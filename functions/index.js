/**
 * Firebase Cloud Functions for Email Notifications & AI Agent
 * Deployed via GitHub Actions
 *
 * Uses Google Cloud Secret Manager for API Keys (defineSecret)
 * Secrets configured: OPENAI_API_KEY, SENDGRID_API_KEY
 */
const functions = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================
// SECRET DEFINITIONS (Google Cloud Secret Manager)
// ============================================

// Define secrets (will be loaded from Google Cloud Secret Manager)
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Helper function: Get and validate SendGrid API Key
function getSendGridApiKey() {
  const apiKey = sendgridApiKey.value();

  if (!apiKey) {
    throw new Error("Missing SENDGRID_API_KEY - run: firebase functions:secrets:set SENDGRID_API_KEY");
  }

  if (!apiKey.startsWith("SG.")) {
    console.warn("⚠️ WARNING: SENDGRID_API_KEY startet nicht mit 'SG.' - möglicherweise ungültig!");
  }

  console.log("✅ SendGrid API Key loaded from Secret Manager");
  return apiKey;
}

// Helper function: Get and validate OpenAI API Key
function getOpenAIApiKey() {
  const apiKey = openaiApiKey.value();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY - run: firebase functions:secrets:set OPENAI_API_KEY");
  }

  if (!apiKey.startsWith("sk-")) {
    console.warn("⚠️ WARNING: OPENAI_API_KEY startet nicht mit 'sk-' - möglicherweise ungültig!");
  }

  console.log("✅ OpenAI API Key loaded from Secret Manager");
  return apiKey;
}

// Sender Email (MUST be verified in SendGrid!)
const SENDER_EMAIL = "Gaertner-marcel@web.de"; // Verifiziert in SendGrid

// ============================================
// FUNCTION 1: Status-Änderung → Email an Kunde
// ============================================
exports.onStatusChange = functions
    .region("europe-west3") // Frankfurt für DSGVO
    .runWith({
      secrets: [sendgridApiKey] // Bind SendGrid API Key from Secret Manager
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

      // Load email template
      const templatePath = path.join(__dirname, "email-templates", "status-change.html");
      let template = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
      const variables = {
        kennzeichen: after.kennzeichen || "k.A.",
        kundenName: after.kundenName || "Kunde",
        oldStatus: getStatusLabel(before.status),
        newStatus: getStatusLabel(after.status),
        serviceTyp: getServiceLabel(after.serviceTyp),
        marke: after.marke || "k.A.",
        modell: after.modell || "",
        quickViewLink: `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/anfrage-detail.html?id=${context.params.vehicleId}&mode=quickview&kennzeichen=${encodeURIComponent(after.kennzeichen)}`,
      };

      Object.keys(variables).forEach((key) => {
        template = template.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
      });

      // Initialize SendGrid (lazy - only when needed)
      const apiKey = getSendGridApiKey();
      sgMail.setApiKey(apiKey);
      console.log("✅ SendGrid initialized for status change email");

      // Send email
      const msg = {
        to: kundenEmail,
        from: SENDER_EMAIL,
        subject: `🚗 Status-Update: ${after.kennzeichen}`,
        html: template,
      };

      try {
        await sgMail.send(msg);
        console.log(`✅ Email sent to: ${kundenEmail}`);

        // Log to Firestore
        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: msg.subject,
          trigger: "status_change",
          vehicleId: vehicleId,
          collectionId: collectionId, // z.B. "fahrzeuge_mosbach"
          werkstatt: werkstatt, // z.B. "mosbach"
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ SendGrid error:", error.message);
        console.error("Error details:", error.response ? error.response.body : "No response body");

        // Log error mit mehr Details
        await db.collection("email_logs").add({
          to: kundenEmail,
          subject: msg.subject,
          trigger: "status_change",
          vehicleId: vehicleId,
          collectionId: collectionId, // z.B. "fahrzeuge_mosbach"
          werkstatt: werkstatt, // z.B. "mosbach"
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: error.message,
          errorCode: error.code || null,
          errorResponse: error.response ? JSON.stringify(error.response.body) : null,
        });

        // Throw error um Function als "failed" zu markieren
        throw new Error(`Email sending failed: ${error.message}`);
      }

      return null;
    });

// ============================================
// FUNCTION 2: Neue Partner-Anfrage → Email an Werkstatt
// ============================================
exports.onNewPartnerAnfrage = functions
    .region("europe-west3")
    .runWith({
      secrets: [sendgridApiKey] // Bind SendGrid API Key from Secret Manager
    })
    .firestore
    .document("partnerAnfragen/{anfrageId}")
    .onCreate(async (snap, context) => {
      const anfrage = snap.data();

      console.log(`📧 New partner anfrage: ${anfrage.kennzeichen}`);

      // Get werkstatt admin emails
      const adminsSnapshot = await db.collection("users")
          .where("role", "in", ["admin", "superadmin"])
          .where("status", "==", "active")
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
        createdAt: new Date(anfrage.timestamp).toLocaleString("de-DE"),
        anfrageLink: `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/anfrage-detail.html?id=${context.params.anfrageId}`,
      };

      Object.keys(variables).forEach((key) => {
        template = template.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
      });

      // Initialize SendGrid (lazy - only when needed)
      const apiKey = getSendGridApiKey();
      sgMail.setApiKey(apiKey);
      console.log("✅ SendGrid initialized for partner anfrage email");

      // Send email to all admins
      const msg = {
        to: adminEmails,
        from: SENDER_EMAIL,
        subject: `🔔 Neue Anfrage von ${anfrage.partnerName}`,
        html: template,
      };

      try {
        await sgMail.send(msg);
        console.log(`✅ Email sent to ${adminEmails.length} admins`);

        // Log
        await db.collection("email_logs").add({
          to: adminEmails.join(", "),
          subject: msg.subject,
          trigger: "new_anfrage",
          anfrageId: context.params.anfrageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ SendGrid error:", error.message);

        await db.collection("email_logs").add({
          to: adminEmails.join(", "),
          subject: msg.subject,
          trigger: "new_anfrage",
          anfrageId: context.params.anfrageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: error.message,
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
      secrets: [sendgridApiKey] // Bind SendGrid API Key from Secret Manager
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
        template = template.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
      });

      // Send email
      // Initialize SendGrid (lazy - only when needed)
      const apiKey = getSendGridApiKey();
      sgMail.setApiKey(apiKey);
      console.log("✅ SendGrid initialized for user approved email");

      const msg = {
        to: after.email,
        from: SENDER_EMAIL,
        subject: "✅ Ihr Account wurde freigeschaltet",
        html: template,
      };

      try {
        await sgMail.send(msg);
        console.log(`✅ Welcome email sent to: ${after.email}`);

        await db.collection("email_logs").add({
          to: after.email,
          subject: msg.subject,
          trigger: "user_approved",
          userId: context.params.userId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "sent",
        });
      } catch (error) {
        console.error("❌ SendGrid error:", error.message);

        await db.collection("email_logs").add({
          to: after.email,
          subject: msg.subject,
          trigger: "user_approved",
          userId: context.params.userId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          error: error.message,
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

        console.log(`🤖 AI Agent Request von User ${userId || "anonym"}: "${message}"`);

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
          model: "gpt-4-turbo-preview",
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
            model: "gpt-4-turbo-preview",
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
      "versicherung": "neu"
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
      const serviceTypen = ["Lackierung", "Reifen", "Mechanik", "Pflege", "TÜV", "Versicherung"];
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
        const { audio, language = "de" } = data;

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
          format = "mp3" // Default: MP3 (beste Browser-Kompatibilität)
        } = data;

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

        // Get all werkstätten (we need to check each one)
        // For now, hardcoded to mosbach (can be extended to query users collection)
        const werkstaetten = ["mosbach"]; // TODO: Query from users collection where role='werkstatt'

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
 * @param {string} kundenname - Customer name
 * @param {string} werkstattId - Workshop ID (default: "mosbach")
 * @returns {object} { partnerId, email, generatedPassword | null, isNewPartner }
 */
exports.ensurePartnerAccount = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔐 ensurePartnerAccount called");

      // Validate input
      const { email, kundenname, werkstattId = "mosbach" } = data;

      if (!email || !kundenname) {
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
              displayName: kundenname
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
              name: kundenname,
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
              name: kundenname,
              werkstattId: werkstattId,
              uid: userRecord.uid,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              bonusPunkte: 0,
              status: "active"
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
            name: kundenname,
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
            name: kundenname,
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
            name: kundenname,
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
 * @param {string} partnerId - Partner ID (email username)
 * @param {string} werkstattId - Workshop ID
 * @param {string} fahrzeugId - Optional: Specific vehicle ID
 * @param {number} expiresInDays - Token expiration (default: 30)
 * @returns {object} { token, loginUrl, expiresAt }
 */
exports.createPartnerAutoLoginToken = functions
    .region("europe-west3")
    .https.onCall(async (data, context) => {
      console.log("🔑 createPartnerAutoLoginToken called");

      // Validate input
      const { partnerId, werkstattId, fahrzeugId = null, expiresInDays = 30 } = data;

      if (!partnerId || !werkstattId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "partnerId und werkstattId erforderlich"
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
          partnerId: partnerId,
          werkstattId: werkstattId,
          fahrzeugId: fahrzeugId,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(now)),
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          usedAt: null,
          usedCount: 0,
          maxUses: 999 // Practically unlimited within 30 days
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