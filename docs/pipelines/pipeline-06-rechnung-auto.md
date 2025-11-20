# Pipeline 6: Rechnung Auto-Creation (Automatische Rechnungserstellung)

**Projekt:** Fahrzeugannahme App (Auto-Lackierzentrum Mosbach)
**Pipeline-ID:** 06
**Erstellt:** 2025-11-19
**Status:** ✅ PRODUKTIONSREIF (Email-Feature blockiert durch SendGrid)
**Abhängigkeiten:** Pipeline 3, 4, 5 (Daten-Quellen für PDF)

---

## 📋 Inhaltsverzeichnis

1. [SOLL-Ziel](#soll-ziel)
2. [Datenfluss-Übersicht (4 Stufen)](#datenfluss-übersicht)
3. [Stufe 1: Status-Trigger](#stufe-1-status-trigger)
4. [Stufe 2: Rechnungsnummer-Generierung](#stufe-2-rechnungsnummer-generierung)
5. [Stufe 3: Rechnungsdaten erstellen](#stufe-3-rechnungsdaten-erstellen)
6. [Stufe 4: Invoice PDF (Waterfall-Logic)](#stufe-4-invoice-pdf-waterfall-logic)
7. [Gap-Analyse](#gap-analyse)
8. [Empfehlungen](#empfehlungen)

---

## 🎯 SOLL-Ziel

### Geschäftsanforderung

Automatische Rechnungserstellung, wenn Fahrzeugstatus auf "Fertig" wechselt, um manuelle Rechnungserstellung zu eliminieren und sicherzustellen, dass alle abgeschlossenen Arbeiten abgerechnet werden.

### Erfolgskriterien

1. ✅ Rechnung wird innerhalb von 5 Sekunden nach Statusänderung zu "Fertig" erstellt
2. ✅ Rechnungsnummer folgt Counter-basiertem Format: `RE-YYYY-MM-NNNN`
3. ✅ Rechnungsdaten in beiden Speicherorten: `fahrzeuge.rechnung` (embedded) + `rechnungen_{werkstattId}` (collection)
4. ✅ Rechnungs-PDF enthält aufgeschlüsselte Kosten (wenn via Waterfall-Logic verfügbar)
5. ⚠️ Email-Versand blockiert (SendGrid-Testversion abgelaufen, gleicher Blocker wie Pipeline 3)

---

## 📊 Datenfluss-Übersicht (4 Stufen)

```
STUFE 1: Status-Änderung zu "Fertig" (kanban.html OR liste.html)
   ↓ TRIGGER: autoCreateRechnung()
   │
STUFE 2: Rechnungsnummer generieren (Counter-basiert, atomar)
   ↓ READ/UPDATE: counters.rechnungsCounter_{werkstattId}_{YYYY-MM}
   │ Format: RE-2025-11-0042
   │
STUFE 3: Rechnungsdaten erstellen (Dual-Write)
   ↓ WRITE 1: rechnungen_{werkstattId}.add(rechnung)
   ↓ WRITE 2: fahrzeuge_{werkstattId}.rechnung (embed)
   │
STUFE 4: Rechnungs-PDF generieren (Waterfall-Logic)
   ↓ READ: kalkulationData (SOURCE 1) OR
   ↓ READ: kva.breakdown (SOURCE 2) OR
   ↓ READ: kostenAufschluesselung (SOURCE 3.5) OR
   ↓ READ: vereinbarterPreis (SOURCE 4 - Fallback)
```

---

## 🔔 Stufe 1: Status-Trigger

### Datei & Zeilen

**Datei:** `kanban.html` Zeilen 4818-4834 (Inside `changeStatus()` Function)

### Trigger-Logic

```javascript
async function changeStatus(fahrzeugId, newStatus, oldStatus) {
  const fahrzeugRef = window.getCollection('fahrzeuge').doc(fahrzeugId);
  const fahrzeugDoc = await fahrzeugRef.get();
  const invoiceVehicleData = fahrzeugDoc.data();

  // ===== STEP 1: UPDATE status FIRST (commit immediately) =====
  await fahrzeugRef.update({
    status: newStatus,
    lastModified: firebase.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Status changed: ${oldStatus} → ${newStatus}`);

  // ===== STEP 2: Auto-create invoice if status is "Fertig" (non-blocking) =====
  if (newStatus === 'Fertig') {
    try {
      const rechnungData = await autoCreateRechnung(fahrzeugId, invoiceVehicleData);

      if (rechnungData) {
        // ===== STEP 3: UPDATE fahrzeug with invoice data (second update) =====
        await fahrzeugRef.update({
          rechnung: rechnungData,
          lastModified: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Rechnung automatisch erstellt:', rechnungData.rechnungsnummer);

        // ===== TOAST NOTIFICATION =====
        toast.success(`Rechnung erstellt: ${rechnungData.rechnungsnummer}`, {
          duration: 5000,
          action: {
            label: 'PDF erstellen',
            onClick: () => openRechnungPDF(rechnungData.id)
          }
        });
      }
    } catch (error) {
      // ✅ PATTERN 31: Non-blocking error handling
      console.error('❌ Fehler bei automatischer Rechnungserstellung (Status bereits gespeichert):', error);
      console.error('   → Rechnung kann später manuell erstellt werden');

      toast.error('⚠️ Rechnung konnte nicht automatisch erstellt werden. Bitte manuell erstellen.', {
        duration: 10000
      });

      // ✅ Status update is NOT affected (already committed in step 1)
    }
  }

  // ... rest of function (Auto-Invoice on "Fertig", etc.)
}
```

**⚠️ CRITICAL DESIGN PATTERN:**
- Status-Update ist **blockierend** (commitet sofort)
- Rechnungs-Erstellung ist **non-blocking** (Fehler rollt Status NICHT zurück)
- **Rationale:** Status-Wechsel ist primäre User-Aktion, Rechnung ist sekundäre Automation
- **Fallback:** Wenn Auto-Erstellung fehlschlägt, kann Personal Rechnung später manuell erstellen

---

## 🔢 Stufe 2: Rechnungsnummer-Generierung (Counter-basiert)

### Datei & Zeilen

**Datei:** `kanban.html` Zeilen 5360-5420 (Function `generateRechnungsnummer()`)

### Format

```
RE-YYYY-MM-NNNN

RE    = Rechnung (Prefix)
YYYY  = Jahr (4-stellig)
MM    = Monat (2-stellig, 01-12)
NNNN  = Laufende Nummer (4-stellig, monatlich zurücksetzend)

Beispiel: RE-2025-11-0042
```

### Implementation (Atomic Transaction)

```javascript
async function generateRechnungsnummer(werkstattId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');  // 01-12

  // ===== Counter-Dokument-ID: rechnungsCounter_{werkstattId}_{YYYY-MM} =====
  const counterDocId = `rechnungsCounter_${werkstattId}_${year}-${month}`;
  const counterRef = db.collection('counters').doc(counterDocId);

  // ===== ATOMIC INCREMENT (verhindert doppelte Nummern) =====
  const result = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let newCounter;

    if (!counterDoc.exists) {
      // ===== ERSTE Rechnung des Monats =====
      newCounter = 1;
      transaction.set(counterRef, {
        counter: 1,
        year: year,
        month: month,
        werkstattId: werkstattId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Neuer Counter erstellt: ${counterDocId} → 1`);
    } else {
      // ===== INCREMENT bestehender Counter =====
      newCounter = counterDoc.data().counter + 1;
      transaction.update(counterRef, {
        counter: newCounter,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Counter erhöht: ${counterDocId} → ${newCounter}`);
    }

    return newCounter;
  });

  // ===== FORMAT: RE-YYYY-MM-NNNN (NNNN = 4-digit zero-padded) =====
  const rechnungsnummer = `RE-${year}-${month}-${String(result).padStart(4, '0')}`;
  console.log('✅ Rechnungsnummer generiert:', rechnungsnummer);

  return rechnungsnummer;
}
```

### Beispiel-Sequenz

```
Nov 2025:
  RE-2025-11-0001  (Erste Rechnung des Monats)
  RE-2025-11-0002  (Zweite Rechnung)
  ...
  RE-2025-11-0042  (42. Rechnung)

Dez 2025:
  RE-2025-12-0001  (Counter setzt sich monatlich zurück)
  RE-2025-12-0002
  ...
```

**⚠️ RACE CONDITION PREVENTION:**
- **Transaction:** `db.runTransaction()` garantiert atomare Read-Modify-Write
- **Warum:** Wenn 2 Mitarbeiter gleichzeitig 2 Fahrzeuge auf "Fertig" setzen → Beide bekommen eindeutige Nummern (kein Duplikat!)
- **Fallback:** Wenn Transaction fehlschlägt (Network Error) → Retry automatisch (max. 5× durch Firebase SDK)

---

## 💾 Stufe 3: Rechnungsdaten erstellen

### Datei & Zeilen

**Datei:** `kanban.html` Zeilen 5320-5440 (Function `autoCreateRechnung()`)

### Datenstruktur

```javascript
async function autoCreateRechnung(fahrzeugId, fahrzeugData) {
  const werkstattId = window.werkstattId || 'mosbach';

  // ===== STEP 1: Generate invoice number =====
  const rechnungsnummer = await generateRechnungsnummer(werkstattId);

  // ===== STEP 2: Build invoice data =====
  const rechnung = {
    // ========== GRUPPE 1: INVOICE IDENTITY ==========
    rechnungsnummer: rechnungsnummer,        // RE-2025-11-0042
    rechnungsdatum: new Date().toISOString().split('T')[0],  // YYYY-MM-DD

    // ========== GRUPPE 2: CUSTOMER INFO (from fahrzeugData) ==========
    kennzeichen: fahrzeugData.kennzeichen,
    kundenname: fahrzeugData.kundenname,
    kundenemail: fahrzeugData.email || fahrzeugData.kundenEmail,
    kundentelefon: fahrzeugData.telefon,

    // ========== GRUPPE 3: SERVICE DETAILS ==========
    serviceTyp: fahrzeugData.serviceTyp,
    serviceBeschreibung: fahrzeugData.schadensbeschreibung || fahrzeugData.notizen || 'Keine Beschreibung',

    // ========== GRUPPE 4: PRICING (Brutto) ==========
    betragBrutto: fahrzeugData.vereinbarterPreis || 0,
    betragNetto: calculateNetto(fahrzeugData.vereinbarterPreis, 19),  // Reverse-calculate
    mwstSatz: 19,
    mwstBetrag: fahrzeugData.vereinbarterPreis - calculateNetto(fahrzeugData.vereinbarterPreis, 19),

    // ========== GRUPPE 5: PAYMENT STATUS ==========
    bezahlstatus: 'Offen',                   // Initial status
    zahlungsdatum: null,                     // Filled when paid
    zahlungsart: null,                       // e.g., 'Bar', 'EC-Karte', 'Überweisung'

    // ========== GRUPPE 6: LINKS (Bidirectional) ==========
    fahrzeugId: fahrzeugId,                  // Link back to vehicle
    partnerId: fahrzeugData.partnerId || null,  // If partner-created
    isPartnerAnfrage: fahrzeugData.isPartnerAnfrage || false,

    // ========== GRUPPE 7: MULTI-SERVICE DATA (if applicable) ==========
    serviceBreakdown: null,                  // Filled below if multi-service
    serviceLabels: null,
    isMultiService: false,

    // ========== GRUPPE 8: METADATA ==========
    werkstattId: werkstattId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: window.currentUser?.name || 'System',
    lastModified: firebase.firestore.FieldValue.serverTimestamp()
  };

  // ===== STEP 3: Add Multi-Service breakdown (for PDF generation) =====
  if (fahrzeugData.kva?.breakdown && fahrzeugData.kva?.isMultiService) {
    console.log('   📦 [MULTI-SERVICE] Füge serviceBreakdown zur Rechnung hinzu');
    rechnung.serviceBreakdown = fahrzeugData.kva.breakdown;
    rechnung.serviceLabels = fahrzeugData.kva.serviceLabels || {};
    rechnung.isMultiService = true;
  }

  // ===== STEP 4: WRITE 1 - to rechnungen_{werkstattId} collection =====
  const rechnungRef = await window.getCollection('rechnungen').add(rechnung);
  rechnung.id = rechnungRef.id;  // Add document ID to object

  console.log('✅ [autoCreateRechnung] Rechnung erstellt:', rechnung);

  // ===== STEP 5: Return for embedding (WRITE 2 happens in changeStatus) =====
  return rechnung;  // Embedded in fahrzeugData.rechnung
}

function calculateNetto(brutto, mwstSatz) {
  return brutto / (1 + mwstSatz / 100);
}
```

### ⚠️ DUAL-WRITE PATTERN

```javascript
// ===== WRITE 1: rechnungen_{werkstattId} collection (standalone document) =====
await window.getCollection('rechnungen').add(rechnung);

// ===== WRITE 2: fahrzeuge_{werkstattId}.rechnung (embedded subdocument) =====
await window.getCollection('fahrzeuge').doc(fahrzeugId).update({
  rechnung: rechnung
});
```

**Rationale für Dual-Write:**
- `rechnungen_{werkstattId}`: Queryable invoice list für Buchhaltung/Partner-Portal
- `fahrzeuge_{werkstattId}.rechnung`: Schneller Zugriff auf Rechnung ohne JOIN-Query
- **Trade-off:** Daten-Duplikation, aber verbessert Query-Performance (Firestore hat KEINE JOINs)

---

## 📄 Stufe 4: Invoice PDF (Waterfall-Logic)

### Datei & Zeilen

**Datei:** `partner-app/rechnungen.html` Zeilen 915-1350 (Function `generatePDF()`)

### Trigger

User klickt "PDF erstellen" ODER "Email senden" Button in Rechnungs-Liste.

### 4-Stufen-Waterfall (Datenquellen-Priorität)

→ **Vollständige Dokumentation:** Siehe [Pipeline 4: Waterfall-Logic](./pipeline-04-direkte-annahme.md#stufe-3-waterfall-logic-invoice-pdf)

```javascript
async function getKalkulationDataForInvoice(fahrzeug) {
  // ========================================
  // ✅ SOURCE 1: kalkulationData (BEST)
  // ========================================
  if (fahrzeug.kalkulationData) {
    // Full itemized breakdown (Arrays)
    return { source: 'kalkulationData', quality: 'full', data: kalkulation };
  }

  // ========================================
  // ✅ SOURCE 2: kva.breakdown (ADAPTIVE)
  // ========================================
  if (fahrzeug.kva && fahrzeug.kva.breakdown) {
    // Category totals OR service-grouped
    return { source: 'kva.breakdown', quality: 'partial', data: breakdown };
  }

  // ========================================
  // ✅ SOURCE 3.5: kostenAufschluesselung
  // 🔧 CRITICAL FIX (2025-11-18): Bug #21
  // ========================================
  if (fahrzeug.kostenAufschluesselung) {
    // Direct workshop breakdown (category totals)
    return { source: 'kostenAufschluesselung', quality: 'partial', data: kosten };
  }

  // ========================================
  // ⚠️ SOURCE 4: vereinbarterPreis (FALLBACK)
  // ========================================
  return { source: 'vereinbarterPreis', quality: 'none', data: { materialien: preis } };
}
```

### PDF-Section: KALKULATIONSAUFSCHLÜSSELUNG

**Datei:** `partner-app/rechnungen.html` Zeilen 1221-1354

```javascript
// ===== ADD COST BREAKDOWN SECTION (if data available) =====
const kalkulationResult = await getKalkulationDataForInvoice(fahrzeug);

if (kalkulationResult.quality !== 'none') {
  const kalkData = kalkulationResult.data;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);  // Green header
  doc.text('KALKULATIONSAUFSCHLÜSSELUNG', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // ===== CATEGORY TOTALS (always available for quality='partial') =====
  if (kalkData.ersatzteile > 0) {
    doc.text(`Ersatzteile (Netto): ${kalkData.ersatzteile.toFixed(2)} €`, 20, y);
    y += 6;
  }

  if (kalkData.arbeitslohn > 0) {
    doc.text(`Arbeitslohn (Netto): ${kalkData.arbeitslohn.toFixed(2)} €`, 20, y);
    y += 6;
  }

  if (kalkData.lackierung > 0) {
    doc.text(`Lackierung (Netto): ${kalkData.lackierung.toFixed(2)} €`, 20, y);
    y += 6;
  }

  if (kalkData.materialien > 0) {
    doc.text(`Materialien/Sonstiges (Netto): ${kalkData.materialien.toFixed(2)} €`, 20, y);
    y += 6;
  }

  // ===== TOTALS =====
  const summeNetto = kalkData.ersatzteile + kalkData.arbeitslohn + kalkData.lackierung + kalkData.materialien;
  const mwstBetrag = summeNetto * 0.19;
  const summeBrutto = summeNetto + mwstBetrag;

  y += 4;
  doc.setDrawColor(0, 0, 0);
  doc.line(20, y, 190, y);  // Horizontal line
  y += 6;

  doc.text(`Zwischensumme (Netto): ${summeNetto.toFixed(2)} €`, 20, y);
  y += 6;
  doc.text(`MwSt (19%): ${mwstBetrag.toFixed(2)} €`, 20, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`GESAMTSUMME (Brutto): ${summeBrutto.toFixed(2)} €`, 20, y);
  y += 10;

  // ===== QUALITY INDICATOR (Fußnote) =====
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const qualityText = kalkulationResult.quality === 'full'
    ? 'Vollständige Aufschlüsselung verfügbar'
    : `Teilweise Aufschlüsselung (Quelle: ${kalkulationResult.source})`;
  doc.text(qualityText, 20, y);
  y += 8;

} else {
  // ===== FALLBACK: Yellow warning box =====
  doc.setFillColor(255, 243, 205);  // Yellow background
  doc.rect(20, y, 170, 20, 'F');

  doc.setFontSize(10);
  doc.setTextColor(138, 109, 59);
  doc.text('⚠️ Detaillierte Kostenaufschlüsselung nicht verfügbar.', 25, y + 8);
  doc.text(`Gesamtpreis: ${fahrzeug.vereinbarterPreis.toFixed(2)} €`, 25, y + 14);

  y += 25;
}
```

### PDF-Ausgabe-Qualität (Zusammenfassung)

| Source | Quality | PDF Display | Pipeline Origin |
|--------|---------|-------------|-----------------|
| **kalkulationData** | ⭐⭐⭐⭐⭐ **full** | Vollständige itemized Tabelle (Bezeichnung, Anzahl, Einzelpreis, Gesamtpreis) | Pipeline 3 (Entwurf) |
| **kva.breakdown** | ⭐⭐⭐⭐ **partial** | Kategorie-Summen (Ersatzteile: 530€, Arbeitslohn: 210€, etc.) | Pipeline 1-2 (KVA) |
| **kostenAufschluesselung** | ⭐⭐⭐⭐ **partial** | Kategorie-Summen (gleich wie kva.breakdown) | Pipeline 4 (Direkt) |
| **vereinbarterPreis** | ⭐⭐ **none** | Gelbe Warnbox: "Detaillierte Kostenaufschlüsselung nicht verfügbar. Gesamtpreis: XXX€" | Fallback |

---

## 📊 Gap-Analyse: SOLL vs IST

### ✅ ALLE KERN-FUNKTIONEN IMPLEMENTIERT

| Stufe | SOLL | IST | Status |
|-------|------|-----|--------|
| **Stufe 1: Status-Trigger** | Auto-create on "Fertig" | ✅ Implementiert | ✅ OK |
| **Stufe 2: Rechnungsnummer** | Counter-basiert, eindeutig, monatlich | ✅ Atomic Transaction | ✅ OK |
| **Stufe 3: Rechnungsdaten** | Dual-Write (collection + embed) | ✅ Implementiert | ✅ OK |
| **Stufe 4: PDF-Generierung** | Aufgeschlüsselte Kosten (wenn verfügbar) | ✅ Bug #21 behoben (2025-11-18) | ✅ OK |

---

### ⚠️ IMPLEMENTIERUNGS-LÜCKEN

| # | Problem | Auswirkung | Priorität |
|---|---------|-----------|-----------|
| 1 | **Email-Versand nicht implementiert** | Personal muss PDF manuell herunterladen + emailen | NIEDRIG |
| 2 | **Payment-Status manuell** | Keine "Mark as Paid" UI in Werkstatt/Partner-Portal | NIEDRIG |
| 3 | **Keine Mahnungs-Logik** | Überfällige Rechnungen nicht automatisch markiert | NIEDRIG |

**Detaillierte Beschreibung:**

#### Gap #1: Email-Versand nicht implementiert

**SOLL:**
- Automatische Email an Kunde nach Rechnungs-Erstellung
- PDF als Anhang
- Email-Template mit Zahlungsinformationen

**IST:**
- ⚠️ Email-Button existiert in `partner-app/rechnungen.html`, aber nicht funktional
- 🔴 **BLOCKER:** SendGrid-Testversion abgelaufen (gleicher Blocker wie Pipeline 3)

**Umgehung:**
```javascript
// Aktueller Workflow (manuell):
// 1. Personal öffnet rechnungen.html
// 2. Klickt "PDF erstellen"
// 3. Download
// 4. Manuell per Outlook/Gmail senden
```

**Lösung:**
→ Siehe Pipeline 3 Empfehlungen (SendGrid Upgrade OR AWS SES Migration)

---

#### Gap #2: Payment-Status manuell

**SOLL:**
- "Mark as Paid" Button in Werkstatt-Dashboard
- Automatische Status-Update bei Payment-Gateway-Integration (Stripe, PayPal)

**IST:**
- ⚠️ Personal muss in `rechnungen-admin.html` manuell `bezahlstatus` ändern
- ⚠️ Kein UI-Shortcut im Kanban-Board

**Lösung (Woche 4-6):**

**Datei:** `kanban.html`

```javascript
// Add "Mark as Paid" button to Fahrzeug-Details modal
async function markRechnungAsPaid(rechnungId, zahlungsart) {
  await window.getCollection('rechnungen').doc(rechnungId).update({
    bezahlstatus: 'Bezahlt',
    zahlungsdatum: new Date().toISOString().split('T')[0],
    zahlungsart: zahlungsart,  // 'Bar', 'EC-Karte', 'Überweisung'
    lastModified: firebase.firestore.FieldValue.serverTimestamp()
  });

  toast.success('✅ Rechnung als bezahlt markiert');
}
```

---

## 🎯 Empfehlungen

### Kurzfristig (Woche 2-3)

**1. Email-Versand implementieren** (Priorität: NIEDRIG - abhängig von SendGrid-Fix)

**Voraussetzung:** SendGrid-Fix aus Pipeline 3 (siehe [Pipeline 3: Empfehlungen](./pipeline-03-entwurf-system.md#sofortmaßnahmen-woche-1))

**Datei:** `partner-app/rechnungen.html`

**Code hinzufügen:**
```javascript
// Email-Button aktivieren (aktuell: disabled)
document.getElementById('emailBtn').disabled = false;

async function sendRechnungEmail(rechnungId) {
  const rechnung = await window.getCollection('rechnungen').doc(rechnungId).get();
  const rechnungData = rechnung.data();

  // Generate PDF (existing function)
  const pdfBlob = await generatePDF(rechnungData.fahrzeugId);

  // Convert to Base64
  const reader = new FileReader();
  reader.readAsDataURL(pdfBlob);
  reader.onloadend = async () => {
    const base64PDF = reader.result.split(',')[1];

    // Call Cloud Function (sendRechnungEmail)
    const result = await firebase.functions().httpsCallable('sendRechnungEmail')({
      kundenEmail: rechnungData.kundenemail,
      kundenname: rechnungData.kundenname,
      rechnungsnummer: rechnungData.rechnungsnummer,
      betragBrutto: rechnungData.betragBrutto,
      pdfBase64: base64PDF,
      werkstattId: rechnungData.werkstattId
    });

    if (result.data.success) {
      toast.success('✅ Rechnung per Email versendet');
    }
  };
}
```

---

### Mittelfristig (Woche 4-6)

**2. Payment-Status UI** (Priorität: NIEDRIG)

**Datei:** `kanban.html` + `partner-app/rechnungen.html`

→ Siehe [Gap #2 Lösung](#gap-2-payment-status-manuell)

---

### Langfristig (Monat 2+)

**3. Mahnungs-System** (Priorität: NIEDRIG)

**Cloud Function (Scheduled):**
```javascript
exports.checkOverdueInvoices = functions
  .region("europe-west3")
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    const now = new Date();
    const overdueDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);  // 30 days ago

    // Find overdue invoices
    const overdueInvoices = await db.collection('rechnungen_mosbach')
      .where('bezahlstatus', '==', 'Offen')
      .where('rechnungsdatum', '<', overdueDate.toISOString().split('T')[0])
      .get();

    // Mark as overdue + send reminder email
    overdueInvoices.forEach(async (doc) => {
      await doc.ref.update({
        bezahlstatus: 'Überfällig',
        mahnungGesendetAm: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Send reminder email
      await sendMahnungEmail(doc.data());
    });

    console.log(`✅ ${overdueInvoices.size} Mahnungen versendet`);
  });
```

---

## 📊 Status Update: VIN Display + Field Consistency (2025-11-20)

**Bug #4: VIN Display + Field Consistency** - ✅ **FIXED** (Commits f925c9f, 13a951f)

### Fix #1: VIN auf Rechnung-PDF (Commit f925c9f)

**Problem:**
- VIN fehlte komplett auf generiertem Rechnung-PDF
- Wichtige Fahrzeug-Identifikation nicht sichtbar für Kunde/Steuerberater

**Lösung:**
- VIN-Display hinzugefügt in rechnungen.html (Lines 1167-1181)
- Waterfall-Logic für VIN-Abruf: `vehicle.vin || vehicle.fahrgestellnummer || 'N/A'`

**Impact:**
- ✅ Vollständige Fahrzeug-Identifikation auf Rechnung-PDF
- ✅ Compliance mit Buchhaltungs-Standards
- ✅ Bessere Nachvollziehbarkeit für Steuerberater

### Fix #2: Feld-Inkonsistenz anliefertermin (Commit 13a951f)

**Problem:**
- Partner-App nutzte `anliefertermin`, Admin-Seite `abholtermin`
- Data Loss: Partner-eingegebene Daten gingen verloren bei Admin-Bearbeitung

**Lösung:**
- Standardisierung auf `anliefertermin` (meine-anfragen.html Lines 7143-7155)
- Backward-Compatibility: Beide Felder werden gelesen, nur eines geschrieben

**Impact:**
- ✅ Keine Data Loss mehr bei Admin/Partner-Bearbeitung
- ✅ Konsistente Feldnamen über beide Apps hinweg

**Siehe:**
- [Pattern 42: Field Name Inconsistency](../../NEXT_AGENT_MANUAL_TESTING_PROMPT.md#pattern-42)
- [Session 2025-11-20: Phase 13](../../CLAUDE.md#session-2025-11-20-phase-13)

---

## 📚 Verwandte Dokumentation

- [Pipeline 3: Entwurf-System](./pipeline-03-entwurf-system.md) (kalkulationData SOURCE 1)
- [Pipeline 4: Direkte Annahme](./pipeline-04-direkte-annahme.md) (kostenAufschluesselung SOURCE 3.5, Waterfall-Logic)
- [Pipeline 5: Status-Sync](./pipeline-05-status-sync.md) (Status "Fertig" Trigger)
- [Cross-Pipeline-Analyse](../CROSS_PIPELINE_ANALYSIS.md#invoice-pdf-dependencies)

---

**Letzte Aktualisierung:** 2025-11-20
**Version:** 1.1
**Status:** ✅ PRODUKTIONSREIF (VIN Display + Field Consistency behoben - Email blockiert durch AWS SES Sandbox)
