/**
 * Firebase Cloud Functions for Email Notifications
 * Deployed via GitHub Actions
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Helper function: Get and validate SendGrid API Key
// Called lazily at runtime, not at module load time
function getSendGridApiKey() {
  const apiKey = functions.config().sendgrid?.api_key || process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.error("❌ FATAL: SENDGRID_API_KEY ist nicht konfiguriert!");
    console.error("Fix: firebase functions:config:set sendgrid.api_key=\"SG.xxx\" --project auto-lackierzentrum-mosbach");
    throw new Error("Missing SENDGRID_API_KEY environment variable");
  }

  if (!apiKey.startsWith("SG.")) {
    console.warn("⚠️ WARNING: SENDGRID_API_KEY startet nicht mit 'SG.' - möglicherweise ungültig!");
  }

  return apiKey;
}

// Sender Email (MUST be verified in SendGrid!)
const SENDER_EMAIL = "Gaertner-marcel@web.de"; // Verifiziert in SendGrid

// ============================================
// FUNCTION 1: Status-Änderung → Email an Kunde
// ============================================
exports.onStatusChange = functions
    .region("europe-west3") // Frankfurt für DSGVO
    .firestore
    .document("fahrzeuge_{werkstatt}/{vehicleId}") // Multi-Tenant: Wildcard für alle Werkstätten
    .onUpdate(async (change, context) => {
      const werkstatt = context.params.werkstatt; // z.B. "mosbach", "heidelberg"
      const vehicleId = context.params.vehicleId;
      console.log(`📧 Status-Änderung in Werkstatt: ${werkstatt}, Fahrzeug: ${vehicleId}`);

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
          vehicleId: context.params.vehicleId,
          werkstatt: werkstatt, // Multi-Tenant Info
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
          vehicleId: context.params.vehicleId,
          werkstatt: werkstatt, // Multi-Tenant Info
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
