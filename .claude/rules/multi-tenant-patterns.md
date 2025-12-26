# Multi-Tenant Patterns

> KRITISCH: Diese Patterns verhindern Daten-Leaks zwischen Werkstätten!

---

## Collection Naming Convention

**MIT Suffix (_werkstattId):**
- `fahrzeuge_*` - Fahrzeugdaten
- `partnerAnfragen_*` - Partner-Anfragen
- `rechnungen_*` - Rechnungsdaten
- `mitarbeiter_*` - Mitarbeiterdaten
- `zeiterfassung_*` - Zeiterfassung
- `kalender_*` - Kalenderdaten
- `bonusAuszahlungen_*` - Bonus-Daten
- `counters_*` - Zähler
- `arbeitszeiten_*` - AGI Training Data

**OHNE Suffix (global):**
- `users` - Authentifizierung
- `settings` - System-Einstellungen
- `partnerAutoLoginTokens` - Auto-Login
- `email_logs` - Email-Protokoll

---

## Korrekte Verwendung

```javascript
// RICHTIG - IMMER so verwenden
const fahrzeuge = window.getCollection('fahrzeuge');
// → Gibt zurück: fahrzeuge_mosbach (oder andere werkstattId)

// FALSCH - Führt zu Daten-Leak!
const fahrzeuge = db.collection('fahrzeuge');
// → Gibt zurück: fahrzeuge (globale Collection!)
```

---

## Firebase Initialization

```javascript
// IMMER vor Firebase-Operationen
await window.firebaseInitialized;

// werkstattId ist dann verfügbar
const werkstattId = window.werkstattId;  // z.B. "mosbach"
```

---

## Häufige Fehler

### Fehler 1: Direkter Collection-Zugriff
```javascript
// FALSCH
db.collection('fahrzeuge').doc(id).get()

// RICHTIG
window.getCollection('fahrzeuge').doc(id).get()
```

### Fehler 2: Hardcoded werkstattId
```javascript
// FALSCH
db.collection('fahrzeuge_mosbach')

// RICHTIG
window.getCollection('fahrzeuge')  // werkstattId automatisch
```

### Fehler 3: Fehlende Initialisierung
```javascript
// FALSCH - Race Condition!
const data = window.getCollection('fahrzeuge').get();

// RICHTIG
await window.firebaseInitialized;
const data = await window.getCollection('fahrzeuge').get();
```

---

## Security Rules Pattern

```javascript
// In firestore.rules - Tenant-Isolation
match /fahrzeuge_{werkstattId}/{docId} {
  allow read, write: if request.auth != null
    && getUserWerkstatt() == werkstattId;
}
```

---

_Referenz: CLAUDE.md Section "Multi-Tenant Architecture"_
