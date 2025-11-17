/**
 * ANGEBOT PDF GENERATION & EMAIL FUNCTIONS
 *
 * Diese Functions müssen ans Ende von index.js hinzugefügt werden
 *
 * INSTALLATION:
 * 1. Kopiere den Inhalt dieser Datei
 * 2. Füge ihn ans Ende von functions/index.js ein
 * 3. cd functions && npm install puppeteer
 * 4. firebase deploy --only functions:generateAngebotPDF,functions:sendAngebotPDFToAdmin
 */

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

        // 3. Create HTML Template
        const htmlContent = createAngebotHTML(entwurf, werkstattId);

        // 4. Convert HTML to PDF with Puppeteer
        console.log("🖨️ Generiere PDF mit Puppeteer...");
        const puppeteer = require("puppeteer");

        const browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
          ]
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
        console.log("✅ PDF erfolgreich generiert");

        // 5. Convert to Base64
        const pdfBase64 = pdfBuffer.toString("base64");
        const filename = `Angebot_${entwurf.kennzeichen.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

        console.log(`📦 PDF Größe: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`✅ PDF generiert: ${filename}`);

        return {
          success: true,
          pdfBase64: pdfBase64,
          filename: filename
        };

      } catch (error) {
        console.error("❌ PDF-Generierung fehlgeschlagen:", error);

        throw new functions.https.HttpsError(
            "internal",
            `PDF-Generierung fehlgeschlagen: ${error.message}`
        );
      }
    });

// ============================================
// FUNCTION: SEND ANGEBOT PDF TO ADMIN
// ============================================
exports.sendAngebotPDFToAdmin = functions
    .region("europe-west3")
    .runWith({
      secrets: [sendgridApiKey]
    })
    .https
    .onCall(async (data, context) => {
      console.log("📧 === SEND ANGEBOT PDF TO ADMIN ===");

      try {
        // 1. Validation
        if (!data.pdfBase64 || !data.filename || !data.werkstattId) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "pdfBase64, filename und werkstattId sind erforderlich"
          );
        }

        const { pdfBase64, filename, werkstattId, kennzeichen, kundenname, vereinbarterPreis } = data;

        // 2. Load Admin Email from Settings
        console.log(`🔍 Lade Admin-Email für Werkstatt: ${werkstattId}`);
        const settingsDoc = await db.collection("settings").doc(werkstattId).get();

        let adminEmail = "info@auto-lackierzentrum.de"; // Fallback
        if (settingsDoc.exists && settingsDoc.data().adminEmail) {
          adminEmail = settingsDoc.data().adminEmail;
          console.log(`✅ Admin-Email gefunden: ${adminEmail}`);
        } else {
          console.warn(`⚠️ Keine Admin-Email in settings/${werkstattId} → Fallback: ${adminEmail}`);
        }

        // 3. Initialize SendGrid
        const apiKey = getSendGridApiKey();
        sgMail.setApiKey(apiKey);

        // 4. Prepare Email
        const msg = {
          to: adminEmail,
          from: SENDER_EMAIL,
          subject: `📄 Neues Angebot erstellt - ${kennzeichen || ""}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #003366;">Neues Angebot erstellt</h2>
              <p>Ein neues Angebot wurde im System erstellt:</p>

              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Kennzeichen:</strong> ${kennzeichen || "N/A"}</p>
                <p style="margin: 5px 0;"><strong>Kunde:</strong> ${kundenname || "N/A"}</p>
                <p style="margin: 5px 0;"><strong>Preis:</strong> ${vereinbarterPreis ? vereinbarterPreis + " €" : "N/A"}</p>
                <p style="margin: 5px 0;"><strong>Erstellt am:</strong> ${new Date().toLocaleDateString("de-DE")} ${new Date().toLocaleTimeString("de-DE")}</p>
              </div>

              <p>Die vollständige Kalkulation finden Sie im Anhang.</p>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                Diese Email wurde automatisch generiert vom Fahrzeugannahme-System.
              </p>
            </div>
          `,
          attachments: [
            {
              content: pdfBase64,
              filename: filename,
              type: "application/pdf",
              disposition: "attachment"
            }
          ]
        };

        // 5. Send Email
        console.log(`📧 Sende Email an: ${adminEmail}`);
        await sgMail.send(msg);
        console.log("✅ Email erfolgreich versendet");

        return {
          success: true,
          adminEmail: adminEmail
        };

      } catch (error) {
        console.error("❌ Email-Versand fehlgeschlagen:", error);

        // SendGrid-spezifische Error Messages
        if (error.response) {
          console.error("SendGrid Response:", error.response.body);
        }

        throw new functions.https.HttpsError(
            "internal",
            `Email-Versand fehlgeschlagen: ${error.message}`
        );
      }
    });

// ============================================
// HELPER: CREATE ANGEBOT HTML TEMPLATE
// ============================================
function createAngebotHTML(entwurf, werkstattId) {
  const kalkulationData = entwurf.kalkulationData || {};
  const ersatzteile = kalkulationData.ersatzteile || [];
  const arbeitslohn = kalkulationData.arbeitslohn || [];
  const lackierung = kalkulationData.lackierung || [];
  const materialien = kalkulationData.materialien || [];

  const ersatzteileSumme = ersatzteile.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const arbeitslohnSumme = arbeitslohn.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const lackierungSumme = lackierung.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);
  const materialienSumme = materialien.reduce((sum, item) => sum + (item.gesamtpreis || 0), 0);

  const nettoSumme = ersatzteileSumme + arbeitslohnSumme + lackierungSumme + materialienSumme;
  const mwstSatz = 19;
  const mwstBetrag = nettoSumme * (mwstSatz / 100);
  const bruttoSumme = nettoSumme + mwstBetrag;

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Angebot - ${entwurf.kennzeichen}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;color:#333}.header{background:#003366;color:white;padding:30px;text-align:center}.header h1{font-size:24pt;margin-bottom:10px}.header p{font-size:12pt}.content{padding:30px}.section{margin-bottom:30px}.section-title{font-size:14pt;font-weight:bold;color:#003366;margin-bottom:15px;border-bottom:2px solid #003366;padding-bottom:5px}.info-grid{display:grid;grid-template-columns:150px 1fr;gap:10px}.info-label{font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:15px}th{background:#003366;color:white;padding:10px;text-align:left;font-weight:bold}td{padding:8px;border-bottom:1px solid #ddd}tr:hover{background:#f9f9f9}.total-row{font-weight:bold;background:#f0f0f0}.summary-box{background:#f5f5f5;padding:20px;border-radius:8px;margin-top:30px}.summary-row{display:flex;justify-content:space-between;padding:8px 0}.summary-label{font-weight:bold}.summary-total{font-size:16pt;font-weight:bold;color:#003366;border-top:2px solid #003366;padding-top:10px}.footer{text-align:center;color:#666;font-size:9pt;margin-top:40px;padding-top:20px;border-top:1px solid #ddd}</style></head><body><div class="header"><h1>Kalkulation & Angebot</h1><p>Auto-Lackierzentrum Mosbach</p></div><div class="content"><div class="section"><div class="section-title">Fahrzeugdaten</div><div class="info-grid"><div class="info-label">Kennzeichen:</div><div>${entwurf.kennzeichen || "N/A"}</div><div class="info-label">Kunde:</div><div>${entwurf.kundenname || "N/A"}</div><div class="info-label">Email:</div><div>${entwurf.kundenEmail || "N/A"}</div><div class="info-label">Telefon:</div><div>${entwurf.telefon || "N/A"}</div><div class="info-label">Fahrzeug:</div><div>${entwurf.marke || ""} ${entwurf.modell || ""}</div><div class="info-label">Baujahr:</div><div>${entwurf.baujahrVon || "N/A"}</div><div class="info-label">KM-Stand:</div><div>${entwurf.kmstand || "N/A"}</div></div></div>${ersatzteile.length > 0 ? `<div class="section"><div class="section-title">Ersatzteile</div><table><thead><tr><th>ETN</th><th>Benennung</th><th style="text-align:right">Anzahl</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${ersatzteile.map(item => `<tr><td>${item.etn || ""}</td><td>${item.benennung || ""}</td><td style="text-align:right">${item.anzahl || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Ersatzteile:</td><td style="text-align:right">${ersatzteileSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${arbeitslohn.length > 0 ? `<div class="section"><div class="section-title">Arbeitslohn</div><table><thead><tr><th>Position</th><th style="text-align:right">Stunden</th><th style="text-align:right">Stundensatz</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${arbeitslohn.map(item => `<tr><td>${item.position || ""}</td><td style="text-align:right">${item.stunden || 0}</td><td style="text-align:right">${(item.stundensatz || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="3" style="text-align:right">Summe Arbeitslohn:</td><td style="text-align:right">${arbeitslohnSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${lackierung.length > 0 ? `<div class="section"><div class="section-title">Lackierung</div><table><thead><tr><th>Position</th><th style="text-align:right">Stunden</th><th style="text-align:right">Stundensatz</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${lackierung.map(item => `<tr><td>${item.position || ""}</td><td style="text-align:right">${item.stunden || 0}</td><td style="text-align:right">${(item.stundensatz || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="3" style="text-align:right">Summe Lackierung:</td><td style="text-align:right">${lackierungSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}${materialien.length > 0 ? `<div class="section"><div class="section-title">Materialien</div><table><thead><tr><th>Kategorie</th><th>Bezeichnung</th><th style="text-align:right">Menge</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamtpreis</th></tr></thead><tbody>${materialien.map(item => `<tr><td>${item.kategorie || ""}</td><td>${item.bezeichnung || ""}</td><td style="text-align:right">${item.menge || 0}</td><td style="text-align:right">${(item.einzelpreis || 0).toFixed(2)} €</td><td style="text-align:right">${(item.gesamtpreis || 0).toFixed(2)} €</td></tr>`).join("")}<tr class="total-row"><td colspan="4" style="text-align:right">Summe Materialien:</td><td style="text-align:right">${materialienSumme.toFixed(2)} €</td></tr></tbody></table></div>` : ""}<div class="summary-box"><div class="summary-row"><span class="summary-label">Netto-Summe:</span><span>${nettoSumme.toFixed(2)} €</span></div><div class="summary-row"><span class="summary-label">MwSt. (${mwstSatz}%):</span><span>${mwstBetrag.toFixed(2)} €</span></div><div class="summary-row summary-total"><span>Gesamt-Betrag:</span><span>${bruttoSumme.toFixed(2)} €</span></div></div><div class="footer"><p>Erstellt am: ${new Date().toLocaleDateString("de-DE")} ${new Date().toLocaleTimeString("de-DE")}</p><p>Auto-Lackierzentrum Mosbach - Fahrzeugannahme-System</p></div></div></body></html>`;
}
