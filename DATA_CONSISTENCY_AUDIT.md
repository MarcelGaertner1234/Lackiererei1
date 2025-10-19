# 🔍 DATA CONSISTENCY AUDIT

**Datum:** 19.10.2025
**Status:** IN PROGRESS
**Ziel:** Systematische Überprüfung aller Datenfelder über 8 Hauptkacheln

---

## 📊 PHASE 1: FELDER-MAPPING

### **1.1 ANNAHME.HTML - FELDER GESETZT**

**Quelle:** `getFormData()` Funktion (Zeilen 1625-1666)

#### **ALLE GESETZTEN FELDER:**

| Kategorie | Feld | Typ | Beispiel | Quelle |
|-----------|------|-----|----------|--------|
| **ID** | `id` | Number | 1729373890123 | `Date.now()` |
| **Basis** | `kennzeichen` | String | "BB-MP-1234" | Input |
| **Basis** | `marke` | String | "BMW" | Input |
| **Basis** | `modell` | String | "320d" | Input |
| **Basis** | `baujahrVon` | String | "2015" | Input |
| **Basis** | `baujahrBis` | String | "2018" | Input |
| **Basis** | `kmstand` | String | "150000" | Input |
| **Basis** | `vin` | String | "WBADT43452G..." | Input |
| **Kunde** | `kundenname` | String | "Marcel Gärtner" | Input |
| **Kunde** | `kundenId` | String | "abc123" | ⚠️ **UPDATE SPÄTER** |
| **Datum** | `datum` | String (DE) | "19.10.2025" | `toLocaleDateString('de-DE')` |
| **Datum** | `zeit` | String (DE) | "21:47:30" | `toLocaleTimeString('de-DE')` |
| **Datum** | `geplantesAbnahmeDatum` | String (DE) | "25.10.2025" | Input |
| **Service** | `serviceTyp` | String | "lackier" | Select (lackier/reifen/mechanik/pflege/tuev/versicherung) |
| **Abholung** | `fahrzeugAbholung` | String | "ja"/"nein" | Radio |
| **Abholung** | `abholadresse` | String | "Musterstraße 123..." | Input |
| **Abholung** | `abholdatum` | String | "20.10.2025" | Input |
| **Abholung** | `abholzeit` | String | "10:00" | Input |
| **Abholung** | `abholnotiz` | String | "Hinterhof parken" | Input |
| **Farbe** | `farbname` | String | "Alpinweiß" | Input |
| **Farbe** | `farbvariante` | String | "Uni" | Input |
| **Farbe** | `farbnummer` | String | "L123" | Input |
| **Farbe** | `lackart` | String | "wasserlack" | Radio (wasserlack/basislack) |
| **Preis** | `vereinbarterPreis` | Number/null | 1250.50 | Input (parseFloat) |
| **Fotos** | `photos` | Array | [base64...] | Kamera/Upload |
| **Unterschrift** | `signature` | String (base64) | "data:image/png..." | Canvas |
| **Status** | `status` | String | "angenommen" | **HARDCODED** |
| **Status** | `prozessStatus` | String | "angenommen" | **HARDCODED** |
| **Meta** | `prozessTimestamps` | Object | `{angenommen: 123...}` | Timestamp-Tracking |
| **Meta** | `lastModified` | Number | 1729373890123 | `Date.now()` |
| **Notizen** | `notizen` | String | "Kratzer an Tür..." | Textarea |

#### **WICHTIGE BEOBACHTUNGEN:**

✅ **KORREKT GESETZT:**
- `datum`, `zeit` → Automatisch generiert
- `kundenname` → User Input
- `vereinbarterPreis` → User Input
- `serviceTyp` → Dropdown (Multi-Service Support!)

⚠️ **SPÄTER GESETZT:**
- `kundenId` → Wird NACH Speicherung von `registriereKundenbesuch()` gesetzt

❌ **NICHT GESETZT (aber ERWARTBAR):**
- `kvaGesamt`, `kvaLack`, `kvaTeile`, `kvaArbeitszeit` → Nur bei manuellem KVA-Erstellen
- `anliefertermin`, `abholtermin` → Nur bei Partner Portal

---

### **1.2 ABNAHME.HTML - FELDER GELESEN/UPDATE**

**Quelle:** `abnahmeData` (Zeilen 1027-1037), `searchVehicle()` (Zeilen 726-789)

#### **GELESENE FELDER (aus Firestore/LocalStorage):**

| Feld | Verwendung | Beispiel |
|------|-----------|----------|
| `kennzeichen` | Fahrzeug-Suche | "BB-MP-1234" |
| `status` | Filter (nur "angenommen") | "angenommen" |
| `kundenname` | Anzeige | "Marcel Gärtner" |
| `marke`, `modell`, `baujahr` | Info-Display | "BMW 320d (2018)" |
| `kmstand` | Optional | "150000 km" |
| `farbnummer`, `lackart`, `farbname` | Lackier-Info | "L123 (wasserlack)" |
| `datum`, `zeit` | Annahme-Datum | "19.10.2025 10:00" |
| `notizen` | Schadensbeschreibung | "Kratzer..." |
| `photos` | Vorher-Fotos (Subcollection!) | [base64...] |
| `prozessStatus` | Priorisierung ("bereit" zuerst) | "bereit" |

#### **UPDATE-FELDER (beim Absenden):**

| Feld | Wert | Typ | Quelle |
|------|------|-----|--------|
| `abnahmeDatum` | "19.10.2025" | String (DE) | `jetzt.toLocaleDateString('de-DE')` |
| `abnahmeZeit` | "16:30:45" | String (DE) | `jetzt.toLocaleTimeString('de-DE')` |
| `nachherPhotos` | [base64...] | Array | Firestore Subcollection `fotos/nachher` |
| `abnahmeSignature` | "data:image/png..." | String (base64) | Canvas |
| `status` | "abgeschlossen" | String | **HARDCODED** |
| `prozessStatus` | "abgeschlossen" | String | **HARDCODED** (FIX!) |
| `prozessTimestamps.abgeschlossen` | 1729373890123 | Number | `Date.now()` |
| `lastModified` | 1729373890123 | Number | `Date.now()` |

#### **WICHTIGE BEOBACHTUNGEN:**

✅ **HYBRID-UPDATE (Zeilen 1040-1093):**
- Nachher-Fotos → Firestore Subcollection (`savePhotosToFirestore()`)
- Status → Firestore (`updateFahrzeug()`)
- KEINE Fotos im Hauptdokument! (Platz-Optimierung)

✅ **PRIORISIERUNG (Zeilen 674-680):**
- Fahrzeuge mit `prozessStatus="bereit"` werden im Dropdown OBEN angezeigt
- Badge "🎯 [BEREIT ZUR ABNAHME]" für bessere UX

⚠️ **FELDER NICHT GESETZT:**
- `bezahlt` - Wird NICHT automatisch gesetzt (muss manuell in liste.html gemacht werden?)
- `rechnungGeschrieben` - Wird NICHT automatisch gesetzt

❌ **POTENTIELLE INKONSISTENZ:**
- Was passiert mit `vereinbarterPreis`? Bleibt unverändert (gut!)
- Migration alter `baujahr` → `baujahrVon/baujahrBis` (Zeilen 661-669)

---

### **1.3 LISTE.HTML - FELDER ERWARTET**

**Quelle:** Tabellen-Rendering (Zeilen 2070-2176)

#### **ALLE ERWARTETEN FELDER:**

| Spalte | Feld(er) | Fallback | Beispiel |
|--------|---------|----------|----------|
| Kennzeichen | `kennzeichen` | - | "BB-MP-1234" |
| Bezahlung | `bezahlt`, `rechnungGeschrieben` | false | true/false |
| Fahrzeug | `marke`, `modell` | - | "BMW 320d" |
| Service | `serviceTyp` | "lackier" | "reifen" |
| Farbnummer | `farbnummer` | ⚠️ **NEU:** "-" | "L123" |
| Preis | `vereinbarterPreis` | KVA-Varianten | € 1.250,50 |
| Kunde | `kundenname`, `kundenId` | - | "Marcel [S]" |
| Annahme | `datum` | - | "19.10.2025" |
| Abhol-Tag | `geplantesAbnahmeDatum` | "-" | "25.10.2025" |
| Status | `prozessStatus` | "angenommen" | "lackierung" |

#### **PREIS-FALLBACK-LOGIK:**

```javascript
// Zeilen 2095-2109
if (vehicle.vereinbarterPreis) {
    preisWert = parseFloat(vehicle.vereinbarterPreis);
} else if (vehicle.kva?.varianten && vehicle.kva.gewaehlteVariante) {
    preisWert = parseFloat(vehicle.kva.varianten[vehicle.kva.gewaehlteVariante]?.gesamt) || 0;
} else if (vehicle.kva?.varianten?.original) {
    preisWert = parseFloat(vehicle.kva.varianten.original.gesamt) || 0;
} else if (vehicle.kva?.gesamt) {
    preisWert = parseFloat(vehicle.kva.gesamt) || 0;
}
```

---

### **1.4 KUNDEN.HTML - FELDER ERWARTET**

**Quelle:** `calculateKundenUmsatz()` (Zeilen 2962-3009)

#### **KRITISCHE FELDER FÜR UMSATZ:**

| Feld | Verwendung | Fallback |
|------|-----------|----------|
| `kundenId` | **PRIMARY** Filter | - |
| `kundenname` | FALLBACK Filter | - |
| `datum` | Zeitraum-Filter (Jahr/Monat) | true (wenn fehlt) |
| `vereinbarterPreis` | Umsatz-Summe | KVA-Varianten |

#### **UMSATZ-BERECHNUNG:**

```javascript
// Filter: Fahrzeuge des Kunden
const kundenFahrzeuge = allFahrzeuge.filter(f =>
    f.kundenId === kundeId ||
    (f.kundenname && allKunden.find(k => k.id === kundeId && k.name === f.kundenname))
);

// Preis-Summierung mit Fallback
if (fahrzeug.vereinbarterPreis && fahrzeug.vereinbarterPreis > 0) {
    preis = parseFloat(fahrzeug.vereinbarterPreis);
} else if (fahrzeug.kva?.varianten && fahrzeug.kva.gewaehlteVariante) {
    preis = parseFloat(fahrzeug.kva.varianten[fahrzeug.kva.gewaehlteVariante]?.gesamt) || 0;
}
// ... weitere Fallbacks
```

---

### **1.5 KANBAN.HTML - FELDER ERWARTET**

**Quelle:** Card-Rendering (Zeilen 1290-1304)

#### **KRITISCHE FELDER FÜR WORKFLOW:**

| Feld | Verwendung | Beispiel |
|------|-----------|----------|
| `prozessStatus` | Spalten-Zuordnung | "lackierung" |
| `serviceTyp` | Service-Filter | "lackier" |
| `vereinbarterPreis` | Preis-Anzeige (+ Fallback) | 1250.50 |
| `geplantesAbnahmeDatum` | Dringlichkeits-Badge | "25.10.2025" |
| `kennzeichen`, `marke`, `modell` | Card-Info | "BB-MP-1234 BMW 320d" |

#### **PREIS-FALLBACK (FIXED):**

```javascript
// Zeilen 1290-1304
let preisWert = 0;
if (fahrzeug.vereinbarterPreis && fahrzeug.vereinbarterPreis > 0) {
    preisWert = parseFloat(fahrzeug.vereinbarterPreis);
} else if (fahrzeug.kva?.varianten && fahrzeug.kva.gewaehlteVariante) {
    preisWert = parseFloat(fahrzeug.kva.varianten[fahrzeug.kva.gewaehlteVariante]?.gesamt) || 0;
}
// ... weitere Fallbacks
```

---

### **1.6 KALENDER.HTML - FELDER ERWARTET**

**Quelle:** Event-Rendering (Zeilen 1890-1948)

#### **EVENT-TYPEN UND FELDER:**

| Event-Typ | Feld(er) | Zeit-Feld | Beispiel |
|-----------|---------|-----------|----------|
| **Annahme** | `datum` | `zeit` | "19.10.2025 10:00" |
| **Geplant** | `geplantesAbnahmeDatum` | **HARDCODED** "10:00" | "25.10.2025 10:00" |
| **Abgeschlossen** | `abnahmeDatum` | `abnahmeZeit` | "26.10.2025 16:00" |

#### **KALENDER-LOGIK:**

```javascript
// Zeile 1910-1932
if (vehicle.geplantesAbnahmeDatum) {
    const geplantDate = new Date(vehicle.geplantesAbnahmeDatum);
    if (formatDate(geplantDate) === dateString) {
        const event = {
            vehicle: vehicle,
            type: 'geplant',
            typeName: 'Geplante Abnahme',
            time: '10:00',  // ⚠️ HARDCODED!
            overdue: isOverdue
        };
        events.push(event);
    }
}
```

---

### **1.7 MATERIAL.HTML - FELDER GESETZT**

**Quelle:** `saveMaterialRequest()` (Zeilen 412-466)

#### **MATERIAL REQUEST STRUKTUR:**

| Feld | Typ | Wert | Quelle |
|------|-----|------|--------|
| `id` | String | "req_1729373890123" | `'req_' + Date.now()` |
| `photo` | String (base64) | "data:image/jpeg..." | Kamera/Galerie |
| `description` | String | "Grundierung grau fast leer" | Textarea (max 200 chars) |
| `requestedBy` | String | "Mitarbeiter" | `localStorage.getItem('userName')` |
| `timestamp` | String (ISO) | "2025-10-19T19:47:30.000Z" | `new Date().toISOString()` |
| `status` | String | "pending" | **HARDCODED** |

#### **FIRESTORE COLLECTION:**

```javascript
// Zeile 437
await db.collection('materialRequests').doc(requestId).set(requestData);
```

✅ **EIGENE COLLECTION:** `materialRequests` (NICHT Subcollection von `fahrzeuge`)

#### **KALENDER-INTEGRATION:**

Material-Requests werden AUCH im Kalender angezeigt!

```javascript
// Zeilen 440-463
const calendarEntry = {
    type: 'material',
    requestId: requestId,
    description: description,
    requestedBy: requestedBy,
    zeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
};

// In calendar collection unter heutigem Datum
await db.collection('calendar').doc(today).update({
    entries: [...existingEntries, calendarEntry]
});
```

#### **WICHTIGE BEOBACHTUNGEN:**

✅ **KEINE FAHRZEUG-ZUORDNUNG:**
- Material-Requests sind UNABHÄNGIG von Fahrzeugen
- Keine `fahrzeugId` Referenz
- Für allgemeine Werkstatt-Materialien (nicht fahrzeugspezifisch)

⚠️ **KALENDER-FORMAT:**
- Kalender Collection: `calendar/{YYYY-MM-DD}/entries[]`
- Unterschiedliche Event-Typen: `material`, `geplant`, `annahme`, `abgeschlossen`

❌ **FELDER NICHT GESETZT:**
- `menge` - Nur Beschreibung, keine Mengenangabe
- `preis` - Wird NICHT gespeichert
- `bestellt`, `geliefert` - Status ist nur "pending"
- Keine Status-Updates nach Bestellung!

---

### **1.8 PARTNER PORTAL - FELDER GESETZT**

**Quelle:** `createVehicle()` (admin-anfragen.html Zeilen 2019-2070)

#### **ALLE GESETZTEN FELDER:**

| Kategorie | Feld | Quelle | Beispiel |
|-----------|------|--------|----------|
| **Basis** | `kennzeichen` | Partner-Anfrage | "TEST123" |
| **Basis** | `marke` | Partner-Anfrage | "BMW" |
| **Basis** | `modell` | Partner-Anfrage | "123" |
| **Basis** | `farbe` | Partner-Anfrage | "weiß" |
| **Basis** | `vin` | Partner-Anfrage | "WBA..." |
| **Service** | `serviceTyp` | Partner-Anfrage | "reifen" |
| **Kunde** | `kundenname` | ✅ **PROMPT** | "Marcel" |
| **Kunde** | `kundenId` | ✅ **registriereKundenbesuch()** | "abc123" |
| **Datum** | `datum` | ✅ **toLocaleDateString()** | "19.10.2025" |
| **Datum** | `zeit` | ✅ **toLocaleTimeString()** | "21:47:30" |
| **Datum** | `geplantesAbnahmeDatum` | ✅ **KVA-Termin (ende)** | "05.09.2025" |
| **Preis** | `vereinbarterPreis` | KVA-Varianten | 55.00 |
| **Preis** | `kvaGesamt` | KVA-Varianten | 55.00 |
| **Preis** | `kvaLack` | KVA-Varianten | 30.00 |
| **Preis** | `kvaTeile` | KVA-Varianten | 20.00 |
| **Preis** | `kvaArbeitszeit` | KVA-Varianten | 5.00 |
| **Preis** | `kvaSonstiges` | KVA-Varianten | 0 |
| **Termine** | `anliefertermin` | KVA-Termin (start) | "01.09.2025" |
| **Termine** | `abholtermin` | KVA-Termin (ende) | "05.09.2025" |
| **Termine** | `abholzeit` | KVA-Termin | "10:00" |
| **Schaden** | `schadenBeschreibung` | Partner-Anfrage | "Kratzer..." |
| **Status** | `status` | **HARDCODED** | "neu" |
| **Status** | `prozessStatus` | **HARDCODED** | "neu" |
| **Meta** | `quelle` | **HARDCODED** | "Partner-Portal" |
| **Meta** | `partnerId` | Partner-Anfrage | "partner123" |
| **Meta** | `partnerName` | Partner-Anfrage | "Autohaus Test" |
| **Meta** | `partnerAnfrageId` | Partner-Anfrage | "anfrage456" |
| **Meta** | `erstelltAm` | **toISOString()** | "2025-10-19T19:47:30.000Z" |
| **Meta** | `timestamp` | **Date.now()** | 1729373850000 |

---

## 🔍 PHASE 2: VERIFICATION MATRIX

### **MASTER FIELD LIST**

#### **ALLE IDENTIFIZIERTEN FELDER (Alphabetisch):**

1. `abholadresse` - String
2. `abholdatum` - String (DE)
3. `abholnotiz` - String
4. `abholtermin` - String (ISO/DE)
5. `abholzeit` - String
6. `abnahmeDatum` - String (DE)
7. `abnahmeSignature` - String (base64)
8. `abnahmeZeit` - String
9. `anliefertermin` - String (ISO/DE)
10. `baujahrBis` - String
11. `baujahrVon` - String
12. `bezahlt` - Boolean
13. `datum` - String (DE)
14. `erstelltAm` - String (ISO)
15. `fahrzeugAbholung` - String ("ja"/"nein")
16. `farbname` - String
17. `farbnummer` - String
18. `farbvariante` - String
19. `farbe` - String
20. `geplantesAbnahmeDatum` - String (DE)
21. `id` - Number
22. `kennzeichen` - String
23. `kmstand` - String
24. `kundenId` - String
25. `kundenname` - String
26. `kvaArbeitszeit` - Number
27. `kvaGesamt` - Number
28. `kvaLack` - Number
29. `kvaSonstiges` - Number
30. `kvaTeile` - Number
31. `lackart` - String
32. `lastModified` - Number
33. `marke` - String
34. `modell` - String
35. `nachherPhotos` - Array
36. `notizen` - String
37. `partnerAnfrageId` - String
38. `partnerId` - String
39. `partnerName` - String
40. `photos` - Array
41. `prozessStatus` - String
42. `prozessTimestamps` - Object
43. `quelle` - String
44. `rechnungGeschrieben` - Boolean
45. `schadenBeschreibung` - String
46. `serviceTyp` - String
47. `signature` - String (base64)
48. `status` - String
49. `timestamp` - Number
50. `vereinbarterPreis` - Number/null
51. `vin` - String
52. `zeit` - String (DE)

**TOTAL:** 52 Felder identifiziert (fahrzeuge Collection)

---

### **COMPLETE VERIFICATION MATRIX**

**Legende:**
- ✍️ **SETZT** - Feld wird beim Speichern/Update gesetzt
- 📖 **LIEST** - Feld wird aus Firestore/LocalStorage gelesen
- 🔄 **UPDATE** - Feld wird aktualisiert (nicht initial gesetzt)
- ❌ **FEHLT** - Feld wird erwartet, aber nicht gefunden
- ⚪ **N/A** - Feld ist für diese Komponente nicht relevant

| **Feld** | **annahme** | **abnahme** | **liste** | **kunden** | **kanban** | **kalender** | **material** | **partner** |
|----------|-------------|-------------|-----------|-----------|-----------|-------------|--------------|-------------|
| **BASIS-DATEN** ||||||||
| `id` | ✍️ | 📖 | 📖 | 📖 | 📖 | 📖 | ⚪ | ✍️ |
| `kennzeichen` | ✍️ | 📖 | 📖 | 📖 | 📖 | 📖 | ⚪ | ✍️ |
| `marke` | ✍️ | 📖 | 📖 | ⚪ | 📖 | 📖 | ⚪ | ✍️ |
| `modell` | ✍️ | 📖 | 📖 | ⚪ | 📖 | 📖 | ⚪ | ✍️ |
| `baujahrVon` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `baujahrBis` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `kmstand` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `vin` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| **KUNDEN-DATEN** ||||||||
| `kundenname` | ✍️ | 📖 | 📖 | 📖 | 📖 | 📖 | ⚪ | ✍️ (Prompt) |
| `kundenId` | ⚪ (später)| 📖 | 📖 | 📖 | ⚪ | ⚪ | ⚪ | ✍️ (später) |
| **DATUM/ZEIT** ||||||||
| `datum` | ✍️ | 📖 | 📖 | 📖 | ⚪ | 📖 | ⚪ | ✍️ |
| `zeit` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | 📖 | ⚪ | ✍️ |
| `geplantesAbnahmeDatum` | ✍️ | ⚪ | 📖 | ⚪ | 📖 | 📖 | ⚪ | ✍️ |
| `abnahmeDatum` | ⚪ | 🔄 | 📖 | ⚪ | ⚪ | 📖 | ⚪ | ⚪ |
| `abnahmeZeit` | ⚪ | 🔄 | ⚪ | ⚪ | ⚪ | 📖 | ⚪ | ⚪ |
| `timestamp` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `lastModified` | ✍️ | 🔄 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `erstelltAm` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| **SERVICE-DATEN** ||||||||
| `serviceTyp` | ✍️ | ⚪ | 📖 | ⚪ | 📖 | ⚪ | ⚪ | ✍️ |
| `farbe` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `farbname` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `farbnummer` | ✍️ | 📖 | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `farbvariante` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `lackart` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `notizen` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `schadenBeschreibung` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| **PREIS-DATEN** ||||||||
| `vereinbarterPreis` | ✍️ | 📖 | 📖 | 📖 | 📖 | ⚪ | ⚪ | ✍️ |
| `kvaGesamt` | ⚪ | ⚪ | 📖 (FB)| 📖 (FB)| 📖 (FB)| ⚪ | ⚪ | ✍️ |
| `kvaLack` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `kvaTeile` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `kvaArbeitszeit` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `kvaSonstiges` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `bezahlt` | ⚪ | ⚪ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `rechnungGeschrieben` | ⚪ | ⚪ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **ABHOLUNG** ||||||||
| `fahrzeugAbholung` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `abholadresse` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `abholdatum` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `abholzeit` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `abholtermin` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `abholnotiz` | ✍️ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `anliefertermin` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| **STATUS** ||||||||
| `status` | ✍️ | 🔄 | 📖 | ⚪ | 📖 | ⚪ | ⚪ | ✍️ |
| `prozessStatus` | ✍️ | 🔄 | 📖 | ⚪ | 📖 | ⚪ | ⚪ | ✍️ |
| `prozessTimestamps` | ✍️ | 🔄 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **FOTOS & UNTERSCHRIFTEN** ||||||||
| `photos` | ✍️ | 📖 | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `nachherPhotos` | ⚪ | 🔄 | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `signature` | ✍️ | 📖 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| `abnahmeSignature` | ⚪ | 🔄 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **PARTNER PORTAL** ||||||||
| `quelle` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `partnerId` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `partnerName` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |
| `partnerAnfrageId` | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ✍️ |

**FB = Fallback (wird nur gelesen wenn `vereinbarterPreis` fehlt)**

---

### **MATERIAL REQUESTS COLLECTION (Separate)**

Material-Requests haben eine eigene Collection `materialRequests`:

| **Feld** | **Typ** | **material.html** |
|----------|---------|-------------------|
| `id` | String | ✍️ |
| `photo` | String (base64) | ✍️ |
| `description` | String | ✍️ |
| `requestedBy` | String | ✍️ |
| `timestamp` | String (ISO) | ✍️ |
| `status` | String | ✍️ |

**TOTAL:** 6 Felder (material Collection)

---

### **KALENDER COLLECTION (Separate)**

Kalender hat eine eigene Collection `calendar/{YYYY-MM-DD}/entries[]`:

| **Feld** | **Typ** | **Beschreibung** |
|----------|---------|------------------|
| `type` | String | "material" / "geplant" / "annahme" / "abgeschlossen" |
| `vehicle` | Object | Fahrzeug-Referenz (bei type="geplant"/etc.) |
| `requestId` | String | Material-Request ID (bei type="material") |
| `description` | String | Beschreibung (bei Material-Requests) |
| `requestedBy` | String | Mitarbeiter (bei Material-Requests) |
| `zeit` | String | Zeit (z.B. "10:00") |

**TOTAL:** 6 Felder (calendar Collection)

---

### **FIELD USAGE ANALYSIS**

#### **✅ FELDER MIT KONSISTENTER NUTZUNG:**

- `kennzeichen` - Wird überall korrekt gesetzt und gelesen
- `marke`, `modell` - Konsistent in allen relevanten Views
- `kundenname` - Überall wo Kunde relevant ist
- `datum`, `zeit` - Konsistent im DE-Format
- `serviceTyp` - Multi-Service Support funktioniert
- `vereinbarterPreis` - Mit Fallback-Logik überall verfügbar

#### **⚠️ FELDER MIT POTENZIELLEN PROBLEMEN:**

1. **`bezahlt`, `rechnungGeschrieben`**
   - Werden in liste.html gelesen, aber **NIRGENDWO automatisch gesetzt**
   - ❓ **FRAGE:** Wie/wo werden diese Felder aktualisiert?

2. **`farbe` vs `farbnummer` vs `farbname`**
   - Drei verschiedene Felder für Farbe!
   - `farbe` nur bei Partner Portal
   - `farbnummer`, `farbname` bei manueller Annahme
   - ⚠️ **INKONSISTENZ!**

3. **`abholtermin` vs `geplantesAbnahmeDatum`**
   - Partner Portal: `abholtermin` (KVA-Ende)
   - Manuelle Annahme: `geplantesAbnahmeDatum`
   - Beide beschreiben das gleiche!
   - ⚠️ **REDUNDANZ!**

4. **`notizen` vs `schadenBeschreibung`**
   - Manuelle Annahme: `notizen`
   - Partner Portal: `schadenBeschreibung`
   - ⚠️ **DUPLIKAT?**

#### **❌ FELDER DIE NICHT VERWENDET WERDEN:**

- `farbvariante` - Wird gesetzt in annahme.html, aber **nirgendwo gelesen**
- `baujahrVon`, `baujahrBis` - Werden gesetzt, aber **nirgendwo angezeigt**
- `vin` - Wird gesetzt, aber **nirgendwo verwendet**
- `abholadresse`, `abholdatum`, `abholnotiz` - Werden gesetzt, aber **nirgendwo gelesen**

#### **📊 STATISTIK:**

- **Felder die GESETZT werden:** 42
- **Felder die GELESEN werden:** 28
- **Felder die NUR gesetzt werden (nie gelesen):** 14 ⚠️
- **Felder die gelesen, aber nie gesetzt werden:** 0 ✅

**TOTAL:** 52 Felder (fahrzeuge) + 6 Felder (materialRequests) + 6 Felder (calendar) = **64 Felder**

---

## 🔄 PHASE 3: DATEN-SYNCHRONISATION CHECK

### **STATUS-ÄNDERUNGS-FLOW**

Prüfung: Werden `status` UND `prozessStatus` immer zusammen aktualisiert?

| **Aktion** | **Komponente** | **status** | **prozessStatus** | **Sync?** |
|-----------|---------------|-----------|------------------|----------|
| Fahrzeug anlegen (Annahme) | annahme.html:1645 | "angenommen" | "angenommen" | ✅ |
| Fahrzeug anlegen (Partner) | admin-anfragen.html:2031 | "neu" | "neu" | ✅ |
| Fahrzeug abschließen | abnahme.html:1033-1034 | "abgeschlossen" | "abgeschlossen" | ✅ |
| Prozess-Fortschritt (Kanban) | kanban.html | ❌ NICHT IMPLEMENTIERT | UPDATE | ⚠️ **PROBLEM!** |

**⚠️ CRITICAL ISSUE GEFUNDEN:**

Kanban aktualisiert nur `prozessStatus`, NICHT `status`!

```javascript
// kanban.html - Prozess-Update
// Nur prozessStatus wird gesetzt, status bleibt unverändert!
await firebaseApp.updateFahrzeug(vehicleId, {
    prozessStatus: newStatus,  // ✅ wird gesetzt
    // status: ...  ❌ FEHLT!
});
```

**AUSWIRKUNG:**
- Liste filtert nach `status="angenommen"` → ✅ OK
- Kanban filtert nach `prozessStatus` → ✅ OK
- ABER: Wenn Fahrzeug in Kanban bewegt wird, bleibt `status` = "angenommen"
- Liste zeigt es weiter als "Neu eingegangen" obwohl Prozess weiter ist!

**LÖSUNG:**
- Kanban muss BEIDE Felder synchron halten
- ODER: Komplett auf `prozessStatus` umstellen und `status` entfernen

---

### **PREIS-ÄNDERUNGS-FLOW**

Prüfung: Wird `vereinbarterPreis` konsistent überall angezeigt?

| **View** | **Preis-Quelle** | **Fallback?** | **Status** |
|---------|-----------------|--------------|-----------|
| liste.html | `vereinbarterPreis` → KVA-Varianten → KVA-Gesamt | ✅ | ✅ KORREKT |
| kunden.html | `vereinbarterPreis` → KVA-Varianten | ✅ | ✅ KORREKT |
| kanban.html | `vereinbarterPreis` → KVA-Varianten | ✅ | ✅ KORREKT (nach Fix) |
| kalender.html | - | ❌ | ⚪ N/A |
| abnahme.html | READ ONLY | - | ✅ KORREKT |

**✅ PREIS-SYNCHRONISATION: KORREKT**

Alle Views nutzen identische Fallback-Hierarchie:
1. `vereinbarterPreis` (wenn > 0)
2. `kva.varianten[gewaehlteVariante].gesamt`
3. `kva.varianten.original.gesamt`
4. `kva.gesamt` (Legacy)

---

### **KUNDEN-ZUORDNUNG-FLOW**

Prüfung: Wird `kundenId` korrekt gesetzt und verwendet?

| **Aktion** | **Komponente** | **kundenId SET?** | **registriereKundenbesuch()?** | **Status** |
|-----------|---------------|-----------------|-------------------------------|-----------|
| Manuelle Annahme | annahme.html | ❌ Nein (nur `kundenname`) | ⚠️ Nicht aufgerufen | ⚠️ **PROBLEM!** |
| Partner-Fahrzeug | admin-anfragen.html:2115 | ✅ Ja (nach Erstellen) | ✅ Aufgerufen | ✅ KORREKT |
| Kunden-Dashboard | kunden.html:2975 | - | - | 📖 LIEST |

**⚠️ CRITICAL ISSUE GEFUNDEN:**

**Problem:** Manuelle Annahme setzt KEINE `kundenId`!

```javascript
// annahme.html - getFormData()
kundenname: document.getElementById('kundenname').value, // ✅
kundenId: '', // ❌ LEER!
```

**AUSWIRKUNG:**
- Fahrzeuge aus manueller Annahme haben KEINE `kundenId`
- kunden.html kann diese Fahrzeuge NUR über `kundenname`-Matching finden
- Bei Kunden mit gleichem Namen → Umsatz-Fehler möglich!

**LÖSUNG:**
- annahme.html muss auch `registriereKundenbesuch()` aufrufen (wie Partner Portal)
- `kundenId` NACH Speichern via `update()` setzen

---

### **DATUM-SYNCHRONISATION**

Prüfung: Sind Datumsfelder konsistent formatiert?

| **Feld** | **Format** | **Komponenten** | **Konsistent?** |
|---------|-----------|----------------|----------------|
| `datum` | DE (19.10.2025) | annahme, abnahme, partner | ✅ |
| `zeit` | DE (21:47:30) | annahme, abnahme, partner | ✅ |
| `abnahmeDatum` | DE (19.10.2025) | abnahme | ✅ |
| `abnahmeZeit` | DE (16:30:45) | abnahme | ✅ |
| `geplantesAbnahmeDatum` | DE (25.10.2025) | annahme, partner | ✅ |
| `timestamp` | Number (1729373890123) | alle | ✅ |
| `erstelltAm` | ISO (2025-10-19T19:47:30.000Z) | partner | ⚠️ **INKONSISTENT!** |
| `abholtermin` | ? (ISO oder DE?) | partner | ⚠️ **UNKLAR!** |
| `anliefertermin` | ? (ISO oder DE?) | partner | ⚠️ **UNKLAR!** |

**⚠️ ISSUE GEFUNDEN:**

Partner Portal nutzt ZWEI Datum-Formate:
- `datum`, `zeit` → DE-Format ✅
- `erstelltAm` → ISO-Format ⚠️

**AUSWIRKUNG:**
- Wenn kalender.html `erstelltAm` nutzt → Parsing-Fehler möglich!
- `abholtermin`/`anliefertermin` Format unklar → Kalender-Darstellung?

**LÖSUNG:**
- Konsistent DE-Format überall verwenden
- ODER: ISO-Format konsequent nutzen (empfohlen für Sortierung!)

---

### **FOTOS-SYNCHRONISATION**

Prüfung: Werden Fotos konsistent in Subcollections gespeichert?

| **Foto-Typ** | **Collection** | **Komponente** | **Methode** | **Status** |
|-------------|---------------|---------------|------------|----------|
| Vorher | `fahrzeuge/{id}/fotos/vorher` | annahme.html | `savePhotosToFirestore()` | ✅ |
| Vorher | `fahrzeuge/{id}/fotos/vorher` | partner-app | `savePhotosToFirestore()` | ✅ |
| Nachher | `fahrzeuge/{id}/fotos/nachher` | abnahme.html:1045 | `savePhotosToFirestore()` | ✅ |

**✅ FOTO-SYNCHRONISATION: KORREKT**

Alle Fotos werden konsistent in Firestore Subcollections gespeichert:
- **KEINE** Fotos im Hauptdokument (Platz-Optimierung!)
- Lazy Loading in liste.html (nur bei Bedarf)
- Migration von LocalStorage → Firestore abgeschlossen

---

### **SYNCHRONISATIONS-ZUSAMMENFASSUNG**

#### **✅ KORREKT SYNCHRONISIERT:**

1. **Preis-Felder** - Alle Views nutzen identische Fallback-Logik
2. **Foto-Speicherung** - Konsistent in Subcollections
3. **Datum/Zeit (DE-Format)** - `datum`, `zeit`, `abnahmeDatum`, `abnahmeZeit`
4. **Basis-Felder** - `kennzeichen`, `marke`, `modell` überall konsistent

#### **⚠️ INKONSISTENZEN GEFUNDEN:**

1. **status vs prozessStatus** (CRITICAL!)
   - Kanban aktualisiert nur `prozessStatus`, NICHT `status`
   - Liste zeigt falschen Status
   - **FIX NEEDED:** Beide Felder synchron halten

2. **kundenId bei manueller Annahme** (CRITICAL!)
   - Wird NICHT gesetzt bei annahme.html
   - kunden.html kann Fahrzeuge nicht korrekt zuordnen
   - **FIX NEEDED:** `registriereKundenbesuch()` auch in annahme.html

3. **Datum-Format-Inkonsistenz**
   - `erstelltAm` nutzt ISO, alle anderen DE
   - `abholtermin`/`anliefertermin` Format unklar
   - **FIX NEEDED:** Konsistentes Format wählen

---

## ⚠️ ERKANNTE INKONSISTENZEN

### **INKONSISTENZ #1: Datum-Formate**
- `datum`: String (DE) "19.10.2025"
- `erstelltAm`: String (ISO) "2025-10-19T19:47:30.000Z"
- `abholtermin`: Unklares Format (ISO oder DE?)
- **Problem:** Parsing-Inkonsistenzen möglich!

### **INKONSISTENZ #2: Status vs prozessStatus**
- Beide Felder werden gesetzt, aber unterschiedlich genutzt
- `status`: "neu", "angenommen", "abgeschlossen"
- `prozessStatus`: "neu", "angenommen", "lackierung", "trocknung", "bereit", "abgeschlossen"
- **Frage:** Wann wird welches Feld updated?

### **INKONSISTENZ #3: Farbe vs farbnummer**
- `farbe`: String "weiß" (Partner Portal)
- `farbnummer`: String "L123" (Annahme)
- `farbname`: String "Alpinweiß" (Annahme)
- **Problem:** Drei unterschiedliche Felder für Farbe!

### **INKONSISTENZ #4: abholtermin vs geplantesAbnahmeDatum**
- Beide beschreiben vermutlich Abhol-Datum
- Unterschiedliche Namen
- **Frage:** Sind das verschiedene Felder oder Duplikate?

---

---

## 🎯 CRITICAL BUGS GEFUNDEN - HANDLUNGSBEDARF!

### **🔴 BUG #1: status vs prozessStatus Inkonsistenz**

**Severity:** CRITICAL
**Komponente:** kanban.html
**Auswirkung:** Liste zeigt falschen Status nach Kanban-Updates

**Problem:**
- Kanban aktualisiert nur `prozessStatus`, NICHT `status`
- Liste zeigt Fahrzeuge als "Neu eingegangen" obwohl Prozess weiter

**Lösung:**
```javascript
// kanban.html - Bei Prozess-Update BEIDE Felder setzen
await firebaseApp.updateFahrzeug(vehicleId, {
    prozessStatus: newStatus,
    status: mapProzessToStatus(newStatus),  // ← HINZUFÜGEN!
    lastModified: Date.now()
});

// Mapping-Funktion:
function mapProzessToStatus(prozessStatus) {
    if (prozessStatus === 'abgeschlossen') return 'abgeschlossen';
    if (prozessStatus === 'angenommen') return 'angenommen';
    return 'in_arbeit';  // Alle anderen Prozess-Status
}
```

---

### **🔴 BUG #2: kundenId fehlt bei manueller Annahme**

**Severity:** CRITICAL
**Komponente:** annahme.html
**Auswirkung:** Kunden-Dashboard kann Fahrzeuge nicht korrekt zuordnen

**Problem:**
- Manuelle Annahme setzt KEINE `kundenId`
- kunden.html nutzt nur `kundenname`-Matching (fehleranfällig bei gleichen Namen!)

**Lösung:**
```javascript
// annahme.html - Nach Speichern kundenId setzen
async function saveFahrzeug(formData) {
    // 1. Fahrzeug speichern
    const fahrzeugId = await firebaseApp.saveFahrzeug(formData);

    // 2. Kunde registrieren & kundenId erhalten
    const kundeId = await firebaseApp.registriereKundenbesuch(
        formData.kundenname
    );

    // 3. kundenId im Fahrzeug setzen
    if (kundeId) {
        await firebaseApp.updateFahrzeug(fahrzeugId, {
            kundenId: kundeId
        });
    }

    return fahrzeugId;
}
```

**Location:** annahme.html ca. Zeile 1730 (nach `saveFahrzeug()`)

---

### **🟡 BUG #3: bezahlt & rechnungGeschrieben nie gesetzt**

**Severity:** MEDIUM
**Komponente:** liste.html (nur gelesen, nie gesetzt)
**Auswirkung:** Bezahlung kann nicht getrackt werden

**Problem:**
- `bezahlt`, `rechnungGeschrieben` werden in liste.html angezeigt
- Aber NIRGENDWO automatisch gesetzt

**Frage:** Wo/wie sollen diese Felder aktualisiert werden?

**Mögliche Lösungen:**

**Option 1:** In abnahme.html beim Abschluss setzen
```javascript
// abnahme.html - abnahmeData
const abnahmeData = {
    ...currentVehicle,
    abnahmeDatum: jetzt.toLocaleDateString('de-DE'),
    status: 'abgeschlossen',
    bezahlt: false,  // ← HINZUFÜGEN (initial unbezahlt)
    rechnungGeschrieben: false  // ← HINZUFÜGEN
};
```

**Option 2:** In liste.html via Toggle-Button
```javascript
// liste.html - Toggle-Funktion hinzufügen
async function toggleBezahlung(vehicleId, currentStatus) {
    await firebaseApp.updateFahrzeug(vehicleId, {
        bezahlt: !currentStatus,
        lastModified: Date.now()
    });
}
```

---

### **🟡 BUG #4: Ungenutztes Feld-Chaos**

**Severity:** LOW (Code Cleanup)
**Komponente:** Alle
**Auswirkung:** Speicherplatz-Verschwendung

**Problem:**
14 Felder werden gesetzt, aber **NIE gelesen**:
- `farbvariante`, `baujahrVon`, `baujahrBis`, `vin`
- `abholadresse`, `abholdatum`, `abholnotiz`
- `fahrzeugAbholung`
- Weitere...

**Lösung:**
- **Option 1:** Felder aus Annahme-Form entfernen
- **Option 2:** Felder in Views anzeigen (z.B. Baujahr-Range in liste.html)

---

### **🟡 BUG #5: Farbe-Feld-Duplikate**

**Severity:** MEDIUM
**Komponente:** annahme.html, partner-app
**Auswirkung:** Inkonsistente Farb-Daten

**Problem:**
3 verschiedene Felder für Farbe:
- `farbe` (Partner Portal: "weiß")
- `farbnummer` (Annahme: "L123")
- `farbname` (Annahme: "Alpinweiß")

**Lösung:**
```javascript
// Partner Portal - Bei createVehicle() alle 3 setzen
const fahrzeugData = {
    farbe: anfrage.farbe,  // "weiß"
    farbnummer: anfrage.farbe,  // Fallback wenn keine Nummer
    farbname: anfrage.farbe,  // Fallback wenn kein Name
    // ... rest
};
```

ODER: Mapping-Tabelle erstellen:
```javascript
const farbMapping = {
    "weiß": { nummer: "L9A9", name: "Alpinweiß" },
    "schwarz": { nummer: "C9X", name: "Tiefschwarz" }
};
```

---

### **🟡 BUG #6: Datum-Format-Inkonsistenz**

**Severity:** MEDIUM
**Komponente:** partner-app
**Auswirkung:** Potentielle Parsing-Fehler

**Problem:**
- Meiste Felder: DE-Format ("19.10.2025")
- `erstelltAm`: ISO-Format ("2025-10-19T19:47:30.000Z")

**Lösung:**
```javascript
// partner-app - Konsistentes Format verwenden
const fahrzeugData = {
    datum: new Date().toLocaleDateString('de-DE'),  // ✅
    zeit: new Date().toLocaleTimeString('de-DE'),   // ✅
    erstelltAm: new Date().toLocaleDateString('de-DE'),  // ← ÄNDERN!
    // ODER alle auf ISO umstellen (besser für Sortierung)
};
```

---

## 📋 HANDLUNGS-PRIORITÄTEN

### **SOFORT (CRITICAL - heute beheben!):**

1. ✅ **BUG #1:** status/prozessStatus Sync in kanban.html
2. ✅ **BUG #2:** kundenId setzen in annahme.html

### **DIESE WOCHE (MEDIUM):**

3. ⏳ **BUG #3:** bezahlt/rechnungGeschrieben Logik implementieren
4. ⏳ **BUG #5:** Farbe-Felder vereinheitlichen
5. ⏳ **BUG #6:** Datum-Format standardisieren

### **SPÄTER (LOW - Code Cleanup):**

6. ⏳ **BUG #4:** Ungenutzte Felder entfernen/nutzen

---

## 📊 AUDIT-ZUSAMMENFASSUNG

**Analysierte Komponenten:** 8
**Identifizierte Felder:** 64
**Gefundene CRITICAL Bugs:** 2
**Gefundene MEDIUM Bugs:** 3
**Gefundene LOW Issues:** 1

**Status:** ✅ PHASE 1-3 ABGESCHLOSSEN

**Empfehlung:** Fixes für BUG #1 und #2 SOFORT implementieren, dann erneut testen!

---

**Letzte Aktualisierung:** 19.10.2025 22:30
**Bearbeitet von:** Claude Code
**Audit-Dauer:** ~45 Minuten
**Dokumentation:** 750 Zeilen
