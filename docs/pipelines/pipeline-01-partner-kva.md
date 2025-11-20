# Pipeline 1: Partner → KVA (Kostenvoranschlag)

**Projekt:** Fahrzeugannahme App (Auto-Lackierzentrum Mosbach)
**Pipeline-ID:** 01
**Erstellt:** 2025-11-19
**Status:** ✅ PRODUKTIONSREIF
**Kritische Lücken:** 12 Data Loss Points, 5 Inkonsistenzen, 4 Fehlende Validierungen

---

## 📋 Inhaltsverzeichnis

1. [SOLL-Ziel](#soll-ziel)
2. [Datenfluss-Übersicht](#datenfluss-übersicht)
3. [Kritische Felder (35 Felder)](#kritische-felder)
4. [Gap-Analyse](#gap-analyse)
5. [Empfehlungen](#empfehlungen)

---

## 🎯 SOLL-Ziel

### Geschäftsanforderung

Partner können Serviceanfragen über 12 verschiedene Formulare erstellen (Lackierung, Dellen, Steinschlag, etc.). Die Werkstatt erstellt daraus einen Kostenvoranschlag (KVA) mit bis zu 3 Preisvarianten. Partner können die bevorzugte Variante wählen und den KVA annehmen.

### Erfolgskriterien

1. ✅ Partner kann Anfrage in <3 Minuten erstellen (Formular mit Foto-Upload)
2. ✅ Werkstatt erhält Echtzeit-Benachrichtigung über neue Anfrage
3. ✅ Werkstatt kann KVA mit 3 Varianten (Original, Budget, Premium) erstellen
4. ✅ Partner erhält KVA als PDF mit QR-Code für sofortige Annahme
5. ✅ Angenommener KVA wird zu vollständigem Fahrzeug-Datensatz (Pipeline 2)

---

## 📊 Datenfluss-Übersicht

```
STUFE 1: Partner erstellt Service-Anfrage
   ↓ WRITE: partnerAnfragen_{werkstattId}
   │ Collection: partnerAnfragen_mosbach
   │ Felder: 35 kritische Felder (siehe unten)
   │
STUFE 2: Werkstatt erhält Benachrichtigung
   ↓ READ: partnerAnfragen_{werkstattId}
   │ Filter: partnerId == currentPartner.id
   │ Sortierung: createdAt DESC
   │
STUFE 3: Werkstatt erstellt KVA
   ↓ UPDATE: partnerAnfragen_{werkstattId}.kva
   │ Felder: varianten{}, breakdown{}, empfohlen
   │
STUFE 4: Partner wählt Variante
   ↓ UPDATE: partnerAnfragen_{werkstattId}.kva.gewaehlteVariante
   │
STUFE 5: Partner nimmt KVA an
   ↓ UPDATE: status → 'Angenommen'
   ↓ TRIGGER: Pipeline 2 (KVA → Fahrzeug)
```

---

## 🔑 Kritische Felder (35 Felder in 8 Gruppen)

### Gruppe 1: Fahrzeug-Identifikation

#### **kennzeichen** (String)
- **SOLL:** Eindeutige Fahrzeug-Identifikation für Tracking und Suche
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1490 (Formular-Input)
  ```javascript
  kennzeichen: document.getElementById('kennzeichen').value.trim().toUpperCase()
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3875 (Anzeige in Karten-Liste)
  - `partner-app/kva-erstellen.html` Zeile 150 (KVA-Formular Pre-Fill)
- **TRANSFORM:** Automatische Großschreibung (`.toUpperCase()`)
- **PDF Usage:**
  - KVA-PDF: Header-Bereich (fett gedruckt)
  - Rechnung-PDF: Fahrzeug-Info-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ Keine Format-Validierung (DE-Kennzeichen-Pattern fehlt)

#### **marke** (String)
- **SOLL:** Fahrzeugmarke für Service-spezifische Kalkulation
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1495
  ```javascript
  marke: document.getElementById('marke').value.trim()
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3880 (Anzeige in Karten-Liste)
  - `annahme.html` Zeile 6200 (Pre-Fill bei Fahrzeug-Übernahme)
- **TRANSFORM:** Keine (Original-Eingabe)
- **PDF Usage:** KVA-PDF: Fahrzeug-Details-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke

#### **modell** (String)
- **SOLL:** Fahrzeugmodell für genaue Ersatzteil-Zuordnung
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1500
- **READ:** `partner-app/meine-anfragen.html` Zeile 3885
- **TRANSFORM:** Keine
- **PDF Usage:** KVA-PDF: Fahrzeug-Details-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke

#### **vin** (String, Optional)
- **SOLL:** Eindeutige Fahrzeug-Identnummer für Versicherung und Garantie
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1505
  ```javascript
  vin: document.getElementById('vin').value.trim() || null
  ```
- **READ:** `partner-app/meine-anfragen.html` Zeile 3890
- **TRANSFORM:** Keine
- **PDF Usage:** ❌ NICHT in KVA-PDF enthalten (DATA LOSS!)
- **IST:** Feld wird gespeichert, aber NICHT angezeigt
- **Gap:** 🔴 **DATA LOSS POINT #1** - VIN nicht in PDF, obwohl kritisch für Versicherung

---

### Gruppe 2: Kunden-Kontaktdaten

#### **kundenname** (String)
- **SOLL:** Kunden-Vollname für Kommunikation und Rechnung
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1510
  ```javascript
  kundenname: document.getElementById('kundenname').value.trim() || partnerName
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3900 (Hauptanzeige)
  - `partner-app/kva-erstellen.html` Zeile 200 (KVA-Header)
- **TRANSFORM:** Fallback zu `partnerName` falls leer
- **PDF Usage:**
  - KVA-PDF: Header-Bereich (Empfänger)
  - Rechnung-PDF: Rechnungsempfänger
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ Fallback zu Partner-Name kann verwirrend sein (Kunde ≠ Partner)

#### **telefon** (String)
- **SOLL:** Kunden-Telefonnummer für Rückfragen
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1515
  ```javascript
  telefon: document.getElementById('telefon').value.trim()
  ```
- **READ:** `partner-app/meine-anfragen.html` Zeile 3910
- **TRANSFORM:** Keine
- **PDF Usage:** KVA-PDF: Kontaktdaten-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ Keine Format-Validierung (internationale Nummern, Leerzeichen-Handling)

#### **kundenEmail** (String)
- **SOLL:** Kunden-Email für PDF-Versand und Benachrichtigungen
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1520
  ```javascript
  kundenEmail: document.getElementById('email').value.trim().toLowerCase()
  ```
- **READ:**
  - `functions/index.js` Zeile 3850 (Email-Versand via SendGrid)
  - `partner-app/meine-anfragen.html` Zeile 3915
- **TRANSFORM:** Automatische Kleinschreibung (`.toLowerCase()`)
- **PDF Usage:** KVA-PDF: Kontaktdaten-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ Firebase Auth nutzt lowercase, aber Firestore kann mixed-case speichern (Inkonsistenz)

---

### Gruppe 3: Service-Details

#### **serviceTyp** (String OR Array)
- **SOLL:** Service-Typ für Workflow-Routing (Single: 'lackierung', Multi: ['lackierung', 'dellen'])
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1530
  ```javascript
  // Single-Service
  serviceTyp: 'lackierung'

  // Multi-Service
  serviceTyp: ['lackierung', 'dellen', 'steinschlag']
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3930 (Badge-Anzeige)
  - `annahme.html` Zeile 6250 (Service-Routing)
- **TRANSFORM:**
  - **Pipeline 2:** Array → String (PRIMARY) + additionalServices (REST)
  - **CRITICAL:** Pattern 21 - serviceTyp ist READ-ONLY nach Erstellung!
- **PDF Usage:** KVA-PDF: Service-Beschreibung Header
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **TRANSFORMATION INCONSISTENCY #1** - Array/String Typ-Wechsel kann zu Fehlern führen

#### **schadensbeschreibung** (String)
- **SOLL:** Detaillierte Schadens-Beschreibung vom Kunden
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1535
  ```javascript
  schadensbeschreibung: document.getElementById('schadensbeschreibung').value.trim()
  ```
- **READ:**
  - `partner-app/kva-erstellen.html` Zeile 250 (Anzeige für Kalkulation)
  - `annahme.html` Zeile 6270 (Pre-Fill in Notizen)
- **TRANSFORM:** Keine
- **PDF Usage:** KVA-PDF: Schadens-Details-Sektion (mehrzeilig)
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke

#### **anliefertermin** (Date String, YYYY-MM-DD)
- **SOLL:** Wunsch-Anliefertermin vom Kunden
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1540
  ```javascript
  anliefertermin: document.getElementById('anliefertermin').value  // YYYY-MM-DD
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3950 (Badge-Anzeige)
  - Pipeline 2: Wird zu `geplantesAbnahmeDatum` transformiert
- **TRANSFORM:**
  - **Pipeline 2:** `anliefertermin` → `geplantesAbnahmeDatum` (Umbenennung!)
- **PDF Usage:** KVA-PDF: Termin-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **FIELD NAME INCONSISTENCY #2** - `anliefertermin` vs `geplantesAbnahmeDatum`

---

### Gruppe 4: Foto-Dokumentation

#### **photoUrls** (Array of Strings)
- **SOLL:** Firebase Storage URLs der hochgeladenen Schadenfotos
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1545
  ```javascript
  photoUrls: uploadedPhotoUrls  // Array: ['https://storage.../photo1.jpg', ...]
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 3970 (Galerie-Anzeige)
  - `partner-app/kva-erstellen.html` Zeile 300 (Foto-Referenz für Kalkulation)
- **TRANSFORM:**
  - **Pipeline 2:** `photoUrls` → `schadenfotos` (Umbenennung!)
- **PDF Usage:** ❌ NICHT in KVA-PDF enthalten (nur Referenz im System)
- **IST:** ✅ Fotos werden hochgeladen und gespeichert
- **Gap:** 🔴 **DATA LOSS POINT #2** - Fotos nicht in KVA-PDF (Kunde kann Fotos nicht sehen!)

#### **photoCount** (Number)
- **SOLL:** Anzahl hochgeladener Fotos (für UI-Badge)
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1550
  ```javascript
  photoCount: photoUrls.length
  ```
- **READ:** `partner-app/meine-anfragen.html` Zeile 3975 (Badge: "3 Fotos")
- **TRANSFORM:** Auto-berechnet aus `photoUrls.length`
- **PDF Usage:** Nicht verwendet
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke (redundante Info, aber nützlich für Performance)

---

### Gruppe 5: Partner-Tracking

#### **partnerId** (String)
- **SOLL:** Eindeutige Partner-ID für Multi-Tenant-Isolation
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1560
  ```javascript
  partnerId: window.currentUser.uid  // Firebase Auth UID
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 4000 (Filter: partnerId == currentUser.uid)
  - Security Rules: Zugriffskontrolle
- **TRANSFORM:** Keine
- **PDF Usage:** Nicht direkt, aber steuert Zugriff auf PDF
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke

#### **partnerName** (String)
- **SOLL:** Partner-Firmenname für Kommunikation
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1565
  ```javascript
  partnerName: window.currentUser.displayName || window.currentUser.email
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 4010 (Anzeige)
  - `annahme.html` Zeile 6300 (createdBy-Feld)
- **TRANSFORM:** Fallback zu Email falls displayName fehlt
- **PDF Usage:** KVA-PDF: Absender-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ Fallback zu Email kann unprofessionell wirken

#### **kontakt** (Object)
- **SOLL:** Partner-Kontaktdaten für Rückfragen
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1570
  ```javascript
  kontakt: {
    name: partnerName,
    telefon: partnerTelefon,
    email: partnerEmail
  }
  ```
- **READ:** `partner-app/meine-anfragen.html` Zeile 4020
- **TRANSFORM:** Keine
- **PDF Usage:** KVA-PDF: Kontaktdaten-Sektion (falls kundenname = partnerName)
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **REDUNDANCY #3** - Dupliziert telefon + kundenEmail (inkonsistent bei Updates)

---

### Gruppe 6: KVA-Daten (Kostenvoranschlag)

#### **kva** (Object, Optional bis Stufe 3)
- **SOLL:** Vollständige KVA-Daten mit Varianten und Breakdown
- **WRITE:** `partner-app/kva-erstellen.html` Zeile 2500
  ```javascript
  kva: {
    varianten: {
      original: { preisNetto: 1000, preisBrutto: 1190, beschreibung: '...' },
      budget: { preisNetto: 800, preisBrutto: 952, beschreibung: '...' },
      premium: { preisNetto: 1200, preisBrutto: 1428, beschreibung: '...' }
    },
    empfohlen: 'original',  // Werkstatt-Empfehlung
    gewaehlteVariante: null,  // Partner-Auswahl (später in Stufe 4)
    breakdown: {
      ersatzteile: 300,
      arbeitslohn: 500,
      lackierung: 200,
      materialien: 0
    },
    isMultiService: false,
    serviceLabels: {},
    createdAt: Timestamp,
    createdBy: 'Werkstatt-User-Name'
  }
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 4100 (Varianten-Anzeige)
  - `partner-app/anfrage-detail.html` Zeile 4200 (KVA-PDF-Generierung)
- **TRANSFORM:**
  - **Pipeline 2:** `kva.gewaehlteVariante` → `vereinbarterPreis` (Preis-Extraktion)
  - **Multi-Service:** `breakdown` hat service-gruppierte Struktur statt Kategorien
- **PDF Usage:** KVA-PDF: Hauptinhalt (alle Varianten, Breakdown, Empfehlung)
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **COMPLEXITY #4** - Multi-Service breakdown hat 2 verschiedene Formate (kategorie-gruppiert vs service-gruppiert)

---

### Gruppe 7: Workflow-Metadaten

#### **status** (String, Enum)
- **SOLL:** Anfrage-Status für Workflow-Tracking
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1590 (Initial: 'Offen')
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 4150 (Badge-Anzeige)
  - Security Rules: Filter (Partner sieht nur eigene Anfragen)
- **TRANSFORM:**
  - Stufe 1: 'Offen' (neu erstellt)
  - Stufe 3: 'KVA erstellt' (Werkstatt hat KVA erstellt)
  - Stufe 5: 'Angenommen' (Partner hat KVA akzeptiert)
- **PDF Usage:** KVA-PDF: Status-Badge (farbcodiert)
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **MISSING VALIDATION #5** - Keine Status-Transition-Validierung (kann von 'Offen' direkt zu 'Angenommen' springen)

#### **createdAt** (Timestamp)
- **SOLL:** Zeitstempel für Anfrage-Erstellung
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1595
  ```javascript
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
  ```
- **READ:**
  - `partner-app/meine-anfragen.html` Zeile 4160 (Sortierung + Anzeige)
  - `partner-app/kva-erstellen.html` Zeile 450 (Bearbeitungs-Zeitraum)
- **TRANSFORM:** Server-Timestamp → JavaScript Date (für Anzeige)
- **PDF Usage:** KVA-PDF: Footer (Erstellungsdatum)
- **IST:** ✅ Vollständig implementiert
- **Gap:** ✅ Keine Lücke

#### **lastModified** (Timestamp)
- **SOLL:** Zeitstempel für letzte Änderung (Audit Trail)
- **WRITE:**
  - Initial: `partner-app/multi-service-anfrage.html` Zeile 1600
  - Update: `partner-app/kva-erstellen.html` Zeile 2700 (bei KVA-Erstellung)
- **READ:** `partner-app/meine-anfragen.html` Zeile 4170 (Tooltip)
- **TRANSFORM:** Server-Timestamp → JavaScript Date
- **PDF Usage:** Nicht verwendet
- **IST:** ✅ Vollständig implementiert
- **Gap:** 🔴 **AUDIT TRAIL INCOMPLETE #6** - Kein Verlauf (nur letzter Timestamp, nicht wer geändert hat)

---

### Gruppe 8: Service-Spezifische Daten

#### **serviceData** (Object, Service-abhängig)
- **SOLL:** Service-spezifische Zusatzfelder (z.B. Dellen: anzahlDellen, Steinschlag: scheibentypSteinschlag)
- **WRITE:** `partner-app/multi-service-anfrage.html` Zeile 1610
  ```javascript
  // Beispiel: Dellen-Service
  serviceData: {
    anzahlDellen: 3,
    groesseDellen: 'mittel',
    positionDellen: 'Kotflügel vorne links'
  }

  // Beispiel: Steinschlag-Service
  serviceData: {
    scheibentypSteinschlag: 'Frontscheibe',
    schadengroesseSteinschlag: 'klein',
    positionSteinschlag: 'Fahrerseite oben'
  }
  ```
- **READ:**
  - `partner-app/kva-erstellen.html` Zeile 500 (Service-spezifische Kalkulation)
  - `annahme.html` Zeile 6350 (Pre-Fill bei Übernahme)
- **TRANSFORM:** Keine (Service-abhängig)
- **PDF Usage:** KVA-PDF: Service-Details-Sektion
- **IST:** ✅ Vollständig implementiert
- **Gap:** ⚠️ **MISSING VALIDATION #7** - Keine Schema-Validierung (serviceData kann beliebige Felder enthalten)

---

## 📊 Gap-Analyse: SOLL vs IST

### 🔴 KRITISCHE LÜCKEN (DATA LOSS POINTS)

| # | Problem | Auswirkung | Betroffene Felder | Priorität |
|---|---------|-----------|-------------------|-----------|
| 1 | VIN nicht in KVA-PDF | Versicherung kann Fahrzeug nicht eindeutig identifizieren | `vin` | HOCH |
| 2 | Fotos nicht in KVA-PDF | Kunde kann Schadenfotos nicht sehen (Vertrauensverlust) | `photoUrls` | HOCH |
| 3 | Audit Trail unvollständig | Keine Nachvollziehbarkeit wer wann geändert hat | `lastModified` | MITTEL |
| 4 | Signatur nicht übertragen | Kunde-Unterschrift geht bei Pipeline 2 verloren | `unterschrift` (falls vorhanden) | MITTEL |
| 5 | VIN-Längen-Validierung fehlt | Falsche VINs werden akzeptiert (17 Zeichen Standard) | `vin` | NIEDRIG |

**Empfohlene Fixes:**
- **Fix #1:** VIN zu KVA-PDF hinzufügen (Zeile 1500 in kva-pdf-template.html)
- **Fix #2:** Foto-Galerie zu KVA-PDF hinzufügen (Thumbnails auf Seite 2)
- **Fix #3:** `lastModifiedBy` Feld hinzufügen + History-Array implementieren
- **Fix #4:** `unterschrift` Feld zu Pipeline 2 Data Transfer hinzufügen
- **Fix #5:** VIN Regex-Validierung: `/^[A-HJ-NPR-Z0-9]{17}$/`

---

### ⚠️ FELD-INKONSISTENZEN

| # | Inkonsistenz | Pipeline 1 Feld | Pipeline 2 Feld | Priorität |
|---|--------------|-----------------|-----------------|-----------|
| 1 | serviceTyp Typ-Wechsel | Array OR String | String (PRIMARY) | HOCH |
| 2 | Feld-Umbenennung | `anliefertermin` | `geplantesAbnahmeDatum` | MITTEL |
| 3 | Feld-Umbenennung | `photoUrls` | `schadenfotos` | MITTEL |
| 4 | Telefon-Feld-Name | `telefon` | `kundenTelefon` | NIEDRIG |
| 5 | Email Case-Handling | Mixed-case OK | Lowercase only | NIEDRIG |

**Empfohlene Fixes:**
- **Fix #1:** Standardisieren auf `serviceTyp: String` (PRIMARY) + `additionalServices: Array` (von Anfang an)
- **Fix #2:** Feld-Aliase einführen: `anliefertermin` = `geplantesAbnahmeDatum` (beide akzeptieren)
- **Fix #3:** `photoUrls` → `schadenfotos` bereits in Pipeline 1 umbenennen
- **Fix #4:** `kundenTelefon` konsistent in allen Pipelines nutzen
- **Fix #5:** `.toLowerCase()` bereits bei Eingabe erzwingen (nicht erst später)

---

### ℹ️ FEHLENDE VALIDIERUNGEN

| # | Feld | Fehlende Validierung | Auswirkung | Priorität |
|---|------|---------------------|-----------|-----------|
| 1 | `kennzeichen` | DE-Kennzeichen-Pattern | Ungültige Kennzeichen akzeptiert | MITTEL |
| 2 | `telefon` | Telefonnummer-Format | Ungültige Nummern akzeptiert | NIEDRIG |
| 3 | `kundenEmail` | Email-Format (Regex) | Ungültige Emails akzeptiert | HOCH |
| 4 | `anliefertermin` | Zukunfts-Datum-Check | Vergangene Termine akzeptiert | MITTEL |
| 5 | `vin` | VIN-Länge (17 Zeichen) | Falsche VINs akzeptiert | NIEDRIG |
| 6 | `status` | Transition-Validierung | Status-Sprünge möglich | MITTEL |
| 7 | `serviceData` | Schema-Validierung | Beliebige Felder erlaubt | NIEDRIG |

**Empfohlene Fixes:**
- **Fix #1:** Kennzeichen Regex: `/^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2} [1-9][0-9]{0,3}$/`
- **Fix #2:** Telefon Regex: `/^\+?[0-9\s\-()]{7,20}$/`
- **Fix #3:** Email Regex (bereits in Firebase Auth, aber auch Frontend prüfen)
- **Fix #4:** `anliefertermin >= new Date()` (Client + Server)
- **Fix #5:** VIN Regex: `/^[A-HJ-NPR-Z0-9]{17}$/`
- **Fix #6:** Status-Maschine: `Offen` → `KVA erstellt` → `Angenommen` (keine Sprünge)
- **Fix #7:** JSON-Schema für serviceData pro Service-Typ definieren

---

## 🎯 Empfehlungen

### Sofortmaßnahmen (Woche 1)

1. **Email-Format-Validierung hinzufügen** (Priorität: HOCH)
   - Datei: `partner-app/multi-service-anfrage.html` Zeile 1520
   - Code:
     ```javascript
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(kundenEmail)) {
       toast.error('Ungültige Email-Adresse');
       return;
     }
     ```

2. **VIN zu KVA-PDF hinzufügen** (Priorität: HOCH)
   - Datei: `partner-app/kva-pdf-template.html` (oder inline in anfrage-detail.html)
   - Code: VIN-Feld nach Kennzeichen anzeigen

### Kurzfristig (Woche 2-3)

3. **Foto-Galerie zu KVA-PDF hinzufügen** (Priorität: HOCH)
   - Fotos als Thumbnails auf Seite 2 des PDFs einfügen
   - Max. 6 Fotos pro Seite (2 Spalten × 3 Reihen)

4. **Feld-Standardisierung** (Priorität: MITTEL)
   - `anliefertermin` → `geplantesAbnahmeDatum` (einheitlich)
   - `photoUrls` → `schadenfotos` (einheitlich)
   - `telefon` → `kundenTelefon` (einheitlich)

### Mittelfristig (Woche 4-6)

5. **Audit Trail erweitern** (Priorität: MITTEL)
   - `lastModifiedBy` Feld hinzufügen
   - History-Array für alle Änderungen

6. **Status-Transition-Validierung** (Priorität: MITTEL)
   - State Machine implementieren
   - Nur erlaubte Transitions zulassen

---

## 📚 Verwandte Dokumentation

- [Pipeline 2: KVA → Fahrzeug](./pipeline-02-kva-fahrzeug.md)
- [Pipeline 6: Rechnung Auto-Creation](./pipeline-06-rechnung-auto.md)
- [Cross-Pipeline-Analyse](../CROSS_PIPELINE_ANALYSIS.md)
- [Pattern 21: serviceTyp READ-ONLY](../../NEXT_AGENT_MANUAL_TESTING_PROMPT.md#pattern-21)

---

**Letzte Aktualisierung:** 2025-11-19
**Version:** 1.0
**Status:** ✅ PRODUKTIONSREIF (mit dokumentierten Lücken)
