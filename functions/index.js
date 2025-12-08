/**
 * Firebase Cloud Functions for Email Notifications & AI Agent
 * Deployed via GitHub Actions
 *
 * Uses Google Cloud Secret Manager for API Keys (defineSecret)
 * Secrets configured: OPENAI_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
const functions = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ✅ BUG #2 FIX: Rate Limiter Helper (OpenAI API Rate Limiting)
const rateLimiter = require('./helpers/rate-limiter');

// ============================================
// SECRET DEFINITIONS (Google Cloud Secret Manager)
// ============================================

// Define secrets (will be loaded from Google Cloud Secret Manager)
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const awsAccessKeyId = defineSecret('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = defineSecret('AWS_SECRET_ACCESS_KEY');

// Helper function: Get and validate AWS SES Client
function getAWSSESClient() {
  let accessKeyId = awsAccessKeyId.value();
  let secretAccessKey = awsSecretAccessKey.value();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY - run: firebase functions:secrets:set AWS_ACCESS_KEY_ID && firebase functions:secrets:set AWS_SECRET_ACCESS_KEY");
  }

  // Sanitization: Trim whitespace and newlines (Firebase Secret Manager adds these)
  accessKeyId = accessKeyId.trim();
  secretAccessKey = secretAccessKey.trim();

  // Validation: Check for invalid characters
  const invalidChars = /[\r\n\t]/g;
  if (invalidChars.test(accessKeyId) || invalidChars.test(secretAccessKey)) {
    console.error("❌ AWS Credentials contain invalid characters (newline/tab)");
    throw new Error("Invalid AWS credentials format - contains control characters");
  }

  console.log("✅ AWS SES Credentials loaded from Secret Manager");

  return new SESClient({
    region: "eu-central-1", // Frankfurt (DSGVO-konform)
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    }
  });
}

// Helper function: Get and validate OpenAI API Key
function getOpenAIApiKey() {
  let apiKey = openaiApiKey.value();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY - run: firebase functions:secrets:set OPENAI_API_KEY");
  }

  // Sanitization: URL-decode if encoded (fixes node-fetch header validation error)
  if (apiKey.includes('%')) {
    console.log("🔧 Decoding URL-encoded API key...");
    apiKey = decodeURIComponent(apiKey);
  }

  // Sanitization: Trim whitespace
  apiKey = apiKey.trim();

  // Validation: Check format
  if (!apiKey.startsWith("sk-")) {
    console.warn("⚠️ WARNING: OPENAI_API_KEY startet nicht mit 'sk-' - möglicherweise ungültig!");
  }

  // Validation: Check for invalid HTTP header characters
  // node-fetch rejects certain characters in Authorization header
  const invalidChars = /[\r\n\t]/g;
  if (invalidChars.test(apiKey)) {
    console.error("❌ API Key contains invalid HTTP header characters (newline/tab)");
    throw new Error("Invalid OPENAI_API_KEY format - contains control characters");
  }

  console.log("✅ OpenAI API Key loaded and sanitized from Secret Manager");
  return apiKey;
}

// Sender Email (MUST be verified in AWS SES!)
const SENDER_EMAIL = "Gaertner-marcel@web.de"; // MUSS in AWS SES verifiziert werden!

// ============================================
// HELPER: HTML Escape for Email Templates (XSS Prevention)
// ============================================

/**
 * Escapes HTML special characters to prevent XSS in email templates
 * @param {string|any} text - The text to escape
 * @returns {string} - Escaped text safe for HTML
 */
function escapeHtml(text) {
  if (text == null) return '';
  if (typeof text !== 'string') {
    text = String(text);
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// HELPER: Get All Active Werkstätten (BUG #8 FIX)
// ============================================

/**
 * Get all active werkstatt IDs dynamically from users collection
 * Used by scheduled functions to process ALL werkstätten
 *
 * @returns {Promise<string[]>} Array of werkstattIds
 */
async function getActiveWerkstaetten() {
  const usersSnapshot = await db.collection('users')
    .where('role', '==', 'werkstatt')
    .where('status', '==', 'active')
    .get();

  const werkstaetten = [];
  for (const userDoc of usersSnapshot.docs) {
    const werkstattId = userDoc.data().werkstattId;
    if (werkstattId) {
      werkstaetten.push(werkstattId);
    }
  }

  console.log(`📍 Found ${werkstaetten.length} active werkstätten: ${werkstaetten.join(', ') || '(none)'}`);
  return werkstaetten;
}

// ============================================
// FUNCTION 1: Status-Änderung → Email an Kunde
// ============================================
exports.onStatusChange = functions
    .region("europe-west3") // Frankfurt für DSGVO
    .runWith({
      secrets: [awsAccessKeyId, awsSecretAccessKey] // Bind AWS SES Credentials from Secret Manager
    })
    .firestore
    .document("{collectionId}/{vehicleId}") // Collection Group Pattern - fängt ALLE Collections
    .onUpdate(async (change, context) => {
      const collectionId = context.params.collectionId; // z.B. "fahrzeuge_mosbach"
      const vehicleId = context.params.vehicleId;

      // FILTER: Nur fahrzeuge_* Collections verarbeiten
      if (!collectionId.startsWith("fahrzeuge_")) {
        console.log(`⏭️ Skipping non-vehicle collection: ${collectionId}`);
        return null;
      }

      // Werkstatt-ID aus Collection-Name extrahieren
      const werkstatt = collectionId.replace("fahrzeuge_", ""); // "mosbach"
      console.log(`📧 Vehicle status change in: ${collectionId} (Werkstatt: ${werkstatt}, Fahrzeug: ${vehicleId})`);

      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed
      if (before.status === after.status) {
        console.log("⏭️ Status unchanged, skip email");
        return null;
      }

      console.log(`📧 Status changed: ${before.status} → ${after.status}`);

      // Get customer email
      const kundenEmail = after.kundenEmail;
      if (!kundenEmail) {
        console.warn("⚠️ No customer email found");
        return null;
      }

      // Load Werkstatt Settings from Firestore
      let settings = null;
      let werkstattName = "Auto-Lackierzentrum"; // Fallback
      let werkstattEmail = SENDER_EMAIL; // Fallback
      let template = "";

      try {
        const settingsRef = db.collection(`einstellungen_${werkstatt}`).doc('config');
        const settingsDoc = await settingsRef.get();

        if (settingsDoc.exists) {
          settings = settingsDoc.data();
          werkstattName = settings.profil?.name || werkstattName;
          werkstattEmail = settings.profil?.email || werkstattEmail;

          // Select template based on status
          if (after.status === 'abgeschlossen' && settings.emailVorlagen?.abschluss?.body) {
            template = settings.emailVorlagen.abschluss.body;
            console.log('✅ Using custom "abschluss" template from Settings');
          } else if (after.status === 'bereit' && settings.emailVorlagen?.erinnerung?.body) {
            template = settings.emailVorlagen.erinnerung.body;
            console.log('✅ Using custom "erinnerung" template from Settings');
          } else if (settings.emailVorlagen?.bestaetigung?.body) {
            template = settings.emailVorlagen.bestaetigung.body;
            console.log('✅ Using custom "bestaetigung" template from Settings');
          }

          console.log(`✅ Settings loaded for ${werkstatt}: ${werkstattName}`);
        } else {
          console.warn(`⚠️ Settings not found for ${werkstatt}, using fallback template`);
        }
      } catch (error) {
        console.warn(`⚠️ Error loading settings for ${werkstatt}:`, error.message);
      }

      // Fallback to hardcoded template if no custom template
      if (!template) {
        console.log('📄 Using fallback hardcoded template');
        const templatePath = path.join(__dirname, "email-templates", "status-change.html");
        template = fs.readFileSync(templatePath, "utf8");
      }

      // Replace placeholders
      const variables = {
        kennzeichen: after.kennzeichen || "k.A.",
        kundenName: after.kundenName || "Kunde",
        oldStatus: getStatusLabel(before.status),
        newStatus: getStatusLabel(after.status),
        serviceTyp: getServiceLabel(after.serviceTyp),
        marke: after.marke || "k.A.",
        modell: after.modell || "",
        werkstattName: werkstattName,
        fahrzeugMarke: after.marke || "k.A.",
        quickViewLink: `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/anfrage-detail.html?id=${context.params.vehicleId}&mode=quickview&kennzeichen=${encodeURIComponent(after.kennzeichen)}`,
      };

      Object.keys(variables).forEach((key) => {
        // XSS Prevention: Escape HTML in template variables
        template = template.replace(new RegExp(`{{${key}}}`, "g"), escapeHtml(variables[key]));
      });

      // Initialize AWS SES (lazy - only when needed)
      const sesClient = getAWSSESClient();
      console.log("✅ AWS SES initialized for status change email");

      // Send email via AWS SES (use werkstatt email if available and verified in AWS SES)
      const subject = `🚗 Status-Update: ${after.kennzeichen} - ${werkstattName}`;

      const sendEmailCommand = new SendEmailCommand({
        Source: werkstattEmail, // Dynamic from Settings (fallback to SENDER_EMAIL)
        Destination: {
          ToAddresses: [kundenEmail]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: template,
              Charset: 'UTF-8'
            }
          }
        }
      });

      try {
        await sesClient.send(sendEmailCommand);
        console.log(`✅ Email sent to: ${kundenEmail}`);

        // Log to Firestore
        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: subject,
          trigger: "status_change",
          vehicleId: vehicleId,
          collectionId: collectionId, // z.B. "fahrzeuge_mosbach"
          werkstatt: werkstatt, // z.B. "mosbach"
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ AWS SES error:", error.message);
        console.error("Error details:", error.name || "No error name");

        // ✅ BUG #3 FIX: Add to retry queue instead of throwing error
        console.log("📬 Adding email to retry queue (Bug #3 Fix)...");

        // Calculate next retry time (5 minutes from now for first retry)
        const nextRetryAt = new admin.firestore.Timestamp(
          admin.firestore.Timestamp.now().seconds + (5 * 60),
          0
        );

        // Add to emailRetryQueue for controlled retry logic
        const queueRef = await db.collection("emailRetryQueue").add({
          emailData: {
            source: werkstattEmail,
            toAddresses: [kundenEmail],
            subject: subject,
            htmlBody: template
          },
          trigger: "status_change",
          vehicleId: vehicleId,
          collectionId: collectionId,
          werkstatt: werkstatt,
          status: "pending_retry",
          retryCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRetryAt: nextRetryAt,
          lastError: error.message,
          lastErrorCode: error.name || error.code || null
        });

        console.log(`✅ Email queued for retry (Queue ID: ${queueRef.id})`);

        // Log to email_logs as "queued_for_retry"
        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: subject,
          trigger: "status_change",
          vehicleId: vehicleId,
          collectionId: collectionId,
          werkstatt: werkstatt,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "queued_for_retry",
          error: error.message,
          errorCode: error.name || error.code || null,
          queueId: queueRef.id // Reference to retry queue entry
        });

        // ✅ DO NOT throw error - prevents duplicate emails from automatic retry
        console.log("✅ Error handled gracefully - no automatic retry");
      }

      return null;
    });

// ============================================
// FUNCTION 2: Neue Partner-Anfrage → Email an Werkstatt
// ============================================
// BUG #2 FIX: Changed from global "partnerAnfragen" to Multi-Tenant Collection Group Pattern
exports.onNewPartnerAnfrage = functions
    .region("europe-west3")
    .runWith({
      secrets: [awsAccessKeyId, awsSecretAccessKey] // Bind AWS SES Credentials from Secret Manager
    })
    .firestore
    .document("{collectionId}/{anfrageId}")  // Collection Group Pattern - fängt ALLE Collections
    .onCreate(async (snap, context) => {
      const collectionId = context.params.collectionId;

      // FILTER: Nur partnerAnfragen_* Collections verarbeiten (Multi-Tenant)
      if (!collectionId.startsWith("partnerAnfragen_")) {
        return null;
      }

      // Werkstatt-ID aus Collection-Name extrahieren (z.B. "partnerAnfragen_mosbach" → "mosbach")
      const werkstattId = collectionId.replace("partnerAnfragen_", "");

      const anfrage = snap.data();

      console.log(`📧 New partner anfrage in ${collectionId}: ${anfrage.kennzeichen}`);

      // Get werkstatt admin emails - NUR für diese Werkstatt!
      const adminsSnapshot = await db.collection("users")
          .where("role", "in", ["admin", "superadmin"])
          .where("status", "==", "active")
          .where("werkstattId", "==", werkstattId)
          .get();

      const adminEmails = adminsSnapshot.docs.map((doc) => doc.data().email);

      if (adminEmails.length === 0) {
        console.warn("⚠️ No admin emails found");
        return null;
      }

      // Load template
      const templatePath = path.join(__dirname, "email-templates", "new-anfrage.html");
      let template = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
      const variables = {
        partnerName: anfrage.partnerName || "Unbekannt",
        serviceTyp: getServiceLabel(anfrage.serviceTyp),
        kennzeichen: anfrage.kennzeichen || "k.A.",
        marke: anfrage.marke || "k.A.",
        modell: anfrage.modell || "",
        createdAt: (anfrage.timestamp?.toDate?.() || new Date(anfrage.timestamp || Date.now())).toLocaleString("de-DE"),
        anfrageLink: `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/anfrage-detail.html?id=${context.params.anfrageId}`,
      };

      Object.keys(variables).forEach((key) => {
        // XSS Prevention: Escape HTML in template variables
        template = template.replace(new RegExp(`{{${key}}}`, "g"), escapeHtml(variables[key]));
      });

      // Initialize AWS SES (lazy - only when needed)
      const sesClient = getAWSSESClient();
      console.log("✅ AWS SES initialized for partner anfrage email");

      // Send email to all admins
      const subject = `🔔 Neue Anfrage von ${anfrage.partnerName}`;

      const sendEmailCommand = new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: {
          ToAddresses: adminEmails
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: template,
              Charset: 'UTF-8'
            }
          }
        }
      });

      try {
        await sesClient.send(sendEmailCommand);
        console.log(`✅ Email sent to ${adminEmails.length} admins`);

        // Log
        await db.collection("email_logs").add({
          to: adminEmails.join(", "),
          subject: subject,
          trigger: "new_anfrage",
          anfrageId: context.params.anfrageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ AWS SES error:", error.message);

        // ✅ BUG #3 FIX: Add to retry queue for each admin email
        console.log("📬 Adding email to retry queue for admins (Bug #3 Fix)...");

        const nextRetryAt = new admin.firestore.Timestamp(
          admin.firestore.Timestamp.now().seconds + (5 * 60),
          0
        );

        // Note: AWS SES supports multiple ToAddresses, so we queue the entire batch
        const queueRef = await db.collection("emailRetryQueue").add({
          emailData: {
            source: SENDER_EMAIL,
            toAddresses: adminEmails,
            subject: subject,
            htmlBody: template
          },
          trigger: "new_anfrage",
          anfrageId: context.params.anfrageId,
          status: "pending_retry",
          retryCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRetryAt: nextRetryAt,
          lastError: error.message,
          lastErrorCode: error.name || error.code || null
        });

        console.log(`✅ Email queued for retry (Queue ID: ${queueRef.id})`);

        await db.collection("email_logs").add({
          to: adminEmails.join(", "),
          subject: subject,
          trigger: "new_anfrage",
          anfrageId: context.params.anfrageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "queued_for_retry",
          error: error.message,
          queueId: queueRef.id
        });
      }

      return null;
    });

// ============================================
// FUNCTION 3: User freigegeben → Email an Partner
// ============================================
exports.onUserApproved = functions
    .region("europe-west3")
    .runWith({
      secrets: [awsAccessKeyId, awsSecretAccessKey] // Bind AWS SES Credentials from Secret Manager
    })
    .firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed from pending to active
      if (before.status !== "pending" || after.status !== "active") {
        return null;
      }

      console.log(`📧 User approved: ${after.email}`);

      // Load template
      const templatePath = path.join(__dirname, "email-templates", "user-approved.html");
      let template = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
      const variables = {
        userName: after.name || "Partner",
        userEmail: after.email,
        portalLink: "https://marcelgaertner1234.github.io/Lackiererei1/partner-app/index.html",
      };

      Object.keys(variables).forEach((key) => {
        // XSS Prevention: Escape HTML in template variables
        template = template.replace(new RegExp(`{{${key}}}`, "g"), escapeHtml(variables[key]));
      });

      // Send email
      // Initialize AWS SES (lazy - only when needed)
      const sesClient = getAWSSESClient();
      console.log("✅ AWS SES initialized for user approved email");

      const subject = "✅ Ihr Account wurde freigeschaltet";

      const sendEmailCommand = new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: {
          ToAddresses: [after.email]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: template,
              Charset: 'UTF-8'
            }
          }
        }
      });

      try {
        await sesClient.send(sendEmailCommand);
        console.log(`✅ Welcome email sent to: ${after.email}`);

        await db.collection("email_logs").add({
          to: after.email,
          subject: subject,
          trigger: "user_approved",
          userId: context.params.userId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ AWS SES error:", error.message);

        // ✅ BUG #3 FIX: Add to retry queue
        console.log("📬 Adding welcome email to retry queue (Bug #3 Fix)...");

        const nextRetryAt = new admin.firestore.Timestamp(
          admin.firestore.Timestamp.now().seconds + (5 * 60),
          0
        );

        const queueRef = await db.collection("emailRetryQueue").add({
          emailData: {
            source: SENDER_EMAIL,
            toAddresses: [after.email],
            subject: subject,
            htmlBody: template
          },
          trigger: "user_approved",
          userId: context.params.userId,
          status: "pending_retry",
          retryCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRetryAt: nextRetryAt,
          lastError: error.message,
          lastErrorCode: error.name || error.code || null
        });

        console.log(`✅ Email queued for retry (Queue ID: ${queueRef.id})`);

        await db.collection("email_logs").add({
          to: after.email,
          subject: subject,
          trigger: "user_approved",
          userId: context.params.userId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "queued_for_retry",
          error: error.message,
          queueId: queueRef.id
        });
      }

      return null;
    });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get German label for status
 */
function getStatusLabel(status) {
  const labels = {
    "neu": "Eingegangen",
    "warte_kva": "In Prüfung",
    "kva_gesendet": "Angebot erstellt",
    "beauftragt": "Beauftragt",
    "terminiert": "Terminiert",
    "in_arbeit": "In Bearbeitung",
    "qualitaetskontrolle": "Qualitätskontrolle",
    "fertig": "Abholbereit",
    "abgeholt": "Abgeholt",
  };
  return labels[status] || status;
}

/**
 * Get German label for service type
 */
function getServiceLabel(serviceTyp) {
  const labels = {
    "lackier": "Lackierung",
    "reifen": "Reifen-Service",
    "mechanik": "Mechanik",
    "pflege": "Fahrzeugpflege",
    "tuev": "TÜV/AU",
    "versicherung": "Versicherung",
    // 🔧 2025-11-25: 6 fehlende Services hinzugefügt
    "glas": "Glas-Reparatur",
    "klima": "Klima-Service",
    "dellen": "Dellen-Drückung",
    "folierung": "Fahrzeugfolierung",
    "steinschutz": "Steinschutzfolie",
    "werbebeklebung": "Fahrzeugbeschriftung",
  };
  return labels[serviceTyp] || serviceTyp;
}

// ============================================
// FUNCTION 4: AI AGENT EXECUTE
// ============================================

/**
 * AI Agent Cloud Function - Processes user messages with OpenAI GPT-4 Function Calling
 *
 * Request:
 * {
 *   message: "Erstelle Fahrzeug HD-AB-1234",
 *   conversationHistory: [...],
 *   werkstatt: "mosbach",
 *   userId: "firebase_user_id"
 * }
 *
 * Response:
 * {
 *   message: "✅ Fahrzeug wurde erstellt!",
 *   toolCalls: [...],
 *   conversationHistory: [...]
 * }
 */
exports.aiAgentExecute = functions
    .region("europe-west3")
    .runWith({
      secrets: [openaiApiKey] // Bind OpenAI API Key from Secret Manager
    })
    .https
    .onCall(async (data, context) => {
      try {
        const { message, conversationHistory = [], werkstatt = "mosbach", userId } = data;

        if (!message) {
          throw new functions.https.HttpsError("invalid-argument", "Message ist erforderlich");
        }

        // ============================================
        // BUG #3 FIX: werkstattId Validation
        // ============================================
        // Validiere dass der User zur angegebenen Werkstatt gehört
        if (context.auth && context.auth.uid) {
          const userDoc = await db.collection('users').doc(context.auth.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const userWerkstatt = userData.werkstattId;
            if (userWerkstatt && userWerkstatt !== werkstatt) {
              console.error(`⚠️ werkstattId mismatch: User ${context.auth.uid} (${userWerkstatt}) tried to access ${werkstatt}`);
              throw new functions.https.HttpsError(
                "permission-denied",
                `Zugriff verweigert: Sie haben keine Berechtigung für Werkstatt "${werkstatt}"`
              );
            }
          }
        }

        console.log(`🤖 AI Agent Request von User ${userId || "anonym"}: "${message}"`);

        // ============================================
        // RATE LIMIT CHECK (Bug #2 Phase 2)
        // ============================================
        const rateLimitResult = await rateLimiter.checkAndIncrementRateLimit(
          userId || "anonym",
          werkstatt,
          'aiChat'
        );

        if (!rateLimitResult.allowed) {
          const resetTime = rateLimitResult.resetAt.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit'
          });

          throw new functions.https.HttpsError(
            'resource-exhausted',
            `Tageslimit erreicht (${rateLimitResult.limit} Anfragen/Tag). ` +
            `Bitte versuchen Sie es morgen wieder ab ${resetTime} Uhr. ` +
            `Sie können weiterhin alle anderen Funktionen der App nutzen.`
          );
        }

        console.log(`✅ Rate limit check passed: ${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`);

        // Initialize OpenAI (lazy)
        const apiKey = getOpenAIApiKey();
        const openai = new OpenAI({ apiKey });

        // Tool definitions (from ai-agent-tools.js)
        const tools = [
          {
            type: "function",
            function: {
              name: "createFahrzeug",
              description: "Erstellt ein neues Fahrzeug in der Datenbank. Verwende dies, wenn der Benutzer ein neues Fahrzeug aufnehmen möchte.",
              parameters: {
                type: "object",
                properties: {
                  kennzeichen: {
                    type: "string",
                    description: "Kfz-Kennzeichen (z.B. HD-AB-1234)"
                  },
                  marke: {
                    type: "string",
                    description: "Fahrzeugmarke (z.B. Mercedes, BMW, VW)"
                  },
                  modell: {
                    type: "string",
                    description: "Fahrzeugmodell (z.B. G-Klasse, 3er, Golf)"
                  },
                  serviceTyp: {
                    type: "string",
                    enum: ["lackier", "reifen", "mechanik", "pflege", "tuev", "versicherung"],
                    description: "Art des Services"
                  },
                  kundenName: {
                    type: "string",
                    description: "Name des Kunden"
                  },
                  kundenEmail: {
                    type: "string",
                    description: "E-Mail-Adresse des Kunden (optional)"
                  },
                  kundenTelefon: {
                    type: "string",
                    description: "Telefonnummer des Kunden (optional)"
                  },
                  beschreibung: {
                    type: "string",
                    description: "Beschreibung des Auftrags (optional)"
                  }
                },
                required: ["kennzeichen", "marke", "serviceTyp", "kundenName"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "updateFahrzeugStatus",
              description: "Aktualisiert den Status eines Fahrzeugs.",
              parameters: {
                type: "object",
                properties: {
                  vehicleId: {
                    type: "string",
                    description: "Firestore Document ID des Fahrzeugs"
                  },
                  status: {
                    type: "string",
                    enum: ["neu", "warte_kva", "kva_gesendet", "beauftragt", "terminiert", "in_arbeit", "qualitaetskontrolle", "fertig", "abgeholt"],
                    description: "Hauptstatus des Fahrzeugs"
                  },
                  prozessStatus: {
                    type: "string",
                    description: "Service-spezifischer Prozess-Status"
                  },
                  notizen: {
                    type: "string",
                    description: "Zusätzliche Notizen (optional)"
                  }
                },
                required: ["vehicleId"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "getFahrzeuge",
              description: "Sucht Fahrzeuge in der Datenbank mit optionalen Filtern.",
              parameters: {
                type: "object",
                properties: {
                  kennzeichen: {
                    type: "string",
                    description: "Filter nach Kennzeichen (optional)"
                  },
                  status: {
                    type: "string",
                    description: "Filter nach Status (optional)"
                  },
                  serviceTyp: {
                    type: "string",
                    enum: ["lackier", "reifen", "mechanik", "pflege", "tuev", "versicherung"],
                    description: "Filter nach Service-Typ (optional)"
                  },
                  kundenName: {
                    type: "string",
                    description: "Filter nach Kundenname (optional)"
                  },
                  limit: {
                    type: "number",
                    description: "Maximale Anzahl Ergebnisse (Standard: 10)"
                  }
                },
                required: []
              }
            }
          },
          {
            type: "function",
            function: {
              name: "createTermin",
              description: "Erstellt einen neuen Abnahme-Termin im Kalender. Verwende dies, wenn ein Termin vereinbart werden soll.",
              parameters: {
                type: "object",
                properties: {
                  fahrzeugId: {
                    type: "string",
                    description: "Firestore ID des Fahrzeugs (optional)"
                  },
                  kennzeichen: {
                    type: "string",
                    description: "Kfz-Kennzeichen (optional)"
                  },
                  datum: {
                    type: "string",
                    description: "Datum des Termins. Akzeptiert: 'heute', 'morgen', 'Freitag', '28.10.', '28.10.2025'"
                  },
                  uhrzeit: {
                    type: "string",
                    description: "Uhrzeit (Format: HH:MM, z.B. '14:00'). Standard: 09:00"
                  },
                  typ: {
                    type: "string",
                    enum: ["abnahme", "annahme", "beratung", "sonstiges"],
                    description: "Art des Termins. Standard: abnahme"
                  },
                  notizen: {
                    type: "string",
                    description: "Zusätzliche Notizen (optional)"
                  }
                },
                required: ["datum"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "getTermine",
              description: "Zeigt Termine an. Kann nach verschiedenen Kriterien gefiltert werden.",
              parameters: {
                type: "object",
                properties: {
                  fahrzeugId: {
                    type: "string",
                    description: "Filter nach Fahrzeug-ID (optional)"
                  },
                  kennzeichen: {
                    type: "string",
                    description: "Filter nach Kennzeichen (optional)"
                  },
                  datum: {
                    type: "string",
                    description: "Filter nach spezifischem Datum (z.B. 'heute', 'morgen')"
                  },
                  zeitraum: {
                    type: "string",
                    enum: ["heute", "diese_woche", "naechste_woche"],
                    description: "Zeitraum-Filter"
                  },
                  status: {
                    type: "string",
                    enum: ["geplant", "bestaetigt", "abgeschlossen", "abgesagt"],
                    description: "Status-Filter"
                  },
                  limit: {
                    type: "number",
                    description: "Maximale Anzahl Ergebnisse (Standard: 50)"
                  }
                },
                required: []
              }
            }
          },
          {
            type: "function",
            function: {
              name: "updateTermin",
              description: "Aktualisiert einen bestehenden Termin (Datum, Uhrzeit, Status, Notizen).",
              parameters: {
                type: "object",
                properties: {
                  terminId: {
                    type: "string",
                    description: "Firestore Document ID des Termins"
                  },
                  datum: {
                    type: "string",
                    description: "Neues Datum (Format siehe createTermin)"
                  },
                  uhrzeit: {
                    type: "string",
                    description: "Neue Uhrzeit (Format: HH:MM)"
                  },
                  status: {
                    type: "string",
                    enum: ["geplant", "bestaetigt", "abgeschlossen", "abgesagt"],
                    description: "Neuer Status"
                  },
                  notizen: {
                    type: "string",
                    description: "Aktualisierte Notizen"
                  }
                },
                required: ["terminId"]
              }
            }
          },
          // ========================================
          // MATERIAL-BESTELLUNGEN TOOLS (Phase 4)
          // ========================================
          {
            type: "function",
            function: {
              name: "createBestellung",
              description: "Erstellt eine neue Material-Bestellung. Verwende dies, wenn Material nachbestellt werden muss (z.B. Lack, Reifen, Ersatzteile).",
              parameters: {
                type: "object",
                properties: {
                  beschreibung: {
                    type: "string",
                    description: "Beschreibung des benötigten Materials (z.B. 'Lack RAL 9016 weiss, 5 Liter', 'Winterreifen 225/45 R17')"
                  },
                  mitarbeiter: {
                    type: "string",
                    description: "Name des Mitarbeiters der die Bestellung aufgibt (optional, Standard: KI-Agent)"
                  },
                  notizen: {
                    type: "string",
                    description: "Zusätzliche Notizen zur Bestellung (optional)"
                  }
                },
                required: ["beschreibung"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "getBestellungen",
              description: "Ruft Material-Bestellungen ab. Kann nach Status oder Mitarbeiter gefiltert werden.",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["pending", "ordered", "delivered"],
                    description: "Filter nach Bestellstatus: pending (ausstehend), ordered (bestellt), delivered (geliefert)"
                  },
                  mitarbeiter: {
                    type: "string",
                    description: "Filter nach Mitarbeiter-Name"
                  },
                  limit: {
                    type: "number",
                    description: "Maximale Anzahl der Bestellungen (Standard: alle)"
                  }
                },
                required: []
              }
            }
          },
          {
            type: "function",
            function: {
              name: "updateBestellung",
              description: "Aktualisiert eine Material-Bestellung (z.B. Status ändern von 'pending' auf 'ordered' oder 'delivered').",
              parameters: {
                type: "object",
                properties: {
                  bestellungId: {
                    type: "string",
                    description: "ID der Bestellung (Format: req_TIMESTAMP)"
                  },
                  status: {
                    type: "string",
                    enum: ["pending", "ordered", "delivered"],
                    description: "Neuer Status: pending (ausstehend), ordered (bestellt), delivered (geliefert)"
                  },
                  notizen: {
                    type: "string",
                    description: "Aktualisierte Notizen"
                  }
                },
                required: ["bestellungId"]
              }
            }
          }
        ];

        // Prepare messages for OpenAI
        const messages = [
          {
            role: "system",
            content: `Du bist ein intelligenter Assistent für die Fahrzeugannahme-App der Werkstatt "${werkstatt}".

Deine Aufgaben:
- Hilf Mitarbeitern beim Erstellen und Verwalten von Fahrzeugen
- Beantworte Fragen zum System
- Führe die Benutzer durch die App
- Verwende die verfügbaren Tools um Aktionen auszuführen

Wichtig:
- Antworte IMMER auf Deutsch
- Sei höflich und professionell
- Verwende die Tools nur wenn der Benutzer eine konkrete Aktion möchte
- Bei Unsicherheit: frag nach

Werkstatt: ${werkstatt}
User ID: ${userId || "unbekannt"}`
          },
          ...conversationHistory,
          {
            role: "user",
            content: message
          }
        ];

        // Call OpenAI with Function Calling
        console.log("🤖 Calling OpenAI GPT-4 with Function Calling...");
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000
        });

        const responseMessage = completion.choices[0].message;
        console.log("✅ OpenAI Response:", JSON.stringify(responseMessage, null, 2));

        // Check if AI wants to call tools
        const toolCalls = responseMessage.tool_calls || [];
        const toolResults = [];

        if (toolCalls.length > 0) {
          console.log(`🔧 AI wants to call ${toolCalls.length} tool(s)`);

          // Execute each tool call
          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`🔧 Executing tool: ${functionName}`, functionArgs);

            let result;

            try {
              // Execute tool in Firestore
              if (functionName === "createFahrzeug") {
                result = await executeCreateFahrzeug(functionArgs, werkstatt);
              } else if (functionName === "updateFahrzeugStatus") {
                result = await executeUpdateFahrzeugStatus(functionArgs, werkstatt);
              } else if (functionName === "getFahrzeuge") {
                result = await executeGetFahrzeuge(functionArgs, werkstatt);
              } else if (functionName === "createTermin") {
                result = await executeCreateTermin(functionArgs, werkstatt);
              } else if (functionName === "getTermine") {
                result = await executeGetTermine(functionArgs, werkstatt);
              } else if (functionName === "updateTermin") {
                result = await executeUpdateTermin(functionArgs, werkstatt);
              } else if (functionName === "createBestellung") {
                result = await executeCreateBestellung(functionArgs, werkstatt);
              } else if (functionName === "getBestellungen") {
                result = await executeGetBestellungen(functionArgs, werkstatt);
              } else if (functionName === "updateBestellung") {
                result = await executeUpdateBestellung(functionArgs, werkstatt);
              } else if (functionName === "getDashboardOverview") {
                result = await executeGetDashboardOverview(functionArgs, werkstatt);
              } else if (functionName === "getStatistiken") {
                result = await executeGetStatistiken(functionArgs, werkstatt);
              } else {
                result = {
                  success: false,
                  message: `Unbekanntes Tool: ${functionName}`
                };
              }

              console.log(`✅ Tool ${functionName} executed:`, result);
            } catch (error) {
              console.error(`❌ Tool ${functionName} failed:`, error);
              result = {
                success: false,
                message: `Fehler: ${error.message}`
              };
            }

            toolResults.push({
              toolCallId: toolCall.id,
              functionName: functionName,
              result: result
            });

            // Add tool result to messages for next OpenAI call
            messages.push({
              role: "assistant",
              content: null,
              tool_calls: [toolCall]
            });
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          }

          // Get final response from OpenAI with tool results
          console.log("🤖 Getting final response from OpenAI...");
          const finalCompletion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
          });

          const finalResponse = finalCompletion.choices[0].message.content;

          // Update conversation history
          const updatedHistory = [
            ...conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: finalResponse }
          ];

          // Log to Firestore
          await db.collection("ai_logs").add({
            userId: userId || "anonym",
            werkstatt: werkstatt,
            message: message,
            response: finalResponse,
            toolCalls: toolResults,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            success: true,
            message: finalResponse,
            toolCalls: toolResults,
            conversationHistory: updatedHistory
          };
        } else {
          // No tool calls - just conversation
          const aiResponse = responseMessage.content;

          // Update conversation history
          const updatedHistory = [
            ...conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: aiResponse }
          ];

          // Log to Firestore
          await db.collection("ai_logs").add({
            userId: userId || "anonym",
            werkstatt: werkstatt,
            message: message,
            response: aiResponse,
            toolCalls: [],
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            success: true,
            message: aiResponse,
            toolCalls: [],
            conversationHistory: updatedHistory
          };
        }
      } catch (error) {
        console.error("❌ AI Agent Error:", error);

        // Log error to Firestore
        await db.collection("ai_logs").add({
          userId: data.userId || "anonym",
          werkstatt: data.werkstatt || "unknown",
          message: data.message || "",
          error: error.message,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed"
        });

        throw new functions.https.HttpsError("internal", `AI Agent Fehler: ${error.message}`);
      }
    });

// ============================================
// TOOL EXECUTION HELPERS (Server-Side)
// ============================================

/**
 * Execute createFahrzeug tool on server
 */
async function executeCreateFahrzeug(params, werkstatt) {
  const {
    kennzeichen,
    marke,
    modell,
    serviceTyp,
    kundenName,
    kundenEmail,
    kundenTelefon,
    beschreibung
  } = params;

  // Validation
  if (!kennzeichen || !marke || !serviceTyp || !kundenName) {
    throw new Error("Pflichtfelder fehlen");
  }

  // Get initial process status
  function getInitialProzessStatus(serviceTyp) {
    const initialStatus = {
      "lackier": "neu",
      "reifen": "neu",
      "mechanik": "neu",
      "pflege": "neu",
      "tuev": "neu",
      "versicherung": "neu",
      // 🔧 2025-11-25: 6 fehlende Services
      "glas": "neu",
      "klima": "neu",
      "dellen": "neu",
      "folierung": "neu",
      "steinschutz": "neu",
      "werbebeklebung": "neu"
    };
    return initialStatus[serviceTyp] || "neu";
  }

  // Create vehicle data
  const vehicleData = {
    kennzeichen: kennzeichen.toUpperCase(),
    marke: marke,
    modell: modell || "",
    serviceTyp: serviceTyp,
    kundenName: kundenName,
    kundenEmail: kundenEmail || "",
    kundenTelefon: kundenTelefon || "",
    beschreibung: beschreibung || "",
    status: "neu",
    prozessStatus: getInitialProzessStatus(serviceTyp),
    timestamp: Date.now(),
    createdBy: "KI-Agent",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Use multi-tenant collection
  const collectionName = `fahrzeuge_${werkstatt}`;
  const docRef = await db.collection(collectionName).add(vehicleData);

  console.log(`✅ Created vehicle in ${collectionName}: ${docRef.id}`);

  return {
    success: true,
    message: `Fahrzeug ${kennzeichen} wurde erstellt!`,
    vehicleId: docRef.id,
    data: vehicleData
  };
}

/**
 * Execute updateFahrzeugStatus tool on server
 */
async function executeUpdateFahrzeugStatus(params, werkstatt) {
  const { vehicleId, status, prozessStatus, notizen } = params;

  if (!vehicleId) {
    throw new Error("vehicleId ist erforderlich");
  }

  // Prepare update data
  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: "KI-Agent"
  };

  if (status) updateData.status = status;
  if (prozessStatus) updateData.prozessStatus = prozessStatus;
  if (notizen) updateData.notizen = notizen;

  // Use multi-tenant collection
  const collectionName = `fahrzeuge_${werkstatt}`;
  await db.collection(collectionName).doc(vehicleId).update(updateData);

  console.log(`✅ Updated vehicle ${vehicleId} in ${collectionName}`);

  return {
    success: true,
    message: "Status wurde aktualisiert!",
    vehicleId: vehicleId,
    updates: updateData
  };
}

/**
 * Execute getFahrzeuge tool on server
 */
async function executeGetFahrzeuge(params, werkstatt) {
  const {
    kennzeichen,
    status,
    serviceTyp,
    kundenName,
    limit = 10
  } = params;

  // Use multi-tenant collection
  const collectionName = `fahrzeuge_${werkstatt}`;
  let query = db.collection(collectionName);

  // Apply filters
  if (kennzeichen) {
    query = query.where("kennzeichen", "==", kennzeichen.toUpperCase());
  }

  if (status) {
    query = query.where("status", "==", status);
  }

  if (serviceTyp) {
    query = query.where("serviceTyp", "==", serviceTyp);
  }

  if (kundenName) {
    query = query.where("kundenName", "==", kundenName);
  }

  // Order by timestamp and limit
  query = query.orderBy("timestamp", "desc").limit(limit);

  const snapshot = await query.get();
  const vehicles = [];

  snapshot.forEach(doc => {
    vehicles.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`✅ Found ${vehicles.length} vehicles in ${collectionName}`);

  return {
    success: true,
    message: `${vehicles.length} Fahrzeug(e) gefunden`,
    count: vehicles.length,
    vehicles: vehicles
  };
}

/**
 * Execute createTermin tool on server
 */
async function executeCreateTermin(params, werkstatt) {
  const {
    fahrzeugId,
    kennzeichen,
    datum,
    uhrzeit,
    typ,
    notizen
  } = params;

  // Validation
  if (!datum) {
    throw new Error("Datum ist erforderlich");
  }

  // Parse date (simplified server-side version)
  function parseGermanDateServer(dateStr) {
    const str = dateStr.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Relative dates
    if (str === "heute") return today;
    if (str === "morgen") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    if (str === "übermorgen" || str === "uebermorgen") {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter;
    }

    // Weekdays
    const weekdays = {
      "montag": 1, "dienstag": 2, "mittwoch": 3, "donnerstag": 4,
      "freitag": 5, "samstag": 6, "sonntag": 0
    };
    if (weekdays.hasOwnProperty(str)) {
      const targetDay = weekdays[str];
      const currentDay = today.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      const result = new Date(today);
      result.setDate(result.getDate() + daysToAdd);
      return result;
    }

    // DD.MM. format
    const ddmmMatch = str.match(/(\d{1,2})\.(\d{1,2})\.?$/);
    if (ddmmMatch) {
      const day = parseInt(ddmmMatch[1]);
      const month = parseInt(ddmmMatch[2]) - 1;
      return new Date(today.getFullYear(), month, day);
    }

    // DD.MM.YYYY format
    const ddmmyyyyMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1]);
      const month = parseInt(ddmmyyyyMatch[2]) - 1;
      const year = parseInt(ddmmyyyyMatch[3]);
      return new Date(year, month, day);
    }

    // ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;

    throw new Error(`Konnte Datum nicht parsen: ${dateStr}`);
  }

  const terminDate = parseGermanDateServer(datum);
  const terminZeit = uhrzeit || "09:00";

  // Create appointment data
  const terminData = {
    fahrzeugId: fahrzeugId || null,
    kennzeichen: kennzeichen ? kennzeichen.toUpperCase() : "",
    datum: terminDate.toISOString().split("T")[0],
    uhrzeit: terminZeit,
    typ: typ || "abnahme",
    notizen: notizen || "",
    status: "geplant",
    timestamp: Date.now(),
    createdBy: "KI-Agent",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Use multi-tenant collection
  const collectionName = `kalender_${werkstatt}`;
  const docRef = await db.collection(collectionName).add(terminData);

  console.log(`✅ Created termin in ${collectionName}: ${docRef.id}`);

  return {
    success: true,
    message: `Termin am ${terminData.datum} um ${terminData.uhrzeit} wurde erstellt!`,
    terminId: docRef.id,
    data: terminData
  };
}

/**
 * Execute getTermine tool on server
 */
async function executeGetTermine(params, werkstatt) {
  const {
    fahrzeugId,
    kennzeichen,
    datum,
    zeitraum,
    status,
    limit = 50
  } = params;

  // Use multi-tenant collection
  const collectionName = `kalender_${werkstatt}`;
  let query = db.collection(collectionName);

  // Apply filters
  if (fahrzeugId) {
    query = query.where("fahrzeugId", "==", fahrzeugId);
  }

  if (kennzeichen) {
    query = query.where("kennzeichen", "==", kennzeichen.toUpperCase());
  }

  if (status) {
    query = query.where("status", "==", status);
  }

  // Date range filter
  if (zeitraum) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (zeitraum === "heute") {
      const dateStr = today.toISOString().split("T")[0];
      query = query.where("datum", "==", dateStr);
    } else if (zeitraum === "diese_woche") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      query = query.where("datum", ">=", startOfWeek.toISOString().split("T")[0])
                   .where("datum", "<=", endOfWeek.toISOString().split("T")[0]);
    } else if (zeitraum === "naechste_woche") {
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(today.getDate() + (8 - today.getDay()));
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

      query = query.where("datum", ">=", nextWeekStart.toISOString().split("T")[0])
                   .where("datum", "<=", nextWeekEnd.toISOString().split("T")[0]);
    }
  } else if (datum) {
    // Parse specific date (reuse parseGermanDateServer from executeCreateTermin context)
    // For simplicity, assume datum is already in YYYY-MM-DD format from client
    query = query.where("datum", "==", datum);
  }

  // Order and limit
  query = query.orderBy("datum", "asc").orderBy("uhrzeit", "asc").limit(limit);

  const snapshot = await query.get();
  const termine = [];

  snapshot.forEach(doc => {
    termine.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`✅ Found ${termine.length} termine in ${collectionName}`);

  return {
    success: true,
    message: `${termine.length} Termin(e) gefunden`,
    count: termine.length,
    termine: termine
  };
}

/**
 * Execute updateTermin tool on server
 */
async function executeUpdateTermin(params, werkstatt) {
  const {
    terminId,
    datum,
    uhrzeit,
    status,
    notizen
  } = params;

  // Validation
  if (!terminId) {
    throw new Error("terminId ist erforderlich");
  }

  // Prepare update data
  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: "KI-Agent"
  };

  if (datum) {
    // Simplified: assume datum is YYYY-MM-DD or parseable
    updateData.datum = datum;
  }

  if (uhrzeit) updateData.uhrzeit = uhrzeit;
  if (status) updateData.status = status;
  if (notizen !== undefined) updateData.notizen = notizen;

  // Use multi-tenant collection
  const collectionName = `kalender_${werkstatt}`;
  await db.collection(collectionName).doc(terminId).update(updateData);

  console.log(`✅ Updated termin ${terminId} in ${collectionName}`);

  return {
    success: true,
    message: "Termin wurde erfolgreich aktualisiert!",
    terminId: terminId,
    updates: updateData
  };
}

// Phase 4: Material-Bestellungen Tools - Deployment Force Update
/**
 * Execute createBestellung tool on server
 */
async function executeCreateBestellung(params, werkstatt) {
  const { beschreibung, mitarbeiter, notizen } = params;

  // Validation
  if (!beschreibung) {
    throw new Error("beschreibung ist erforderlich");
  }

  // Generate unique ID
  const requestId = "req_" + Date.now();

  // Prepare request data
  const requestData = {
    id: requestId,
    photo: null,
    description: beschreibung,
    requestedBy: mitarbeiter || "KI-Agent",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: "pending",
    notizen: notizen || "",
    createdBy: "KI-Agent"
  };

  // Use multi-tenant collection
  const collectionName = `materialRequests_${werkstatt}`;
  await db.collection(collectionName).doc(requestId).set(requestData);

  console.log(`✅ Created material request ${requestId} in ${collectionName}`);

  return {
    success: true,
    message: `Material-Bestellung "${beschreibung}" wurde erfolgreich erstellt!`,
    requestId: requestId,
    data: requestData
  };
}

/**
 * Execute getBestellungen tool on server
 */
async function executeGetBestellungen(params, werkstatt) {
  const { status, limit = 50 } = params;

  // Use multi-tenant collection
  const collectionName = `materialRequests_${werkstatt}`;
  let query = db.collection(collectionName);

  // Filter by status if provided
  if (status) {
    query = query.where("status", "==", status);
  }

  // Order by timestamp (newest first) and limit
  query = query.orderBy("timestamp", "desc").limit(limit);

  const snapshot = await query.get();
  const bestellungen = [];

  snapshot.forEach(doc => {
    bestellungen.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`✅ Found ${bestellungen.length} material requests in ${collectionName}`);

  return {
    success: true,
    message: `${bestellungen.length} Material-Bestellung(en) gefunden`,
    count: bestellungen.length,
    bestellungen: bestellungen
  };
}

/**
 * Execute updateBestellung tool on server
 */
async function executeUpdateBestellung(params, werkstatt) {
  const { requestId, status, notizen } = params;

  // Validation
  if (!requestId) {
    throw new Error("requestId ist erforderlich");
  }

  if (!status) {
    throw new Error("status ist erforderlich");
  }

  // Validate status value
  const validStatuses = ["pending", "ordered", "delivered"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Ungültiger Status. Erlaubte Werte: ${validStatuses.join(", ")}`);
  }

  // Prepare update data
  const updateData = {
    status: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: "KI-Agent"
  };

  if (notizen !== undefined) {
    updateData.notizen = notizen;
  }

  // Use multi-tenant collection
  const collectionName = `materialRequests_${werkstatt}`;
  await db.collection(collectionName).doc(requestId).update(updateData);

  console.log(`✅ Updated material request ${requestId} in ${collectionName} to status: ${status}`);

  return {
    success: true,
    message: `Material-Bestellung wurde erfolgreich auf Status "${status}" aktualisiert!`,
    requestId: requestId,
    updates: updateData
  };
}

/**
 * Execute getDashboardOverview tool on server
 */
async function executeGetDashboardOverview(params, werkstatt) {
  console.log(`📊 getDashboardOverview called for werkstatt: ${werkstatt}`);

  try {
    // Multi-Tenant Collections
    const fahrzeugeCollection = `fahrzeuge_${werkstatt}`;
    const kundenCollection = `kunden_${werkstatt}`;
    const kalenderCollection = `kalender_${werkstatt}`;
    const materialCollection = `materialRequests_${werkstatt}`;

    // Parallel alle Daten laden
    const [fahrzeugeSnap, kundenSnap, termineSnap, materialSnap] = await Promise.all([
      db.collection(fahrzeugeCollection).get(),
      db.collection(kundenCollection).get(),
      db.collection(kalenderCollection).get(),
      db.collection(materialCollection).get()
    ]);

    // Fahrzeuge auswerten
    const fahrzeuge = [];
    fahrzeugeSnap.forEach(doc => fahrzeuge.push(doc.data()));

    const fahrzeugStats = {
      total: fahrzeuge.length,
      offen: fahrzeuge.filter(f => f.status === "Offen").length,
      in_arbeit: fahrzeuge.filter(f => f.status === "In Bearbeitung").length,
      abgeschlossen: fahrzeuge.filter(f => f.status === "Abgeschlossen").length
    };

    // Kunden auswerten
    const kunden = [];
    kundenSnap.forEach(doc => kunden.push(doc.data()));

    const kundenStats = {
      total: kunden.length,
      stammkunden: kunden.filter(k => k.anzahlBesuche >= 2).length,
      neukunden: kunden.filter(k => k.anzahlBesuche === 1).length
    };

    // Termine auswerten
    const termine = [];
    termineSnap.forEach(doc => termine.push(doc.data()));

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const naechsteWoche = new Date(heute);
    naechsteWoche.setDate(heute.getDate() + 7);

    const terminStats = {
      total: termine.length,
      heute: termine.filter(t => {
        if (!t.datum) return false;
        const tDate = new Date(t.datum);
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === heute.getTime();
      }).length,
      diese_woche: termine.filter(t => {
        if (!t.datum) return false;
        const tDate = new Date(t.datum);
        return tDate >= heute && tDate < naechsteWoche;
      }).length
    };

    // Material auswerten
    const materialRequests = [];
    materialSnap.forEach(doc => materialRequests.push(doc.data()));

    const materialStats = {
      total: materialRequests.length,
      pending: materialRequests.filter(m => m.status === "pending").length,
      ordered: materialRequests.filter(m => m.status === "ordered").length,
      delivered: materialRequests.filter(m => m.status === "delivered").length
    };

    const overview = {
      fahrzeuge: fahrzeugStats,
      kunden: kundenStats,
      termine: terminStats,
      material: materialStats,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Dashboard overview loaded for ${werkstatt}`, overview);

    return {
      success: true,
      message: "Dashboard-Übersicht erfolgreich geladen",
      data: overview
    };

  } catch (error) {
    console.error("❌ Error in executeGetDashboardOverview:", error);
    return {
      success: false,
      message: `Fehler beim Laden der Dashboard-Übersicht: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Execute getStatistiken tool on server
 */
async function executeGetStatistiken(params, werkstatt) {
  const { zeitraum = "gesamt", serviceTyp = null } = params;

  console.log(`📊 getStatistiken called for werkstatt: ${werkstatt}, zeitraum: ${zeitraum}, serviceTyp: ${serviceTyp}`);

  try {
    // Multi-Tenant Collection
    const fahrzeugeCollection = `fahrzeuge_${werkstatt}`;
    let query = db.collection(fahrzeugeCollection);

    // Filter nach Service-Typ
    if (serviceTyp) {
      query = query.where("serviceTyp", "==", serviceTyp);
    }

    // Daten laden
    const snapshot = await query.get();
    const fahrzeuge = [];
    snapshot.forEach(doc => fahrzeuge.push(doc.data()));

    // Zeitraum-Filter anwenden
    let filteredFahrzeuge = fahrzeuge;
    const heute = new Date();

    if (zeitraum === "heute") {
      heute.setHours(0, 0, 0, 0);
      const morgen = new Date(heute);
      morgen.setDate(heute.getDate() + 1);
      filteredFahrzeuge = fahrzeuge.filter(f => {
        if (!f.timestamp) return false;
        const fDate = new Date(f.timestamp);
        return fDate >= heute && fDate < morgen;
      });
    } else if (zeitraum === "woche") {
      const wochenStart = new Date(heute);
      wochenStart.setDate(heute.getDate() - heute.getDay());
      wochenStart.setHours(0, 0, 0, 0);
      filteredFahrzeuge = fahrzeuge.filter(f => {
        if (!f.timestamp) return false;
        return new Date(f.timestamp) >= wochenStart;
      });
    } else if (zeitraum === "monat") {
      const monatsStart = new Date(heute.getFullYear(), heute.getMonth(), 1);
      filteredFahrzeuge = fahrzeuge.filter(f => {
        if (!f.timestamp) return false;
        return new Date(f.timestamp) >= monatsStart;
      });
    }

    // Statistiken berechnen
    const stats = {
      zeitraum,
      serviceTyp: serviceTyp || "alle",
      anzahl: filteredFahrzeuge.length,
      status_verteilung: {
        offen: filteredFahrzeuge.filter(f => f.status === "Offen").length,
        in_arbeit: filteredFahrzeuge.filter(f => f.status === "In Bearbeitung").length,
        abgeschlossen: filteredFahrzeuge.filter(f => f.status === "Abgeschlossen").length
      },
      service_verteilung: {}
    };

    // Service-Typ Verteilung (nur wenn kein Service-Filter)
    if (!serviceTyp) {
      const serviceTypen = [
        "Lackierung", "Reifen", "Mechanik", "Pflege", "TÜV", "Versicherung",
        "Glas", "Klima", "Dellen", "Steinschutz", "Folierung", "Werbebeklebung"
      ];
      serviceTypen.forEach(typ => {
        stats.service_verteilung[typ] = filteredFahrzeuge.filter(f => f.serviceTyp === typ).length;
      });
    }

    console.log(`✅ Statistiken loaded for ${werkstatt}`, stats);

    return {
      success: true,
      message: `Statistiken für ${zeitraum} erfolgreich geladen`,
      data: stats
    };

  } catch (error) {
    console.error("❌ Error in executeGetStatistiken:", error);
    return {
      success: false,
      message: `Fehler beim Laden der Statistiken: ${error.message}`,
      error: error.message
    };
  }
}

// ============================================
// FUNCTION 5: WHISPER TRANSCRIBE (Speech-to-Text)
// ============================================

/**
 * OpenAI Whisper Speech-to-Text Cloud Function
 *
 * Receives audio from browser, transcribes it using OpenAI Whisper API
 *
 * Request:
 * {
 *   audio: "base64_encoded_audio_data",
 *   language: "de" (optional, defaults to "de")
 * }
 *
 * Response:
 * {
 *   success: true,
 *   text: "Transkribierter Text",
 *   duration: 3.5
 * }
 */
exports.whisperTranscribe = functions
    .region("europe-west3") // DSGVO compliance
    .runWith({
      secrets: [openaiApiKey], // Bind OpenAI API Key from Secret Manager
      timeoutSeconds: 60, // Whisper kann bis zu 60s brauchen für lange Audios
      memory: "512MB" // Mehr Memory für Audio-Processing
    })
    .https
    .onCall(async (data, context) => {
      try {
        const { audio, language = "de", werkstatt = "mosbach" } = data;

        // Validation
        if (!audio) {
          throw new functions.https.HttpsError("invalid-argument", "Audio data ist erforderlich");
        }

        // Authentication check (optional - entferne wenn alle User nutzen dürfen)
        if (!context.auth) {
          console.warn("⚠️ Whisper called without authentication - allowing for testing");
          // throw new functions.https.HttpsError("unauthenticated", "User muss eingeloggt sein");
        }

        const userId = context.auth?.uid || "anonym";
        console.log(`🎤 Whisper Transcribe Request von User ${userId}`);

        // Check audio size (OpenAI limit: 25 MB)
        const audioSizeBytes = Buffer.byteLength(audio, "base64");
        const audioSizeMB = audioSizeBytes / (1024 * 1024);

        if (audioSizeMB > 25) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Audio zu groß (${audioSizeMB.toFixed(2)} MB). Maximum: 25 MB`
          );
        }

        console.log(`📊 Audio size: ${audioSizeMB.toFixed(2)} MB`);

        // ============================================
        // RATE LIMIT CHECK (Bug #2 Phase 2)
        // ============================================
        const rateLimitResult = await rateLimiter.checkAndIncrementRateLimit(
          userId,
          werkstatt,
          'whisper'
        );

        if (!rateLimitResult.allowed) {
          const resetTime = rateLimitResult.resetAt.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit'
          });

          throw new functions.https.HttpsError(
            'resource-exhausted',
            `Tageslimit für Spracherkennung erreicht (${rateLimitResult.limit} Anfragen/Tag). ` +
            `Bitte versuchen Sie es morgen wieder ab ${resetTime} Uhr.`
          );
        }

        console.log(`✅ Rate limit check passed: ${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`);

        // Initialize OpenAI
        const apiKey = getOpenAIApiKey();
        const openai = new OpenAI({ apiKey });

        // Convert base64 to Buffer
        const audioBuffer = Buffer.from(audio, "base64");

        // Create a File-like object for OpenAI API
        // OpenAI expects a File or Blob, we create a temporary file
        const fs = require("fs");
        const os = require("os");
        const path = require("path");

        const tmpDir = os.tmpdir();
        const tmpFilePath = path.join(tmpDir, `whisper_${Date.now()}.webm`);

        // Write audio to temporary file
        fs.writeFileSync(tmpFilePath, audioBuffer);
        console.log(`✅ Audio written to temp file: ${tmpFilePath}`);

        // Call OpenAI Whisper API
        console.log("🎤 Calling OpenAI Whisper API...");
        const startTime = Date.now();

        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tmpFilePath),
          model: "whisper-1",
          language: language, // "de" für Deutsch
          response_format: "json"
        });

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Whisper transcription completed in ${duration}s`);
        console.log(`📝 Transcribed text: "${transcription.text}"`);

        // Cleanup temp file
        try {
          fs.unlinkSync(tmpFilePath);
          console.log("🗑️ Temp file cleaned up");
        } catch (cleanupError) {
          console.warn("⚠️ Failed to cleanup temp file:", cleanupError.message);
        }

        // Log to Firestore
        await db.collection("whisper_logs").add({
          userId: userId,
          text: transcription.text,
          language: language,
          audioSizeMB: audioSizeMB,
          durationSeconds: duration,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
          success: true,
          text: transcription.text,
          duration: duration
        };

      } catch (error) {
        console.error("❌ Whisper Transcribe Error:", error);

        // Log error to Firestore
        await db.collection("whisper_logs").add({
          userId: context.auth?.uid || "anonym",
          error: error.message,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed"
        });

        // Return user-friendly error
        if (error.message.includes("Audio zu groß")) {
          throw error; // Re-throw size error as-is
        }

        throw new functions.https.HttpsError("internal", `Whisper Fehler: ${error.message}`);
      }
    });

// ============================================
// OPENAI TEXT-TO-SPEECH (TTS)
// ============================================

/**
 * Text-to-Speech mit OpenAI TTS API
 *
 * Konvertiert Text zu natürlicher Sprache (Audio).
 * Verwendet OpenAI TTS-1-HD für bessere Qualität.
 *
 * @param {string} text - Text zum Sprechen (max 4096 Zeichen)
 * @param {string} voice - Stimme (alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse)
 * @param {string} model - TTS Model (tts-1 oder tts-1-hd)
 * @param {string} format - Audio Format (mp3, opus, aac, flac, wav, pcm)
 *
 * @returns {Object} { success: true, audio: base64String, format: string }
 *
 * Models:
 * - tts-1: Standard Qualität ($15/1M Zeichen)
 * - tts-1-hd: Höhere Qualität ($30/1M Zeichen)
 *
 * Beste Stimmen für Deutsch:
 * - fable: Ausdrucksvoll, warm
 * - nova: Klar, freundlich
 *
 * Limits:
 * - Max 4096 Zeichen pro Request
 * - Rate Limit: 50 requests/min (Standard)
 */
exports.synthesizeSpeech = functions
    .region("europe-west3") // DSGVO compliance
    .runWith({
      secrets: [openaiApiKey], // Bind OpenAI API Key from Secret Manager
      timeoutSeconds: 30,
      memory: "512MB"
    })
    .https
    .onCall(async (data, context) => {
      const startTime = Date.now();

      try {
        console.log("🔊 synthesizeSpeech called");

        // ============================================
        // 1. VALIDATION
        // ============================================

        const {
          text,
          voice = "fable", // Default: Beste Stimme für Deutsch
          model = "tts-1-hd", // Default: HD Qualität
          format = "mp3", // Default: MP3 (beste Browser-Kompatibilität)
          werkstatt = "mosbach"
        } = data;

        const userId = context.auth?.uid || "anonym";

        // Validate text
        if (!text || typeof text !== "string" || text.trim() === "") {
          throw new functions.https.HttpsError("invalid-argument", "Text ist erforderlich");
        }

        // Validate text length (OpenAI limit: 4096 characters)
        if (text.length > 4096) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Text zu lang (${text.length} Zeichen). Maximum: 4096 Zeichen. Bitte kürzen Sie den Text.`
          );
        }

        // Validate voice
        const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "ballad", "coral", "sage", "verse"];
        if (!validVoices.includes(voice)) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Ungültige Stimme: ${voice}. Erlaubt: ${validVoices.join(", ")}`
          );
        }

        // Validate model
        const validModels = ["tts-1", "tts-1-hd"];
        if (!validModels.includes(model)) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Ungültiges Model: ${model}. Erlaubt: ${validModels.join(", ")}`
          );
        }

        // Validate format
        const validFormats = ["mp3", "opus", "aac", "flac", "wav", "pcm"];
        if (!validFormats.includes(format)) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Ungültiges Format: ${format}. Erlaubt: ${validFormats.join(", ")}`
          );
        }

        console.log(`✅ Validation passed: ${text.length} chars, voice=${voice}, model=${model}, format=${format}`);

        // ============================================
        // RATE LIMIT CHECK (Bug #2 Phase 2)
        // ============================================
        const rateLimitResult = await rateLimiter.checkAndIncrementRateLimit(
          userId,
          werkstatt,
          'tts'
        );

        if (!rateLimitResult.allowed) {
          const resetTime = rateLimitResult.resetAt.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit'
          });

          throw new functions.https.HttpsError(
            'resource-exhausted',
            `Tageslimit für Text-to-Speech erreicht (${rateLimitResult.limit} Anfragen/Tag). ` +
            `Bitte versuchen Sie es morgen wieder ab ${resetTime} Uhr.`
          );
        }

        console.log(`✅ Rate limit check passed: ${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`);

        // ============================================
        // 2. INITIALIZE OPENAI
        // ============================================

        const apiKey = getOpenAIApiKey();
        if (!apiKey) {
          throw new functions.https.HttpsError("internal", "OpenAI API Key nicht verfügbar");
        }

        const openai = new OpenAI({ apiKey });
        console.log("✅ OpenAI initialized");

        // ============================================
        // 3. CALL OPENAI TTS API
        // ============================================

        console.log(`🚀 Calling OpenAI TTS API (model: ${model}, voice: ${voice})...`);

        const response = await openai.audio.speech.create({
          model: model,
          voice: voice,
          input: text,
          response_format: format
        });

        console.log("✅ TTS API response received");

        // ============================================
        // 4. CONVERT AUDIO TO BASE64
        // ============================================

        // response.body is a ReadableStream
        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        const audioSizeMB = (audioBuffer.byteLength / (1024 * 1024)).toFixed(2);
        console.log(`📦 Audio generated: ${audioSizeMB} MB (${format})`);

        // ============================================
        // 5. RETURN RESULT
        // ============================================

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ synthesizeSpeech completed in ${duration}s`);

        return {
          success: true,
          audio: audioBase64,
          format: format,
          voice: voice,
          model: model,
          textLength: text.length,
          audioSizeBytes: audioBuffer.byteLength,
          duration: parseFloat(duration)
        };

      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ synthesizeSpeech failed after ${duration}s:`, error);

        // Log error details
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          status: error.status,
          type: error.type
        });

        // Return user-friendly error
        if (error.message.includes("Text zu lang")) {
          throw error; // Re-throw length error as-is
        }

        if (error.message.includes("Ungültige")) {
          throw error; // Re-throw validation errors as-is
        }

        // Handle OpenAI API errors
        if (error.status === 429) {
          throw new functions.https.HttpsError(
              "resource-exhausted",
              "Zu viele Anfragen. Bitte warten Sie einen Moment."
          );
        }

        if (error.status === 401) {
          throw new functions.https.HttpsError(
              "permission-denied",
              "OpenAI API Key ungültig"
          );
        }

        throw new functions.https.HttpsError("internal", `TTS Fehler: ${error.message}`);
      }
    });

// ============================================
// FUNCTION 7: CREATE MITARBEITER NOTIFICATIONS
// ============================================

/**
 * Triggered when a new vehicle is created - sends notifications to all employees of the workshop
 *
 * Trigger: firestore.document('fahrzeuge_{werkstatt}/{fahrzeugId}').onCreate()
 *
 * Creates notification documents in mitarbeiterNotifications_{werkstatt} for each employee
 */
exports.createMitarbeiterNotifications = functions
    .region("europe-west3")
    .firestore
    .document("{collectionId}/{fahrzeugId}")
    .onCreate(async (snap, context) => {
      try {
        const collectionId = context.params.collectionId;

        // Only trigger for fahrzeuge_* collections
        if (!collectionId.startsWith("fahrzeuge_")) {
          console.log(`⏭️  Skipping collection: ${collectionId}`);
          return null;
        }

        // Extract werkstatt from collection name (fahrzeuge_mosbach → mosbach)
        const werkstatt = collectionId.replace("fahrzeuge_", "");

        const fahrzeug = snap.data();
        const fahrzeugId = context.params.fahrzeugId;

        console.log(`🔔 Creating notifications for new vehicle: ${fahrzeug.kennzeichen} (Werkstatt: ${werkstatt})`);

        // 1. Get all employees of this workshop
        const mitarbeiterRef = admin.firestore().collection(`mitarbeiter_${werkstatt}`);
        const mitarbeiterSnapshot = await mitarbeiterRef.get();

        if (mitarbeiterSnapshot.empty) {
          console.log(`⚠️ No employees found for werkstatt ${werkstatt}`);
          return null;
        }

        console.log(`👥 Found ${mitarbeiterSnapshot.size} employees`);

        // 2. Create notification for each employee (batch write for performance)
        const batch = admin.firestore().batch();
        let notificationCount = 0;

        mitarbeiterSnapshot.docs.forEach((doc) => {
          const mitarbeiter = doc.data();
          const notificationRef = admin.firestore()
              .collection(`mitarbeiterNotifications_${werkstatt}`)
              .doc();

          // Determine priority based on service type
          let priority = "normal";
          if (fahrzeug.serviceTyp === "versicherung") priority = "high";
          if (fahrzeug.serviceTyp === "tuev") priority = "high";

          // Create sprachausgabe text
          const sprachausgabe = `Neue ${getServiceLabel(fahrzeug.serviceTyp)} Anfrage eingegangen. ` +
            `${fahrzeug.partnerName || "Kunde"} hat ein ${fahrzeug.marke} ${fahrzeug.modell} angemeldet.`;

          batch.set(notificationRef, {
            mitarbeiterId: doc.id,
            type: "neue_anfrage",
            title: `Neue Anfrage von ${fahrzeug.partnerName || "Kunde"}`,
            message: `${fahrzeug.marke} ${fahrzeug.modell} (${fahrzeug.kennzeichen})`,
            fahrzeugId: fahrzeugId,
            serviceTyp: fahrzeug.serviceTyp || "lackier",
            status: "unread",
            priority: priority,
            sprachausgabe: sprachausgabe,
            createdAt: admin.firestore.Timestamp.now(),
            readAt: null,
          });

          notificationCount++;
        });

        // 3. Commit batch write
        await batch.commit();

        console.log(`✅ Created ${notificationCount} notifications for vehicle ${fahrzeug.kennzeichen}`);

        return {success: true, notificationCount};
      } catch (error) {
        console.error("❌ Error creating notifications:", error);
        // Don't throw - we don't want to block vehicle creation if notifications fail
        return {success: false, error: error.message};
      }
    });

// ============================================
// FUNCTION 8: FAHRZEUG STATUS CHANGED
// ============================================

/**
 * Triggered when vehicle status changes - sends notifications when vehicle is ready for pickup
 *
 * Trigger: firestore.document('fahrzeuge_{werkstatt}/{fahrzeugId}').onUpdate()
 *
 * Sends notification to employees when:
 * - Status changes to 'bereit_abnahme' (ready for pickup)
 * - Status changes to 'fertig' (completed)
 */
exports.fahrzeugStatusChanged = functions
    .region("europe-west3")
    .firestore
    .document("{collectionId}/{fahrzeugId}")
    .onUpdate(async (change, context) => {
      try {
        const collectionId = context.params.collectionId;

        // Only trigger for fahrzeuge_* collections
        if (!collectionId.startsWith("fahrzeuge_")) {
          console.log(`⏭️  Skipping collection: ${collectionId}`);
          return null;
        }

        // Extract werkstatt from collection name (fahrzeuge_mosbach → mosbach)
        const werkstatt = collectionId.replace("fahrzeuge_", "");

        const before = change.before.data();
        const after = change.after.data();
        const fahrzeugId = context.params.fahrzeugId;

        // Check if status changed to bereit_abnahme or fertig
        const notifyStatuses = ["bereit_abnahme", "fertig"];
        const statusChanged = before.status !== after.status;
        const shouldNotify = statusChanged && notifyStatuses.includes(after.status);

        if (!shouldNotify) {
          return null; // No notification needed
        }

        console.log(`🔔 Vehicle ${after.kennzeichen} status changed: ${before.status} → ${after.status}`);

        // Get all employees of this workshop
        const mitarbeiterRef = admin.firestore().collection(`mitarbeiter_${werkstatt}`);
        const mitarbeiterSnapshot = await mitarbeiterRef.get();

        if (mitarbeiterSnapshot.empty) {
          console.log(`⚠️ No employees found for werkstatt ${werkstatt}`);
          return null;
        }

        // Create notification for each employee
        const batch = admin.firestore().batch();
        let notificationCount = 0;

        mitarbeiterSnapshot.docs.forEach((doc) => {
          const notificationRef = admin.firestore()
              .collection(`mitarbeiterNotifications_${werkstatt}`)
              .doc();

          // Determine notification text based on status
          let title, message, sprachausgabe, type;

          if (after.status === "bereit_abnahme") {
            title = `Fahrzeug bereit zur Abnahme`;
            message = `${after.marke} ${after.modell} (${after.kennzeichen})`;
            sprachausgabe = `Fahrzeug ${after.marke} ${after.modell} ist bereit zur Abnahme. ` +
              `Kunde ${after.partnerName || "unbekannt"} kann benachrichtigt werden.`;
            type = "fahrzeug_bereit";
          } else { // fertig
            title = `Fahrzeug fertiggestellt`;
            message = `${after.marke} ${after.modell} (${after.kennzeichen})`;
            sprachausgabe = `Fahrzeug ${after.marke} ${after.modell} wurde fertiggestellt.`;
            type = "fahrzeug_fertig";
          }

          batch.set(notificationRef, {
            mitarbeiterId: doc.id,
            type: type,
            title: title,
            message: message,
            fahrzeugId: fahrzeugId,
            serviceTyp: after.serviceTyp || "lackier",
            status: "unread",
            priority: "high", // Status changes are high priority
            sprachausgabe: sprachausgabe,
            createdAt: admin.firestore.Timestamp.now(),
            readAt: null,
          });

          notificationCount++;
        });

        await batch.commit();

        console.log(`✅ Created ${notificationCount} notifications for status change: ${after.status}`);

        return {success: true, notificationCount};
      } catch (error) {
        console.error("❌ Error creating status change notifications:", error);
        return {success: false, error: error.message};
      }
    });

// ============================================
// FUNCTION 9: MATERIAL ORDER OVERDUE (Scheduled)
// ============================================

/**
 * Scheduled function (runs daily) - sends notifications for overdue material orders
 *
 * Schedule: Every day at 9 AM (Europe/Berlin timezone)
 *
 * Checks materialRequests_{werkstatt} collections for orders with:
 * - status: 'bestellt' (ordered)
 * - liefertermin < today
 *
 * Sends notifications to employees of the affected workshop
 */
exports.materialOrderOverdue = functions
    .region("europe-west3")
    .pubsub
    .schedule("0 9 * * *") // Every day at 9 AM
    .timeZone("Europe/Berlin")
    .onRun(async (context) => {
      try {
        console.log("🔔 Running daily material order check...");

        const db = admin.firestore();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

        // ✅ BUG #8 FIX: Get all werkstätten dynamically
        const werkstaetten = await getActiveWerkstaetten();
        if (werkstaetten.length === 0) {
          console.log("⚠️ No active werkstätten found - skipping check");
          return { success: true, totalNotifications: 0 };
        }

        let totalNotifications = 0;

        for (const werkstatt of werkstaetten) {
          console.log(`📦 Checking material orders for werkstatt: ${werkstatt}`);

          // Query overdue material requests
          const materialRef = db.collection(`materialRequests_${werkstatt}`);
          const overdueSnapshot = await materialRef
              .where("status", "==", "bestellt")
              .where("liefertermin", "<", todayTimestamp)
              .get();

          if (overdueSnapshot.empty) {
            console.log(`✅ No overdue orders for ${werkstatt}`);
            continue;
          }

          console.log(`⚠️ Found ${overdueSnapshot.size} overdue orders for ${werkstatt}`);

          // Get all employees of this workshop
          const mitarbeiterRef = db.collection(`mitarbeiter_${werkstatt}`);
          const mitarbeiterSnapshot = await mitarbeiterRef.get();

          if (mitarbeiterSnapshot.empty) {
            console.log(`⚠️ No employees found for werkstatt ${werkstatt}`);
            continue;
          }

          // Create notifications for each employee
          const batch = db.batch();
          let notificationCount = 0;

          overdueSnapshot.docs.forEach((orderDoc) => {
            const order = orderDoc.data();

            mitarbeiterSnapshot.docs.forEach((mitarbeiterDoc) => {
              const notificationRef = db
                  .collection(`mitarbeiterNotifications_${werkstatt}`)
                  .doc();

              const daysOverdue = Math.floor(
                  (today - order.liefertermin.toDate()) / (1000 * 60 * 60 * 24)
              );

              const sprachausgabe = `Material-Bestellung überfällig. ` +
                `${order.artikel || "Artikel unbekannt"} hätte vor ${daysOverdue} Tagen geliefert werden sollen.`;

              batch.set(notificationRef, {
                mitarbeiterId: mitarbeiterDoc.id,
                type: "material_overdue",
                title: `Material-Bestellung überfällig`,
                message: `${order.artikel || "Artikel"} (${daysOverdue} Tage überfällig)`,
                materialRequestId: orderDoc.id,
                status: "unread",
                priority: "urgent", // Overdue orders are urgent
                sprachausgabe: sprachausgabe,
                createdAt: admin.firestore.Timestamp.now(),
                readAt: null,
              });

              notificationCount++;
            });
          });

          await batch.commit();
          totalNotifications += notificationCount;

          console.log(`✅ Created ${notificationCount} notifications for ${werkstatt}`);
        }

        console.log(`✅ Material order check complete. Total notifications: ${totalNotifications}`);

        return {success: true, totalNotifications};
      } catch (error) {
        console.error("❌ Error checking overdue material orders:", error);
        return {success: false, error: error.message};
      }
    });

// ============================================
// FUNCTION 10: SET PARTNER CUSTOM CLAIMS
// ============================================

/**
 * Sets custom claims for partner users after successful authentication
 *
 * Called from partner-app/index.html after Firebase Auth login
 *
 * Sets custom claims:
 * - role: 'partner'
 * - partnerId: email username (e.g. 'marcel' from marcel@test.de)
 * - werkstattId: werkstatt location (e.g. 'mosbach')
 *
 * Request:
 * {
 *   uid: "firebase_user_id",
 *   email: "marcel@test.de",
 *   werkstattId: "mosbach" (optional, defaults to 'mosbach')
 * }
 *
 * Response:
 * {
 *   success: true,
 *   claims: { role: 'partner', partnerId: 'marcel', werkstattId: 'mosbach' }
 * }
 */
exports.setPartnerClaims = functions
    .region("europe-west3")
    .https
    .onCall(async (data, context) => {
      try {
        // Require authentication
        if (!context.auth) {
          throw new functions.https.HttpsError(
              "unauthenticated",
              "User muss eingeloggt sein"
          );
        }

        const { uid, email, werkstattId = "mosbach" } = data;

        // Validation
        if (!uid) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "uid ist erforderlich"
          );
        }

        if (!email) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "email ist erforderlich"
          );
        }

        // Ensure user is setting claims for themselves (security)
        if (context.auth.uid !== uid) {
          throw new functions.https.HttpsError(
              "permission-denied",
              "User kann nur eigene Claims setzen"
          );
        }

        console.log(`🔐 Setting partner claims for user ${uid} (${email})`);

        // Extract partnerId from email
        const partnerId = email.split("@")[0]; // "marcel@test.de" → "marcel"

        // Set custom claims
        const claims = {
          role: "partner",
          partnerId: partnerId,
          werkstattId: werkstattId
        };

        await admin.auth().setCustomUserClaims(uid, claims);

        console.log(`✅ Custom claims set for ${email}:`, claims);

        // Update users collection (if exists)
        try {
          const userDocRef = admin.firestore().collection("users").doc(uid);
          const userDoc = await userDocRef.get();

          if (userDoc.exists) {
            await userDocRef.update({
              role: "partner",
              werkstattId: werkstattId,
              customClaimsSet: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Updated users collection for ${uid}`);
          }
        } catch (updateError) {
          console.warn("⚠️ Could not update users collection:", updateError.message);
          // Non-critical error, continue
        }

        return {
          success: true,
          claims: claims,
          message: "Custom Claims erfolgreich gesetzt"
        };

      } catch (error) {
        console.error("❌ setPartnerClaims error:", error);

        // Return user-friendly error
        if (error instanceof functions.https.HttpsError) {
          throw error; // Re-throw HttpsError as-is
        }

        throw new functions.https.HttpsError(
            "internal",
            `Fehler beim Setzen der Claims: ${error.message}`
        );
      }
    });

// ============================================
// SET WERKSTATT CUSTOM CLAIMS
// 🆕 PHASE 2.4: Custom Claims für Werkstatt Users
// ============================================
/**
 * Set Custom Claims for Werkstatt Users
 * Similar to setPartnerClaims but for werkstatt role
 *
 * Request:
 * {
 *   uid: "firebase_user_id",
 *   email: "werkstatt-mosbach@auto-lackierzentrum.de",
 *   werkstattId: "mosbach" (optional, default: extracted from email or "mosbach")
 * }
 *
 * Response:
 * {
 *   success: true,
 *   claims: { role: 'werkstatt', werkstattId: 'mosbach' },
 *   message: "Custom Claims erfolgreich gesetzt"
 * }
 */
exports.setWerkstattClaims = functions
    .region("europe-west3")
    .https
    .onCall(async (data, context) => {
      try {
        // Require authentication
        if (!context.auth) {
          throw new functions.https.HttpsError(
              "unauthenticated",
              "User muss eingeloggt sein"
          );
        }

        const { uid, email, werkstattId } = data;

        // Validation
        if (!uid) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "uid ist erforderlich"
          );
        }

        if (!email) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "email ist erforderlich"
          );
        }

        // Ensure user is setting claims for themselves (security)
        if (context.auth.uid !== uid) {
          throw new functions.https.HttpsError(
              "permission-denied",
              "User kann nur eigene Claims setzen"
          );
        }

        console.log(`🔐 Setting werkstatt claims for user ${uid} (${email})`);

        // Extract werkstattId from email if not provided
        // "werkstatt-mosbach@..." → "mosbach"
        let finalWerkstattId = werkstattId;
        if (!finalWerkstattId && email.includes("werkstatt-")) {
          const parts = email.split("@")[0].split("-"); // werkstatt-mosbach
          if (parts.length > 1) {
            finalWerkstattId = parts[1]; // mosbach
          }
        }

        // Fallback to "mosbach" if still not set
        if (!finalWerkstattId) {
          finalWerkstattId = "mosbach";
        }

        // 🛡️ SECURITY: Whitelist valid werkstattIds (Defense-in-Depth)
        const VALID_WERKSTATT_IDS = ["mosbach", "heidelberg", "mannheim", "karlsruhe"];
        if (!VALID_WERKSTATT_IDS.includes(finalWerkstattId)) {
          console.warn(`⚠️ Invalid werkstattId attempted: ${finalWerkstattId} - falling back to mosbach`);
          finalWerkstattId = "mosbach";
        }

        // Set custom claims
        const claims = {
          role: "werkstatt",
          werkstattId: finalWerkstattId
        };

        await admin.auth().setCustomUserClaims(uid, claims);

        console.log(`✅ Custom claims set for ${email}:`, claims);

        // Update users collection (if exists)
        try {
          const userDocRef = admin.firestore().collection("users").doc(uid);
          const userDoc = await userDocRef.get();

          if (userDoc.exists) {
            await userDocRef.update({
              role: "werkstatt",
              werkstattId: finalWerkstattId,
              customClaimsSet: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Updated users collection for ${uid}`);
          }
        } catch (updateError) {
          console.warn("⚠️ Could not update users collection:", updateError.message);
          // Non-critical error, continue
        }

        return {
          success: true,
          claims: claims,
          message: "Custom Claims erfolgreich gesetzt"
        };

      } catch (error) {
        console.error("❌ setWerkstattClaims error:", error);

        // Return user-friendly error
        if (error instanceof functions.https.HttpsError) {
          throw error; // Re-throw HttpsError as-is
        }

        throw new functions.https.HttpsError(
            "internal",
            `Fehler beim Setzen der Claims: ${error.message}`
        );
      }
    });

/**
 * FUNCTION: setMitarbeiterClaims
 *
 * Sets custom claims for a Mitarbeiter (employee) after Stage 2 login
 * Must be called by a logged-in Werkstatt user after Mitarbeiter validates password
 *
 * @param {string} mitarbeiterId - Employee ID from Firestore
 * @param {string} werkstattId - Workshop ID (e.g. "mosbach")
 * @returns {object} { success, claims, message }
 */
exports.setMitarbeiterClaims = functions
    .region("europe-west3")
    .https
    .onCall(async (data, context) => {
      try {
        // Require authentication (Werkstatt must be logged in)
        if (!context.auth) {
          throw new functions.https.HttpsError(
              "unauthenticated",
              "Werkstatt muss eingeloggt sein"
          );
        }

        const { mitarbeiterId, werkstattId } = data;

        // Validation
        if (!mitarbeiterId) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "mitarbeiterId ist erforderlich"
          );
        }

        if (!werkstattId) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "werkstattId ist erforderlich"
          );
        }

        // Security: Only werkstatt role can set mitarbeiter claims
        if (!context.auth.token || context.auth.token.role !== "werkstatt") {
          throw new functions.https.HttpsError(
              "permission-denied",
              "Nur Werkstatt kann Mitarbeiter-Claims setzen"
          );
        }

        // Security: werkstattId in claims must match requested werkstattId
        if (context.auth.token.werkstattId !== werkstattId) {
          throw new functions.https.HttpsError(
              "permission-denied",
              "Werkstatt kann nur Claims für eigene Mitarbeiter setzen"
          );
        }

        console.log(`🔐 Setting mitarbeiter claims for user ${context.auth.uid}`);
        console.log(`   MitarbeiterId: ${mitarbeiterId}, WerkstattId: ${werkstattId}`);

        // Verify mitarbeiter exists in Firestore
        const mitarbeiterRef = admin.firestore()
            .collection(`mitarbeiter_${werkstattId}`)
            .doc(mitarbeiterId);

        const mitarbeiterDoc = await mitarbeiterRef.get();

        if (!mitarbeiterDoc.exists) {
          throw new functions.https.HttpsError(
              "not-found",
              `Mitarbeiter ${mitarbeiterId} nicht gefunden in Werkstatt ${werkstattId}`
          );
        }

        const mitarbeiterData = mitarbeiterDoc.data();

        // Security: Check if mitarbeiter is active
        if (mitarbeiterData.status !== "active") {
          throw new functions.https.HttpsError(
              "permission-denied",
              "Mitarbeiter ist nicht aktiv"
          );
        }

        // Set custom claims for the WERKSTATT user (not mitarbeiter)
        // IMPORTANT: Keep role="werkstatt" so admin permissions stay intact
        // Add selectedMitarbeiterId to indicate which employee is selected
        const claims = {
          role: "werkstatt",
          werkstattId: werkstattId,
          selectedMitarbeiterId: mitarbeiterId,
          selectedMitarbeiterName: mitarbeiterData.name || "Unbekannt"
        };

        await admin.auth().setCustomUserClaims(context.auth.uid, claims);

        console.log(`✅ Custom claims set for ${context.auth.uid}:`, claims);

        return {
          success: true,
          claims: claims,
          message: "Mitarbeiter-Claims erfolgreich gesetzt"
        };

      } catch (error) {
        console.error("❌ setMitarbeiterClaims error:", error);

        // Return user-friendly error
        if (error instanceof functions.https.HttpsError) {
          throw error; // Re-throw HttpsError as-is
        }

        throw new functions.https.HttpsError(
            "internal",
            `Fehler beim Setzen der Mitarbeiter-Claims: ${error.message}`
        );
      }
    });

// ============================================
// PARTNER AUTO-LOGIN FUNCTIONS (QR-Code Feature)
// ============================================

/**
 * FUNCTION: ensurePartnerAccount
 *
 * Ensures a partner account exists (create if new, return if existing)
 * Used when generating PDF with QR-Code for customer
 *
 * @param {string} email - Partner email
 * @param {string} name - Customer name (also accepts legacy 'kundenname')
 * @param {string} werkstattId - Workshop ID (default: "mosbach")
 * @returns {object} { partnerId, email, generatedPassword | null, isNewPartner }
 */
exports.ensurePartnerAccount = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔐 ensurePartnerAccount called");

      // Validate input
      // Support both 'name' (new) and 'kundenname' (legacy) for backward compatibility
      const { email, name, kundenname, werkstattId = "mosbach" } = data;
      const finalName = name || kundenname;

      if (!email || !finalName) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Email und Kundenname erforderlich"
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Ungültiges Email-Format"
        );
      }

      try {
        // partnerId = email username (part before @)
        const partnerId = email.split("@")[0].toLowerCase();

        console.log(`🔍 Checking if partner exists: ${email}`);

        // Check if Firebase Auth user exists
        let userRecord = null;
        let isNewPartner = false;
        let generatedPassword = null;

        try {
          userRecord = await admin.auth().getUserByEmail(email);
          console.log(`✅ Partner exists: ${email} (UID: ${userRecord.uid})`);
          isNewPartner = false;
        } catch (error) {
          if (error.code === "auth/user-not-found") {
            console.log(`🆕 Partner does not exist, creating: ${email}`);
            isNewPartner = true;

            // Generate secure password (12 characters)
            const passwordChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
            generatedPassword = Array.from(crypto.randomBytes(12))
                .map((byte) => passwordChars[byte % passwordChars.length])
                .join("");

            // Create Firebase Auth user
            userRecord = await admin.auth().createUser({
              email: email,
              password: generatedPassword,
              emailVerified: false,
              displayName: finalName
            });

            console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);

            // Set custom claims for partner
            const claims = {
              role: "partner",
              partnerId: partnerId,
              werkstattId: werkstattId
            };
            await admin.auth().setCustomUserClaims(userRecord.uid, claims);
            console.log(`✅ Custom claims set for ${email}:`, claims);

            // 🆕 PHASE 2: Create users/{uid} document for Partner
            const userData = {
              uid: userRecord.uid,
              email: email,
              name: finalName,
              role: "partner",
              status: "active", // Partners start active
              partnerId: partnerId,
              werkstattId: werkstattId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastLogin: null
            };
            await db.collection("users").doc(userRecord.uid).set(userData);
            console.log(`✅ Firestore users document created: users/${userRecord.uid}`);

            // Create Firestore partner document
            const partnerData = {
              id: partnerId,
              email: email,
              name: finalName,
              werkstattId: werkstattId,
              uid: userRecord.uid,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              bonusPunkte: 0,
              status: "active",
              // ✅ FIX: Add password change fields to GLOBAL collection too
              initialPassword: generatedPassword,
              requiresPasswordChange: true
            };

            // Write to GLOBAL collection
            await db.collection("partner").doc(partnerId).set(partnerData);
            console.log(`✅ Firestore partner document created (global): ${partnerId}`);

            // 🆕 ALSO write to MULTI-TENANT collection (partners_{werkstattId})
            const werkstattCollection = `partners_${werkstattId}`;
            const multiTenantData = {
              ...partnerData,
              initialPassword: generatedPassword, // Store initial password temporarily
              requiresPasswordChange: true, // Force password change on first login
              accountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
              accountCreatedBy: "system"
            };
            await db.collection(werkstattCollection).doc(partnerId).set(multiTenantData, {merge: true});
            console.log(`✅ Firestore partner document created (multi-tenant): ${werkstattCollection}/${partnerId}`);
          } else {
            throw error; // Re-throw if not "user-not-found"
          }
        }

        // Ensure Firestore partner document exists (even for existing users)
        const partnerDocRef = db.collection("partner").doc(partnerId);
        const partnerDoc = await partnerDocRef.get();

        if (!partnerDoc.exists && !isNewPartner) {
          // Edge case: Firebase Auth user exists but Firestore doc missing
          console.warn(`⚠️ Creating missing Firestore doc for existing user: ${partnerId}`);
          const edgeCaseData = {
            id: partnerId,
            email: email,
            name: finalName, // FIX: Bug #6b - Use finalName instead of kundenname (Nov 22, 2025)
            werkstattId: werkstattId,
            uid: userRecord.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            bonusPunkte: 0,
            status: "active"
          };
          // Write to global collection
          await partnerDocRef.set(edgeCaseData);
          // 🆕 ALSO write to multi-tenant collection
          const werkstattCollection = `partners_${werkstattId}`;
          await db.collection(werkstattCollection).doc(partnerId).set(edgeCaseData, {merge: true});
          console.log(`✅ Edge case: Created docs in both collections for ${partnerId}`);

          // 🆕 PHASE 2: Also create users/{uid} for edge case
          const edgeCaseUserData = {
            uid: userRecord.uid,
            email: email,
            name: finalName, // FIX: Bug #6b - Use finalName instead of kundenname (Nov 22, 2025)
            role: "partner",
            status: "active",
            partnerId: partnerId,
            werkstattId: werkstattId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: null
          };
          await db.collection("users").doc(userRecord.uid).set(edgeCaseUserData, {merge: true});
          console.log(`✅ Edge case: Created users/${userRecord.uid} document`);
        }

        // 🆕 FIX: Ensure users/{uid} exists for ALL partners (new + existing)
        // This catches the case where:
        // - Firebase Auth exists ✅
        // - Custom Claims exist ✅
        // - partners_mosbach exists ✅
        // - BUT users/{uid} is missing ❌
        const userDocRef = db.collection("users").doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          console.warn(`⚠️ Creating missing users/${userRecord.uid} for existing partner ${partnerId}`);
          const missingUserData = {
            uid: userRecord.uid,
            email: email,
            name: finalName, // FIX: Bug #6b - Use finalName instead of kundenname (Nov 22, 2025)
            role: "partner",
            status: "active",
            partnerId: partnerId,
            werkstattId: werkstattId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: null
          };
          await userDocRef.set(missingUserData, {merge: true});
          console.log(`✅ Created missing users/${userRecord.uid} document`);
        } else {
          console.log(`✅ users/${userRecord.uid} already exists`);
        }

        return {
          partnerId: partnerId,
          email: email,
          generatedPassword: generatedPassword, // null if existing partner
          isNewPartner: isNewPartner,
          requiresPasswordChange: isNewPartner, // 🆕 Added
          message: isNewPartner ? "Partner erstellt" : "Partner existiert bereits"
        };
      } catch (error) {
        console.error("❌ ensurePartnerAccount error:", error);
        throw new functions.https.HttpsError(
            "internal",
            `Fehler beim Erstellen des Partner-Accounts: ${error.message}`
        );
      }
    });

/**
 * FUNCTION: createPartnerAutoLoginToken
 *
 * Creates a secure auto-login token for partner
 * Token is valid for 30 days and stored in Firestore
 *
 * @param {string} email - Partner email (will extract partnerId from username) - also accepts 'partnerId' directly
 * @param {string} werkstattId - Workshop ID (default: "mosbach")
 * @param {string} fahrzeugId - Optional: Specific vehicle ID
 * @param {number} expiresInDays - Token expiration (default: 30)
 * @returns {object} { token, loginUrl, expiresAt }
 */
exports.createPartnerAutoLoginToken = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔑 createPartnerAutoLoginToken called");

      // ✅ SECURITY: Authentication check - only werkstatt accounts can create tokens
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Authentifizierung erforderlich"
        );
      }

      const userRole = context.auth.token.role;
      const allowedRoles = ["werkstatt", "admin", "owner", "superadmin"];
      if (!allowedRoles.includes(userRole)) {
        throw new functions.https.HttpsError(
            "permission-denied",
            `Keine Berechtigung. Rolle '${userRole}' darf keine Tokens erstellen.`
        );
      }

      console.log(`✅ Auth check passed - Role: ${userRole}`);

      // Validate input - Support both 'email' and 'partnerId' for backward compatibility
      const { email, partnerId, werkstattId = "mosbach", fahrzeugId = null, expiresInDays = 30 } = data;
      const finalPartnerId = partnerId || (email ? email.split('@')[0] : null);

      if (!finalPartnerId || !werkstattId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "partnerId (or email) und werkstattId erforderlich"
        );
      }

      try {
        // Generate secure random token (32 characters hex)
        const token = crypto.randomBytes(16).toString("hex");

        // Calculate expiration date
        const now = Date.now();
        const expiresAt = new Date(now + (expiresInDays * 24 * 60 * 60 * 1000));

        // Store token in Firestore
        const tokenData = {
          partnerId: finalPartnerId,
          werkstattId: werkstattId,
          fahrzeugId: fahrzeugId,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(now)),
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          usedAt: null,
          usedCount: 0,
          maxUses: 10 // ✅ SECURITY: Limited reuse (was 999) - reduces risk if PDF is leaked
        };

        await db.collection("partnerAutoLoginTokens").doc(token).set(tokenData);

        console.log(`✅ Auto-login token created: ${token.substring(0, 8)}... (expires: ${expiresAt.toISOString()})`);

        // Generate login URL
        const baseUrl = "https://marcelgaertner1234.github.io/Lackiererei1";
        const loginUrl = `${baseUrl}/partner-app/auto-login.html?token=${token}`;

        return {
          token: token,
          loginUrl: loginUrl,
          expiresAt: expiresAt.toISOString(),
          message: "Auto-Login Token erstellt"
        };
      } catch (error) {
        console.error("❌ createPartnerAutoLoginToken error:", error);
        throw new functions.https.HttpsError(
            "internal",
            `Fehler beim Erstellen des Tokens: ${error.message}`
        );
      }
    });

/**
 * FUNCTION: validatePartnerAutoLoginToken
 *
 * Validates auto-login token and creates Firebase custom token
 * Used by auto-login.html to authenticate partner
 *
 * @param {string} token - Auto-login token from QR code
 * @returns {object} { valid, partnerId, werkstattId, customToken, fahrzeugId }
 */
exports.validatePartnerAutoLoginToken = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔍 validatePartnerAutoLoginToken called");

      // Validate input
      const { token } = data;

      if (!token || token.length !== 32) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Ungültiger Token"
        );
      }

      try {
        // Load token from Firestore
        const tokenDocRef = db.collection("partnerAutoLoginTokens").doc(token);
        const tokenDoc = await tokenDocRef.get();

        if (!tokenDoc.exists) {
          console.warn(`⚠️ Token not found: ${token.substring(0, 8)}...`);
          throw new functions.https.HttpsError(
              "not-found",
              "QR-Code ungültig oder bereits verwendet"
          );
        }

        const tokenData = tokenDoc.data();

        // Validation 1: Check expiration
        const now = Date.now();
        const expiresAt = tokenData.expiresAt.toMillis();

        if (now > expiresAt) {
          console.warn(`⚠️ Token expired: ${token.substring(0, 8)}... (expired: ${new Date(expiresAt).toISOString()})`);
          throw new functions.https.HttpsError(
              "deadline-exceeded",
              "QR-Code abgelaufen (30 Tage). Bitte neues PDF anfordern."
          );
        }

        // Validation 2: Check usage limit
        if (tokenData.usedCount >= tokenData.maxUses) {
          console.warn(`⚠️ Token usage limit reached: ${token.substring(0, 8)}...`);
          throw new functions.https.HttpsError(
              "resource-exhausted",
              "QR-Code wurde zu oft verwendet"
          );
        }

        // Get partner user
        const partnerId = tokenData.partnerId;
        const partnerEmail = `${partnerId}@`; // Need to construct full email

        // Load partner document to get full email
        const partnerDocRef = db.collection("partner").doc(partnerId);
        const partnerDoc = await partnerDocRef.get();

        if (!partnerDoc.exists) {
          throw new functions.https.HttpsError(
              "not-found",
              "Partner-Account nicht gefunden"
          );
        }

        const partnerData = partnerDoc.data();
        const fullEmail = partnerData.email;

        // Get Firebase Auth user by email
        let userRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(fullEmail);
        } catch (authError) {
          console.error(`❌ Firebase Auth user not found: ${fullEmail}`);
          throw new functions.https.HttpsError(
              "not-found",
              "Partner-Account nicht gefunden in Firebase Auth"
          );
        }

        // Create custom token for authentication
        const customToken = await admin.auth().createCustomToken(userRecord.uid, {
          role: "partner",
          partnerId: partnerId,
          werkstattId: tokenData.werkstattId
        });

        // Update token usage statistics
        await tokenDocRef.update({
          usedCount: admin.firestore.FieldValue.increment(1),
          usedAt: tokenData.usedAt || admin.firestore.Timestamp.now(), // Only set on first use
          lastUsedAt: admin.firestore.Timestamp.now()
        });

        console.log(`✅ Token validated: ${token.substring(0, 8)}... (Partner: ${partnerId}, Uses: ${tokenData.usedCount + 1})`);

        return {
          valid: true,
          partnerId: partnerId,
          email: fullEmail,
          werkstattId: tokenData.werkstattId,
          fahrzeugId: tokenData.fahrzeugId,
          customToken: customToken,
          message: "Token gültig"
        };
      } catch (error) {
        console.error("❌ validatePartnerAutoLoginToken error:", error);

        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
            "internal",
            `Fehler bei der Token-Validierung: ${error.message}`
        );
      }
    });

// ============================================
// SCHEDULED FUNCTION: Monthly Bonus Reset
// ============================================

/**
 * Monthly Bonus Reset - Runs on the 1st of every month at 00:00 (Europe/Berlin)
 *
 * Resets all `bonusErhalten` flags for all partners across all werkstatt instances.
 * This allows partners to earn bonuses EVERY month (recurring incentive system).
 *
 * Cron Schedule: '0 0 1 * *' = 00:00 on the 1st day of every month
 *
 * Implementation: FIX #55 (2025-11-05)
 * User Request: "Monatliche Reset-Bonuses" for recurring partner motivation
 */
exports.monthlyBonusReset = functions.pubsub
    .schedule('0 0 1 * *')  // Runs at 00:00 on the 1st of every month
    .timeZone('Europe/Berlin')
    .onRun(async (context) => {
      console.log('🔄 Starting monthly bonus reset...');

      try {
        // Multi-Tenant: Reset bonuses for ALL werkstatt instances
        // 🔧 FIX Nov 30, 2025: Use dynamic getActiveWerkstaetten() instead of hardcoded list
        const werkstattIds = await getActiveWerkstaetten();
        console.log(`📋 Active werkstätten: ${werkstattIds.join(', ')}`);
        let totalPartnersUpdated = 0;

        for (const werkstattId of werkstattIds) {
          const collectionName = `partners_${werkstattId}`;

          try {
            // Get all partners for this werkstatt
            const partnersRef = db.collection(collectionName);
            const snapshot = await partnersRef.get();

            if (snapshot.empty) {
              console.log(`ℹ️  No partners found in ${collectionName}`);
              continue;
            }

            // Batch update (max 500 operations per batch)
            const batchSize = 500;
            let batch = db.batch();
            let operationCount = 0;

            snapshot.forEach(doc => {
              const data = doc.data();

              // Only reset if partner has rabattKonditionen
              if (data.rabattKonditionen) {
                batch.update(doc.ref, {
                  'rabattKonditionen.stufe1.bonusErhalten': false,
                  'rabattKonditionen.stufe2.bonusErhalten': false,
                  'rabattKonditionen.stufe3.bonusErhalten': false
                });

                operationCount++;
                totalPartnersUpdated++;

                // Commit batch if size limit reached
                if (operationCount >= batchSize) {
                  batch.commit();
                  batch = db.batch();
                  operationCount = 0;
                }
              }
            });

            // Commit remaining operations
            if (operationCount > 0) {
              await batch.commit();
            }

            console.log(`✅ ${collectionName}: ${snapshot.size} partners processed`);
          } catch (error) {
            console.error(`❌ Error resetting bonuses for ${collectionName}:`, error);
            // Continue with next werkstatt even if one fails
          }
        }

        // Create log entry in Firestore
        await db.collection('system_logs').add({
          type: 'bonus_reset',
          action: 'monthly_reset',
          timestamp: admin.firestore.Timestamp.now(),
          partnersUpdated: totalPartnersUpdated,
          success: true,
          message: `✅ Monthly bonus reset completed. ${totalPartnersUpdated} partners updated across all werkstatt instances.`
        });

        console.log(`🎉 Monthly bonus reset completed! ${totalPartnersUpdated} partners updated.`);
        return null;
      } catch (error) {
        console.error('❌ Monthly bonus reset failed:', error);

        // Log failure
        await db.collection('system_logs').add({
          type: 'bonus_reset',
          action: 'monthly_reset',
          timestamp: admin.firestore.Timestamp.now(),
          success: false,
          error: error.message,
          stack: error.stack
        });

        throw error;
      }
    });

// ============================================
// TEST FUNCTION: Manual Bonus Reset Trigger
// ============================================

/**
 * HTTP function to manually trigger bonus reset for testing
 *
 * Usage via curl:
 *   curl https://us-central1-auto-lackierzentrum-mosbach.cloudfunctions.net/testMonthlyBonusReset
 *
 * Or open in browser (GET):
 *   https://us-central1-auto-lackierzentrum-mosbach.cloudfunctions.net/testMonthlyBonusReset
 *
 * Implementation: FIX #55 (Manual test trigger)
 */
exports.testMonthlyBonusReset = functions.https.onRequest(async (req, res) => {
  console.log('🧪 Manual bonus reset test triggered...');

  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    // Multi-Tenant: Reset bonuses for ALL werkstatt instances
    const werkstattIds = ['mosbach', 'heidelberg', 'mannheim', 'test'];
    let totalPartnersUpdated = 0;
    const results = {};

    for (const werkstattId of werkstattIds) {
      const collectionName = `partners_${werkstattId}`;

      try {
        // Get all partners for this werkstatt
        const partnersRef = db.collection(collectionName);
        const snapshot = await partnersRef.get();

        if (snapshot.empty) {
          console.log(`ℹ️  No partners found in ${collectionName}`);
          results[collectionName] = { count: 0, status: 'empty' };
          continue;
        }

        // Batch update
        const batch = db.batch();
        let operationCount = 0;

        snapshot.forEach(doc => {
          const data = doc.data();

          // Only reset if partner has rabattKonditionen
          if (data.rabattKonditionen) {
            batch.update(doc.ref, {
              'rabattKonditionen.stufe1.bonusErhalten': false,
              'rabattKonditionen.stufe2.bonusErhalten': false,
              'rabattKonditionen.stufe3.bonusErhalten': false
            });
            operationCount++;
            totalPartnersUpdated++;
          }
        });

        // Commit batch
        if (operationCount > 0) {
          await batch.commit();
        }

        results[collectionName] = {
          total: snapshot.size,
          updated: operationCount,
          status: 'success'
        };

        console.log(`✅ ${collectionName}: ${operationCount}/${snapshot.size} partners updated`);
      } catch (error) {
        console.error(`❌ Error resetting bonuses for ${collectionName}:`, error);
        results[collectionName] = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Create log entry
    await db.collection('system_logs').add({
      type: 'bonus_reset',
      action: 'manual_test',
      timestamp: admin.firestore.Timestamp.now(),
      partnersUpdated: totalPartnersUpdated,
      success: true,
      results: results,
      message: `🧪 Manual test: ${totalPartnersUpdated} partners updated`
    });

    console.log(`🎉 Manual bonus reset test completed! ${totalPartnersUpdated} partners updated.`);

    res.status(200).json({
      success: true,
      totalPartnersUpdated: totalPartnersUpdated,
      results: results,
      message: `✅ Bonus reset successful! ${totalPartnersUpdated} partners updated across all werkstatt instances.`
    });
  } catch (error) {
    console.error('❌ Manual bonus reset test failed:', error);

    // Log failure
    await db.collection('system_logs').add({
      type: 'bonus_reset',
      action: 'manual_test',
      timestamp: admin.firestore.Timestamp.now(),
      success: false,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: `❌ Bonus reset failed: ${error.message}`
    });
  }
});

// ================================================================================
// 🧹 STALE SESSION CLEANUP - Scheduled Function (v2 / 2nd Gen)
// ================================================================================
// Automatically deletes sessions older than 2 hours without heartbeat
// Runs every 15 minutes to keep session list clean
// Fixes bug: Sessions accumulate forever after logout/crash/tab-close
// Upgraded to v2 API for better performance & fewer permission issues
// ================================================================================

exports.cleanupStaleSessions = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'Europe/Berlin',
  region: 'europe-west3',
  memory: '256MiB',          // Lower memory = cheaper (default is 1GB)
  timeoutSeconds: 300        // 5 minutes max
}, async (event) => {
    console.log('🧹 Starting stale session cleanup (v2)...');

    const now = admin.firestore.Timestamp.now();
    const twoHoursAgo = new admin.firestore.Timestamp(
      now.seconds - (2 * 60 * 60),  // 2 hours in seconds
      now.nanoseconds
    );

    try {
      // Find all werkstatt IDs dynamically (query users collection)
      const usersSnapshot = await db.collection('users')
        .where('role', '==', 'werkstatt')
        .get();

      let totalDeleted = 0;
      const werkstaetten = [];

      for (const userDoc of usersSnapshot.docs) {
        const werkstattId = userDoc.data().werkstattId;
        if (!werkstattId) continue;

        werkstaetten.push(werkstattId);
        const collectionName = `activeSessions_${werkstattId}`;

        // Find stale sessions (lastActivity > 2 hours ago)
        const staleSessionsSnapshot = await db.collection(collectionName)
          .where('status', '==', 'active')
          .where('lastActivity', '<', twoHoursAgo)
          .get();

        console.log(`   📍 ${werkstattId}: Found ${staleSessionsSnapshot.size} stale sessions`);

        // Delete in batch for performance
        if (staleSessionsSnapshot.size > 0) {
          const batch = db.batch();
          staleSessionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          totalDeleted += staleSessionsSnapshot.size;
          console.log(`   ✅ ${werkstattId}: Deleted ${staleSessionsSnapshot.size} stale sessions`);
        }
      }

      console.log(`✅ Cleanup complete: ${totalDeleted} stale sessions deleted across ${werkstaetten.length} werkstatt(s)`);

      // Log to Firestore for audit trail
      await db.collection('systemLogs').add({
        type: 'stale_session_cleanup',
        timestamp: admin.firestore.Timestamp.now(),
        deletedCount: totalDeleted,
        werkstaetten: werkstaetten,
        thresholdHours: 2
      });

      return { success: true, deleted: totalDeleted, werkstaetten: werkstaetten.length };

    } catch (error) {
      console.error('❌ Stale session cleanup failed:', error);

      // Log error to Firestore
      await db.collection('systemLogs').add({
        type: 'stale_session_cleanup_error',
        timestamp: admin.firestore.Timestamp.now(),
        error: error.message,
        stack: error.stack
      });

      throw error;  // Re-throw to mark function as failed in logs
    }
  });

// ============================================
// EMAIL RETRY QUEUE PROCESSOR (Bug #3 Fix - 2025-11-21)
// Scheduled function to retry failed email sends
// ============================================

/**
 * Process Email Retry Queue
 * - Runs every 5 minutes
 * - Retries failed emails (max 3 attempts)
 * - Prevents duplicate emails by using queue system
 *
 * Bug #3 Fix: Instead of throwing errors (which causes automatic retries),
 * failed emails are added to emailRetryQueue for controlled retry logic.
 */
exports.processEmailRetryQueue = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'Europe/Berlin',
  region: 'europe-west3',
  memory: '256MiB',
  timeoutSeconds: 300,
  secrets: [awsAccessKeyId, awsSecretAccessKey] // Bind AWS SES Credentials
}, async (event) => {
  console.log('📧 Starting email retry queue processing...');

  try {
    // Query pending retries (status="pending_retry", retryCount < 3)
    const retryQueueSnapshot = await db.collection('emailRetryQueue')
      .where('status', '==', 'pending_retry')
      .where('retryCount', '<', 3)
      .limit(20) // Process max 20 emails per run (prevent timeout)
      .get();

    if (retryQueueSnapshot.empty) {
      console.log('✅ No emails to retry');
      return { success: true, processed: 0 };
    }

    console.log(`📬 Found ${retryQueueSnapshot.size} emails to retry`);

    // Initialize AWS SES client
    const sesClient = getAWSSESClient();
    console.log('✅ AWS SES initialized for retry processing');

    let successCount = 0;
    let failedCount = 0;
    let permanentFailCount = 0;

    // Process each email sequentially (avoid rate limiting)
    for (const queueDoc of retryQueueSnapshot.docs) {
      const queueData = queueDoc.data();
      const queueId = queueDoc.id;

      console.log(`📧 Processing retry for queue ID: ${queueId} (attempt ${queueData.retryCount + 1}/3)`);

      try {
        // Reconstruct SendEmailCommand from queue data
        const sendEmailCommand = new SendEmailCommand({
          Source: queueData.emailData.source,
          Destination: {
            ToAddresses: queueData.emailData.toAddresses
          },
          Message: {
            Subject: {
              Data: queueData.emailData.subject,
              Charset: 'UTF-8'
            },
            Body: {
              Html: {
                Data: queueData.emailData.htmlBody,
                Charset: 'UTF-8'
              }
            }
          }
        });

        // Attempt to send email
        await sesClient.send(sendEmailCommand);
        console.log(`✅ Email sent successfully (retry ${queueData.retryCount + 1}): ${queueData.emailData.toAddresses[0]}`);

        // Update queue status to "sent"
        await queueDoc.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log successful send to email_logs
        await db.collection('email_logs').add({
          to: queueData.emailData.toAddresses[0],
          subject: queueData.emailData.subject,
          trigger: queueData.trigger,
          vehicleId: queueData.vehicleId || null,
          collectionId: queueData.collectionId || null,
          werkstatt: queueData.werkstatt || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          retryCount: queueData.retryCount + 1,
          queueId: queueId // Reference to retry queue entry
        });

        successCount++;

      } catch (error) {
        console.error(`❌ Retry failed for queue ID ${queueId}:`, error.message);

        const newRetryCount = queueData.retryCount + 1;

        if (newRetryCount >= 3) {
          // Permanent failure after 3 attempts
          console.error(`❌ PERMANENT FAILURE (3 attempts exhausted) for: ${queueData.emailData.toAddresses[0]}`);

          await queueDoc.ref.update({
            status: 'failed_permanent',
            lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
            retryCount: newRetryCount,
            lastError: error.message,
            lastErrorCode: error.name || error.code || null
          });

          // Log permanent failure
          await db.collection('email_logs').add({
            to: queueData.emailData.toAddresses[0],
            subject: queueData.emailData.subject,
            trigger: queueData.trigger,
            vehicleId: queueData.vehicleId || null,
            collectionId: queueData.collectionId || null,
            werkstatt: queueData.werkstatt || null,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed_permanent',
            error: error.message,
            errorCode: error.name || error.code || null,
            retryCount: newRetryCount,
            queueId: queueId
          });

          permanentFailCount++;

        } else {
          // Increment retry count and schedule next retry
          const nextRetryDelay = Math.pow(2, newRetryCount) * 5; // Exponential backoff: 10min, 20min, 40min
          const nextRetryAt = new admin.firestore.Timestamp(
            admin.firestore.Timestamp.now().seconds + (nextRetryDelay * 60),
            0
          );

          await queueDoc.ref.update({
            retryCount: newRetryCount,
            lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
            nextRetryAt: nextRetryAt,
            lastError: error.message,
            lastErrorCode: error.name || error.code || null
          });

          console.log(`⏰ Retry scheduled (attempt ${newRetryCount}/3) - next retry in ${nextRetryDelay} minutes`);
          failedCount++;
        }
      }

      // Rate limiting: Wait 100ms between emails to avoid SES throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      success: true,
      processed: retryQueueSnapshot.size,
      sent: successCount,
      failed: failedCount,
      permanentFail: permanentFailCount
    };

    console.log(`✅ Email retry processing complete: ${JSON.stringify(summary)}`);

    // Log to systemLogs for monitoring
    await db.collection('systemLogs').add({
      type: 'email_retry_queue_processed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      summary: summary
    });

    return summary;

  } catch (error) {
    console.error('❌ Email retry queue processing failed:', error);

    // Log error to systemLogs
    await db.collection('systemLogs').add({
      type: 'email_retry_queue_error',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      error: error.message,
      stack: error.stack
    });

    throw error; // Re-throw to mark function as failed
  }
});

// ============================================
// PDF PARSING WITH OPENAI GPT-4 VISION
// ============================================

/**
 * Parse DAT PDF/Invoice with OpenAI GPT-4 Vision
 * PRIMARY method for 100% accurate data extraction
 *
 * Extracts: Fahrzeugdaten, Ersatzteile, Arbeitszeiten, Lackierung
 * Supports: DAT layout, other platforms, any invoice format
 *
 * Cost: ~$0.01-0.03 per PDF
 */
exports.parseDATPDF = functions
  .region('europe-west3')
  .runWith({
    secrets: [openaiApiKey],
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    try {
      // Security: Only authenticated users
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Nutzer muss eingeloggt sein'
        );
      }

      const { imagesBase64, werkstatt = "mosbach" } = data;

      if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'imagesBase64 array ist erforderlich (PNG/JPEG/WEBP)'
        );
      }

      console.log('📄 [OPENAI] Starting multi-page image parsing...');
      console.log(`   User: ${context.auth.token.email}`);
      console.log(`   Pages: ${imagesBase64.length}`);
      const totalSizeKB = imagesBase64.reduce((sum, img) => sum + img.length, 0) / 1024;
      console.log(`   Total Size: ${totalSizeKB.toFixed(2)} KB`);

      // ============================================
      // RATE LIMIT CHECK (Bug #2 Phase 2)
      // ============================================
      const rateLimitResult = await rateLimiter.checkAndIncrementRateLimit(
        context.auth.uid,
        werkstatt,
        'pdfVision'
      );

      if (!rateLimitResult.allowed) {
        const resetTime = rateLimitResult.resetAt.toLocaleString('de-DE', {
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit'
        });

        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Tageslimit für PDF-Analyse erreicht (${rateLimitResult.limit} Anfragen/Tag). ` +
          `Bitte versuchen Sie es morgen wieder ab ${resetTime} Uhr.`
        );
      }

      console.log(`✅ Rate limit check passed: ${rateLimitResult.remaining}/${rateLimitResult.limit} remaining`);

      // Initialize OpenAI with secret
      const apiKey = getOpenAIApiKey();
      const openai = new OpenAI({ apiKey });

      // Build content array with text prompt + all page images
      const messageContent = [
        {
          type: "text",
          text: `Extrahiere ALLE Daten aus dieser VOLLSTÄNDIGEN DAT-Rechnung/Kalkulation (${imagesBase64.length} Seiten).

WICHTIG: Gib die Daten als JSON zurück mit dieser exakten Struktur:

{
  "fahrzeugdaten": {
    "marke": "Peugeot",
    "modell": "508 SW",
    "vin": "VR3FCYHZTPY554388",
    "kennzeichen": "ROW-M 9044",
    "farbcode": "B0NVL/B0MM0/EVL",
    "farbname": "PLATINIUM-GRAU"
  },
  "ersatzteile": [
    {
      "etn": "1622749580",
      "benennung": "NIET RADLAUFABDECKUNG V.R.",
      "anzahl": 4,
      "einzelpreis": 0.28,
      "gesamtpreis": 1.12
    }
  ],
  "arbeitslohn": [
    {
      "position": "SCHEINWERFER R. AUSTAUSCHEN",
      "art": "E",
      "stunden": 0.30,
      "stundensatz": 70.00,
      "gesamtpreis": 21.00
    }
  ],
  "lackierung": [
    {
      "position": "OBERFLAECHE KOTFLUEGEL L.",
      "bereich": "Lackierung",
      "stunden": 0.50,
      "stundensatz": 40.00,
      "gesamtpreis": 71.92
    }
  ]
}

WICHTIGE REGELN:
1. Preise als Zahlen (float), NICHT als Strings
2. Schweizer Format (1'532.10) → 1532.10
3. Deutsches Format (1.532,10) → 1532.10
4. ETN: 10-stellig ODER 6-8 Stellen + Buchstabe (z.B. "6925P8")
5. ALLE Ersatzteile extrahieren (auch bei REPARATURSATZ-Unterteilen)
   - WICHTIG: SCHEINWERFER, STOSSSTANGE, KOTFLÜGEL = Ersatzteile!
   - Auch teure Teile (>1000€) sind Ersatzteile, NICHT Arbeitszeiten!
   - Wenn du 6 Teile siehst, gib 6 zurück (nicht 5!)
6. ALLE Arbeitszeiten extrahieren (Art: E=Elektrik, K=Karosserie, M=Mechanik)
7. ALLE Lackier-Positionen extrahieren
8. Wenn ein Feld leer ist: null verwenden
9. Arrays können leer sein: []
10. Keine zusätzlichen Felder hinzufügen
11. ZÄHLE GENAU: Wenn PDF 6 Ersatzteile zeigt, return 6 items (nicht 5!)`
        }
      ];

      // Add all page images to content array
      for (let i = 0; i < imagesBase64.length; i++) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imagesBase64[i]}`
          }
        });
        console.log(`   📄 Added page ${i + 1} to OpenAI request`);
      }

      // Call GPT-4 Vision with all pages
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{
          role: "user",
          content: messageContent
        }],
        max_tokens: 4096,
        temperature: 0.3  // Slightly higher for better vision edge-case handling (was 0.1)
      });

      const content = response.choices[0].message.content;
      const finishReason = response.choices[0].finish_reason;

      console.log('✅ [OPENAI] Response received');
      console.log(`   Tokens used: ${response.usage.total_tokens}`);
      console.log(`   Estimated cost: $${(response.usage.total_tokens * 0.00001).toFixed(4)}`);
      console.log(`   Finish reason: ${finishReason}`);

      // Log raw response for debugging (first 500 + last 200 chars)
      if (content.length > 700) {
        console.log('   Response preview (first 500 chars):');
        console.log('   ' + content.substring(0, 500));
        console.log('   Response preview (last 200 chars):');
        console.log('   ' + content.substring(content.length - 200));
      } else {
        console.log('   Full response:');
        console.log('   ' + content);
      }

      // Check finish reason
      if (finishReason !== 'stop') {
        console.warn(`⚠️ [OPENAI] Unexpected finish_reason: ${finishReason} (expected: stop)`);
        if (finishReason === 'length') {
          console.error('❌ [OPENAI] Response was truncated due to max_tokens limit!');
        }
      }

      // Parse JSON from response - TRY DIRECT PARSE FIRST (more robust)
      let parsedData;
      try {
        // Attempt 1: Direct JSON parse (assumes clean JSON response)
        parsedData = JSON.parse(content);
        console.log('✅ [OPENAI] Direct JSON parse successful');
      } catch (directParseError) {
        console.warn('⚠️ [OPENAI] Direct parse failed, trying regex extraction...');

        // Attempt 2: Regex extraction (fallback for responses with extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('❌ [OPENAI] No JSON found in response');
          console.error('   Content:', content);
          throw new functions.https.HttpsError(
            'internal',
            'Keine JSON-Daten in OpenAI Response gefunden'
          );
        }

        try {
          parsedData = JSON.parse(jsonMatch[0]);
          console.log('✅ [OPENAI] Regex-extracted JSON parse successful');
        } catch (regexParseError) {
          console.error('❌ [OPENAI] JSON parsing failed even with regex');
          console.error('   Extracted JSON:', jsonMatch[0]);
          throw new functions.https.HttpsError(
            'internal',
            `JSON parsing fehlgeschlagen: ${regexParseError.message}`
          );
        }
      }

      // Validate structure
      if (!parsedData.fahrzeugdaten && !parsedData.ersatzteile) {
        throw new functions.https.HttpsError(
          'internal',
          'Ungültige Datenstruktur von OpenAI'
        );
      }

      console.log('✅ [OPENAI] Parsing successful:');
      console.log(`   - Fahrzeugdaten: ${parsedData.fahrzeugdaten ? 'ja' : 'nein'}`);
      console.log(`   - Ersatzteile: ${parsedData.ersatzteile?.length || 0}`);
      console.log(`   - Arbeitszeiten: ${parsedData.arbeitslohn?.length || 0}`);
      console.log(`   - Lackierung: ${parsedData.lackierung?.length || 0}`);

      // Log to Firestore for analytics
      await db.collection('openai_usage').add({
        userId: context.auth.uid,
        email: context.auth.token.email,
        timestamp: admin.firestore.Timestamp.now(),
        model: 'gpt-4-vision-preview',
        tokensUsed: response.usage.total_tokens,
        estimatedCost: response.usage.total_tokens * 0.00001,
        ersatzteileCount: parsedData.ersatzteile?.length || 0,
        arbeitslohnCount: parsedData.arbeitslohn?.length || 0,
        lackierungCount: parsedData.lackierung?.length || 0
      });

      return {
        success: true,
        data: parsedData,
        source: 'openai-gpt4-vision',
        meta: {
          tokensUsed: response.usage.total_tokens,
          estimatedCost: (response.usage.total_tokens * 0.00001).toFixed(4)
        }
      };

    } catch (error) {
      console.error('❌ [OPENAI] Parsing failed:', error);

      // Log error to Firestore
      await db.collection('systemLogs').add({
        type: 'openai_parsing_error',
        timestamp: admin.firestore.Timestamp.now(),
        userId: context.auth?.uid || 'unknown',
        error: error.message,
        stack: error.stack
      });

      throw new functions.https.HttpsError(
        'internal',
        `PDF-Parsing fehlgeschlagen: ${error.message}`
      );
    }
  });

// ============================================
// ENTWURF-SYSTEM (MVP): Email & Notifications
// ============================================

/**
 * FUNCTION: sendEntwurfEmail
 * Sendet Email an Kunde wenn Angebot fertig ist
 * Called from: entwuerfe-bearbeiten.html
 */
exports.sendEntwurfEmail = functions
    .region("europe-west3")
    .runWith({
      secrets: [awsAccessKeyId, awsSecretAccessKey]
    })
    .https.onCall(async (data, context) => {
      console.log("📧 sendEntwurfEmail called");

      // ✅ SECURITY: Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Authentifizierung erforderlich"
        );
      }

      // Validate input
      const { kundenEmail, kundenname, kennzeichen, qrCodeUrl, fahrzeugId,
              // 🆕 FIX Nov 30, 2025: Varianten-Preise für Email
              hasVarianten, summeBruttoOriginal, summeBruttoAftermarket, vereinbarterPreis } = data;

      if (!kundenEmail || !kundenname || !kennzeichen || !qrCodeUrl) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Fehlende erforderliche Felder"
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(kundenEmail)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Ungültiges Email-Format"
        );
      }

      // ✅ AWS SES Email Integration
      // IMPORTANT: Requires AWS SES credentials in Firebase Secret Manager
      // Setup: firebase functions:secrets:set AWS_ACCESS_KEY_ID && firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
      // Verify: firebase functions:secrets:access AWS_ACCESS_KEY_ID
      // Domain verification required in AWS SES Console!

      try {
        // Initialize AWS SES Client
        const sesClient = getAWSSESClient();

        // 🆕 FIX Nov 30, 2025: Preise formatieren für Email
        const formatPrice = (price) => {
          if (!price || isNaN(price)) return null;
          return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price);
        };

        const originalPreisFormatted = formatPrice(summeBruttoOriginal);
        const aftermarketPreisFormatted = formatPrice(summeBruttoAftermarket);
        const einzelPreisFormatted = formatPrice(vereinbarterPreis);

        // Ersparnis berechnen (wenn Aftermarket günstiger)
        let ersparnisText = '';
        if (hasVarianten && summeBruttoOriginal > 0 && summeBruttoAftermarket > 0 && summeBruttoAftermarket < summeBruttoOriginal) {
          const ersparnis = Math.round((1 - summeBruttoAftermarket / summeBruttoOriginal) * 100);
          ersparnisText = `(${ersparnis}% günstiger)`;
        }

        // Preis-Sektion für Email generieren
        let preisSection = '';
        if (hasVarianten && (originalPreisFormatted || aftermarketPreisFormatted)) {
          preisSection = `
                <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #003366;">💰 Ihre Preisoptionen:</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${originalPreisFormatted ? `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <strong>⭐ Original</strong><br>
                        <small style="color: #666;">Premium-Ersatzteile vom Hersteller</small>
                      </td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-size: 18px; font-weight: bold; color: #0066cc;">
                        ${originalPreisFormatted}
                      </td>
                    </tr>
                    ` : ''}
                    ${aftermarketPreisFormatted ? `
                    <tr>
                      <td style="padding: 10px;">
                        <strong>💚 Aftermarket</strong><br>
                        <small style="color: #666;">Qualitäts-Ersatzteile ${ersparnisText}</small>
                      </td>
                      <td style="padding: 10px; text-align: right; font-size: 18px; font-weight: bold; color: #22c55e;">
                        ${aftermarketPreisFormatted}
                      </td>
                    </tr>
                    ` : ''}
                  </table>
                  <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">
                    ℹ️ Sie können Ihre bevorzugte Variante im Online-Portal auswählen.
                  </p>
                </div>`;
        } else if (einzelPreisFormatted) {
          preisSection = `
                <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #666;">Geschätzter Gesamtpreis:</p>
                  <p style="margin: 0; font-size: 24px; font-weight: bold; color: #003366;">${einzelPreisFormatted}</p>
                </div>`;
        }

        // Email HTML (inline for MVP)
        const emailHtml = `
          <!DOCTYPE html>
          <html lang="de">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #003366, #0066cc); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #00bfff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .button:hover { background: #0099cc; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚗 Ihr Kosten-Voranschlag ist fertig!</h1>
              </div>
              <div class="content">
                <p>Hallo ${kundenname},</p>
                <p>wir haben Ihren Kosten-Voranschlag für <strong>${kennzeichen}</strong> fertiggestellt!</p>
                ${preisSection}
                <p>Sie können Ihr Angebot jetzt online einsehen und bestätigen:</p>
                <p style="text-align: center;">
                  <a href="${qrCodeUrl}" class="button">
                    📄 Angebot jetzt ansehen
                  </a>
                </p>
                <p><small>Alternativ können Sie den QR-Code in Ihrem Annahme-PDF scannen.</small></p>
                <p><strong>💡 Tipp:</strong> Das Angebot ist 14 Tage gültig.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p>Bei Fragen erreichen Sie uns unter:<br>
                📞 <strong>06261 9363580</strong><br>
                📧 <strong>info@auto-lackierzentrum.de</strong></p>
                <p>Mit freundlichen Grüßen,<br>
                <strong>Ihr Team vom Auto-Lackierzentrum Mosbach</strong></p>
              </div>
              <div class="footer">
                <p>Diese Email wurde automatisch generiert.</p>
                <p>Auto-Lackierzentrum Mosbach | Hinkel GmbH<br>
                Pfalzgraf-Otto-Straße 2, 74821 Mosbach</p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email via AWS SES
        const sendEmailCommand = new SendEmailCommand({
          Source: SENDER_EMAIL,
          Destination: {
            ToAddresses: [kundenEmail]
          },
          Message: {
            Subject: {
              Data: `🚗 Ihr Kosten-Voranschlag für ${kennzeichen}`,
              Charset: 'UTF-8'
            },
            Body: {
              Html: {
                Data: emailHtml,
                Charset: 'UTF-8'
              }
            }
          }
        });

        await sesClient.send(sendEmailCommand);
        console.log(`✅ Entwurf-Email sent via AWS SES to: ${kundenEmail}`);

        // Log to Firestore
        // 🔧 FIX Bug #3 (2025-11-28): subject war undefined - jetzt korrekt definiert
        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: `🚗 Ihr Kosten-Voranschlag für ${kennzeichen}`,
          trigger: "entwurf_email",
          fahrzeugId: fahrzeugId || null,
          kennzeichen: kennzeichen,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });

        return { success: true, message: "Email versendet" };
      } catch (error) {
        console.error("❌ AWS SES error:", error.message);

        // ✅ PATTERN 31: Graceful Degradation for AWS SES Errors
        // Common AWS SES errors:
        // - MessageRejected: Email address not verified
        // - InvalidParameterValue: Invalid credentials
        // - AccessDeniedException: Invalid AWS credentials

        const errorCode = error.name || error.code || '';
        const errorMessage = error.message || '';

        // Check for credential/verification errors
        if (errorCode.includes('MessageRejected') ||
            errorCode.includes('AccessDenied') ||
            errorCode.includes('InvalidParameterValue') ||
            errorMessage.toLowerCase().includes('not verified')) {

          console.warn("⚠️ [GRACEFUL DEGRADATION] AWS SES Configuration Error");
          console.log("📧 [DEMO MODE] Email would be sent to:", kundenEmail);
          console.log("🎯 [DEMO MODE] Kennzeichen:", kennzeichen);
          console.log("🔗 [DEMO MODE] QR-Code URL:", qrCodeUrl);
          console.log("⚠️ [HINT] Check: 1) AWS credentials in Secret Manager, 2) Email verification in AWS SES Console");

          // Log as "skipped" (not "failed") → Workflow continues
          await db.collection("email_logs").add({
            to: kundenEmail,
            subject: `Kosten-Voranschlag für ${kennzeichen}`,
            trigger: "entwurf_email",
            fahrzeugId: fahrzeugId || null,
            kennzeichen: kennzeichen,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "skipped",
            reason: `AWS SES Configuration Error: ${errorCode}`,
            originalError: error.message,
          });

          // ✅ Return success (workflow continues)
          return {
            success: true,
            message: "Email übersprungen (AWS SES nicht konfiguriert)",
            demoMode: true,
            recipient: kundenEmail,
            warning: `AWS SES Error: ${errorCode} - Bitte Konfiguration prüfen`
          };
        }

        // Other errors (network, timeout, etc.) → Add to retry queue
        console.log("📬 Adding Entwurf email to retry queue (Bug #3 Fix)...");

        const nextRetryAt = new admin.firestore.Timestamp(
          admin.firestore.Timestamp.now().seconds + (5 * 60),
          0
        );

        const queueRef = await db.collection("emailRetryQueue").add({
          emailData: {
            source: SENDER_EMAIL,
            toAddresses: [kundenEmail],
            subject: `🚗 Ihr Kosten-Voranschlag für ${kennzeichen}`,
            htmlBody: emailHtml
          },
          trigger: "entwurf_email",
          fahrzeugId: fahrzeugId || null,
          kennzeichen: kennzeichen,
          status: "pending_retry",
          retryCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRetryAt: nextRetryAt,
          lastError: error.message,
          lastErrorCode: error.name || error.code || null
        });

        console.log(`✅ Entwurf email queued for retry (Queue ID: ${queueRef.id})`);

        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: `Kosten-Voranschlag für ${kennzeichen}`,
          trigger: "entwurf_email",
          fahrzeugId: fahrzeugId || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "queued_for_retry",
          error: error.message,
          queueId: queueRef.id
        });

        // ✅ Return error to caller (but email is in retry queue)
        throw new functions.https.HttpsError(
            "internal",
            `Email-Versand fehlgeschlagen: ${error.message} (Email wurde zur Wiederholung eingereiht)`
        );
      }
    });

/**
 * FUNCTION: sendEntwurfBestaetigtNotification
 * Erstellt Notification für Werkstatt wenn Kunde Angebot bestätigt
 * Called from: kunde-angebot.html (or partner portal)
 */
exports.sendEntwurfBestaetigtNotification = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔔 sendEntwurfBestaetigtNotification called");

      // Validate input
      const { fahrzeugId, werkstattId = "mosbach" } = data;

      if (!fahrzeugId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "fahrzeugId erforderlich"
        );
      }

      try {
        // Load Fahrzeug/PartnerAnfrage data
        const docRef = await db.collection(`partnerAnfragen_${werkstattId}`).doc(fahrzeugId).get();

        if (!docRef.exists) {
          // Try fahrzeuge collection as fallback
          const fahrzeugRef = await db.collection(`fahrzeuge_${werkstattId}`).doc(fahrzeugId).get();
          if (!fahrzeugRef.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Fahrzeug nicht gefunden"
            );
          }
        }

        const fahrzeug = docRef.data();

        // Load all Meister/Admin users
        const adminsSnapshot = await db.collection(`mitarbeiter_${werkstattId}`)
            .where("role", "in", ["admin", "meister"])
            .where("status", "==", "active")
            .get();

        if (adminsSnapshot.empty) {
          console.warn(`⚠️ No admins found for werkstatt: ${werkstattId}`);
          return { success: false, message: "Keine Admins gefunden" };
        }

        // Create Notifications for each Admin/Meister
        const notificationPromises = adminsSnapshot.docs.map(async (adminDoc) => {
          return db.collection(`mitarbeiterNotifications_${werkstattId}`).add({
            mitarbeiterId: adminDoc.id,
            title: "✅ Kunde hat Angebot bestätigt!",
            message: `${fahrzeug.kundenname || "Kunde"} (${fahrzeug.kennzeichen || "k.A."}) hat das Angebot akzeptiert.`,
            type: "success",
            status: "unread",
            priority: "high",
            link: `/partner-anfragen-pruefen.html?highlight=${fahrzeugId}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await Promise.all(notificationPromises);
        console.log(`✅ Notifications created for ${adminsSnapshot.size} admins`);

        return { success: true, notificationCount: adminsSnapshot.size };
      } catch (error) {
        console.error("❌ Notification creation failed:", error.message);

        throw new functions.https.HttpsError(
            "internal",
            `Notification fehlgeschlagen: ${error.message}`
        );
      }
    });

/**
 * FUNCTION: sendEntwurfAbgelehntNotification
 * Erstellt Notification für Werkstatt wenn Kunde Angebot ablehnt
 * Called from: kunde-angebot.html (or partner portal)
 */
exports.sendEntwurfAbgelehntNotification = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔔 sendEntwurfAbgelehntNotification called");

      // Validate input
      const { fahrzeugId, grund, werkstattId = "mosbach" } = data;

      if (!fahrzeugId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "fahrzeugId erforderlich"
        );
      }

      try {
        // Load Fahrzeug/PartnerAnfrage data
        const docRef = await db.collection(`partnerAnfragen_${werkstattId}`).doc(fahrzeugId).get();

        if (!docRef.exists) {
          // Try fahrzeuge collection as fallback
          const fahrzeugRef = await db.collection(`fahrzeuge_${werkstattId}`).doc(fahrzeugId).get();
          if (!fahrzeugRef.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Fahrzeug nicht gefunden"
            );
          }
        }

        const fahrzeug = docRef.data();

        // Load all Meister/Admin users
        const adminsSnapshot = await db.collection(`mitarbeiter_${werkstattId}`)
            .where("role", "in", ["admin", "meister"])
            .where("status", "==", "active")
            .get();

        if (adminsSnapshot.empty) {
          console.warn(`⚠️ No admins found for werkstatt: ${werkstattId}`);
          return { success: false, message: "Keine Admins gefunden" };
        }

        // Create Notifications for each Admin/Meister
        const notificationPromises = adminsSnapshot.docs.map(async (adminDoc) => {
          return db.collection(`mitarbeiterNotifications_${werkstattId}`).add({
            mitarbeiterId: adminDoc.id,
            title: "❌ Kunde hat Angebot abgelehnt",
            message: `${fahrzeug.kundenname || "Kunde"} (${fahrzeug.kennzeichen || "k.A."}) hat das Angebot abgelehnt.${grund ? ` Grund: ${grund}` : ""}`,
            type: "warning",
            status: "unread",
            priority: "normal",
            link: `/partner-anfragen-pruefen.html?highlight=${fahrzeugId}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await Promise.all(notificationPromises);
        console.log(`✅ Notifications created for ${adminsSnapshot.size} admins`);

        return { success: true, notificationCount: adminsSnapshot.size };
      } catch (error) {
        console.error("❌ Notification creation failed:", error.message);

        throw new functions.https.HttpsError(
            "internal",
            `Notification fehlgeschlagen: ${error.message}`
        );
      }
    });

// ============================================
// FUNCTION: GENERATE ANGEBOT PDF (Puppeteer)
// ============================================
exports.generateAngebotPDF = functions
    .region("europe-west3")
    .runWith({
      memory: "1GB", // Puppeteer needs more memory
      timeoutSeconds: 120 // PDF generation can take time
    })
    .https
    .onCall(async (data, context) => {
      console.log("📄 === GENERATE ANGEBOT PDF ===");

      // ✅ SECURITY: Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Authentifizierung erforderlich"
        );
      }

      // ✅ BUG #10 FIX: Rollen-Prüfung (Cross-Tenant-Schutz)
      const userRole = context.auth.token?.role;
      const userWerkstattId = context.auth.token?.werkstattId;

      if (userRole !== "werkstatt") {
        console.error(`❌ Unauthorized role: ${userRole} tried to generate PDF`);
        throw new functions.https.HttpsError(
            "permission-denied",
            "Nur Werkstatt-Admins dürfen Angebots-PDFs generieren"
        );
      }

      // ✅ BUG #10 FIX: Werkstatt-ID-Prüfung
      if (userWerkstattId !== data.werkstattId) {
        console.error(`❌ Cross-tenant attempt: ${userWerkstattId} tried to access ${data.werkstattId}`);
        throw new functions.https.HttpsError(
            "permission-denied",
            "Zugriff auf andere Werkstätten nicht erlaubt"
        );
      }

      console.log(`✅ Auth verified: ${userRole} / ${userWerkstattId}`);

      // ✅ BUG #18 FIX: Declare browser outside try for finally cleanup
      let browser;
      try {
        // 1. Validation
        if (!data.entwurfId || !data.werkstattId) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "entwurfId und werkstattId sind erforderlich"
          );
        }

        const { entwurfId, werkstattId } = data;
        console.log(`📝 Lade Entwurf: ${entwurfId} (Werkstatt: ${werkstattId})`);

        // 2. Load Entwurf from Firestore
        const collectionName = `partnerAnfragen_${werkstattId}`;
        const entwurfDoc = await db.collection(collectionName).doc(entwurfId).get();

        if (!entwurfDoc.exists) {
          throw new functions.https.HttpsError(
              "not-found",
              `Entwurf ${entwurfId} nicht gefunden`
          );
        }

        const entwurf = entwurfDoc.data();
        console.log("✅ Entwurf geladen:", entwurf.kennzeichen);

        // 2.5. Load Werkstatt Settings for Logo
        // ✅ BUG #5 FIX: Korrektes Multi-Tenant Collection Pattern
        const settingsDoc = await db.collection(`einstellungen_${werkstattId}`).doc('config').get();
        const logoData = settingsDoc.exists && settingsDoc.data().profil?.logoUrl ? settingsDoc.data().profil.logoUrl : null;
        console.log(`📷 Logo ${logoData ? "gefunden" : "nicht gefunden"} für Werkstatt: ${werkstattId}`);

        // 3. Create HTML Template
        const htmlContent = createAngebotHTML(entwurf, werkstattId, logoData);

        // 4. Convert HTML to PDF with Puppeteer-Core + @sparticuz/chromium
        console.log("🖨️ Generiere PDF mit Puppeteer-Core...");
        const puppeteer = require("puppeteer-core");
        const chromium = require("@sparticuz/chromium");

        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "20mm",
            right: "15mm",
            bottom: "20mm",
            left: "15mm"
          }
        });

        await browser.close();
        browser = null;  // Prevent double-close in finally block
        console.log("✅ PDF erfolgreich generiert");

        // 5. Upload PDF to Firebase Storage (NEW: Partner Portal Display)
        console.log("☁️ Uploading PDF to Firebase Storage...");
        const bucket = admin.storage().bucket();
        const timestamp = Date.now();
        const pdfFileName = `angebote/${werkstattId}/${entwurfId}_${timestamp}.pdf`;
        const pdfFile = bucket.file(pdfFileName);

        await pdfFile.save(pdfBuffer, {
          metadata: {
            contentType: "application/pdf",
            metadata: {
              entwurfId: entwurfId,
              werkstattId: werkstattId,
              kennzeichen: entwurf.kennzeichen,
              uploadedAt: new Date().toISOString()
            }
          }
        });

        // Make file publicly accessible (for partner portal)
        await pdfFile.makePublic();

        // Get public download URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${pdfFileName}`;
        console.log(`✅ PDF uploaded to Storage: ${publicUrl}`);

        // 6. Save PDF URL to Firestore (for partner portal display)
        console.log("💾 Saving PDF URL to Firestore...");
        const filename = `Angebot_${entwurf.kennzeichen.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

        await db.collection(collectionName).doc(entwurfId).update({
          angebotPdfUrl: publicUrl,
          angebotPdfFileName: filename,
          angebotPdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ PDF URL saved to Firestore");

        // 7. Convert to Base64 (for email attachment - backward compatibility)
        const pdfBase64 = pdfBuffer.toString("base64");

        console.log(`📦 PDF Größe: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`✅ PDF generiert: ${filename}`);

        return {
          success: true,
          pdfBase64: pdfBase64,
          filename: filename,
          pdfUrl: publicUrl  // NEW: For partner portal display
        };

      } catch (error) {
        console.error("❌ PDF-Generierung fehlgeschlagen:", error);

        // ✅ BUG #4 FIX: Set error flag in Firestore for persistent error state
        try {
          const { entwurfId, werkstattId } = data;
          if (entwurfId && werkstattId) {
            const collectionName = `partnerAnfragen_${werkstattId}`;
            await db.collection(collectionName).doc(entwurfId).update({
              pdfGenerationFailed: true,
              pdfGenerationError: error.message || 'Unknown error',
              pdfGenerationFailedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Error flag set in Firestore: ${entwurfId}`);
          }
        } catch (dbError) {
          // Non-critical error (log but don't throw)
          console.error('⚠️ Failed to set error flag in Firestore (non-critical):', dbError);
        }

        throw new functions.https.HttpsError(
            "internal",
            `PDF-Generierung fehlgeschlagen: ${error.message}`
        );
      } finally {
        // ✅ BUG #18 FIX: Ensure browser is always closed to prevent memory leaks
        if (browser) {
          try {
            await browser.close();
            console.log("🧹 Browser cleanup: closed successfully");
          } catch (closeError) {
            console.error("⚠️ Browser cleanup failed (non-critical):", closeError);
          }
        }
      }
    });

// ============================================
// FUNCTION: SEND ANGEBOT PDF TO ADMIN
// ============================================
// ============================================
// SEND ANGEBOT PDF TO ADMIN (EMAIL DISABLED)
// ============================================
// NOTE: Temporarily disabled due to SendGrid trial expiration
// TODO: Re-enable when production email service is configured
// Options: SendGrid paid plan, Gmail SMTP, AWS SES, Resend, Mailgun
exports.sendAngebotPDFToAdmin = functions
    .region("europe-west3")
    .https
    .onCall(async (data, context) => {
      console.log("📧 === SEND ANGEBOT PDF TO ADMIN (TEMP DISABLED) ===");
      console.log("⏭️  Admin-Email übersprungen (SendGrid Trial abgelaufen)");
      console.log("📎 Datei:", data.filename || "N/A");
      console.log("🎯 Kennzeichen:", data.kennzeichen || "N/A");
      console.log("💰 Preis:", data.vereinbarterPreis || "N/A");

      // ✅ BUG #4 FIX: Set email-skip flag in Firestore (not an error, but expected behavior)
      try {
        const { entwurfId, werkstattId } = data;
        if (entwurfId && werkstattId) {
          const collectionName = `partnerAnfragen_${werkstattId}`;
          await db.collection(collectionName).doc(entwurfId).update({
            pdfEmailSkipped: true,
            pdfEmailSkippedReason: "SendGrid Trial abgelaufen",
            pdfEmailSkippedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Email-skip flag set in Firestore: ${entwurfId}`);
        }
      } catch (dbError) {
        // Non-critical error (log but don't throw)
        console.error('⚠️ Failed to set email-skip flag in Firestore (non-critical):', dbError);
      }

      // Return success immediately to allow workflow to continue
      return {
        success: true,
        message: "Admin-Email übersprungen (SendGrid Trial abgelaufen)",
        tempDisabled: true,
        emailSkipped: true,  // ✅ NEW: Explicit flag for frontend to detect skip
        filename: data.filename || "angebot.pdf"
      };
    });

// ============================================
// HELPER: CREATE ANGEBOT HTML TEMPLATE
// ============================================
function createAngebotHTML(entwurf, werkstattId, logoData = null) {
  const kalkulationData = entwurf.kalkulationData || {};
  const ersatzteile = kalkulationData.ersatzteile || [];
  const arbeitslohn = kalkulationData.arbeitslohn || [];
  const lackierung = kalkulationData.lackierung || [];
  // 🔧 FIX Nov 29, 2025: Materialien-Mapping für kalkulation.html Datenstruktur
  // kalkulation.html speichert: materialTyp/name, menge, einheit, einheitspreis, gesamtpreis
  // PDF erwartet: kategorie, bezeichnung, menge, einzelpreis, gesamtpreis
  const rawMaterialien = kalkulationData.materialien || [];
  const materialien = rawMaterialien.map(item => ({
    kategorie: item.kategorie || item.einheit || '',
    bezeichnung: item.bezeichnung || item.materialTyp || item.name || item.typ || '',
    menge: item.menge || 0,
    einzelpreis: item.einzelpreis || item.einheitspreis || item.verkaufspreis || 0,
    gesamtpreis: item.gesamtpreis || item.preis || 0
  }));

  // 🚗 FIX (2025-11-27): Ersatzfahrzeug-Kosten aus kalkulationData extrahieren
  const ersatzfahrzeug = kalkulationData.ersatzfahrzeug || null;

  // ✅ FIX: Extract photoUrls for photo gallery
  const photoUrls = entwurf.photoUrls || [];

  // 🆕 2025-11-29: Design-URLs für Folierung/Werbebeklebung
  const designUrls = entwurf.designUrls || {};
  const allDesignImages = [];
  for (const [fieldId, files] of Object.entries(designUrls)) {
    if (Array.isArray(files)) {
      files.forEach(f => {
        if (f.url && f.type?.startsWith('image/')) {
          allDesignImages.push({ url: f.url, name: f.name || 'Design' });
        }
      });
    }
  }

  // 🆕 2025-11-29: Service-Details für Anzeige
  const serviceDetails = entwurf.serviceDetails || {};

  // 🆕 2025-11-26: Leihfahrzeug aus KVA extrahieren
  const leihfahrzeug = entwurf.kva?.zugewiesenesLeihfahrzeug || null;

  // 🔧 BUG FIX Dec 8, 2025 (v2): Ersatzteile FILTERN statt alle mappen
  // Ein Teil ist ENTWEDER Original ODER Aftermarket, NICHT beides!
  // Nur Teile mit preisOriginal > 0 für Original-Liste
  const ersatzteileOriginal = ersatzteile
    .filter(item => parseFloat(item.preisOriginal) > 0)
    .map(item => ({
      ...item,
      einzelpreis: parseFloat(item.preisOriginal),
      gesamtpreis: parseFloat(item.preisOriginal) * (item.anzahl || 1)
    }));
  // Nur Teile mit preisAftermarket > 0 für Aftermarket-Liste
  const ersatzteileAftermarket = ersatzteile
    .filter(item => parseFloat(item.preisAftermarket) > 0)
    .map(item => ({
      ...item,
      einzelpreis: parseFloat(item.preisAftermarket),
      gesamtpreis: parseFloat(item.preisAftermarket) * (item.anzahl || 1)
    }));
  const ersatzteileOriginalSumme = ersatzteileOriginal.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const ersatzteileAftermarketSumme = ersatzteileAftermarket.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  // Legacy: Gesamt-Summe für nicht-Varianten PDFs
  const ersatzteileSumme = ersatzteile.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);

  const arbeitslohnSumme = arbeitslohn.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const lackierungSumme = lackierung.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const materialienSumme = materialien.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  // 🚗 FIX (2025-11-27): Ersatzfahrzeug-Kosten Summe
  const ersatzfahrzeugSumme = ersatzfahrzeug?.gesamt || 0;

  // 🚗 FIX (2025-11-27): Ersatzfahrzeug-Kosten in Netto-Summe inkludieren
  const nettoSumme = ersatzteileSumme + arbeitslohnSumme + lackierungSumme + materialienSumme + ersatzfahrzeugSumme;
  const mwstSatz = 19;
  const mwstBetrag = nettoSumme * (mwstSatz / 100);
  const bruttoSumme = nettoSumme + mwstBetrag;

  // 🆕 FIX Dec 8, 2025: Separate Netto/MwSt. für Original/Aftermarket Varianten
  const basisNetto = arbeitslohnSumme + lackierungSumme + materialienSumme + ersatzfahrzeugSumme;
  const nettoOriginal = basisNetto + ersatzteileOriginalSumme;
  const nettoAftermarket = basisNetto + ersatzteileAftermarketSumme;
  const mwstOriginal = nettoOriginal * (mwstSatz / 100);
  const mwstAftermarket = nettoAftermarket * (mwstSatz / 100);

  // 🆕 FIX (2025-11-30): Varianten-Preise (Original/Aftermarket) für PDF
  // Preise können auf Root-Ebene ODER in kalkulationData sein
  const summeBruttoOriginal = parseFloat(entwurf.summeBruttoOriginal) || parseFloat(kalkulationData.summeBruttoOriginal) || 0;
  const summeBruttoAftermarket = parseFloat(entwurf.summeBruttoAftermarket) || parseFloat(kalkulationData.summeBruttoAftermarket) || 0;
  const hatVarianten = entwurf.hasVarianten || (summeBruttoOriginal > 0 && summeBruttoAftermarket > 0 && summeBruttoOriginal !== summeBruttoAftermarket);

  // Ersparnis berechnen (wenn Aftermarket günstiger)
  let ersparnisText = '';
  if (hatVarianten && summeBruttoOriginal > 0 && summeBruttoAftermarket > 0 && summeBruttoAftermarket < summeBruttoOriginal) {
    const ersparnis = Math.round((1 - summeBruttoAftermarket / summeBruttoOriginal) * 100);
    ersparnisText = `(${ersparnis}% günstiger)`;
  }

  // 🛡️ SECURITY: Escape all user-provided data to prevent XSS in PDF
  const safe = {
    kennzeichen: escapeHtml(entwurf.kennzeichen || "N/A"),
    kundenname: escapeHtml(entwurf.kundenname || "N/A"),
    kundenEmail: escapeHtml(entwurf.kundenEmail || "N/A"),
    telefon: escapeHtml(entwurf.telefon || "N/A"),
    marke: escapeHtml(entwurf.marke || ""),
    modell: escapeHtml(entwurf.modell || ""),
    baujahrVon: escapeHtml(entwurf.baujahrVon || "N/A"),
    kmstand: escapeHtml(entwurf.kmstand || "N/A"),
    leihKennzeichen: escapeHtml(leihfahrzeug?.kennzeichen || "N/A"),
    leihMarke: escapeHtml(leihfahrzeug?.marke || ""),
    leihModell: escapeHtml(leihfahrzeug?.modell || ""),
    leihKraftstoff: escapeHtml(leihfahrzeug?.kraftstoff || "N/A"),
    ersatzKennzeichen: escapeHtml(ersatzfahrzeug?.kennzeichen || "Ersatzfahrzeug")
  };

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Angebot - ${safe.kennzeichen}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;color:#333}.header{background:#003366;color:white;padding:30px;text-align:center}.header h1{font-size:24pt;margin-bottom:10px}.header p{font-size:12pt}.content{padding:30px}.section{margin-bottom:30px;page-break-inside:avoid}.section-title{font-size:14pt;font-weight:bold;color:#003366;margin-bottom:15px;border-bottom:2px solid #003366;padding-bottom:5px}.info-grid{display:grid;grid-template-columns:150px 1fr;gap:10px}.info-label{font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#003366;color:white;padding:10px;text-align:left;font-weight:bold}td{padding:8px;border-bottom:1px solid #ddd}tr:hover{background:#f9f9f9}.total-row{font-weight:bold;background:#f0f0f0}.summary-box{background:#f5f5f5;padding:20px;border-radius:8px;margin-top:30px}.summary-row{display:flex;justify-content:space-between;padding:8px 0}.summary-label{font-weight:bold}.summary-total{font-size:16pt;font-weight:bold;color:#003366;border-top:2px solid #003366;padding-top:10px}.footer{text-align:center;color:#666;font-size:9pt;margin-top:40px;padding-top:20px;border-top:1px solid #ddd}.photo-gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin-top:15px}.photo-item{border:1px solid #ddd;border-radius:8px;overflow:hidden;page-break-inside:avoid}.photo-item img{width:100%;height:auto;display:block;max-height:250px;object-fit:cover}.photo-caption{text-align:center;padding:8px;background:#f5f5f5;margin:0;font-size:10pt;color:#666}</style></head><body><div class="header">${logoData ? `<img src="${logoData}" alt="Werkstatt Logo" style="max-width:150px;max-height:60px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;">` : ''}<h1>Kalkulation &amp; Angebot</h1><p>Auto-Lackierzentrum Mosbach</p></div><div class="content"><div class="section"><div class="section-title">Fahrzeugdaten</div><div class="info-grid"><div class="info-label">Kennzeichen:</div><div>${safe.kennzeichen}</div><div class="info-label">Kunde:</div><div>${safe.kundenname}</div><div class="info-label">Email:</div><div>${safe.kundenEmail}</div><div class="info-label">Telefon:</div><div>${safe.telefon}</div><div class="info-label">Fahrzeug:</div><div>${safe.marke} ${safe.modell}</div><div class="info-label">Baujahr:</div><div>${safe.baujahrVon}</div><div class="info-label">KM-Stand:</div><div>${safe.kmstand}</div></div></div>${leihfahrzeug ? `<div class="section" style="background:#e8f5e9;padding:20px;border-radius:8px;border-left:4px solid #4caf50;"><div class="section-title" style="color:#2e7d32;">Reserviertes Ersatzfahrzeug</div><div class="info-grid"><div class="info-label">Kennzeichen:</div><div style="font-weight:bold;color:#2e7d32;">${safe.leihKennzeichen}</div><div class="info-label">Fahrzeug:</div><div>${safe.leihMarke} ${safe.leihModell}</div><div class="info-label">Kraftstoff:</div><div>${safe.leihKraftstoff}</div></div><p style="margin-top:15px;font-size:10pt;color:#666;"><strong>Hinweis:</strong> Dieses Ersatzfahrzeug wurde für die Dauer der Reparatur reserviert. Bitte bei Fahrzeugübergabe den Übergabe-Zustand dokumentieren.</p></div>` : ""}${photoUrls.length > 0 ? `<div class="section"><div class="section-title">Schadenfotos (${photoUrls.length})</div><div class="photo-gallery">${photoUrls.map((url, index) => `<div class="photo-item"><img src="${escapeHtml(url)}" alt="Schadenfoto ${index + 1}" onerror="this.style.display='none'"><p class="photo-caption">Foto ${index + 1}</p></div>`).join("")}</div></div>` : ""}${allDesignImages.length > 0 ? `<div class="section" style="background:#f3e5f5;padding:20px;border-radius:8px;border-left:4px solid #9c27b0;"><div class="section-title" style="color:#7b1fa2;">Design-Vorschau (${allDesignImages.length})</div><div class="photo-gallery">${allDesignImages.map((design, index) => `<div class="photo-item"><img src="${escapeHtml(design.url)}" alt="${escapeHtml(design.name)}" onerror="this.style.display='none'"><p class="photo-caption">${escapeHtml(design.name)}</p></div>`).join("")}</div><p style="margin-top:15px;font-size:10pt;color:#666;"><strong>Hinweis:</strong> Dies ist die Design-Vorschau für Ihr gewünschtes Folierungs-/Beklebungs-Design. Die finale Umsetzung kann je nach Material und Fahrzeuggeometrie leicht abweichen.</p></div>` : ""}${ersatzteile.length > 0 ? (hatVarianten ? `<div class="section" style="background:#e3f2fd;padding:15px;border-radius:8px;border-left:4px solid #0066cc;"><div class="section-title" style="color:#0066cc;">⭐ Ersatzteile (Original)</div><table><thead><tr><th>ETN</th><th>Benennung</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${ersatzteileOriginal.map(item => `<tr><td>${escapeHtml(item.etn || "")}</td><td>${escapeHtml(item.benennung || "")}</td><td style="text-align:right">${item.anzahl || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Original:</td><td style="text-align:right">${ersatzteileOriginalSumme.toFixed(2)} €</td></tr></tbody></table></div><div class="section" style="background:#e8f5e9;padding:15px;border-radius:8px;border-left:4px solid #22c55e;margin-top:15px;"><div class="section-title" style="color:#22c55e;">🔧 Ersatzteile (Aftermarket)</div><table><thead><tr><th>ETN</th><th>Benennung</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${ersatzteileAftermarket.map(item => `<tr><td>${escapeHtml(item.etn || "")}</td><td>${escapeHtml(item.benennung || "")}</td><td style="text-align:right">${item.anzahl || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Aftermarket:</td><td style="text-align:right">${ersatzteileAftermarketSumme.toFixed(2)} €</td></tr></tbody></table></div>` : `<div class="section"><div class="section-title">Ersatzteile</div><table><thead><tr><th>ETN</th><th>Benennung</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${ersatzteile.map(item => `<tr><td>${escapeHtml(item.etn || "")}</td><td>${escapeHtml(item.benennung || "")}</td><td style="text-align:right">${item.anzahl || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Ersatzteile:</td><td style="text-align:right">${ersatzteileSumme.toFixed(2)} €</td></tr></tbody></table></div>`) : ""}${arbeitslohn.length > 0 ? `<div class="section"><div class="section-title">Arbeitslohn</div><table><thead><tr><th>Position</th><th style="text-align:right">Stunden</th><th style="text-align:right">Stundensatz</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${arbeitslohn.map(item => `<tr><td>${escapeHtml(item.position || "")}</td><td style="text-align:right">${item.stunden || 0}</td><td style="text-align:right">${(item.stundensatz || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="3" style="text-align:right">Summe Arbeitslohn:</td><td style="text-align:right">${arbeitslohnSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${lackierung.length > 0 ? `<div class="section"><div class="section-title">Lackierung</div><table><thead><tr><th>Position</th><th style="text-align:right">Stunden</th><th style="text-align:right">Stundensatz</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${lackierung.map(item => `<tr><td>${escapeHtml(item.position || "")}</td><td style="text-align:right">${item.stunden || 0}</td><td style="text-align:right">${(item.stundensatz || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="3" style="text-align:right">Summe Lackierung:</td><td style="text-align:right">${lackierungSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${materialien.length > 0 ? `<div class="section"><div class="section-title">Materialien</div><table><thead><tr><th>Kategorie</th><th>Bezeichnung</th><th style="text-align:right">Menge</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${materialien.map(item => `<tr><td>${escapeHtml(item.kategorie || "")}</td><td>${escapeHtml(item.bezeichnung || "")}</td><td style="text-align:right">${item.menge || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Materialien:</td><td style="text-align:right">${materialienSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${ersatzfahrzeug && ersatzfahrzeugSumme > 0 ? `<div class="section" style="background:#fff8e1;padding:15px;border-radius:8px;border-left:4px solid #ffc107;"><div class="section-title" style="color:#f57c00;">Ersatzfahrzeug-Kosten</div><table><thead><tr><th>Fahrzeug</th><th style="text-align:right">Tagesmiete</th><th style="text-align:right">Tage</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody><tr><td>${safe.ersatzKennzeichen}</td><td style="text-align:right">${(ersatzfahrzeug.tagesmiete || 0).toFixed(2)} €</td><td style="text-align:right">${ersatzfahrzeug.tage || 0}</td><td style="text-align:right">${(ersatzfahrzeug.gesamt || 0).toFixed(2)} €</td></tr><tr class="total-row"><td colspan="3" style="text-align:right">Summe Ersatzfahrzeug:</td><td style="text-align:right">${ersatzfahrzeugSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${hatVarianten ? `<div class="summary-box" style="background:#e8f4fd;border-left:4px solid #003366;"><div style="font-size:14pt;font-weight:bold;color:#003366;margin-bottom:15px;border-bottom:2px solid #003366;padding-bottom:5px;">Ihre Preisoptionen</div><div style="background:#fff;padding:15px;border-radius:8px;border:2px solid #0066cc;margin-bottom:15px;"><div style="font-weight:bold;color:#0066cc;font-size:14pt;margin-bottom:5px;">⭐ Original (OEM)</div><div style="font-size:10pt;color:#666;margin-bottom:10px;">Premium-Ersatzteile vom Hersteller</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:5px 10px 5px 0;">Netto:</td><td style="padding:5px 10px;text-align:right;">${nettoOriginal.toFixed(2)} €</td><td style="padding:5px 10px;">MwSt. (${mwstSatz}%):</td><td style="padding:5px 10px;text-align:right;">${mwstOriginal.toFixed(2)} €</td><td style="padding:5px 0 5px 10px;font-weight:bold;font-size:14pt;color:#0066cc;text-align:right;border-left:2px solid #0066cc;">Brutto: ${summeBruttoOriginal.toFixed(2)} €</td></tr></table></div><div style="background:#fff;padding:15px;border-radius:8px;border:2px solid #22c55e;"><div style="font-weight:bold;color:#22c55e;font-size:14pt;margin-bottom:5px;">🔧 Aftermarket ${ersparnisText}</div><div style="font-size:10pt;color:#666;margin-bottom:10px;">Qualitäts-Ersatzteile</div><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:5px 10px 5px 0;">Netto:</td><td style="padding:5px 10px;text-align:right;">${nettoAftermarket.toFixed(2)} €</td><td style="padding:5px 10px;">MwSt. (${mwstSatz}%):</td><td style="padding:5px 10px;text-align:right;">${mwstAftermarket.toFixed(2)} €</td><td style="padding:5px 0 5px 10px;font-weight:bold;font-size:14pt;color:#22c55e;text-align:right;border-left:2px solid #22c55e;">Brutto: ${summeBruttoAftermarket.toFixed(2)} €</td></tr></table><p style="font-size:9pt;color:#666;margin-top:8px;font-style:italic;">* Aftermarket-Teile können in Passform geringfügig von Originalteilen abweichen.</p></div><p style="margin-top:15px;font-size:10pt;color:#666;text-align:center;">Sie können Ihre bevorzugte Variante im Online-Portal auswählen.</p></div>` : `<div class="summary-box"><div class="summary-row"><span class="summary-label">Netto-Summe:</span><span>${nettoSumme.toFixed(2)} €</span></div><div class="summary-row"><span class="summary-label">MwSt. (${mwstSatz}%):</span><span>${mwstBetrag.toFixed(2)} €</span></div><div class="summary-row summary-total"><span>Gesamt-Betrag:</span><span>${bruttoSumme.toFixed(2)} €</span></div></div>`}<div class="footer"><p>Erstellt am: ${new Date().toLocaleDateString("de-DE")} ${new Date().toLocaleTimeString("de-DE")}</p><p>Auto-Lackierzentrum Mosbach - Fahrzeugannahme-System</p></div></div><div style="page-break-before:always;"></div><div style="padding:30px;"><h2 style="color:#003366;border-bottom:2px solid #003366;padding-bottom:10px;margin-bottom:20px;">Allgemeine Geschäftsbedingungen</h2><div style="font-size:10pt;line-height:1.6;"><h3 style="font-size:11pt;margin-top:15px;color:#003366;">1. Geltungsbereich</h3><p style="margin:5px 0;">Diese AGB gelten für alle Aufträge zwischen dem Auto-Lackierzentrum Mosbach (nachfolgend "Auftragnehmer") und dem Kunden (nachfolgend "Auftraggeber").</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">2. Angebotsgültigkeit</h3><p style="margin:5px 0;">Dieses Angebot ist 30 Tage ab Erstellungsdatum gültig. Preisänderungen bei Ersatzteilen bleiben vorbehalten.</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">3. Zahlungsbedingungen</h3><p style="margin:5px 0;">Die Zahlung ist bei Abholung des Fahrzeugs fällig. Akzeptierte Zahlungsmittel: Barzahlung, EC-Karte, Überweisung (bei Vorkasse).</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">4. Gewährleistung</h3><p style="margin:5px 0;">Auf Lackierarbeiten gewähren wir 24 Monate Garantie. Die Garantie umfasst Farbbeständigkeit, Haftung und Oberflächenqualität bei sachgemäßer Fahrzeugpflege.</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">5. Ersatzteile</h3><p style="margin:5px 0;"><strong>Original (OEM):</strong> Originalteile vom Fahrzeughersteller mit voller Passgarantie.</p><p style="margin:5px 0;"><strong>Aftermarket:</strong> Qualitäts-Ersatzteile von Drittanbietern. Passform kann geringfügig abweichen. Preisersparnis bis zu 50%.</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">6. Haftung</h3><p style="margin:5px 0;">Der Auftragnehmer haftet für Schäden, die durch vorsätzliches oder grob fahrlässiges Verhalten entstehen. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit keine wesentlichen Vertragspflichten verletzt werden.</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">7. Eigentumsvorbehalt</h3><p style="margin:5px 0;">Das Fahrzeug bleibt bis zur vollständigen Bezahlung im Besitz des Auftragnehmers. Ein Zurückbehaltungsrecht besteht bis zur Begleichung aller offenen Forderungen.</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">8. Datenschutz</h3><p style="margin:5px 0;">Personenbezogene Daten werden ausschließlich zur Auftragsabwicklung verwendet und nicht an Dritte weitergegeben (DSGVO-konform).</p><h3 style="font-size:11pt;margin-top:15px;color:#003366;">9. Gerichtsstand</h3><p style="margin:5px 0;">Gerichtsstand ist Mosbach. Es gilt deutsches Recht.</p></div><p style="margin-top:30px;font-size:9pt;color:#666;text-align:center;">Auto-Lackierzentrum Mosbach | Stand: Dezember 2025</p></div></body></html>`;
}

// ============================================
// ✅ BUG #2 FIX: DAILY RATE LIMIT RESET (Cloud Scheduler)
// Runs every day at midnight UTC (Cron: 0 0 * * *)
// ============================================

/**
 * Reset all rate limits for all werkstätten at midnight UTC
 * Called by Cloud Scheduler daily
 *
 * Schedule: 0 0 * * * (every day at 00:00 UTC)
 */
exports.resetDailyRateLimits = onSchedule(
  {
    schedule: "0 0 * * *",  // Midnight UTC
    timeZone: "UTC",
    region: "europe-west3"
  },
  async (event) => {
    console.log("🕛 [resetDailyRateLimits] Daily rate limit reset started");

    try {
      // ✅ BUG #8 FIX: Get all werkstätten dynamically
      const werkstaetten = await getActiveWerkstaetten();
      if (werkstaetten.length === 0) {
        console.log("⚠️ [resetDailyRateLimits] No active werkstätten found");
        return { success: true, totalResets: 0, timestamp: new Date().toISOString() };
      }

      let totalResets = 0;

      for (const werkstattId of werkstaetten) {
        try {
          const count = await rateLimiter.resetAllRateLimits(werkstattId);
          totalResets += count;
          console.log(`✅ [resetDailyRateLimits] Reset ${count} limits for ${werkstattId}`);
        } catch (error) {
          console.error(`❌ [resetDailyRateLimits] Failed for ${werkstattId}:`, error);
          // Continue with other werkstätten even if one fails
        }
      }

      console.log(`🎉 [resetDailyRateLimits] Daily reset complete. Total: ${totalResets} users`);

      return {
        success: true,
        totalResets: totalResets,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ [resetDailyRateLimits] Daily reset failed:", error);
      throw error;
    }
  }
);

// ============================================
// ✅ BUG #2 FIX: GET USER QUOTA (Frontend Display)
// ============================================

/**
 * Get current quota for authenticated user
 * Used by frontend to display remaining quota
 *
 * Request:
 * {
 *   werkstatt: "mosbach" (optional, defaults to "mosbach")
 * }
 *
 * Response:
 * {
 *   success: true,
 *   aiChat: { used: 10, limit: 200, remaining: 190 },
 *   whisper: { used: 5, limit: 100, remaining: 95 },
 *   tts: { used: 3, limit: 100, remaining: 97 },
 *   pdfVision: { used: 1, limit: 50, remaining: 49 },
 *   resetAt: "2025-11-22T00:00:00.000Z"
 * }
 */
exports.getQuota = functions
  .region("europe-west3")
  .https
  .onCall(async (data, context) => {
    try {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Nutzer muss eingeloggt sein'
        );
      }

      const { werkstatt = "mosbach" } = data;
      const userId = context.auth.uid;

      console.log(`📊 [getQuota] Request from user ${userId} for werkstatt ${werkstatt}`);

      // Get quota from rate limiter
      const quota = await rateLimiter.getQuota(userId, werkstatt);

      console.log(`✅ [getQuota] Quota retrieved successfully`);

      return {
        success: true,
        ...quota
      };
    } catch (error) {
      console.error("❌ [getQuota] Failed:", error);
      throw new functions.https.HttpsError(
        'internal',
        `Quota-Abfrage fehlgeschlagen: ${error.message}`
      );
    }
  });

// ============================================
// LOHNABRECHNUNG-SYSTEM: Automatische Monatliche Abrechnung
// ============================================

/**
 * LOHN-KONSTANTEN 2025 (Server-seitig)
 * Gespiegelt von js/lohnberechnung.js
 */
const LOHN_KONSTANTEN_2025 = {
  bbg: { kvPv: 5512.50, rvAv: 7550.00 },
  beitraege: { kv: 7.3, rv: 9.3, av: 1.3, pv: 1.7, pvKinderlos: 0.6 },
  geringfuegig: { minijobGrenze: 538, midijobGrenze: 2000 },
  kirchensteuerSatz: {
    BW: 8, BY: 8, BE: 9, BB: 9, HB: 9, HH: 9, HE: 9, MV: 9,
    NI: 9, NW: 9, RP: 9, SL: 9, SN: 9, ST: 9, SH: 9, TH: 9
  }
};

const MONATSNAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Berechnet Lohnsteuer (vereinfachte Fallback-Berechnung)
 */
function berechneLohnsteuerServer(brutto, steuerklasse, kinderfreibetraege = 0) {
  const jahresBrutto = brutto * 12;
  const grundfreibetrag = 12084;
  const kinderfreibetragProKind = 9312;
  const gesamtKinderfreibetrag = kinderfreibetraege * kinderfreibetragProKind;

  let zvE = steuerklasse === '6'
    ? jahresBrutto - gesamtKinderfreibetrag
    : jahresBrutto - grundfreibetrag - gesamtKinderfreibetrag;

  if (zvE <= 0) return 0;

  const steuerklassenModifikator = {
    '1': 1.0, '2': 0.85, '3': 0.65, '4': 1.0, '5': 1.35, '6': 1.15
  };

  let steuer = 0;
  if (zvE <= 17005) {
    const y = (zvE - 12084) / 10000;
    steuer = (932.30 * y + 1400) * y;
  } else if (zvE <= 66760) {
    const z = (zvE - 17005) / 10000;
    steuer = (176.64 * z + 2397) * z + 1015.13;
  } else if (zvE <= 277826) {
    steuer = 0.42 * zvE - 10636.31;
  } else {
    steuer = 0.45 * zvE - 18971.10;
  }

  steuer *= steuerklassenModifikator[steuerklasse] || 1.0;
  return Math.round((steuer / 12) * 100) / 100;
}

/**
 * Berechnet Sozialversicherung (AN-Anteil)
 */
function berechneSVServer(brutto, svStatus, krankenversicherung, kvZusatzbeitrag, kinderlos, alter) {
  const bbg = LOHN_KONSTANTEN_2025.bbg;
  const beitraege = LOHN_KONSTANTEN_2025.beitraege;

  if (svStatus === 'befreit' || svStatus === 'minijob') {
    return { kv: 0, rv: 0, av: 0, pv: 0, gesamt: 0 };
  }

  const kvBasis = Math.min(brutto, bbg.kvPv);
  const rvBasis = Math.min(brutto, bbg.rvAv);

  let kv = 0, rv = 0, av = 0, pv = 0;

  // KV
  if (krankenversicherung === 'gkv') {
    kv = kvBasis * (beitraege.kv / 100);
    kv += kvBasis * ((kvZusatzbeitrag || 1.7) / 2 / 100);
  }

  // RV (außer Werkstudent)
  if (svStatus !== 'rentner') {
    rv = rvBasis * (beitraege.rv / 100);
  }

  // AV (außer Werkstudent und Rentner)
  if (svStatus !== 'werkstudent' && svStatus !== 'rentner') {
    av = rvBasis * (beitraege.av / 100);
  }

  // PV
  if (svStatus !== 'werkstudent') {
    let pvSatz = beitraege.pv;
    if (kinderlos && alter >= 23) pvSatz += beitraege.pvKinderlos;
    pv = kvBasis * (pvSatz / 100);
  }

  // Midijob-Reduktion
  if (svStatus === 'midijob') {
    const faktor = (brutto - 538) / (2000 - 538);
    kv *= faktor; rv *= faktor; av *= faktor; pv *= faktor;
  }

  return {
    kv: Math.round(kv * 100) / 100,
    rv: Math.round(rv * 100) / 100,
    av: Math.round(av * 100) / 100,
    pv: Math.round(pv * 100) / 100,
    gesamt: Math.round((kv + rv + av + pv) * 100) / 100
  };
}

/**
 * Berechnet komplette Lohnabrechnung serverseitig
 */
function berechneLohnabrechnungServer(mitarbeiter, monat, jahr, zeiterfassung) {
  // Brutto ermitteln
  let brutto = 0;
  let arbeitsstunden = 0;
  const sollstunden = (mitarbeiter.wochenarbeitsstunden || 40) * 4.33;

  if (mitarbeiter.verguetungsart === 'stundenlohn') {
    arbeitsstunden = zeiterfassung?.gesamtStunden || sollstunden;
    brutto = arbeitsstunden * (mitarbeiter.stundenlohn || 0);
  } else {
    brutto = mitarbeiter.monatsgehalt || 0;
    arbeitsstunden = sollstunden;
  }

  brutto = Math.round(brutto * 100) / 100;

  // Steuern
  const lohnsteuer = berechneLohnsteuerServer(
    brutto,
    mitarbeiter.steuerklasse || '1',
    parseFloat(mitarbeiter.kinderfreibetraege) || 0
  );

  const soli = lohnsteuer > 1510.83 ? Math.round(lohnsteuer * 0.055 * 100) / 100 : 0;

  const kistSatz = LOHN_KONSTANTEN_2025.kirchensteuerSatz[mitarbeiter.bundesland] || 9;
  const kirchensteuer = mitarbeiter.kirchensteuer !== 'keine'
    ? Math.round(lohnsteuer * (kistSatz / 100) * 100) / 100
    : 0;

  // Alter berechnen
  const alter = mitarbeiter.geburtsdatum
    ? Math.floor((new Date() - new Date(mitarbeiter.geburtsdatum)) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  // Sozialversicherung
  const sv = berechneSVServer(
    brutto,
    mitarbeiter.svStatus || 'normal',
    mitarbeiter.krankenversicherung || 'gkv',
    mitarbeiter.kvZusatzbeitrag || 1.7,
    mitarbeiter.kinderlos || false,
    alter
  );

  // Netto
  const abzuegeGesamt = lohnsteuer + soli + kirchensteuer + sv.gesamt;
  const netto = Math.round((brutto - abzuegeGesamt) * 100) / 100;

  return {
    mitarbeiterId: mitarbeiter.id,
    mitarbeiterName: mitarbeiter.name,
    monat, jahr,
    abrechnungsDatum: new Date().toISOString(),
    arbeitszeit: {
      sollstunden: Math.round(sollstunden * 100) / 100,
      iststunden: Math.round(arbeitsstunden * 100) / 100,
      differenz: Math.round((arbeitsstunden - sollstunden) * 100) / 100
    },
    brutto: { grundgehalt: brutto, zulagen: 0, zuschlaege: 0, gesamt: brutto },
    steuern: {
      lohnsteuer, solidaritaetszuschlag: soli, kirchensteuer,
      gesamt: Math.round((lohnsteuer + soli + kirchensteuer) * 100) / 100
    },
    sozialversicherung: {
      krankenversicherung: sv.kv,
      rentenversicherung: sv.rv,
      arbeitslosenversicherung: sv.av,
      pflegeversicherung: sv.pv,
      gesamt: sv.gesamt
    },
    abzuege: {
      steuern: Math.round((lohnsteuer + soli + kirchensteuer) * 100) / 100,
      sozialversicherung: sv.gesamt,
      gesamt: Math.round(abzuegeGesamt * 100) / 100
    },
    netto,
    stammdaten: {
      steuerklasse: mitarbeiter.steuerklasse || '1',
      kirchensteuer: mitarbeiter.kirchensteuer || 'keine',
      bundesland: mitarbeiter.bundesland || 'BW',
      svStatus: mitarbeiter.svStatus || 'normal',
      krankenversicherung: mitarbeiter.krankenversicherung || 'gkv',
      verguetungsart: mitarbeiter.verguetungsart || 'monatsgehalt'
    },
    bankverbindung: {
      iban: mitarbeiter.iban || '',
      bic: mitarbeiter.bic || '',
      bank: mitarbeiter.bankName || '',
      kontoinhaber: mitarbeiter.kontoinhaber || mitarbeiter.name
    }
  };
}

/**
 * Generiert HTML für Lohnabrechnung-Email
 */
function generateLohnEmailHTML(abrechnung, werkstattName) {
  const monatName = MONATSNAMEN[abrechnung.monat - 1];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2980b9; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
    .summary { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #666; }
    .value { font-weight: bold; }
    .netto { font-size: 24px; color: #27ae60; }
    .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;">💰 Lohnabrechnung</h1>
    <p style="margin:5px 0 0 0;">${monatName} ${abrechnung.jahr}</p>
  </div>

  <div class="content">
    <p>Hallo ${abrechnung.mitarbeiterName},</p>
    <p>anbei Ihre Lohnabrechnung für ${monatName} ${abrechnung.jahr}.</p>

    <div class="summary">
      <div class="row">
        <span class="label">Brutto:</span>
        <span class="value">${abrechnung.brutto.gesamt.toFixed(2)} €</span>
      </div>
      <div class="row">
        <span class="label">- Steuern:</span>
        <span class="value">${abrechnung.steuern.gesamt.toFixed(2)} €</span>
      </div>
      <div class="row">
        <span class="label">- Sozialversicherung:</span>
        <span class="value">${abrechnung.sozialversicherung.gesamt.toFixed(2)} €</span>
      </div>
      <hr style="border:none;border-top:1px solid #ddd;margin:10px 0;">
      <div class="row">
        <span class="label" style="font-size:18px;">Netto-Auszahlung:</span>
        <span class="value netto">${abrechnung.netto.toFixed(2)} €</span>
      </div>
    </div>

    <p>Die Überweisung erfolgt auf Ihr Konto:</p>
    <p><strong>IBAN:</strong> ${abrechnung.bankverbindung.iban || 'Nicht hinterlegt'}</p>

    <p style="color:#666;font-size:14px;">
      Die detaillierte Lohnabrechnung finden Sie in Ihrem Mitarbeiter-Portal.
    </p>
  </div>

  <div class="footer">
    <p>${werkstattName}</p>
    <p>Diese E-Mail wurde automatisch generiert.</p>
  </div>
</body>
</html>
`;
}

/**
 * SCHEDULED FUNCTION: monthlyPayrollGeneration
 *
 * Läuft am 1. jeden Monats um 06:00 Uhr (Europe/Berlin)
 * Erstellt Lohnabrechnungen für alle aktiven Mitarbeiter
 * Sendet Email an Mitarbeiter mit hinterlegter Email-Adresse
 */
exports.monthlyPayrollGeneration = onSchedule(
  {
    schedule: "0 6 1 * *",           // 1. des Monats, 06:00 Uhr
    timeZone: "Europe/Berlin",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 540,             // 9 Minuten max
    secrets: [awsAccessKeyId, awsSecretAccessKey]
  },
  async (event) => {
    console.log("💰 [monthlyPayrollGeneration] Starting monthly payroll run...");

    const now = new Date();
    // Vormonat berechnen (wenn wir am 1. Januar sind, dann Dezember des Vorjahres)
    let abrechnungsMonat = now.getMonth(); // 0-11, also aktueller Monat - 1 = Vormonat
    let abrechnungsJahr = now.getFullYear();

    if (abrechnungsMonat === 0) {
      abrechnungsMonat = 12;
      abrechnungsJahr -= 1;
    }

    console.log(`📅 Processing payroll for: ${MONATSNAMEN[abrechnungsMonat - 1]} ${abrechnungsJahr}`);

    const stats = {
      werkstaetten: 0,
      mitarbeiter: 0,
      abrechnungen: 0,
      emailsSent: 0,
      errors: []
    };

    try {
      // 1. Alle Werkstätten finden (anhand von settings-Dokumenten)
      const settingsSnapshot = await db.collection('settings').get();
      const werkstaetten = [];

      settingsSnapshot.forEach(doc => {
        if (doc.id.startsWith('werkstatt_') || doc.id === 'werkstatt') {
          const werkstattId = doc.id === 'werkstatt' ? 'mosbach' : doc.id.replace('werkstatt_', '');
          werkstaetten.push({
            id: werkstattId,
            name: doc.data().name || `Werkstatt ${werkstattId}`
          });
        }
      });

      // Fallback: Mindestens Mosbach
      if (werkstaetten.length === 0) {
        werkstaetten.push({ id: 'mosbach', name: 'Auto-Lackierzentrum Mosbach' });
      }

      console.log(`🏭 Found ${werkstaetten.length} werkstätten`);
      stats.werkstaetten = werkstaetten.length;

      // 2. Für jede Werkstatt: Mitarbeiter verarbeiten
      for (const werkstatt of werkstaetten) {
        console.log(`\n📋 Processing werkstatt: ${werkstatt.name} (${werkstatt.id})`);

        try {
          // Mitarbeiter-Collection mit werkstatt-Suffix
          const mitarbeiterRef = db.collection(`mitarbeiter_${werkstatt.id}`);
          const mitarbeiterSnapshot = await mitarbeiterRef
            .where('status', '==', 'active')
            .get();

          if (mitarbeiterSnapshot.empty) {
            console.log(`   ℹ️ No active employees found`);
            continue;
          }

          console.log(`   👥 Found ${mitarbeiterSnapshot.size} active employees`);

          for (const mitarbeiterDoc of mitarbeiterSnapshot.docs) {
            const mitarbeiter = { id: mitarbeiterDoc.id, ...mitarbeiterDoc.data() };
            stats.mitarbeiter++;

            // Prüfen ob Gehalt hinterlegt
            if (!mitarbeiter.stundenlohn && !mitarbeiter.monatsgehalt) {
              console.log(`   ⏭️ Skipping ${mitarbeiter.name}: No salary configured`);
              continue;
            }

            try {
              console.log(`   💼 Processing: ${mitarbeiter.name}`);

              // Zeiterfassung laden
              let zeiterfassung = null;
              const startDatum = `${abrechnungsJahr}-${String(abrechnungsMonat).padStart(2, '0')}-01`;
              const endDatum = abrechnungsMonat === 12
                ? `${abrechnungsJahr + 1}-01-01`
                : `${abrechnungsJahr}-${String(abrechnungsMonat + 1).padStart(2, '0')}-01`;

              const zeitSnapshot = await db.collection(`zeiterfassung_${werkstatt.id}`)
                .where('mitarbeiterId', '==', mitarbeiter.id)
                .where('datum', '>=', startDatum)
                .where('datum', '<', endDatum)
                .get();

              if (!zeitSnapshot.empty) {
                let gesamtStunden = 0;
                zeitSnapshot.forEach(doc => {
                  gesamtStunden += parseFloat(doc.data().stunden) || 0;
                });
                zeiterfassung = { gesamtStunden };
                console.log(`      ⏱️ Time tracked: ${gesamtStunden.toFixed(2)}h`);
              }

              // Lohnabrechnung berechnen
              const abrechnung = berechneLohnabrechnungServer(
                mitarbeiter,
                abrechnungsMonat,
                abrechnungsJahr,
                zeiterfassung
              );

              // In Firestore speichern
              const docId = `${mitarbeiter.id}_${abrechnungsJahr}_${String(abrechnungsMonat).padStart(2, '0')}`;
              await db.collection(`lohnabrechnungen_${werkstatt.id}`).doc(docId).set({
                ...abrechnung,
                werkstattId: werkstatt.id,
                createdAt: admin.firestore.Timestamp.now(),
                createdBy: 'System (Scheduled)'
              });

              stats.abrechnungen++;
              console.log(`      ✅ Payslip saved: ${abrechnung.netto.toFixed(2)}€ netto`);

              // Email senden wenn Adresse hinterlegt
              if (mitarbeiter.externalEmail) {
                try {
                  const sesClient = getAWSSESClient();
                  const emailHtml = generateLohnEmailHTML(abrechnung, werkstatt.name);

                  const emailCommand = new SendEmailCommand({
                    Source: SENDER_EMAIL,
                    Destination: { ToAddresses: [mitarbeiter.externalEmail] },
                    Message: {
                      Subject: {
                        Data: `💰 Lohnabrechnung ${MONATSNAMEN[abrechnungsMonat - 1]} ${abrechnungsJahr}`,
                        Charset: "UTF-8"
                      },
                      Body: {
                        Html: { Data: emailHtml, Charset: "UTF-8" }
                      }
                    }
                  });

                  await sesClient.send(emailCommand);
                  stats.emailsSent++;
                  console.log(`      📧 Email sent to: ${mitarbeiter.externalEmail}`);

                } catch (emailError) {
                  console.error(`      ❌ Email failed: ${emailError.message}`);
                  stats.errors.push(`Email to ${mitarbeiter.name}: ${emailError.message}`);
                }
              }

            } catch (mitarbeiterError) {
              console.error(`   ❌ Error processing ${mitarbeiter.name}:`, mitarbeiterError);
              stats.errors.push(`${mitarbeiter.name}: ${mitarbeiterError.message}`);
            }
          }

        } catch (werkstattError) {
          console.error(`❌ Error processing werkstatt ${werkstatt.id}:`, werkstattError);
          stats.errors.push(`Werkstatt ${werkstatt.id}: ${werkstattError.message}`);
        }
      }

      // Log Summary
      console.log("\n" + "=".repeat(50));
      console.log("📊 MONTHLY PAYROLL SUMMARY");
      console.log("=".repeat(50));
      console.log(`   Werkstätten: ${stats.werkstaetten}`);
      console.log(`   Mitarbeiter: ${stats.mitarbeiter}`);
      console.log(`   Abrechnungen: ${stats.abrechnungen}`);
      console.log(`   Emails sent: ${stats.emailsSent}`);
      console.log(`   Errors: ${stats.errors.length}`);
      if (stats.errors.length > 0) {
        console.log(`   Error details: ${stats.errors.join('; ')}`);
      }

      // System-Log speichern
      await db.collection('systemLogs').add({
        type: 'monthly_payroll',
        timestamp: admin.firestore.Timestamp.now(),
        monat: abrechnungsMonat,
        jahr: abrechnungsJahr,
        stats
      });

      console.log("\n✅ [monthlyPayrollGeneration] Completed successfully");

    } catch (error) {
      console.error("❌ [monthlyPayrollGeneration] Critical error:", error);

      await db.collection('systemLogs').add({
        type: 'monthly_payroll_error',
        timestamp: admin.firestore.Timestamp.now(),
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }
);

/**
 * MANUAL TRIGGER: testMonthlyPayroll
 * Für manuelles Testen der Lohnabrechnung
 * Aufruf: https://europe-west3-auto-lackierzentrum-mosbach.cloudfunctions.net/testMonthlyPayroll?werkstatt=mosbach&monat=11&jahr=2025
 */
exports.testMonthlyPayroll = functions
  .region("europe-west3")
  .runWith({
    secrets: [awsAccessKeyId, awsSecretAccessKey],
    memory: "512MB",
    timeoutSeconds: 300
  })
  .https.onRequest(async (req, res) => {
    console.log("🧪 [testMonthlyPayroll] Manual test triggered");

    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET');
      return res.status(204).send('');
    }

    const werkstattId = req.query.werkstatt || 'mosbach';
    const monat = parseInt(req.query.monat) || new Date().getMonth() + 1;
    const jahr = parseInt(req.query.jahr) || new Date().getFullYear();
    const sendEmail = req.query.email === 'true';

    console.log(`📋 Test parameters: werkstatt=${werkstattId}, monat=${monat}, jahr=${jahr}, sendEmail=${sendEmail}`);

    try {
      const mitarbeiterRef = db.collection(`mitarbeiter_${werkstattId}`);
      const snapshot = await mitarbeiterRef.where('status', '==', 'active').get();

      const results = [];

      for (const doc of snapshot.docs) {
        const mitarbeiter = { id: doc.id, ...doc.data() };

        if (!mitarbeiter.stundenlohn && !mitarbeiter.monatsgehalt) {
          results.push({ name: mitarbeiter.name, status: 'skipped', reason: 'No salary' });
          continue;
        }

        const abrechnung = berechneLohnabrechnungServer(mitarbeiter, monat, jahr, null);

        // Save to Firestore
        const docId = `${mitarbeiter.id}_${jahr}_${String(monat).padStart(2, '0')}_TEST`;
        await db.collection(`lohnabrechnungen_${werkstattId}`).doc(docId).set({
          ...abrechnung,
          werkstattId,
          createdAt: admin.firestore.Timestamp.now(),
          createdBy: 'Manual Test',
          isTest: true
        });

        let emailStatus = 'not_sent';
        if (sendEmail && mitarbeiter.externalEmail) {
          try {
            const sesClient = getAWSSESClient();
            const emailHtml = generateLohnEmailHTML(abrechnung, 'Test-Werkstatt');

            await sesClient.send(new SendEmailCommand({
              Source: SENDER_EMAIL,
              Destination: { ToAddresses: [mitarbeiter.externalEmail] },
              Message: {
                Subject: { Data: `[TEST] Lohnabrechnung ${MONATSNAMEN[monat - 1]} ${jahr}`, Charset: "UTF-8" },
                Body: { Html: { Data: emailHtml, Charset: "UTF-8" } }
              }
            }));
            emailStatus = 'sent';
          } catch (e) {
            emailStatus = `error: ${e.message}`;
          }
        }

        results.push({
          name: mitarbeiter.name,
          status: 'processed',
          brutto: abrechnung.brutto.gesamt,
          netto: abrechnung.netto,
          email: emailStatus
        });
      }

      res.json({
        success: true,
        werkstatt: werkstattId,
        monat: MONATSNAMEN[monat - 1],
        jahr,
        results
      });

    } catch (error) {
      console.error("❌ Test failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// ================================================================================
// LEIHFAHRZEUG EXPIRY SYSTEM - Automatic 48h Release
// Runs every hour to check for expired Leihfahrzeug reservations
// Fixes bug: Leihfahrzeuge stay blocked forever if customer never accepts offer
// ================================================================================

exports.releaseExpiredLeihfahrzeugReservations = onSchedule({
  schedule: 'every 1 hours',
  timeZone: 'Europe/Berlin',
  memory: '256MiB'
}, async (event) => {
  console.log('🔄 [releaseExpiredLeihfahrzeugReservations] Checking for expired reservations...');

  const now = admin.firestore.Timestamp.now();
  let releasedCount = 0;

  try {
    // Find all expired requests in leihfahrzeugAnfragen
    const expiredRequests = await db.collection('leihfahrzeugAnfragen')
      .where('status', '==', 'genehmigt')
      .where('reserviertBis', '<=', now)
      .get();

    console.log(`📋 Found ${expiredRequests.size} expired reservations`);

    for (const doc of expiredRequests.docs) {
      const anfrage = doc.data();
      console.log(`⏰ Releasing expired reservation: ${doc.id}`);

      const batch = db.batch();

      // Update request status to 'abgelaufen'
      batch.update(doc.ref, {
        status: 'abgelaufen',
        abgelaufenAm: admin.firestore.FieldValue.serverTimestamp()
      });

      // Release pool vehicle
      if (anfrage.poolFahrzeugId) {
        const poolRef = db.collection('leihfahrzeugPool').doc(anfrage.poolFahrzeugId);
        batch.update(poolRef, {
          verfuegbar: true,
          reserviertFuer: admin.firestore.FieldValue.delete()
        });
        console.log(`  ✅ Pool vehicle ${anfrage.poolFahrzeugId} released`);
      }

      // Release original vehicle (in werkstatt collection)
      if (anfrage.originalVehicleId && anfrage.besitzerWerkstattId) {
        const collectionName = `leihfahrzeuge_${anfrage.besitzerWerkstattId}`;
        const vehicleRef = db.collection(collectionName).doc(anfrage.originalVehicleId);
        batch.update(vehicleRef, {
          status: 'verfuegbar',
          reserviertFuer: admin.firestore.FieldValue.delete(),
          letzteAenderung: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ✅ Original vehicle ${anfrage.originalVehicleId} in ${collectionName} released`);
      }

      await batch.commit();
      releasedCount++;
    }

    console.log(`✅ [releaseExpiredLeihfahrzeugReservations] Released ${releasedCount} expired reservations`);
    return null;

  } catch (error) {
    console.error('❌ [releaseExpiredLeihfahrzeugReservations] Error:', error);
    throw error;
  }
});

// ================================================================================
// LEIHFAHRZEUG EXPIRY WARNING - 24h Notification
// Runs every 6 hours to notify about soon-expiring reservations
// ================================================================================

exports.notifyExpiringSoonLeihfahrzeugReservations = onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'Europe/Berlin',
  memory: '256MiB'
}, async (event) => {
  console.log('⏰ [notifyExpiringSoonLeihfahrzeugReservations] Checking for soon-expiring reservations...');

  const now = admin.firestore.Timestamp.now();
  const in24h = new Date(now.toDate().getTime() + 24 * 60 * 60 * 1000);
  const in24hTimestamp = admin.firestore.Timestamp.fromDate(in24h);

  try {
    // Find requests expiring within 24h that haven't been notified
    const expiringRequests = await db.collection('leihfahrzeugAnfragen')
      .where('status', '==', 'genehmigt')
      .where('reserviertBis', '<=', in24hTimestamp)
      .where('reserviertBis', '>', now)
      .where('warnungGesendet', '==', false)
      .get();

    console.log(`📋 Found ${expiringRequests.size} reservations expiring within 24h`);

    for (const doc of expiringRequests.docs) {
      const anfrage = doc.data();
      console.log(`⚠️ Marking 24h warning for: ${doc.id}`);

      // Mark as notified (warning sent)
      await doc.ref.update({
        warnungGesendet: true,
        warnungGesendetAm: admin.firestore.FieldValue.serverTimestamp()
      });

      // Note: Email notification can be added here using AWS SES if needed
      // For now, we just mark the warning as sent (visible in admin UI)
    }

    console.log(`✅ [notifyExpiringSoonLeihfahrzeugReservations] Processed ${expiringRequests.size} expiry warnings`);
    return null;

  } catch (error) {
    console.error('❌ [notifyExpiringSoonLeihfahrzeugReservations] Error:', error);
    throw error;
  }
});
