# Common Gotchas (Production Bugs)

> Diese Patterns haben echte Bugs in Production verursacht. NIEMALS wiederholen!

---

## Gotcha 1: Timestamp Inkonsistenz

```javascript
// FALSCH - String bricht Date-Vergleiche!
storniertAm: new Date().toISOString()

// RICHTIG - Firestore native Timestamp
storniertAm: firebase.firestore.Timestamp.now()
```

**Bug-Symptom:** Datumsfilter funktionieren nicht, Sortierung kaputt

---

## Gotcha 2: Radio Button Crash

```javascript
// FALSCH - Crash wenn nichts ausgewählt
document.querySelector('input[name="x"]:checked').value

// RICHTIG - Null-safe mit Fallback
document.querySelector('input[name="x"]:checked')?.value || 'default'
```

**Bug-Symptom:** "Cannot read property 'value' of null"

---

## Gotcha 3: Deprecated substr()

```javascript
// FALSCH - Deprecated, wird entfernt
text.substr(0, 10)  // substr(start, length)

// RICHTIG - Modern
text.substring(0, 10)  // substring(start, end) - ANDERE Semantik!
```

**Achtung:** `substr(start, length)` vs `substring(start, end)` - unterschiedliche Parameter!

---

## Gotcha 4: Double-Click Bug

```javascript
// FALSCH - Async Operation läuft doppelt
async function submit() {
  await saveData();
}

// RICHTIG - Button während Operation deaktivieren
async function submit() {
  btn.disabled = true;
  try {
    await saveData();
  } finally {
    btn.disabled = false;
  }
}
```

**Bug-Symptom:** Doppelte Einträge, Race Conditions

---

## Gotcha 5: serviceTyp Überschreiben (DATA LOSS!)

```javascript
// KRITISCH: serviceTyp ist READ-ONLY nach Erstellung!
const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

// Bei jedem Update prüfen
if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
  fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;  // Restore!
}
```

**Bug-Symptom:** Fahrzeug verschwindet aus Kanban, Daten verloren

---

## Gotcha 6: Bug Screening False Positives

```
Bug-Screening hat ~75% false positive rate!
```

**Regel:** IMMER im Code verifizieren bevor du einen Bug fixst!

---

## Gotcha 7: Ersatzfahrzeug Logic

```javascript
// FALSCH - Nur abholservice prüfen
if (abholserviceGewuenscht) {
  prozessStatus = 'abholung';
}

// RICHTIG - Ersatzfahrzeug hat Priorität!
if (ersatzfahrzeugGewuenscht === true) {
  prozessStatus = 'anlieferung';
} else if (abholserviceGewuenscht) {
  prozessStatus = 'abholung';
}
```

---

## Gotcha 8: Partner-App Permission Denied

```javascript
// Partner-App kann werkstatt settings NICHT lesen!
// Lösung: werkstattDaten direkt ins Dokument embedden

// In Cloud Function beim Erstellen der Anfrage:
await anfragenRef.add({
  ...anfrageData,
  werkstattDaten: {
    name: werkstatt.name,
    email: werkstatt.email,
    // ... relevante Daten
  }
});
```

**Bug-Symptom:** "permission-denied" in Partner-App

---

## Gotcha 9: Array Index Out of Bounds

```javascript
// FALSCH - Crash bei leerem Array
const first = items[0].name;

// RICHTIG - Bounds Check
const first = items?.[0]?.name || 'default';
```

---

## Gotcha 10: Async forEach

```javascript
// FALSCH - forEach wartet nicht auf async!
items.forEach(async item => {
  await processItem(item);
});

// RICHTIG - for...of oder Promise.all
for (const item of items) {
  await processItem(item);
}

// Oder parallel:
await Promise.all(items.map(item => processItem(item)));
```

---

## Quick Reference: Was zu prüfen ist

| Wenn du siehst... | Prüfe auf... |
|-------------------|--------------|
| `new Date().toISOString()` | Timestamp Inkonsistenz |
| `.value` ohne `?.` | Null-safety |
| `substr(` | Deprecated Method |
| `async function` ohne disabled | Double-Click |
| `serviceTyp =` | READ-ONLY Violation |
| `db.collection(` | Multi-Tenant Leak |
| `forEach(async` | Async Loop Bug |

---

_Aktualisiert: 2025-12-11_
_Quelle: Production Bug Reports_
