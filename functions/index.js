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