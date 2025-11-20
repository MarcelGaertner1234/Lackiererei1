# Pipeline 2: KVA → Fahrzeug (Annahme & Transformation)

**Projekt:** Fahrzeugannahme App (Auto-Lackierzentrum Mosbach)
**Pipeline-ID:** 02
**Erstellt:** 2025-11-19
**Status:** ✅ PRODUKTIONSREIF
**Kritische Lücken:** 10 Data Loss Points, 5 Transformation Issues, 7 Fehlende Validierungen

---

## 📋 Inhaltsverzeichnis

1. [SOLL-Ziel](#soll-ziel)
2. [Datenfluss-Übersicht](#datenfluss-übersicht)
3. [14-Schritte Data Flow (annehmenKVA)](#14-schritte-data-flow)
4. [Kritische Transformationen](#kritische-transformationen)
5. [Gap-Analyse](#gap-analyse)
6. [Empfehlungen](#empfehlungen)

---

## 🎯 SOLL-Ziel

### Geschäftsanforderung

Nach Partner-Annahme eines KVA muss ein vollständiger Fahrzeug-Datensatz in der `fahrzeuge_{werkstattId}` Collection erstellt werden. Dieser Datensatz durchläuft dann den Werkstatt-Workflow (Kanban, Liste, Fertigstellung, Rechnung).

### Erfolgskriterien

1. ✅ Duplikat-Prüfung verhindert doppelte Fahrzeug-Erstellung
2. ✅ Alle 35 Felder werden korrekt transformiert und übertragen
3. ✅ KVA-Daten bleiben erhalten für Rechnungs-PDF (Waterfall-Logic)
4. ✅ Partner-Anfrage wird mit `fahrzeugId` verknüpft (bidirektionale Verknüpfung)
5. ✅ Status-Synchronisation zwischen `partnerAnfragen` und `fahrzeuge`

---

## 📊 Datenfluss-Übersicht

```
STUFE 1: Partner klickt "KVA annehmen"
   ↓ TRIGGER: annehmenKVA() Funktion
   │ Datei: partner-app/meine-anfragen.html (Zeilen 6179-7290)
   │
STUFE 2: Duplikat-Prüfung (2 Checks)
   ↓ CHECK 1: Auftragsnummer bereits vorhanden?
   ↓ CHECK 2: Kennzeichen bereits vorhanden?
   │ Falls JA → ABORT + retroaktives Flag setzen
   │
STUFE 3: Daten-Transformation (prepareFahrzeugData)
   ↓ TRANSFORM: 35 Felder von partnerAnfragen → fahrzeuge Format
   │ Kritisch: serviceTyp Array → String + additionalServices
   │ Kritisch: Preis-Berechnung mit Rabatt + Bonus
   │
STUFE 4: Fahrzeug-Datensatz erstellen
   ↓ WRITE: fahrzeuge_{werkstattId}.add(fahrzeugData)
   │
STUFE 5: Bidirektionale Verknüpfung
   ↓ UPDATE: partnerAnfragen.fahrzeugAngelegt = true
   ↓ UPDATE: partnerAnfragen.fahrzeugId = <neue ID>
   │
STUFE 6: Status-Synchronisation
   ↓ LISTENER: Echtzeit-Sync zwischen beiden Collections
```

---

## 🔄 14-Schritte Data Flow (annehmenKVA)

### Schritt 1-2: Duplikat-Prüfung (Zeilen 6307-6372)

**Datei:** `partner-app/meine-anfragen.html`

```javascript
// ✅ CHECK 1: Auftragsnummer-Duplikat?
let existingVehicle = await window.getCollection('fahrzeuge')
  .where('auftragsnummer', '==', anfrage.auftragsnummer)
  .limit(1)
  .get();

if (!existingVehicle.empty) {
  console.warn('⚠️ Fahrzeug bereits angelegt (Auftragsnummer)');

  // Retroaktives Flag setzen (falls UI-Bug verhinderte Anzeige)
  await window.getCollection('partnerAnfragen').doc(anfrageId).update({
    fahrzeugAngelegt: true,
    fahrzeugId: existingVehicle.docs[0].id
  });

  alert('⚠️ Fahrzeug wurde bereits angelegt!');
  return; // ABORT
}

// ✅ CHECK 2: Kennzeichen-Duplikat?
existingVehicle = await window.getCollection('fahrzeuge')
  .where('kennzeichen', '==', anfrage.kennzeichen.toUpperCase())
  .limit(1)
  .get();

if (!existingVehicle.empty) {
  console.warn('⚠️ Fahrzeug bereits angelegt (Kennzeichen)');

  // Retroaktives Flag setzen
  await window.getCollection('partnerAnfragen').doc(anfrageId).update({
    fahrzeugAngelegt: true,
    fahrzeugId: existingVehicle.docs[0].id
  });

  alert('⚠️ Fahrzeug wurde bereits angelegt!');
  return; // ABORT
}
```

**Warum 2 Checks?**
- **CHECK 1:** Verhindert Duplikate bei Re-Import (Auftragsnummer ist eindeutig)
- **CHECK 2:** Verhindert Duplikate bei manueller Erstellung (Kennzeichen ist eindeutig)

**⚠️ RACE CONDITION RISK:**
- Wenn 2 Partner gleichzeitig denselben KVA annehmen → Beide Checks PASS → 2 Fahrzeuge erstellt!
- **Lösung:** Firestore Transaction nutzen (noch nicht implementiert)

---

### Schritt 3-8: Daten-Transformation (prepareFahrzeugData)

**Datei:** `partner-app/meine-anfragen.html` Zeilen 6741-7290

#### **Transformation 1: serviceTyp Array → String + additionalServices**

```javascript
// INPUT (partnerAnfragen)
serviceTyp: ['lackierung', 'dellen', 'steinschlag']  // Array

// TRANSFORMATION
let primaryService = serviceTyp[0];  // 'lackierung'
let additionalServices = serviceTyp.slice(1);  // ['dellen', 'steinschlag']

// OUTPUT (fahrzeuge)
serviceTyp: 'lackierung',  // String (PRIMARY)
additionalServices: ['dellen', 'steinschlag']  // Array (REST)
```

**⚠️ PATTERN 21 - KRITISCH:**
- Nach dieser Transformation ist `serviceTyp` **READ-ONLY**!
- NIEMALS `fahrzeug.serviceTyp` überschreiben (DATA LOSS bei Multi-Service!)

---

#### **Transformation 2: Kennzeichen Uppercase**

```javascript
// INPUT
kennzeichen: 'Aa-BC 123'  // Mixed-case

// TRANSFORMATION
kennzeichen: anfrage.kennzeichen.toUpperCase()  // 'AA-BC 123'

// OUTPUT
kennzeichen: 'AA-BC 123'  // Uppercase
```

**Grund:** Standardisierung für Suche (case-insensitive)

---

#### **Transformation 3: Preis-Berechnung mit Rabatt + Bonus**

```javascript
// INPUT (KVA-Variante)
kva.varianten.original.preisBrutto = 1190€

// TRANSFORMATION
let basispreis = kva.varianten[kva.gewaehlteVariante].preisBrutto;  // 1190€

// Rabatt (falls vorhanden)
if (anfrage.rabatt && anfrage.rabatt > 0) {
  basispreis = basispreis * (1 - anfrage.rabatt / 100);  // -10% = 1071€
}

// Bonus (falls vorhanden)
if (anfrage.bonus && anfrage.bonus > 0) {
  basispreis = basispreis + anfrage.bonus;  // +50€ = 1121€
}

// OUTPUT
vereinbarterPreis: Math.round(basispreis * 100) / 100  // 1121.00€
```

**⚠️ REIHENFOLGE WICHTIG:**
1. ERST Rabatt (prozentual)
2. DANN Bonus (absolut)

---

#### **Transformation 4: Datum-Normalisierung**

```javascript
// INPUT (verschiedene Formate möglich)
anliefertermin: '2025-11-20'  // ISO String
anliefertermin: Timestamp      // Firestore Timestamp
anliefertermin: Date object    // JavaScript Date

// TRANSFORMATION
let datum;
if (typeof anliefertermin === 'string') {
  datum = anliefertermin;  // ISO String OK
} else if (anliefertermin.toDate) {
  datum = anliefertermin.toDate().toISOString().split('T')[0];  // Timestamp → ISO
} else if (anliefertermin instanceof Date) {
  datum = anliefertermin.toISOString().split('T')[0];  // Date → ISO
}

// OUTPUT
geplantesAbnahmeDatum: '2025-11-20'  // YYYY-MM-DD String
```

**⚠️ FIELD RENAME:**
- `anliefertermin` (Pipeline 1) → `geplantesAbnahmeDatum` (Pipeline 2)
- Inkonsistente Benennung!

---

#### **Transformation 5: Kunden-Name Fallback**

```javascript
// INPUT
kundenname: ''  // Leer
partnerName: 'Partner XYZ GmbH'

// TRANSFORMATION
kundenname: anfrage.kundenname || anfrage.partnerName || 'Unbekannt'

// OUTPUT
kundenname: 'Partner XYZ GmbH'  // Fallback zu Partner
```

**⚠️ PROBLEM:**
- Kunde-Name und Partner-Name werden vermischt
- Auf Rechnung steht dann Partner-Firma statt Kunde!

---

#### **Transformation 6: Telefon-Fallback**

```javascript
// INPUT
telefon: null
kontakt.telefon: '0123456789'

// TRANSFORMATION
telefon: anfrage.telefon || anfrage.kontakt?.telefon || ''

// OUTPUT (fahrzeuge)
telefon: '0123456789'  // Fallback zu Partner-Kontakt
```

**⚠️ FIELD RENAME:**
- `telefon` (Pipeline 1) → `telefon` (Pipeline 2) ✅ OK
- ABER: Sollte `kundenTelefon` heißen für Klarheit!

---

#### **Transformation 7: Email-Fallback + Lowercase**

```javascript
// INPUT
email: null
kontakt.email: 'Partner@Example.COM'

// TRANSFORMATION
email: (anfrage.email || anfrage.kontakt?.email || '').toLowerCase()

// OUTPUT
email: 'partner@example.com'  // Lowercase!
```

**Warum Lowercase?**
- Firebase Auth speichert Emails in lowercase
- Konsistenz für Suchfunktionen

---

#### **Transformation 8: KVA-Daten Übertragung**

```javascript
// INPUT (partnerAnfragen.kva)
kva: {
  varianten: { original: {...}, budget: {...}, premium: {...} },
  gewaehlteVariante: 'original',
  breakdown: { ersatzteile: 300, arbeitslohn: 500, ... },
  isMultiService: false
}

// TRANSFORMATION (1:1 Kopie, KEIN Transform!)
kva: anfrage.kva  // Referenz-Kopie

// OUTPUT (fahrzeuge.kva)
kva: {
  varianten: { ... },  // Vollständig übertragen
  gewaehlteVariante: 'original',
  breakdown: { ... },  // KRITISCH für Rechnung-PDF (Waterfall Source 2)
  isMultiService: false
}
```

**⚠️ KRITISCH:**
- `kva.breakdown` wird für Invoice-PDF-Generierung benötigt (Waterfall Source 2)
- MUSS vollständig übertragen werden!

---

### Schritt 9-11: Partner-Tracking Metadaten

#### **Transformation 9: Partner-Tracking Flags**

```javascript
// OUTPUT
isPartnerAnfrage: true,            // Flag: Kam von Partner (nicht direkt)
partnerId: anfrage.partnerId,      // Partner UID
partnerName: anfrage.partnerName,  // Partner Firmenname
originalAnfrageId: anfrageId       // Link zurück zu partnerAnfragen
```

**Warum bidirektionale Verknüpfung?**
- `fahrzeuge.originalAnfrageId` → Partner-Anfrage finden
- `partnerAnfragen.fahrzeugId` → Fahrzeug finden
- **Nutzen:** Status-Sync zwischen beiden Collections (Pipeline 5)

---

### Schritt 12-14: Workflow-Metadaten

#### **Transformation 10: Status Initial**

```javascript
// OUTPUT
status: 'Neu'  // Initial-Status für Kanban
```

**Workflow-States:**
- `Neu` → `Wartend` → `In Arbeit` → `Fertig` → `Abgeholt`

---

#### **Transformation 11: Timestamps**

```javascript
// OUTPUT
createdAt: firebase.firestore.FieldValue.serverTimestamp(),
lastModified: firebase.firestore.FieldValue.serverTimestamp(),
createdBy: 'Partner: ' + anfrage.partnerName  // Audit Trail
```

**⚠️ SERVER TIMESTAMP:**
- **NIEMALS** Client-Timestamp nutzen (Zeitzone-Probleme!)
- **IMMER** `FieldValue.serverTimestamp()` für Konsistenz

---

#### **Transformation 12: Werkstatt-ID (Multi-Tenant)**

```javascript
// OUTPUT
werkstattId: window.werkstattId  // 'mosbach'
```

**KRITISCH:**
- Multi-Tenant-Isolation
- Jede Werkstatt hat eigene `fahrzeuge_{werkstattId}` Collection

---

## 🔍 Kritische Transformationen (Zusammenfassung)

| # | Input-Feld | Output-Feld | Transformation | Risiko |
|---|-----------|-------------|----------------|--------|
| 1 | `serviceTyp: Array` | `serviceTyp: String` + `additionalServices: Array` | Array Split | **HOCH** - Pattern 21 READ-ONLY! |
| 2 | `kennzeichen` | `kennzeichen` | `.toUpperCase()` | NIEDRIG |
| 3 | `kva.gewaehlteVariante.preisBrutto` | `vereinbarterPreis` | Rabatt + Bonus | MITTEL - Reihenfolge wichtig |
| 4 | `anliefertermin` | `geplantesAbnahmeDatum` | Field Rename + Date Format | MITTEL - Inkonsistente Namen |
| 5 | `kundenname` | `kundenname` | Fallback zu `partnerName` | **HOCH** - Kunde ≠ Partner! |
| 6 | `telefon` | `telefon` | Fallback zu `kontakt.telefon` | NIEDRIG |
| 7 | `email` | `email` | Fallback + `.toLowerCase()` | NIEDRIG |
| 8 | `kva` | `kva` | 1:1 Kopie | **KRITISCH** - Für Rechnung-PDF! |

---

## 📊 Gap-Analyse: SOLL vs IST

### 🔴 KRITISCHE LÜCKEN (DATA LOSS POINTS)

| # | Problem | Auswirkung | Priorität |
|---|---------|-----------|-----------|
| 1 | Kein Optimistic Locking | Race Condition bei gleichzeitiger KVA-Annahme | **HOCH** |
| 2 | `kundenname` Fallback zu `partnerName` | Rechnung zeigt Partner statt Kunde | **HOCH** |
| 3 | VIN geht verloren | VIN nicht zu `fahrzeuge` übertragen | MITTEL |
| 4 | Foto-URLs umbenennen ohne Mapping | `photoUrls` → `schadenfotos` (inkonsistent) | MITTEL |
| 5 | Unterschrift geht verloren | Falls vorhanden, nicht übertragen | NIEDRIG |
| 6 | Service-spezifische Daten partiell | `serviceData` nur für PRIMARY service, REST verloren | MITTEL |
| 7 | KVA-Erstellungs-Metadaten fehlen | `kva.createdBy`, `kva.createdAt` nicht übertragen | NIEDRIG |
| 8 | Audit Trail unvollständig | Nur `createdBy`, kein `lastModifiedBy` | NIEDRIG |
| 9 | Rabatt/Bonus nicht dokumentiert | `vereinbarterPreis` ohne Hinweis auf Rabatt | MITTEL |
| 10 | Multi-Service breakdown Format | Kategorie-gruppiert vs Service-gruppiert inkonsistent | MITTEL |

---

### ⚠️ TRANSFORMATION ISSUES

| # | Issue | Beschreibung | Priorität |
|---|-------|--------------|-----------|
| 1 | serviceTyp Array → String | Komplexe Logik, Pattern 21 READ-ONLY Risiko | **HOCH** |
| 2 | Field Renames | `anliefertermin` → `geplantesAbnahmeDatum` inkonsistent | MITTEL |
| 3 | Field Renames | `photoUrls` → `schadenfotos` inkonsistent | MITTEL |
| 4 | kundenname Fallback | Partner-Name wird zu Kunden-Name | **HOCH** |
| 5 | Preis-Berechnung Intransparenz | Rabatt + Bonus nicht in Rechnung sichtbar | MITTEL |

---

### ℹ️ FEHLENDE VALIDIERUNGEN

| # | Feld | Fehlende Validierung | Auswirkung | Priorität |
|---|------|---------------------|-----------|-----------|
| 1 | `vereinbarterPreis` | Min/Max Grenzen | Unrealistische Preise akzeptiert | MITTEL |
| 2 | `geplantesAbnahmeDatum` | Zukunfts-Datum | Vergangene Termine akzeptiert | MITTEL |
| 3 | `kva.gewaehlteVariante` | Muss in `kva.varianten` existieren | Ungültige Variante → Crash | **HOCH** |
| 4 | `status` | Nur 'Neu' initial erlaubt | Andere Status möglich (Fehler) | NIEDRIG |
| 5 | `serviceTyp` | Muss in erlaubten Services sein | Ungültige Services akzeptiert | MITTEL |
| 6 | `additionalServices` | Keine Duplikate zu `serviceTyp` | PRIMARY kann in additionalServices sein | NIEDRIG |
| 7 | Transaction fehlt | Race Condition bei Duplikat-Prüfung | 2 Fahrzeuge können erstellt werden | **HOCH** |

---

## 🎯 Empfehlungen

### Sofortmaßnahmen (Woche 1)

**1. Transaction für Duplikat-Prüfung + Erstellung** (Priorität: **HOCH**)

**Datei:** `partner-app/meine-anfragen.html` Zeilen 6307-6640

**Aktueller Code (RACE CONDITION):**
```javascript
// ❌ PROBLEM: 2 Checks + 1 Write sind NICHT atomar!
let existingVehicle = await window.getCollection('fahrzeuge').where(...).get();
if (!existingVehicle.empty) { return; }

existingVehicle = await window.getCollection('fahrzeuge').where(...).get();
if (!existingVehicle.empty) { return; }

await window.getCollection('fahrzeuge').add(fahrzeugData);  // 3. Schritt separat!
```

**Empfohlener Code (ATOMIC):**
```javascript
// ✅ LÖSUNG: Firestore Transaction (atomar)
await db.runTransaction(async (transaction) => {
  // Read Phase (alle Reads MÜSSEN vor Writes!)
  const check1 = await transaction.get(
    window.getCollection('fahrzeuge')
      .where('auftragsnummer', '==', anfrage.auftragsnummer)
      .limit(1)
  );

  const check2 = await transaction.get(
    window.getCollection('fahrzeuge')
      .where('kennzeichen', '==', anfrage.kennzeichen.toUpperCase())
      .limit(1)
  );

  // Validation
  if (!check1.empty || !check2.empty) {
    throw new Error('Fahrzeug bereits vorhanden');
  }

  // Write Phase (nur wenn beide Checks PASS)
  const fahrzeugRef = window.getCollection('fahrzeuge').doc();  // Neue ID
  transaction.set(fahrzeugRef, fahrzeugData);

  // Bidirektionale Verknüpfung (auch atomar)
  const anfrageRef = window.getCollection('partnerAnfragen').doc(anfrageId);
  transaction.update(anfrageRef, {
    fahrzeugAngelegt: true,
    fahrzeugId: fahrzeugRef.id
  });

  return fahrzeugRef.id;
});
```

**Vorteil:**
- ✅ Atomar: Entweder BEIDE Writes oder KEINE
- ✅ Race Condition verhindert
- ✅ Bidirektionale Verknüpfung garantiert konsistent

---

**2. kundenname Fallback FIX** (Priorität: **HOCH**)

**Datei:** `partner-app/meine-anfragen.html` Zeile 6760

**Aktueller Code (PROBLEM):**
```javascript
// ❌ PROBLEM: Partner-Name wird zu Kunden-Name!
kundenname: anfrage.kundenname || anfrage.partnerName || 'Unbekannt'
```

**Empfohlener Code:**
```javascript
// ✅ LÖSUNG: Separate Felder für Kunde und Partner
kundenname: anfrage.kundenname || 'Kunde nicht angegeben',  // Kein Fallback!
partnerFirma: anfrage.partnerName,  // Separates Feld für Partner

// Auf Rechnung:
// - Rechnungsempfänger: kundenname (falls angegeben)
// - Vermittelt durch: partnerFirma
```

**Validierung hinzufügen:**
```javascript
if (!anfrage.kundenname || anfrage.kundenname.trim() === '') {
  // Warnung anzeigen (nicht blockieren)
  toast.warning('⚠️ Kein Kunden-Name angegeben. Bitte bei nächster Gelegenheit nachtragen.');
}
```

---

### Kurzfristig (Woche 2-3)

**3. VIN Übertragung** (Priorität: MITTEL)

**Datei:** `partner-app/meine-anfragen.html` Zeile 6800

**Code hinzufügen:**
```javascript
// In prepareFahrzeugData()
vin: anfrage.vin || null,  // VIN übertragen (falls vorhanden)
```

---

**4. Feld-Standardisierung** (Priorität: MITTEL)

**Konsistente Feld-Namen über alle Pipelines:**

| Alt (inkonsistent) | Neu (standardisiert) |
|-------------------|---------------------|
| `anliefertermin` | `geplantesAbnahmeDatum` |
| `photoUrls` | `schadenfotos` |
| `telefon` | `kundenTelefon` |
| `email` | `kundenEmail` |

**Implementation:**
- Pipeline 1 bereits mit neuen Namen schreiben
- Pipeline 2 keine Transformation mehr nötig
- Rückwärts-Kompatibilität: Aliase in Firestore Rules

---

**5. Rabatt/Bonus Transparenz** (Priorität: MITTEL)

**Datei:** `partner-app/meine-anfragen.html` Zeile 6820

**Code hinzufügen:**
```javascript
// In prepareFahrzeugData()
preisDetails: {
  basispreis: kva.varianten[kva.gewaehlteVariante].preisBrutto,
  rabatt: anfrage.rabatt || 0,      // Prozent
  rabattBetrag: basispreis * (anfrage.rabatt / 100),
  bonus: anfrage.bonus || 0,        // Euro
  vereinbarterPreis: finalPreis
}
```

**Auf Rechnung-PDF anzeigen:**
```
Basispreis (KVA Original):  1190,00 €
Rabatt (-10%):              -119,00 €
Bonus:                       +50,00 €
─────────────────────────────────────
Vereinbarter Preis:         1121,00 €
```

---

### Mittelfristig (Woche 4-6)

**6. Multi-Service serviceData Übertragung** (Priorität: MITTEL)

**Problem:** Bei Multi-Service wird nur PRIMARY `serviceData` übertragen, REST geht verloren.

**Lösung:**
```javascript
// serviceData für ALLE Services übertragen
serviceDataAll: {
  lackierung: anfrage.serviceData.lackierung || {},
  dellen: anfrage.serviceData.dellen || {},
  steinschlag: anfrage.serviceData.steinschlag || {}
}
```

---

**7. Validierung: kva.gewaehlteVariante** (Priorität: **HOCH**)

**Datei:** `partner-app/meine-anfragen.html` Zeile 6750

**Code hinzufügen:**
```javascript
// BEFORE Preis-Berechnung
if (!anfrage.kva.varianten[anfrage.kva.gewaehlteVariante]) {
  throw new Error(`Ungültige Variante: ${anfrage.kva.gewaehlteVariante}`);
}
```

---

## 📚 Verwandte Dokumentation

- [Pipeline 1: Partner → KVA](./pipeline-01-partner-kva.md)
- [Pipeline 5: Status-Sync Partner](./pipeline-05-status-sync.md)
- [Pipeline 6: Rechnung Auto-Creation](./pipeline-06-rechnung-auto.md)
- [Pattern 21: serviceTyp READ-ONLY](../../NEXT_AGENT_MANUAL_TESTING_PROMPT.md#pattern-21)
- [Waterfall-Logic: Invoice PDF](./pipeline-06-rechnung-auto.md#waterfall-logic)

---

**Letzte Aktualisierung:** 2025-11-19
**Version:** 1.0
**Status:** ✅ PRODUKTIONSREIF (mit dokumentierten Lücken)
