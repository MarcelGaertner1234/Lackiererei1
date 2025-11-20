# Pipeline 3: Entwurf-System (2-Stufen-Angebots-Workflow)

**Projekt:** Fahrzeugannahme App (Auto-Lackierzentrum Mosbach)
**Pipeline-ID:** 03
**Erstellt:** 2025-11-19
**Status:** ⚠️ **1 BLOCKER** (AWS SES Sandbox Mode - Production Access benötigt)
**Implementiert:** 2025-11-17 (14/14 Phasen, 2,055 Zeilen Code, 8 Commits)
**Email Service:** AWS SES (eu-central-1) - Migriert von SendGrid (Nov 2025)

---

## 📋 Inhaltsverzeichnis

1. [SOLL-Ziel](#soll-ziel)
2. [Datenfluss-Übersicht (6 Stufen)](#datenfluss-übersicht)
3. [Stufe 1: Meister-Entwurf](#stufe-1-meister-entwurf)
4. [Stufe 2: Büro-Benachrichtigung](#stufe-2-büro-benachrichtigung)
5. [Stufe 3: Büro-Vervollständigung](#stufe-3-büro-vervollständigung)
6. [Stufe 4: PDF + Email](#stufe-4-pdf--email)
7. [Stufe 5: Kunden-Entscheidung](#stufe-5-kunden-entscheidung)
8. [Stufe 6: Werkstatt-Benachrichtigung](#stufe-6-werkstatt-benachrichtigung)
9. [Gap-Analyse](#gap-analyse)
10. [Empfehlungen](#empfehlungen)

---

## 🎯 SOLL-Ziel

### Geschäftsanforderung

2-stufige Fahrzeugaufnahme: Werkstatt-Meister erstellt minimalen Entwurf (3 Felder: Kennzeichen, Kundenname, Telefon), Büro-Personal vervollständigt Details und sendet professionelles Angebot per Email mit QR-Code zur sofortigen Annahme/Ablehnung.

### Erfolgskriterien

1. ✅ Meister kann Entwurf in <30 Sekunden erstellen
2. ⚠️ Büro erhält Echtzeit-Benachrichtigung (nur Listenansicht, keine Toast)
3. ✅ Kunde erhält professionelles PDF-Angebot per Email mit QR-Code (AWS SES)
4. ⚠️ **BLOCKER:** AWS SES Sandbox Mode - nur verifizierte Empfänger (Production Access benötigt, 24-48h Wartezeit)
5. ✅ Kunde kann Angebot mit 1-Klick annehmen/ablehnen (kein Login)
6. ✅ Werkstatt erhält Echtzeit-Benachrichtigung über Kunden-Entscheidung

---

## 📊 Datenfluss-Übersicht (6 Stufen)

```
STUFE 1: Meister erstellt Entwurf (3 Felder)
   ↓ WRITE: partnerAnfragen_{werkstattId}
   │ Felder: kennzeichen, kundenname, telefon
   │ Flags: isEntwurf=true, entwurfStatus='wartend'
   │
STUFE 2: Büro sieht neue Entwürfe
   ↓ READ: partnerAnfragen_{werkstattId}
   │ Filter: isEntwurf=true, entwurfStatus='wartend'
   │
STUFE 3: Büro vervollständigt Entwurf
   ↓ UPDATE: partnerAnfragen_{werkstattId}
   │ Neue Felder: kundenEmail, serviceTyp, kalkulationData, vereinbarterPreis
   │ Status: entwurfStatus='bereit_zum_versenden'
   │
STUFE 4: PDF-Generierung + Email-Versand
   ↓ WRITE: partnerAutoLoginTokens (QR-Code Token, 7 Tage gültig)
   ↓ CALL: Cloud Function sendEntwurfEmail (AWS SES)
   │ ⚠️ BLOCKER: AWS SES Sandbox Mode (nur verifizierte Empfänger)
   │ NEXT STEP: Production Access beantragen (24-48h)
   │
STUFE 5: Kunde entscheidet (QR-Code Auto-Login)
   ↓ UPDATE: entwurfStatus → 'akzeptiert' OR 'abgelehnt'
   │ Token: used=true (Single-Use)
   │
STUFE 6: Werkstatt-Benachrichtigung
   ↓ WRITE: mitarbeiterNotifications_{werkstattId}
   │ Type: 'entwurf_akzeptiert' OR 'entwurf_abgelehnt'
```

---

## 🔧 Stufe 1: Meister-Entwurf

### Datei & Zeilen

**Geplante Datei:** `annahme.html` (Draft-Modus UI noch NICHT implementiert)
**Aktuelle Umgehung:** `entwuerfe-bearbeiten.html` (vollständiges Formular, nicht ideal)

### SOLL vs IST

**SOLL:**
- Einfaches 3-Felder-Formular
- Toggle-Button "Schnell-Entwurf-Modus"
- Nur sichtbar: Kennzeichen, Kundenname, Telefon
- Alle anderen Felder ausgeblendet

**IST:**
- ⚠️ Meister nutzt `entwuerfe-bearbeiten.html` (vollständiges Formular)
- ⚠️ Meister sieht unnötige Felder (verwirrend)
- ✅ Workflow funktioniert trotzdem (Felder können leer bleiben)

### Datenstruktur

```javascript
// WRITE zu partnerAnfragen_{werkstattId}
const entwurfData = {
  // Minimal-Eingabe (3 Felder)
  kennzeichen: String,           // REQUIRED
  kundenname: String,            // REQUIRED
  telefon: String,               // REQUIRED

  // System-Flags
  isEntwurf: true,               // Unterscheidet Entwurf von regulärer Anfrage
  entwurfStatus: 'wartend',      // Workflow-Status
  createdAt: Timestamp,          // Server-Timestamp
  createdBy: String,             // Meister-Name
  werkstattId: 'mosbach',        // Multi-Tenant

  // Placeholder (später von Büro ausgefüllt)
  kundenEmail: null,
  serviceTyp: null,
  geplantesAbnahmeDatum: null,
  notizen: null,
  kalkulationData: null,
  vereinbarterPreis: null
};
```

### Gap: Fehlende UI

**Problem:**
- Kein dedizierter "Draft-Mode" in `annahme.html`
- Meister muss vollständiges Formular nutzen (ineffizient)

**Lösung (Woche 2-3):**
```javascript
// In annahme.html (Zeile ~500)
<div class="form-mode-toggle">
  <button id="toggleDraftMode" onclick="toggleDraftMode()">
    🚀 Schnell-Entwurf-Modus
  </button>
</div>

<script>
let isDraftMode = false;

function toggleDraftMode() {
  isDraftMode = !isDraftMode;

  // Alle Felder außer Kennzeichen, Kundenname, Telefon ausblenden
  document.querySelectorAll('.optional-field').forEach(field => {
    field.style.display = isDraftMode ? 'none' : 'block';
  });

  // Submit-Button Text ändern
  document.getElementById('submitBtn').textContent = isDraftMode
    ? 'Entwurf erstellen (für Büro)'
    : 'Fahrzeug komplett anlegen';
}
</script>
```

---

## 📧 Stufe 2: Büro-Benachrichtigung

### Datei & Zeilen

**Datei:** `entwuerfe-bearbeiten.html` Zeilen 1795-1900

### Datenfluss

```javascript
// READ: Alle wartenden Entwürfe
const pendingDrafts = await window.getCollection('partnerAnfragen')
  .where('isEntwurf', '==', true)
  .where('entwurfStatus', '==', 'wartend')
  .orderBy('createdAt', 'desc')
  .get();

// UI: Karten-Liste anzeigen
pendingDrafts.forEach(doc => {
  const entwurf = doc.data();
  displayEntwurfCard({
    id: doc.id,
    kennzeichen: entwurf.kennzeichen,
    kundenname: entwurf.kundenname,
    telefon: entwurf.telefon,
    createdAt: entwurf.createdAt,
    createdBy: entwurf.createdBy
  });
});
```

### UI-Elemente

- **Entwurf-Karte:** Kompakte Darstellung mit Kennzeichen + Kundenname
- **"Bearbeiten" Button:** Öffnet Vervollständigungs-Formular
- **Real-Time Listener:** Automatische Updates bei neuen Entwürfen

### Gap: Keine proaktiven Benachrichtigungen

**SOLL:**
- Toast-Benachrichtigung bei neuem Entwurf
- Benachrichtigungsglocke mit Badge-Counter

**IST:**
- ⚠️ Nur Listenansicht (Büro muss manuell prüfen)

**Lösung (Woche 4-6):**
```javascript
// In index.html (Dashboard)
window.getCollection('partnerAnfragen')
  .where('isEntwurf', '==', true)
  .where('entwurfStatus', '==', 'wartend')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const entwurf = change.doc.data();
        toast.info(`📝 Neuer Entwurf: ${entwurf.kennzeichen} (${entwurf.kundenname})`, {
          duration: 8000,
          action: {
            label: 'Öffnen',
            onClick: () => window.location.href = 'entwuerfe-bearbeiten.html'
          }
        });
      }
    });
  });
```

---

## ✍️ Stufe 3: Büro-Vervollständigung

### Datei & Zeilen

**Datei:** `entwuerfe-bearbeiten.html` Zeilen 2600-2900

### Neue Felder

```javascript
// UPDATE zu partnerAnfragen_{werkstattId}
const completedData = {
  // Original-Felder (pre-filled, editierbar)
  kennzeichen: String,           // ✅ Pre-filled
  kundenname: String,            // ✅ Pre-filled
  telefon: String,               // ✅ Pre-filled

  // NEUE Felder (Büro-Eingabe)
  kundenEmail: String,           // REQUIRED - Für Email-Versand
  serviceTyp: String,            // z.B. 'lackierung', 'dellen'
  geplantesAbnahmeDatum: Date,   // Erwartete Fertigstellung
  notizen: String,               // Schadens-Beschreibung

  // NEUE Felder: Itemized Kalkulation (FULL DETAIL)
  kalkulationData: {
    ersatzteile: [
      {
        bezeichnung: 'Stoßstange vorne',
        anzahl: 1,
        einzelpreis: 350.00,
        gesamtpreis: 350.00
      }
    ],
    arbeitslohn: [
      {
        taetigkeit: 'Lackierung Tür links',
        stunden: 3,
        stundensatz: 70.00,
        gesamtpreis: 210.00
      }
    ],
    lackierung: [
      {
        bereich: 'Tür links',
        stunden: 2,
        stundensatz: 80.00,
        gesamtpreis: 160.00
      }
    ],
    materialien: [
      {
        bezeichnung: 'Klarlack 2K',
        menge: 2,
        einheitspreis: 40.00,
        gesamtpreis: 80.00
      }
    ]
  },

  // Auto-berechnet
  vereinbarterPreis: Number,     // Summe aller kalkulationData

  // Status-Update
  entwurfStatus: 'bereit_zum_versenden',
  versendungsdatum: null,        // Später in Stufe 4
  lastModified: Timestamp
};
```

### Kalkulations-Builder UI

**Funktionalität:**
- Dynamische Zeilen (Add/Remove für jede Kategorie)
- Auto-Berechnung: `gesamtpreis = anzahl × einzelpreis`
- Auto-Summe: `vereinbarterPreis = SUM(alle gesamtpreise) × 1.19` (MwSt)

**Beispiel-UI:**

```
┌─────────────────────────────────────────────────┐
│ ERSATZTEILE                                     │
├─────────────────────────────────────────────────┤
│ Bezeichnung       Anzahl  Einzelpreis  Gesamt   │
│ Stoßstange vorne     1×      350€      350€     │
│ Scheinwerfer links   1×      180€      180€     │
│ [+ Zeile hinzufügen]              Summe: 530€   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ARBEITSLOHN                                     │
├─────────────────────────────────────────────────┤
│ Tätigkeit           Stunden  Stundensatz Gesamt │
│ Lackierung Tür         3h       70€      210€   │
│ [+ Zeile hinzufügen]              Summe: 210€   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ GESAMTKALKULATION                               │
├─────────────────────────────────────────────────┤
│ Ersatzteile (Netto):           530,00 €         │
│ Arbeitslohn (Netto):           210,00 €         │
│ Lackierung (Netto):            160,00 €         │
│ Materialien (Netto):            80,00 €         │
│ ─────────────────────────────────────────       │
│ Zwischensumme (Netto):         980,00 €         │
│ MwSt (19%):                    186,20 €         │
│ ═════════════════════════════════════════       │
│ GESAMTSUMME (Brutto):        1.166,20 €         │
└─────────────────────────────────────────────────┘
```

### Validierung

```javascript
// BEFORE Submit
if (!kundenEmail || !kundenEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  toast.error('Gültige Email-Adresse erforderlich');
  return;
}

if (!vereinbarterPreis || vereinbarterPreis <= 0) {
  toast.error('Kalkulation muss mindestens einen Posten enthalten');
  return;
}

if (Math.abs(vereinbarterPreis - calculatedTotal) > 0.01) {
  toast.warning('⚠️ Vereinbarter Preis weicht von Kalkulation ab');
  // Nicht blockierend (Warnung nur)
}
```

---

## 📄 Stufe 4: PDF-Generierung + Email-Versand

### Cloud Function: sendEntwurfEmail

**Datei:** `functions/index.js` Zeilen 3735-3935

### Input-Parameter

```javascript
{
  kundenEmail: 'kunde@example.com',
  kundenname: 'Max Mustermann',
  kennzeichen: 'AA-BC 123',
  qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=...',
  fahrzeugId: 'abc123...'  // Entwurf-Dokument-ID
}
```

### Ablauf

**Schritt 1: QR-Code Token generieren (7-Tage-Gültigkeit)**

```javascript
const autoLoginToken = {
  token: crypto.randomBytes(32).toString('hex'),  // 64-stellig hex
  partnerId: null,                                 // Kunde (kein Partner)
  fahrzeugId: fahrzeugId,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 Tage
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  used: false                                      // Single-Use Flag
};

// WRITE zu partnerAutoLoginTokens (globale Collection)
await db.collection('partnerAutoLoginTokens').add(autoLoginToken);

// QR-Code URL generieren
const loginUrl = `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/kunde-angebot.html?token=${autoLoginToken.token}`;
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(loginUrl)}`;
```

**Schritt 2: Email via SendGrid (🔴 BLOCKER!)**

```javascript
// ❌ PROBLEM: SendGrid-Testversion abgelaufen!
const msg = {
  to: kundenEmail,
  from: 'noreply@auto-lackierzentrum.de',
  subject: `Ihr Angebot: ${kennzeichen}`,
  html: `
    <h2>Ihr Angebot von Auto-Lackierzentrum Mosbach</h2>
    <p>Guten Tag ${kundenname},</p>
    <p>anbei finden Sie Ihr persönliches Angebot für Ihr Fahrzeug <strong>${kennzeichen}</strong>.</p>

    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Angebotssumme: ${vereinbarterPreis}€</h3>
      <p>Geplante Fertigstellung: ${geplantesAbnahmeDatum}</p>
    </div>

    <p>Scannen Sie diesen QR-Code, um das Angebot anzunehmen oder abzulehnen:</p>
    <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;" />

    <p>Oder klicken Sie hier: <a href="${loginUrl}">Angebot prüfen</a></p>

    <p>Mit freundlichen Grüßen,<br>
    Ihr Team vom Auto-Lackierzentrum Mosbach</p>
  `
};

try {
  await sgMail.send(msg);
  console.log('✅ Email versendet');
} catch (error) {
  // ✅ PATTERN 31: Graceful Degradation
  if (error.message.toLowerCase().includes("unauthorized")) {
    console.warn('⚠️ [GRACEFUL DEGRADATION] SendGrid API Key ungültig');

    // Email-Log (für Monitoring)
    await db.collection('email_logs').add({
      to: kundenEmail,
      status: 'skipped',
      reason: 'SendGrid API Key ungültig (Testversion abgelaufen)',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Email übersprungen (SendGrid API Key ungültig)',
      demoMode: true  // ⚠️ Frontend zeigt Warnung
    };
  }

  // Andere Fehler → Throw (blockierend)
  throw error;
}
```

### Frontend-Handling (Demo-Mode)

**Datei:** `entwuerfe-bearbeiten.html` Zeilen 2887-2911

```javascript
// Step 4: Send Email FIRST (before status change)
const emailResult = await sendEmail({
  kundenEmail: email,
  kundenname: kundenname,
  kennzeichen: kennzeichen,
  qrCodeUrl: qrCodeUrl,
  fahrzeugId: currentEntwurfId
});

// ✅ PATTERN 31: Check for Demo Mode
if (emailResult.data.demoMode) {
  console.warn('⚠️ [DEMO MODE] Email nicht versendet:', emailResult.data.message);
  showToast('⚠️ Demo-Modus: Email-Versand übersprungen.\n\nAngebot wird trotzdem erstellt...', 'warning', 8000);
} else {
  console.log('✅ Email versendet');
}

// Workflow continues (status update, etc.)
```

### Gap: SendGrid-Testversion abgelaufen

**🔴 KRITISCHER BLOCKER:**
- **Symptom:** Kunden erhalten KEINE Emails (Workflow unterbrochen!)
- **Root Cause:** SendGrid-Testversion expired, API Key unauthorized
- **Auswirkung:** Entwurf-System funktioniert NICHT Ende-zu-Ende

**Lösung (Sofort - Woche 1):**

**Option A: SendGrid Upgrade** (Empfohlen für Skalierung)
- **Kosten:** $19,95/Monat (40.000 Emails)
- **DSGVO:** ✅ Konform
- **Setup:** 30 Minuten (API Key ersetzen)

**Option B: AWS SES** (Empfohlen für Kosten)
- **Kosten:** €0,10 pro 1.000 Emails (62.000 kostenlos im 1. Jahr)
- **DSGVO:** ✅ Konform
- **Setup:** 2 Stunden (Domain-Verifizierung + Code-Änderung)

**Option C: Resend** (Moderne Alternative)
- **Kosten:** $20/Monat (50.000 Emails)
- **DSGVO:** ✅ Konform
- **Setup:** 1 Stunde (einfache API)

**Temporäre Umgehung:**
```javascript
// Manueller Email-Versand (nicht skalierbar)
// 1. PDF erstellen
// 2. Download
// 3. Manuell per Outlook/Gmail senden mit QR-Code
```

---

## ✅ Stufe 5: Kunden-Entscheidung (QR-Code Auto-Login)

### Datei & Zeilen

**Datei:** `partner-app/anfrage-detail.html` Zeilen 3940-4300

### Auto-Login Flow

**URL:** `kunde-angebot.html?token=abc123def456...`

```javascript
// Step 1: Token aus URL extrahieren
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  toast.error('Ungültiger Link (kein Token)');
  return;
}

// Step 2: Token validieren
const tokenSnapshot = await db.collection('partnerAutoLoginTokens')
  .where('token', '==', token)
  .where('used', '==', false)  // Single-Use Check
  .get();

if (tokenSnapshot.empty) {
  toast.error('Ungültiger oder bereits verwendeter Link');
  return;
}

const tokenData = tokenSnapshot.docs[0].data();
const tokenDocId = tokenSnapshot.docs[0].id;

// Step 3: Expiry Check
if (new Date() > tokenData.expiresAt.toDate()) {
  toast.error('Link ist abgelaufen (7 Tage Gültigkeit)');
  return;
}

// Step 4: Entwurf laden
const fahrzeugId = tokenData.fahrzeugId;
const entwurfDoc = await db.collection(`partnerAnfragen_${werkstattId}`)
  .doc(fahrzeugId)
  .get();

const entwurf = entwurfDoc.data();

// Step 5: Angebot anzeigen (READ-ONLY)
displayAngebot({
  kennzeichen: entwurf.kennzeichen,
  serviceTyp: entwurf.serviceTyp,
  vereinbarterPreis: entwurf.vereinbarterPreis,
  geplantesAbnahmeDatum: entwurf.geplantesAbnahmeDatum,
  notizen: entwurf.notizen,
  kalkulationData: entwurf.kalkulationData  // Itemized breakdown
});
```

### Annahme-Workflow

```javascript
async function akzeptierenEntwurf(fahrzeugId, token) {
  // Step 1: UPDATE Entwurf-Status
  await db.collection(`partnerAnfragen_${werkstattId}`)
    .doc(fahrzeugId)
    .update({
      entwurfStatus: 'akzeptiert',
      akzeptiertAm: firebase.firestore.FieldValue.serverTimestamp(),
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
    });

  // Step 2: Token als verwendet markieren (Single-Use)
  await db.collection('partnerAutoLoginTokens')
    .doc(tokenDocId)
    .update({ used: true });

  // Step 3: Werkstatt-Benachrichtigung senden (Stufe 6)
  await firebase.functions().httpsCallable('sendEntwurfBestaetigtNotification')({
    fahrzeugId: fahrzeugId,
    werkstattId: werkstattId
  });

  // UI: Erfolgs-Meldung
  toast.success('✅ Angebot angenommen! Wir werden uns in Kürze melden.');
}
```

### Ablehnungs-Workflow

```javascript
async function ablehnenEntwurf(fahrzeugId, grund, token) {
  // Modal: Ablehnungsgrund eingeben
  const grund = await showAblehnungsModal();

  if (!grund || grund.trim() === '') {
    toast.warning('Bitte geben Sie einen Grund an');
    return;
  }

  // Step 1: UPDATE Entwurf-Status
  await db.collection(`partnerAnfragen_${werkstattId}`)
    .doc(fahrzeugId)
    .update({
      entwurfStatus: 'abgelehnt',
      ablehnungsgrund: grund,
      abgelehntAm: firebase.firestore.FieldValue.serverTimestamp(),
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
    });

  // Step 2: Token als verwendet markieren
  await db.collection('partnerAutoLoginTokens')
    .doc(tokenDocId)
    .update({ used: true });

  // Step 3: Werkstatt-Benachrichtigung senden
  await firebase.functions().httpsCallable('sendEntwurfAbgelehntNotification')({
    fahrzeugId: fahrzeugId,
    grund: grund,
    werkstattId: werkstattId
  });

  // UI: Bestätigung
  toast.info('Angebot abgelehnt. Vielen Dank für Ihre Rückmeldung.');
}
```

### Security: Single-Use Token

**Warum wichtig?**
- Verhindert mehrfache Annahme/Ablehnung
- Verhindert Replay-Angriffe
- Audit Trail (wann wurde Token verwendet)

**Implementation:**
```javascript
// BEFORE Annahme/Ablehnung
if (tokenData.used) {
  toast.error('Dieser Link wurde bereits verwendet');
  return;
}

// AFTER Annahme/Ablehnung
await db.collection('partnerAutoLoginTokens')
  .doc(tokenDocId)
  .update({ used: true, usedAt: Timestamp });
```

---

## 🔔 Stufe 6: Werkstatt-Benachrichtigung

### Cloud Functions

**Datei:** `functions/index.js` Zeilen 3942-4087

#### Function 1: sendEntwurfBestaetigtNotification

```javascript
exports.sendEntwurfBestaetigtNotification = functions
  .region("europe-west3")
  .https.onCall(async (data, context) => {
    const { fahrzeugId, werkstattId = "mosbach" } = data;

    // Step 1: Entwurf-Daten laden
    const entwurfDoc = await db.collection(`partnerAnfragen_${werkstattId}`)
      .doc(fahrzeugId)
      .get();

    if (!entwurfDoc.exists) {
      throw new Error('Entwurf nicht gefunden');
    }

    const entwurf = entwurfDoc.data();

    // Step 2: Alle Admins + Werkstatt-User finden
    const adminsSnapshot = await db.collection('users')
      .where('werkstattId', '==', werkstattId)
      .where('role', 'in', ['admin', 'werkstatt'])
      .get();

    // Step 3: Benachrichtigung für jeden Admin erstellen
    const notificationPromises = adminsSnapshot.docs.map(adminDoc => {
      const notification = {
        type: 'entwurf_akzeptiert',
        title: `✅ Angebot akzeptiert: ${entwurf.kennzeichen}`,
        message: `Kunde ${entwurf.kundenname} hat das Angebot über ${entwurf.vereinbarterPreis}€ akzeptiert.`,
        fahrzeugId: fahrzeugId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // WRITE zu mitarbeiterNotifications_{werkstattId}
      return db.collection(`mitarbeiterNotifications_${werkstattId}`)
        .add(notification);
    });

    await Promise.all(notificationPromises);

    console.log(`✅ ${adminsSnapshot.size} Benachrichtigungen erstellt`);
    return { success: true, notificationCount: adminsSnapshot.size };
  });
```

#### Function 2: sendEntwurfAbgelehntNotification

```javascript
exports.sendEntwurfAbgelehntNotification = functions
  .region("europe-west3")
  .https.onCall(async (data, context) => {
    const { fahrzeugId, grund, werkstattId = "mosbach" } = data;

    // Ähnlich wie Bestätigung, aber:
    const notification = {
      type: 'entwurf_abgelehnt',
      title: `❌ Angebot abgelehnt: ${entwurf.kennzeichen}`,
      message: `Kunde ${entwurf.kundenname} hat das Angebot abgelehnt.\n\nGrund: ${grund}`,
      fahrzeugId: fahrzeugId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // WRITE zu mitarbeiterNotifications_{werkstattId}
    await db.collection(`mitarbeiterNotifications_${werkstattId}`)
      .add(notification);
  });
```

### Frontend-Anzeige (index.html)

**Real-Time Listener:**
```javascript
// In Dashboard (index.html)
window.getCollection('mitarbeiterNotifications')
  .where('read', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const notif = change.doc.data();

        // Toast-Benachrichtigung
        if (notif.type === 'entwurf_akzeptiert') {
          toast.success(notif.title, {
            description: notif.message,
            duration: 10000
          });
        } else if (notif.type === 'entwurf_abgelehnt') {
          toast.error(notif.title, {
            description: notif.message,
            duration: 10000
          });
        }

        // Benachrichtigungsglocke Badge aktualisieren
        updateNotificationBadge(+1);
      }
    });
  });
```

---

## 📊 Gap-Analyse: SOLL vs IST

### 🔴 KRITISCHE LÜCKE (BLOCKER)

| Stufe | SOLL | IST | Gap | Priorität |
|-------|------|-----|-----|-----------|
| **Stufe 4: Email** | Email mit PDF an Kunde | ⚠️ SendGrid-Testversion abgelaufen | 🔴 **BLOCKER** | **DRINGEND** |

**Auswirkung:**
- Entwurf-System **NICHT funktionsfähig** Ende-zu-Ende
- Kunde erhält KEIN Angebot (Kommunikation unterbrochen)
- Workflow endet nach Stufe 3 (Büro-Vervollständigung)

**Lösung:**
→ Siehe [Empfehlungen: Sofortmaßnahmen](#sofortmaßnahmen-woche-1)

---

### ⚠️ MITTLERE LÜCKEN

| # | Problem | Auswirkung | Priorität |
|---|---------|-----------|-----------|
| 1 | Kein Schnell-Entwurf-Modus | Meister sieht unnötige Felder (UX) | MITTEL |
| 2 | Keine proaktiven Benachrichtigungen | Büro muss manuell prüfen (Verzögerung) | NIEDRIG |
| 3 | Token-Expiry vs Kunden-Zugriff | Kunde erhält Email nach 7 Tagen → Token abgelaufen | NIEDRIG |

---

## 🎯 Empfehlungen

### Sofortmaßnahmen (Woche 1)

**1. SendGrid Email-Problem beheben (DRINGEND!)**

**Option A: AWS SES** (Empfohlen)
```bash
# 1. AWS SES Setup
aws ses verify-email-identity --email-address noreply@auto-lackierzentrum.de

# 2. Node.js Dependency
cd functions
npm install @aws-sdk/client-ses

# 3. Code-Änderung (functions/index.js)
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'eu-central-1' });

async function sendEmailViaSES(to, subject, html) {
  const params = {
    Source: 'noreply@auto-lackierzentrum.de',
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } }
    }
  };

  await sesClient.send(new SendEmailCommand(params));
}

# 4. Deploy
firebase deploy --only functions:sendEntwurfEmail
```

**Option B: SendGrid Upgrade** (Schneller)
```bash
# 1. SendGrid-Konto upgraden ($19.95/Monat)
# 2. Neuen API Key generieren
# 3. Firebase Secret Manager aktualisieren
firebase functions:secrets:set SENDGRID_API_KEY

# 4. Deploy (keine Code-Änderung nötig)
firebase deploy --only functions:sendEntwurfEmail
```

---

### Kurzfristig (Woche 2-3)

**2. Schnell-Entwurf-Modus UI** (Priorität: MITTEL)

**Datei:** `annahme.html`

**Code hinzufügen:**
→ Siehe [Stufe 1: Gap-Lösung](#gap-fehlende-ui)

---

### Mittelfristig (Woche 4-6)

**3. Proaktive Benachrichtigungen** (Priorität: NIEDRIG)

**Datei:** `index.html`

**Code hinzufügen:**
→ Siehe [Stufe 2: Gap-Lösung](#gap-keine-proaktiven-benachrichtigungen)

---

**4. Token-Expiry Monitoring** (Priorität: NIEDRIG)

**Cloud Function:**
```javascript
// Scheduled Function (täglich)
exports.checkExpiredTokens = functions
  .region("europe-west3")
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    const now = new Date();

    // Tokens die in <24h ablaufen
    const expiringTokens = await db.collection('partnerAutoLoginTokens')
      .where('expiresAt', '<', new Date(now.getTime() + 24 * 60 * 60 * 1000))
      .where('used', '==', false)
      .get();

    // Admin-Benachrichtigung
    if (!expiringTokens.empty) {
      console.warn(`⚠️ ${expiringTokens.size} Tokens laufen in <24h ab`);
      // Optional: Admin-Email senden
    }
  });
```

---

## 🔧 AWS SES Migration (Nov 2025)

### Migration Summary

**Datum:** 2025-11-20 (00:00-01:00 Uhr)
**Grund:** SendGrid Testversion abgelaufen
**Status:** ✅ Code deployed, ⚠️ Sandbox Mode (BLOCKER)

**Code-Änderungen:**
- Dependencies: `@sendgrid/mail` → `@aws-sdk/client-ses@^3.525.0`
- Cloud Function: `sendEntwurfEmail` (functions/index.js Line 3789) migriert zu AWS SES
- Helper: `getAWSSESClient()` mit Credential Sanitization (.trim())
- Region: eu-central-1 (Frankfurt) - DSGVO-konform

**AWS Setup:**
- Account: Gaertner-marcel@web.de
- Sender Email verifiziert: ✅
- IAM User: MarcelGaertner (AmazonSESFullAccess)
- Firebase Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

**Aktueller Blocker:**
- AWS SES Sandbox Mode: ONLY verifizierte Empfänger-Emails erlaubt
- Rate Limits: 1 Email/s, max. 200 Emails/24h
- **NICHT Production-ready!**

**Lösung:**
1. AWS SES Console: Request Production Access
2. Formular ausfüllen (Use case, Daily volume, Bounce rate)
3. Warte 24-48h auf AWS Approval
4. Nach Approval: KEINE Empfänger-Verifikation mehr nötig

**Siehe:** `docs/AWS_SES_SETUP_GUIDE.md` für vollständige Setup-Anleitung

---

## 📚 Verwandte Dokumentation

- [Pipeline 6: Rechnung Auto-Creation](./pipeline-06-rechnung-auto.md) (nutzt kalkulationData)
- [Pattern 31: Graceful Degradation](../../NEXT_AGENT_MANUAL_TESTING_PROMPT.md#pattern-31)
- [Cross-Pipeline-Analyse](../CROSS_PIPELINE_ANALYSIS.md#email-dependencies)
- [AWS SES Setup Guide](../AWS_SES_SETUP_GUIDE.md) (Migration Details)

---

**Letzte Aktualisierung:** 2025-11-20 (AWS SES Migration)
**Version:** 1.1
**Status:** ⚠️ **1 BLOCKER** (AWS SES Sandbox Mode - Production Access benötigt)
**Implementierungs-Commits:** 31b0e68 → f7b6871 (8 Commits, Nov 17, 2025) + 45f3bab (AWS SES Migration, Nov 20, 2025)
