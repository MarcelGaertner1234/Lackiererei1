# Rechnungs-Feature - Firestore Schema Dokumentation

**Created:** 2025-11-11
**Feature:** Rechnungsverwaltung für Partner & Werkstatt
**Collection:** `fahrzeuge_{werkstattId}` (erweitert mit `rechnung` Object)

---

## Overview

Partner können Rechnungen für abgeschlossene Aufträge (Status: "Fertig" oder "Abgeholt") einsehen und als PDF herunterladen. Die Werkstatt kann Rechnungen erstellen und den Zahlungsstatus verwalten.

---

## Firestore Schema Extension

### Fahrzeuge Collection (`fahrzeuge_mosbach`)

Jedes Fahrzeug-Dokument wird um ein **optionales** `rechnung` Object erweitert:

```javascript
{
  // ========================================
  // EXISTING FIELDS (unchanged)
  // ========================================

  id: "fahrzeug_1731279600000",
  auftragsnummer: "AUF-2025-11-001",
  status: "Fertig",  // Rechnung nur wenn "Fertig" oder "Abgeholt"

  kennzeichen: "HD-AB 1234",
  hersteller: "VW",
  modell: "Golf",
  farbe: "Blau",

  kundenname: "Max Mustermann",
  kundenEmail: "max@example.com",
  kundenTelefon: "+49 171 1234567",

  partnerName: "Autohaus Müller GmbH",
  partnerEmail: "info@autohaus-mueller.de",
  partnerId: "partner_1234567890",

  service: "Lackierung",
  serviceBeschreibung: "Tür lackieren + Glasschaden",

  // KVA Data
  kva: {
    gesamtpreis: 3508.00,
    positionen: [
      { name: "Lackierung Tür", preis: 1200.00 },
      { name: "Glasschaden Scheibe", preis: 2308.00 }
    ],
    erstellt: true,
    erstelltAm: Timestamp
  },

  werkstattId: "mosbach",
  createdAt: Timestamp,
  updatedAt: Timestamp,


  // ========================================
  // NEW FIELD: rechnung (OPTIONAL)
  // ========================================

  rechnung: {
    // Rechnungs-Identifikation
    rechnungsnummer: "RE-2025-11-001",        // Format: RE-YYYY-MM-NNNN (unique)
    erstelltAm: Timestamp,                    // Wann Rechnung erstellt wurde
    erstelltVon: "admin@werkstatt.de",        // Wer Rechnung erstellt hat

    // Zahlungsinformationen
    faelligAm: Timestamp,                     // Zahlungsziel (+14 Tage ab erstelltAm)
    zahlungsstatus: "offen",                  // "offen" | "bezahlt" | "ueberfaellig"

    // Beträge (aus KVA übernommen + Rabatt berechnet)
    bruttoBetrag: 3508.00,                    // Aus kva.gesamtpreis
    rabattProzent: 2,                         // Partner-Rabatt aus partner.rabattKonditionen.allgemeinerRabatt
    rabattBetrag: 70.16,                      // Berechneter Rabatt (brutto * rabattProzent / 100)
    nettoBetrag: 3437.84,                     // Zu zahlen (brutto - rabattBetrag)

    // Zahlungsdetails (optional, nur wenn bezahlt)
    bezahltAm: Timestamp | null,              // Wann als bezahlt markiert
    bezahltVon: "Admin Name" | null,          // Wer als bezahlt markiert hat
    zahlungsart: null,                        // "ueberweisung" | "bar" | "karte" | null

    // Notizen & Mahnungen
    notizen: "",                              // Admin-Notizen (z.B. "Teilzahlung 1000€ erhalten")
    mahnungen: []                             // Array of { datum: Timestamp, stufe: 1|2|3, versendet: boolean }
  }
}
```

---

## Field Descriptions

### `rechnung.rechnungsnummer` (String, required)

**Format:** `RE-YYYY-MM-NNNN`
- `RE` = Prefix (Rechnung)
- `YYYY` = Jahr (4-stellig)
- `MM` = Monat (2-stellig, 01-12)
- `NNNN` = Fortlaufende Nummer (4-stellig, 0001-9999)

**Beispiele:**
- `RE-2025-11-0001` (Erste Rechnung im November 2025)
- `RE-2025-11-0042` (42. Rechnung im November 2025)
- `RE-2025-12-0001` (Erste Rechnung im Dezember 2025)

**Generation:**
```javascript
function generateRechnungsnummer() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // TODO: Query Firestore for last invoice number of this month
  // For MVP: Use random 4-digit number
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

  return `RE-${year}-${month}-${random}`;
}
```

**Unique Constraint:** Rechnungsnummer MUST be unique across all werkstätten.

---

### `rechnung.zahlungsstatus` (String, required)

**Values:**
- `"offen"` - Rechnung wurde erstellt, noch nicht bezahlt
- `"bezahlt"` - Rechnung wurde als bezahlt markiert
- `"ueberfaellig"` - Rechnung ist offen UND faelligAm < heute

**Berechnung (Client-side):**
```javascript
function calculateZahlungsstatus(rechnung) {
  if (rechnung.zahlungsstatus === 'bezahlt') {
    return 'bezahlt';
  }

  const now = new Date();
  const faellig = rechnung.faelligAm.toDate();

  if (now > faellig) {
    return 'ueberfaellig';  // ⚠️ Client-side only! NOT stored in Firestore
  }

  return 'offen';
}
```

**Wichtig:** `"ueberfaellig"` wird NICHT in Firestore gespeichert! Es ist eine berechnete Eigenschaft basierend auf `faelligAm` und aktuellem Datum.

---

### Betrags-Berechnung

**Formel:**
```
Brutto:      3508.00 € (aus kva.gesamtpreis)
Rabatt (2%):  -70.16 € (3508.00 * 0.02)
───────────────────────
Netto:       3437.84 € (3508.00 - 70.16)
```

**JavaScript:**
```javascript
function calculateRechnungsBetraege(kva, rabattProzent) {
  const bruttoBetrag = parseFloat(kva.gesamtpreis);
  const rabattBetrag = bruttoBetrag * (rabattProzent / 100);
  const nettoBetrag = bruttoBetrag - rabattBetrag;

  return {
    bruttoBetrag: Math.round(bruttoBetrag * 100) / 100,  // Round to 2 decimals
    rabattProzent: rabattProzent,
    rabattBetrag: Math.round(rabattBetrag * 100) / 100,
    nettoBetrag: Math.round(nettoBetrag * 100) / 100
  };
}
```

---

### Fälligkeitsdatum Berechnung

**Standard:** +14 Tage ab Rechnungserstellung

```javascript
function calculateFaelligDatum(erstelltAm) {
  const date = erstelltAm instanceof Date ? erstelltAm : erstelltAm.toDate();
  date.setDate(date.getDate() + 14);  // +14 Tage
  return firebase.firestore.Timestamp.fromDate(date);
}
```

**Konfigurierbar (Future):** Admin kann Zahlungsziel pro Partner festlegen (7/14/30 Tage).

---

## Rechnung erstellen - Workflow

### Trigger 1: Manuell (Admin)

**Wann:** Werkstatt-Admin klickt "Rechnung erstellen" in `rechnungen-admin.html`

**Voraussetzungen:**
- Fahrzeug Status = "Fertig" oder "Abgeholt"
- KVA existiert (`kva.erstellt === true`)
- `rechnung` Object existiert NOCH NICHT

**Code:**
```javascript
async function createRechnung(fahrzeugId) {
  try {
    // 1. Load Fahrzeug
    const fahrzeugDoc = await window.getCollection('fahrzeuge').doc(fahrzeugId).get();
    const fahrzeug = fahrzeugDoc.data();

    // 2. Validation
    if (!['Fertig', 'Abgeholt'].includes(fahrzeug.status)) {
      throw new Error('Rechnung kann nur für fertige Fahrzeuge erstellt werden');
    }

    if (!fahrzeug.kva || !fahrzeug.kva.erstellt) {
      throw new Error('KVA muss zuerst erstellt werden');
    }

    if (fahrzeug.rechnung) {
      throw new Error('Rechnung existiert bereits');
    }

    // 3. Load Partner Rabatt
    const partnerDoc = await window.getCollection('partners').doc(fahrzeug.partnerId).get();
    const partner = partnerDoc.data();
    const rabattProzent = (partner.rabattKonditionen?.allgemeinerRabatt) || 0;

    // 4. Calculate Beträge
    const betraege = calculateRechnungsBetraege(fahrzeug.kva, rabattProzent);

    // 5. Generate Rechnungsnummer
    const rechnungsnummer = generateRechnungsnummer();

    // 6. Create Rechnung Object
    const now = new Date();
    const rechnung = {
      rechnungsnummer: rechnungsnummer,
      erstelltAm: firebase.firestore.Timestamp.fromDate(now),
      erstelltVon: firebase.auth().currentUser.email,

      faelligAm: calculateFaelligDatum(now),
      zahlungsstatus: 'offen',

      bruttoBetrag: betraege.bruttoBetrag,
      rabattProzent: betraege.rabattProzent,
      rabattBetrag: betraege.rabattBetrag,
      nettoBetrag: betraege.nettoBetrag,

      bezahltAm: null,
      bezahltVon: null,
      zahlungsart: null,

      notizen: '',
      mahnungen: []
    };

    // 7. Update Fahrzeug Document
    await window.getCollection('fahrzeuge').doc(fahrzeugId).update({
      rechnung: rechnung,
      updatedAt: firebase.firestore.Timestamp.now()
    });

    console.log('✅ Rechnung erstellt:', rechnungsnummer);
    return rechnungsnummer;

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Rechnung:', error);
    throw error;
  }
}
```

### Trigger 2: Automatisch (Future - Cloud Function)

**Trigger:** Fahrzeug Status Änderung → "Fertig" oder "Abgeholt"

**Cloud Function:**
```javascript
exports.autoCreateRechnung = functions.firestore
  .document('fahrzeuge_{werkstattId}/{fahrzeugId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to "Fertig" or "Abgeholt"
    if (after.status !== before.status && ['Fertig', 'Abgeholt'].includes(after.status)) {
      // Check if rechnung already exists
      if (!after.rechnung && after.kva && after.kva.erstellt) {
        // Create rechnung
        // ... (similar logic as manual creation)
      }
    }
  });
```

---

## Rechnung als bezahlt markieren - Workflow

**Wann:** Werkstatt-Admin klickt "Als bezahlt markieren" in `rechnungen-admin.html`

**UI Modal:**
```html
┌────────────────────────────────────────┐
│ Rechnung als bezahlt markieren        │
├────────────────────────────────────────┤
│                                        │
│ Rechnungsnummer: RE-2025-11-001       │
│ Betrag: 3.437,84 €                    │
│                                        │
│ Bezahldatum:                           │
│ [___________] (Datepicker)            │
│                                        │
│ Zahlungsart:                           │
│ [Dropdown: Überweisung/Bar/Karte]     │
│                                        │
│ Notizen:                               │
│ [________________________]            │
│ [________________________]            │
│                                        │
│ [Abbrechen]  [Als bezahlt markieren]  │
└────────────────────────────────────────┘
```

**Code:**
```javascript
async function markRechnungAsBezahlt(fahrzeugId, bezahldaten) {
  try {
    await window.getCollection('fahrzeuge').doc(fahrzeugId).update({
      'rechnung.zahlungsstatus': 'bezahlt',
      'rechnung.bezahltAm': firebase.firestore.Timestamp.fromDate(bezahldaten.datum),
      'rechnung.bezahltVon': firebase.auth().currentUser.displayName || firebase.auth().currentUser.email,
      'rechnung.zahlungsart': bezahldaten.zahlungsart,
      'rechnung.notizen': bezahldaten.notizen || '',
      updatedAt: firebase.firestore.Timestamp.now()
    });

    console.log('✅ Rechnung als bezahlt markiert');
    alert('✅ Rechnung wurde als bezahlt markiert!');

  } catch (error) {
    console.error('❌ Fehler beim Markieren:', error);
    alert('❌ Fehler: ' + error.message);
  }
}
```

---

## Firestore Queries

### Partner: Meine Rechnungen laden

```javascript
// Load all invoices for logged-in partner
async function loadMeineRechnungen(partnerEmail) {
  try {
    const fahrzeugeSnapshot = await window.getCollection('fahrzeuge')
      .where('partnerEmail', '==', partnerEmail)
      .where('rechnung', '!=', null)  // Only fahrzeuge with rechnung
      .orderBy('rechnung.erstelltAm', 'desc')
      .get();

    const rechnungen = [];

    fahrzeugeSnapshot.forEach(doc => {
      const fahrzeug = doc.data();
      rechnungen.push({
        fahrzeugId: doc.id,
        kennzeichen: fahrzeug.kennzeichen,
        kundenname: fahrzeug.kundenname,
        service: fahrzeug.service,
        ...fahrzeug.rechnung
      });
    });

    return rechnungen;

  } catch (error) {
    console.error('❌ Fehler beim Laden der Rechnungen:', error);
    throw error;
  }
}
```

### Admin: Alle Rechnungen laden

```javascript
// Load all invoices (all partners)
async function loadAlleRechnungen() {
  try {
    const fahrzeugeSnapshot = await window.getCollection('fahrzeuge')
      .where('rechnung', '!=', null)
      .orderBy('rechnung.erstelltAm', 'desc')
      .limit(100)  // Pagination
      .get();

    const rechnungen = [];

    fahrzeugeSnapshot.forEach(doc => {
      const fahrzeug = doc.data();
      rechnungen.push({
        fahrzeugId: doc.id,
        kennzeichen: fahrzeug.kennzeichen,
        kundenname: fahrzeug.kundenname,
        partnerName: fahrzeug.partnerName,
        service: fahrzeug.service,
        ...fahrzeug.rechnung
      });
    });

    return rechnungen;

  } catch (error) {
    console.error('❌ Fehler beim Laden der Rechnungen:', error);
    throw error;
  }
}
```

### Filter: Offene Rechnungen

```javascript
// Load only unpaid invoices
async function loadOffeneRechnungen(partnerEmail = null) {
  let query = window.getCollection('fahrzeuge')
    .where('rechnung.zahlungsstatus', '==', 'offen')
    .orderBy('rechnung.faelligAm', 'asc');  // Oldest first

  if (partnerEmail) {
    query = query.where('partnerEmail', '==', partnerEmail);
  }

  const snapshot = await query.get();

  const rechnungen = [];
  snapshot.forEach(doc => {
    const fahrzeug = doc.data();
    rechnungen.push({
      fahrzeugId: doc.id,
      kennzeichen: fahrzeug.kennzeichen,
      kundenname: fahrzeug.kundenname,
      ...fahrzeug.rechnung
    });
  });

  return rechnungen;
}
```

---

## Firestore Security Rules

```javascript
// Fahrzeuge Collections: fahrzeuge_mosbach, etc.
match /{fahrzeugeCollection}/{vehicleId} {
  // ... existing rules ...

  // Partners: Can read fahrzeuge.rechnung (read-only)
  // Already allowed via existing read rules (line 942-947)
  // Partners cannot modify rechnung object!

  // Werkstatt/Admin: Can update ONLY rechnung object
  allow update: if fahrzeugeCollection.matches('fahrzeuge_.*')
                && isAdmin()
                && request.resource.data.diff(resource.data)
                    .affectedKeys()
                    .hasOnly(['rechnung', 'updatedAt']);
}
```

**Key Security Principles:**
1. Partners can READ rechnungen (via existing email-based rules)
2. Partners CANNOT CREATE or UPDATE rechnungen
3. Only Werkstatt/Admin can create/update rechnungen
4. Rechnung updates are isolated (only `rechnung` + `updatedAt` can be modified)

---

## Data Migration Strategy

**For Existing Fahrzeuge:**

Existing fahrzeuge documents without `rechnung` field will:
- ✅ Continue to function normally (field is optional)
- ✅ Show "Rechnung erstellen" button in Admin panel
- ✅ Can have rechnung added retroactively by Admin

**No database migration required!** Rechnung field is optional.

---

## Testing Checklist

### Functional Testing

- [ ] **Rechnung erstellen (Manual)**
  - Fahrzeug Status = "Fertig"
  - KVA exists
  - Click "Rechnung erstellen" in Admin
  - Verify rechnung object created
  - Verify rechnungsnummer unique

- [ ] **Rechnung laden (Partner)**
  - Login as Partner
  - Open rechnungen.html
  - Verify only own rechnungen shown
  - Verify Beträge korrekt (Brutto, Rabatt, Netto)

- [ ] **Rechnung laden (Admin)**
  - Login as Admin
  - Open rechnungen-admin.html
  - Verify all rechnungen shown (all partners)

- [ ] **Als bezahlt markieren**
  - Click "Als bezahlt markieren"
  - Enter Bezahldatum
  - Select Zahlungsart
  - Submit
  - Verify zahlungsstatus = "bezahlt"

- [ ] **Überfällig-Status**
  - Create rechnung with faelligAm = yesterday
  - Verify Status Badge shows "Überfällig" (red)

### Security Testing

- [ ] **Partner isolation**
  - Log in as Partner A
  - Verify can only see own rechnungen
  - Try to modify rechnung via DevTools
  - Verify permission-denied error

- [ ] **Admin access**
  - Log in as Admin
  - Verify can see all rechnungen
  - Verify can mark as bezahlt
  - Verify can create rechnungen

### UI/UX Testing

- [ ] **Responsive design**
  - Test on mobile (320px)
  - Test on tablet (768px)
  - Test on desktop (1920px)

- [ ] **Filter & Search**
  - Filter by Status (Offen/Bezahlt)
  - Filter by Zeitraum
  - Search by Rechnungsnummer

---

## Future Enhancements

### Phase 2: PDF Generation

- Rechnungs-Template mit jsPDF
- Logo, Werkstatt-Adresse, Kundendaten
- Positionsliste aus kva.positionen
- Bankverbindung
- PDF Download Button

### Phase 3: Automation

- Auto-Rechnung bei Status = "Fertig"
- Überfällig-Check (Daily Cloud Function)
- Email Notifications

### Phase 4: Mahnwesen

- Automatische Mahnung nach 30 Tagen
- Mahnstufen (1., 2., 3.)
- Mahngebühren

---

## Changelog

### Version 1.0 (2025-11-11)

**Initial Schema Design**

- ✅ Rechnung Object definiert
- ✅ Fields documented
- ✅ Queries documented
- ✅ Security Rules designed
- ✅ Workflows documented

**Collections:**
- `fahrzeuge_{werkstattId}` (extended with `rechnung` object)

**Files:**
- `RECHNUNGEN_SCHEMA.md` (this file)

**Status:** ✅ Schema Ready - Implementation Pending

---

_Last Updated: 2025-11-11_
_Document Version: 1.0_
_Feature Status: 📝 Planning Complete - Ready for Implementation_
