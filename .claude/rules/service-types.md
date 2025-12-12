# Service Types Reference

> 12 Service-Typen für das Werkstatt-System

---

## Alle Service-Typen

```javascript
window.SERVICE_TYPES = {
  LACKIER: 'lackier',           // Lackierung
  REIFEN: 'reifen',             // Reifen
  MECHANIK: 'mechanik',         // Mechanik
  PFLEGE: 'pflege',             // Pflege/Detailing
  TUEV: 'tuev',                 // TÜV/AU
  VERSICHERUNG: 'versicherung', // Versicherung
  GLAS: 'glas',                 // Glasreparatur
  KLIMA: 'klima',               // Klimaservice
  DELLEN: 'dellen',             // PDR/Smart Repair
  FOLIERUNG: 'folierung',       // Folierung
  STEINSCHUTZ: 'steinschutz',   // Lackschutz
  WERBEBEKLEBUNG: 'werbebeklebung' // Beschriftung
};
```

---

## Labels mit Emojis

| Key | Label |
|-----|-------|
| lackier | Lackierung |
| reifen | Reifen |
| mechanik | Mechanik |
| pflege | Pflege/Detailing |
| tuev | TÜV/AU |
| versicherung | Versicherung |
| glas | Glasreparatur |
| klima | Klimaservice |
| dellen | PDR/Smart Repair |
| folierung | Folierung |
| steinschutz | Lackschutz |
| werbebeklebung | Beschriftung |

---

## Normalisierung (WICHTIG!)

```javascript
// Input validieren und normalisieren
const validatedServiceTyp = window.normalizeAndValidateServiceType(userInput, 'lackier');

// Label holen
const label = window.getServiceTypeLabel('lackier');  // → 'Lackierung'
```

**Warum Normalisierung?**
- 40+ Aliases werden unterstützt
- "Lackiererei", "lackieren", "LACKIER" → alle zu 'lackier'
- Verhindert inkonsistente Daten

---

## serviceTyp ist READ-ONLY!

```javascript
// KRITISCH: Nach Erstellung NIEMALS ändern!
const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

// Bei Updates prüfen
if (updateData.serviceTyp && updateData.serviceTyp !== ORIGINAL_SERVICE_TYP) {
  console.error('serviceTyp darf nicht geändert werden!');
  updateData.serviceTyp = ORIGINAL_SERVICE_TYP;
}
```

**Warum?**
- Kanban filtert nach serviceTyp
- Änderung = Fahrzeug "verschwindet"
- Data Loss möglich!

---

## Multi-Service Struktur

```javascript
// Ein Fahrzeug kann mehrere Services haben
Vehicle {
  kennzeichen: "MOS-123",
  serviceTyp: "lackier",           // PRIMARY (READ-ONLY!)
  additionalServices: [
    { serviceTyp: "reifen", data: {...} }
  ],
  serviceStatuses: {
    "lackier": { status: "fertig", statusHistory: [...] },
    "reifen": { status: "in_arbeit", statusHistory: [...] }
  }
}
```

---

## Partner-Anfrage Formulare

| Service | Formular-Datei |
|---------|----------------|
| lackier | partner-app/lackier-anfrage.html |
| reifen | partner-app/reifen-anfrage.html |
| mechanik | partner-app/mechanik-anfrage.html |
| ... | partner-app/{serviceTyp}-anfrage.html |

---

_Referenz: js/service-types.js (733 Zeilen)_
