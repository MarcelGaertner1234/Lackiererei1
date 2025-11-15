# 📋 Service-Specific Fields - Code-Referenz

**Purpose:** Vollständige Dokumentation des Service-spezifischen Felder Systems in der Fahrzeugannahme App

**Zuletzt aktualisiert:** 2025-11-15 (Dokumentation vervollständigt)

---

## 🎯 Overview

Die App unterstützt **12 verschiedene Service-Typen** mit jeweils spezifischen Eingabefeldern:

### Werkstatt-Services (annahme.html)

| Service | Icon | Spezifische Felder | Implementiert |
|---------|------|-------------------|---------------|
| **Reifen** | 🚗 | Reifengröße, Typ, Anzahl, DOT | ✅ |
| **Glas** | 🔧 | Scheiben-Typ, Schaden-Typ, Versicherung | ✅ |
| **Klima** | ❄️ | Problem-Typ, Kältemittel-Typ | ✅ |
| **Dellen** | 🔨 | Anzahl Dellen, Größe, Technik | ✅ |
| **Lackierung** | 🎨 | (Standard-Felder only) | ✅ |
| **Mechanik** | 🔧 | (Standard-Felder only) | ✅ |
| **Pflege** | ✨ | (Standard-Felder only) | ✅ |
| **TÜV** | 📋 | (Standard-Felder only) | ✅ |

### Partner-Only Services (partner-app/*.html)

| Service | Icon | Spezifische Felder | Partner-Form File |
|---------|------|-------------------|-------------------|
| **Versicherung** | 🛡️ | Schadenstyp, Schadennummer, Gutachter, Versicherung | `versicherung-anfrage.html` |
| **Folierung** | 🎨 | Art, Material, Farbe, Bereiche, Design | `folierung-anfrage.html` |
| **Steinschutz** | 🛡️ | Schutzart/Umfang, Bereiche, Material, Finish | `steinschutz-anfrage.html` |
| **Werbebeklebung** | 📢 | Umfang, Komplexität, Text, Farbanzahl | `werbebeklebung-anfrage.html` |

**Feature History:**
- **v3.6 (2025-10-29):** Nur Reifen-Service hatte spezifische Felder
- **v3.7 (2025-10-30):** 3 weitere Services hinzugefügt (Glas, Klima, Dellen)
- **v3.8 (2025-10-31):** Testing & Bug Fixes
- **v3.9+ (2025-11+):** 4 Partner-Services implementiert (Versicherung, Folierung, Steinschutz, Werbebeklebung)

---

## 📍 Code Locations

### 1. Field Definitions (HTML)

**File:** `annahme.html`
**Lines:** 541-780

```html
<!-- Reifen-Service Felder (Lines 541-589) -->
<div id="reifen-felder" class="service-felder" style="display:none;">
    <div class="form-row">
        <div class="form-group">
            <label for="reifengroesse">
                <i data-feather="circle"></i>
                Reifengröße
            </label>
            <input
                type="text"
                id="reifengroesse"
                placeholder="z.B. 205/55 R16 91V"
                class="form-control">
        </div>

        <div class="form-group">
            <label for="reifentyp">
                <i data-feather="sun"></i>
                Reifen-Typ
            </label>
            <select id="reifentyp" class="form-control">
                <option value="">-- Bitte wählen --</option>
                <option value="sommer">Sommerreifen</option>
                <option value="winter">Winterreifen</option>
                <option value="ganzjahres">Ganzjahresreifen</option>
                <option value="runflat">Runflat-Reifen</option>
            </select>
        </div>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="reifenanzahl">
                <i data-feather="hash"></i>
                Anzahl
            </label>
            <input
                type="number"
                id="reifenanzahl"
                min="1"
                max="4"
                value="4"
                class="form-control">
        </div>

        <div class="form-group">
            <label for="reifendot">
                <i data-feather="calendar"></i>
                DOT-Nummer (optional)
            </label>
            <input
                type="text"
                id="reifendot"
                placeholder="z.B. 2521 (Woche 25, Jahr 2021)"
                class="form-control">
        </div>
    </div>
</div>

<!-- Glas-Service Felder (Lines 593-656) -->
<div id="glas-felder" class="service-felder" style="display:none;">
    <div class="form-row">
        <div class="form-group">
            <label for="glasscheibe">
                <i data-feather="maximize"></i>
                Scheibe
            </label>
            <select id="glasscheibe" class="form-control">
                <option value="">-- Bitte wählen --</option>
                <option value="frontscheibe">Frontscheibe</option>
                <option value="heckscheibe">Heckscheibe</option>
                <option value="seitenscheibe-links">Seitenscheibe links</option>
                <option value="seitenscheibe-rechts">Seitenscheibe rechts</option>
                <option value="schiebedach">Schiebedach</option>
            </select>
        </div>

        <div class="form-group">
            <label for="glasschaden">
                <i data-feather="alert-circle"></i>
                Schaden-Typ
            </label>
            <select id="glasschaden" class="form-control">
                <option value="">-- Bitte wählen --</option>
                <option value="steinschlag">Steinschlag (reparierbar)</option>
                <option value="riss">Riss (Austausch)</option>
                <option value="komplett">Kompletter Austausch</option>
            </select>
        </div>
    </div>

    <div class="form-group">
        <label for="glasversicherung">
            <i data-feather="shield"></i>
            Versicherung zahlt?
        </label>
        <select id="glasversicherung" class="form-control">
            <option value="">-- Bitte wählen --</option>
            <option value="ja-teilkasko">Ja, Teilkasko</option>
            <option value="ja-vollkasko">Ja, Vollkasko</option>
            <option value="nein-selbstzahler">Nein, Selbstzahler</option>
        </select>
    </div>
</div>

<!-- Klima-Service Felder (Lines 660-707) -->
<div id="klima-felder" class="service-felder" style="display:none;">
    <div class="form-group">
        <label for="klimaproblem">
            <i data-feather="thermometer"></i>
            Problem
        </label>
        <select id="klimaproblem" class="form-control">
            <option value="">-- Bitte wählen --</option>
            <option value="kein-kaltluft">Keine Kaltluft</option>
            <option value="schwach">Schwache Leistung</option>
            <option value="geruch">Unangenehmer Geruch</option>
            <option value="geraeusch">Geräusche beim Betrieb</option>
            <option value="leck">Leck/Kältemittelverlust</option>
            <option value="wartung">Wartung/Desinfektion</option>
        </select>
    </div>

    <div class="form-group">
        <label for="klimakaeltemittel">
            <i data-feather="droplet"></i>
            Kältemittel-Typ (falls bekannt)
        </label>
        <select id="klimakaeltemittel" class="form-control">
            <option value="">-- Unbekannt --</option>
            <option value="r134a">R134a (ältere Fahrzeuge)</option>
            <option value="r1234yf">R1234yf (ab 2017)</option>
        </select>
    </div>
</div>

<!-- Dellen-Service Felder (Lines 711-780) -->
<div id="dellen-felder" class="service-felder" style="display:none;">
    <div class="form-row">
        <div class="form-group">
            <label for="dellenanzahl">
                <i data-feather="hash"></i>
                Anzahl Dellen
            </label>
            <input
                type="number"
                id="dellenanzahl"
                min="1"
                max="20"
                value="1"
                class="form-control">
        </div>

        <div class="form-group">
            <label for="dellengroesse">
                <i data-feather="maximize-2"></i>
                Größe (durchschnittlich)
            </label>
            <select id="dellengroesse" class="form-control">
                <option value="">-- Bitte wählen --</option>
                <option value="klein">Klein (< 2cm Ø, z.B. Hagel)</option>
                <option value="mittel">Mittel (2-5cm Ø)</option>
                <option value="gross">Groß (> 5cm Ø)</option>
            </select>
        </div>
    </div>

    <div class="form-group">
        <label for="dellentechnik">
            <i data-feather="tool"></i>
            Empfohlene Technik
        </label>
        <select id="dellentechnik" class="form-control">
            <option value="">-- Automatisch erkennen --</option>
            <option value="pdr">PDR (Paintless Dent Repair)</option>
            <option value="lackierung">Mit Lackierung</option>
            <option value="austausch">Teil-Austausch nötig</option>
        </select>
    </div>
</div>
```

**CSS für service-felder:**
```css
.service-felder {
    display: none;  /* Default: versteckt */
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
}

.service-felder.active {
    display: block;
}
```

---

### 2. Toggle Function (Show/Hide Fields)

**File:** `annahme.html`
**Lines:** 1167-1179

```javascript
function toggleServiceFelder() {
    // Alle service-felder verstecken
    document.querySelectorAll('.service-felder').forEach(el => {
        el.style.display = 'none';
    });

    // Nur relevante Felder für ausgewählten Service zeigen
    const serviceTyp = document.getElementById('serviceTyp').value;
    const felderDiv = document.getElementById(`${serviceTyp}-felder`);

    if (felderDiv) {
        felderDiv.style.display = 'block';
        console.log(`✨ Service-Felder angezeigt für: ${serviceTyp}`);
    }
}
```

**Event Listener (Line 1822):**
```javascript
// Service-Typ Dropdown Change → Show/Hide Service-Felder
document.getElementById('serviceTyp').addEventListener('change', toggleServiceFelder);
```

---

### 3. Data Collection (Get Service Details)

**File:** `annahme.html`
**Lines:** 1915-1995

```javascript
function getServiceDetails(serviceTyp) {
    const details = {};

    switch(serviceTyp) {
        case 'reifen':
            details.reifengroesse = document.getElementById('reifengroesse')?.value || '';
            details.reifentyp = document.getElementById('reifentyp')?.value || '';
            details.reifenanzahl = document.getElementById('reifenanzahl')?.value || '';
            details.reifendot = document.getElementById('reifendot')?.value || '';
            break;

        case 'glas':
            details.glasscheibe = document.getElementById('glasscheibe')?.value || '';
            details.glasschaden = document.getElementById('glasschaden')?.value || '';
            details.glasversicherung = document.getElementById('glasversicherung')?.value || '';
            break;

        case 'klima':
            details.klimaproblem = document.getElementById('klimaproblem')?.value || '';
            details.klimakaeltemittel = document.getElementById('klimakaeltemittel')?.value || '';
            break;

        case 'dellen':
            details.dellenanzahl = document.getElementById('dellenanzahl')?.value || '';
            details.dellengroesse = document.getElementById('dellengroesse')?.value || '';
            details.dellentechnik = document.getElementById('dellentechnik')?.value || '';
            break;

        default:
            // Keine service-spezifischen Felder für andere Services
            break;
    }

    // Nur Details zurückgeben wenn mindestens 1 Feld ausgefüllt
    const hasData = Object.values(details).some(v => v !== '');
    return hasData ? details : null;
}
```

**Usage in saveVehicle() (Line ~1480):**
```javascript
const serviceTyp = document.getElementById('serviceTyp').value;
const serviceDetails = getServiceDetails(serviceTyp);

const vehicleData = {
    kennzeichen,
    kunde,
    serviceTyp,
    serviceDetails,  // ← Nested object mit service-spezifischen Feldern
    notizen,
    photos,
    // ...
};

await firebaseApp.updateFahrzeug(fahrzeugId, vehicleData);
```

---

### 4. Data Display (Render Service Details)

**File:** `liste.html`
**Lines:** 2166-2238

```javascript
function renderServiceDetails(vehicle) {
    if (!vehicle.serviceDetails) {
        return '';  // Keine service-spezifischen Daten
    }

    let html = '<div class="detail-row">';
    html += '<strong>🔧 Service-Details</strong>';

    switch(vehicle.serviceTyp) {
        case 'reifen':
            if (vehicle.serviceDetails.reifengroesse) {
                html += `<p>🛞 <strong>Reifengröße:</strong> ${vehicle.serviceDetails.reifengroesse}</p>`;
            }
            if (vehicle.serviceDetails.reifentyp) {
                const typLabel = {
                    'sommer': 'Sommerreifen',
                    'winter': 'Winterreifen',
                    'ganzjahres': 'Ganzjahresreifen',
                    'runflat': 'Runflat-Reifen'
                }[vehicle.serviceDetails.reifentyp] || vehicle.serviceDetails.reifentyp;
                html += `<p>🌡️ <strong>Typ:</strong> ${typLabel}</p>`;
            }
            if (vehicle.serviceDetails.reifenanzahl) {
                html += `<p>🔢 <strong>Anzahl:</strong> ${vehicle.serviceDetails.reifenanzahl} Reifen</p>`;
            }
            if (vehicle.serviceDetails.reifendot) {
                html += `<p>📅 <strong>DOT:</strong> ${vehicle.serviceDetails.reifendot}</p>`;
            }
            break;

        case 'glas':
            if (vehicle.serviceDetails.glasscheibe) {
                const scheibeLabel = {
                    'frontscheibe': 'Frontscheibe',
                    'heckscheibe': 'Heckscheibe',
                    'seitenscheibe-links': 'Seitenscheibe links',
                    'seitenscheibe-rechts': 'Seitenscheibe rechts',
                    'schiebedach': 'Schiebedach'
                }[vehicle.serviceDetails.glasscheibe] || vehicle.serviceDetails.glasscheibe;
                html += `<p>🪟 <strong>Scheibe:</strong> ${scheibeLabel}</p>`;
            }
            if (vehicle.serviceDetails.glasschaden) {
                html += `<p>⚠️ <strong>Schaden:</strong> ${vehicle.serviceDetails.glasschaden}</p>`;
            }
            if (vehicle.serviceDetails.glasversicherung) {
                html += `<p>🛡️ <strong>Versicherung:</strong> ${vehicle.serviceDetails.glasversicherung}</p>`;
            }
            break;

        case 'klima':
            if (vehicle.serviceDetails.klimaproblem) {
                html += `<p>🌡️ <strong>Problem:</strong> ${vehicle.serviceDetails.klimaproblem}</p>`;
            }
            if (vehicle.serviceDetails.klimakaeltemittel) {
                html += `<p>💧 <strong>Kältemittel:</strong> ${vehicle.serviceDetails.klimakaeltemittel}</p>`;
            }
            break;

        case 'dellen':
            if (vehicle.serviceDetails.dellenanzahl) {
                html += `<p>🔢 <strong>Anzahl Dellen:</strong> ${vehicle.serviceDetails.dellenanzahl}</p>`;
            }
            if (vehicle.serviceDetails.dellengroesse) {
                html += `<p>📏 <strong>Größe:</strong> ${vehicle.serviceDetails.dellengroesse}</p>`;
            }
            if (vehicle.serviceDetails.dellentechnik) {
                html += `<p>🛠️ <strong>Technik:</strong> ${vehicle.serviceDetails.dellentechnik}</p>`;
            }
            break;
    }

    html += '</div>';
    return html;
}
```

**Usage in showVehicleDetails() (Line ~2080):**
```javascript
const detailsHTML = `
    <div class="detail-row">
        <strong>🚗 Kennzeichen</strong>
        <span>${vehicle.kennzeichen}</span>
    </div>
    ${renderServiceDetails(vehicle)}  // ← Service-Details einfügen
    <div class="detail-row">
        <strong>📝 Notizen</strong>
        <span>${vehicle.notizen || 'Keine Notizen'}</span>
    </div>
`;
```

---

### 5. Kanban Process Definitions

**File:** `kanban.html`
**Lines:** 1683-1800

```javascript
const processDefinitions = {
    reifen: {
        name: '🚗 Reifen-Service',
        icon: '🚗',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert' },
            { id: 'bestellung', icon: '🛒', label: 'Bestellung' },
            { id: 'montage', icon: '🔧', label: 'Montage' },
            { id: 'fertig', icon: '✅', label: 'Fertig' }
        ]
    },

    glas: {
        name: '🔧 Glas-Service',
        icon: '🪟',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert' },
            { id: 'bestellung', icon: '🛒', label: 'Scheibe bestellt' },
            { id: 'montage', icon: '🔧', label: 'Einbau' },
            { id: 'fertig', icon: '✅', label: 'Fertig' }
        ]
    },

    klima: {
        name: '❄️ Klima-Service',
        icon: '❄️',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert' },
            { id: 'diagnose', icon: '🔍', label: 'Diagnose' },
            { id: 'wartung', icon: '🔧', label: 'Wartung/Befüllung' },
            { id: 'fertig', icon: '✅', label: 'Fertig' }
        ]
    },

    dellen: {
        name: '🔨 Dellen-Service',
        icon: '🔨',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangan' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert' },
            { id: 'reparatur', icon: '🔧', label: 'PDR/Reparatur' },
            { id: 'lackierung', icon: '🎨', label: 'Nachbehandlung' },
            { id: 'fertig', icon: '✅', label: 'Fertig' }
        ]
    },

    // ... other 6 services (lackierung, mechanik, pflege, tuev, versicherung, sonstiges)
};
```

---

## 🔄 Data Flow

### 1. Vehicle Creation (annahme.html)

```
User selects Service-Typ (dropdown)
        ↓
toggleServiceFelder()
        ↓
Show/Hide relevant service-felder <div>
        ↓
User fills service-specific fields
        ↓
User clicks "Speichern"
        ↓
getServiceDetails(serviceTyp)
        ↓
Collect data → { reifengroesse: '...', reifentyp: '...' }
        ↓
Save to Firestore: { serviceTyp: 'reifen', serviceDetails: {...} }
```

### 2. Vehicle Display (liste.html)

```
Load vehicle from Firestore
        ↓
User clicks "Details anzeigen"
        ↓
renderServiceDetails(vehicle)
        ↓
Switch on vehicle.serviceTyp
        ↓
Render fields with labels & icons
        ↓
Display in modal
```

### 3. Kanban Processing (kanban.html)

```
Load vehicle from Firestore
        ↓
Identify vehicle.serviceTyp ('reifen')
        ↓
Load processDefinitions['reifen']
        ↓
Render 5 custom steps (Eingegangen → Terminiert → Bestellung → Montage → Fertig)
        ↓
Drag & Drop updates vehicle.status
```

---

## 🧪 Testing Guide

### Test Case 1: Reifen-Service

**SCHRITT 2.1 (Manual Testing):**

1. Navigate to `annahme.html`
2. Fill basic fields (Kennzeichen, Kunde)
3. Select **Service-Typ: Reifen**
4. **Expected:** Reifen-Felder div appears
5. Fill fields:
   - Reifengröße: `205/55 R16 91V`
   - Typ: `Winterreifen`
   - Anzahl: `4`
   - DOT: `2521`
6. Click "Speichern"
7. **Expected Console Logs:**
```
✨ Service-Felder angezeigt für: reifen
🚀 Speichere Fahrzeug...
📦 Service-Details: {reifengroesse: '205/55 R16 91V', reifentyp: 'winter', ...}
✅ Fahrzeug gespeichert: [ID]
```
8. Navigate to `liste.html`
9. Click vehicle → "Details anzeigen"
10. **Expected:** Service-Details section shows:
```
🔧 Service-Details
🛞 Reifengröße: 205/55 R16 91V
🌡️ Typ: Winterreifen
🔢 Anzahl: 4 Reifen
📅 DOT: 2521
```

### Test Case 2: Glas-Service

**SCHRITT 2.2 (Manual Testing):**

1. Select **Service-Typ: Glas**
2. Fill fields:
   - Scheibe: `Frontscheibe`
   - Schaden: `Steinschlag (reparierbar)`
   - Versicherung: `Ja, Teilkasko`
3. Save & verify in liste.html
4. **Expected:**
```
🔧 Service-Details
🪟 Scheibe: Frontscheibe
⚠️ Schaden: Steinschlag (reparierbar)
🛡️ Versicherung: Ja, Teilkasko
```

### Test Case 3: Klima-Service

**SCHRITT 2.3:**

1. Select **Service-Typ: Klima**
2. Fill:
   - Problem: `Keine Kaltluft`
   - Kältemittel: `R1234yf (ab 2017)`
3. Verify rendering

### Test Case 4: Dellen-Service

**SCHRITT 2.4:**

1. Select **Service-Typ: Dellen**
2. Fill:
   - Anzahl: `3`
   - Größe: `Klein (< 2cm Ø, z.B. Hagel)`
   - Technik: `PDR (Paintless Dent Repair)`
3. Verify rendering

---

## 📊 Firestore Data Structure

### Vehicle Document (with Service Details)

```javascript
{
    id: "1730987654321",
    kennzeichen: "HD-AB 123",
    kunde: {
        name: "Max Mustermann",
        kontakt: "0123456789"
    },
    serviceTyp: "reifen",
    serviceDetails: {  // ← NEW in v3.7
        reifengroesse: "205/55 R16 91V",
        reifentyp: "winter",
        reifenanzahl: "4",
        reifendot: "2521"
    },
    status: "neu",
    processStep: "neu",
    notizen: "Kunde möchte Winterreifen montieren",
    photos: [ /* ... */ ],
    createdAt: 1730987654321,
    lastModified: 1730987654321,
    werkstattId: "mosbach"
}
```

**Collection Path:** `fahrzeuge_mosbach` (Multi-Tenant!)

---

## ⚠️ Common Errors

### Error 1: Service-Felder bleiben versteckt

**Symptom:** User wählt Service-Typ, aber Felder erscheinen nicht

**Cause:** `toggleServiceFelder()` nicht an `change` Event gebunden

**Fix:**
```javascript
// annahme.html:1822 - Event Listener prüfen
document.getElementById('serviceTyp').addEventListener('change', toggleServiceFelder);
```

### Error 2: Service-Details nicht gespeichert

**Symptom:** Felder ausgefüllt, aber Daten nicht in Firestore

**Cause:** `getServiceDetails()` nicht aufgerufen vor `saveVehicle()`

**Fix:**
```javascript
// annahme.html:~1480 - Vor save()
const serviceDetails = getServiceDetails(serviceTyp);
const vehicleData = {
    serviceTyp,
    serviceDetails,  // ← MUSS hier sein!
    // ...
};
```

### Error 3: Service-Details nicht angezeigt in liste.html

**Symptom:** Daten in Firestore, aber nicht im Detail-Modal sichtbar

**Cause:** `renderServiceDetails()` nicht aufgerufen

**Fix:**
```javascript
// liste.html:~2080 - Im details HTML
const detailsHTML = `
    ${renderServiceDetails(vehicle)}  // ← MUSS hier sein!
`;
```

---

## 🔗 Related References

- [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md) - Firebase Initialization
- [REFERENCE_VEHICLE_INTAKE.md](REFERENCE_VEHICLE_INTAKE.md) - Complete annahme.html workflow
- [REFERENCE_VEHICLE_LIST.md](REFERENCE_VEHICLE_LIST.md) - liste.html rendering
- [REFERENCE_KANBAN_SYSTEM.md](REFERENCE_KANBAN_SYSTEM.md) - Kanban process definitions
- [CODEBASE_INDEX.md](CODEBASE_INDEX.md) - Master Index

---

## 📱 Partner-Only Services - Detaillierte Felddokumentation

Die folgenden 4 Services sind **NUR in der Partner-App** verfügbar (nicht in annahme.html). Partner erstellen Service-Anfragen über dedizierte Formulare.

---

### Service 9: Versicherung 🛡️

**Partner-Form:** `partner-app/versicherung-anfrage.html`

#### Felder:

| Feld-Name | Typ | Beschreibung | Beispiel |
|-----------|-----|--------------|----------|
| `schadenstyp` | Select | Art des Schadens | Hagel, Wildunfall, Parkschaden, Unfall |
| `schadennummer` | Text | Versicherungs-Schadensnummer | GDV-123456789 |
| `gutachter` | Text | Gutachter-Name (falls vorhanden) | Max Mustermann |
| `versicherung` | Text | Versicherungsgesellschaft | Allianz, HUK, etc. |

#### Code-Locations:

**Normalisierung:** `partner-app/admin-anfragen.html`
```javascript
// Line ~2250: normalizeServiceData('versicherung', rawData)
// Keine spezielle Normalisierung nötig - Felder werden direkt übernommen
```

**Kanban-Process:** `kanban.html:processDefinitions.versicherung`
```javascript
{
    name: '🛡️ Versicherung',
    icon: '🛡️',
    steps: [
        { id: 'neu', label: 'Eingegangen' },
        { id: 'gutachten', label: 'Gutachten' },
        { id: 'freigabe', label: 'Freigabe' },
        { id: 'reparatur', label: 'Reparatur' },
        { id: 'fertig', label: 'Fertig' }
    ]
}
```

---

### Service 10: Folierung 🎨

**Partner-Form:** `partner-app/folierung-anfrage.html`

#### Felder:

| Feld-Name | Typ | Beschreibung | Beispiel |
|-----------|-----|--------------|----------|
| `art` / `folierungArt` | Select | Art der Folierung | Vollfolierung, Teilfolierung, Akzente |
| `material` | Select | Folien-Marke | 3M, Avery, Hexis |
| `farbe` | Text | Farbe/Finish | Schwarz Matt, Chrom, Carbon |
| `bereiche` | Array | Zu folierende Bereiche | ['Motorhaube', 'Dach', 'Spiegel'] |
| `design` | Textarea | Custom-Design Beschreibung | Freitext |

#### Code-Locations:

**Normalisierung:** `partner-app/anfrage-detail.html:1037-1045`
```javascript
function normalizeServiceData(serviceTyp, rawData) {
    if (serviceTyp === 'folierung') {
        return {
            art: rawData.art || rawData.folierungArt || '',
            material: rawData.material || '',
            farbe: rawData.farbe || '',
            bereiche: rawData.bereiche || [],
            design: rawData.design || ''
        };
    }
}
```

**Field-Alias:** `art` || `folierungArt` (Partner vs Fahrzeug)

---

### Service 11: Steinschutz 🛡️

**Partner-Form:** `partner-app/steinschutz-anfrage.html`

**⚠️ WICHTIG:** Dieser Service hat **40+ Code-Verwendungen** in 10 Files!

#### Felder:

| Feld-Name | Typ | Beschreibung | Beispiel |
|-----------|-----|--------------|----------|
| `schutzart` / `umfang` / `steinschutzUmfang` | Select | Umfang des Schutzes | vollverklebung, frontpaket, teilbereich |
| `bereiche` | Array | Geschützte Bereiche | ['Front', 'Motorhaube', 'Spiegel'] |
| `material` | Select | PPF-Marke | 3M, XPEL, SunTek |
| `finish` | Select | Oberflächen-Finish | gloss, matte, satin |
| `info` | Textarea | Zusätzliche Hinweise | Freitext |

#### Code-Locations:

**Normalisierung:** `partner-app/anfrage-detail.html:1025-1035`
```javascript
function normalizeServiceData(serviceTyp, rawData) {
    if (serviceTyp === 'steinschutz') {
        return {
            schutzart: rawData.schutzart || rawData.umfang || rawData.steinschutzUmfang || '',
            bereiche: rawData.bereiche || [],
            material: rawData.material || '',
            finish: rawData.finish || '',
            info: rawData.info || ''
        };
    }
}
```

**Field-Alias (3 Varianten):**
- `umfang` = Partner-Anfrage Input
- `steinschutzUmfang` = Fahrzeug Additional Service (Service-Präfix!)
- `schutzart` = Render-Funktionen (semantisch korrekt)

**Grund für 3 Namen:** Multi-Service Field-Kollisions-Vermeidung (siehe CLAUDE.md:2586-2596)

**Kanban-Label:** `kanban.html:5779-5789`
```javascript
if (serviceData.steinschutzUmfang || serviceData.schutzart || serviceData.umfang) {
    const umfang = serviceData.steinschutzUmfang || serviceData.schutzart || serviceData.umfang;
    labelParts.push(`Umfang: ${umfang}`);
}
```

---

### Service 12: Werbebeklebung 📢

**Partner-Form:** `partner-app/werbebeklebung-anfrage.html`

#### Felder:

| Feld-Name | Typ | Beschreibung | Beispiel |
|-----------|-----|--------------|----------|
| `umfang` / `werbebeklebungUmfang` | Select | Umfang der Beklebung | Vollverklebung, Teilverklebung, Nur Logo |
| `komplexitaet` / `werbebeklebungKomplexitaet` | Select | Komplexitätsstufe | einfach, mittel, komplex |
| `text` | Textarea | Text-Inhalt | Firmenname, Slogan, etc. |
| `farbanzahl` | Number | Anzahl verwendeter Farben | 1-5 |

#### Code-Locations:

**Normalisierung:** `partner-app/anfrage-detail.html:1047-1052`
```javascript
function normalizeServiceData(serviceTyp, rawData) {
    if (serviceTyp === 'werbebeklebung') {
        return {
            umfang: rawData.umfang || rawData.werbebeklebungUmfang || '',
            komplexitaet: rawData.komplexitaet || rawData.werbebeklebungKomplexitaet || '',
            text: rawData.text || '',
            farbanzahl: rawData.farbanzahl || ''
        };
    }
}
```

**Field-Alias (2 Varianten pro Feld):**
- `umfang` vs `werbebeklebungUmfang`
- `komplexitaet` vs `werbebeklebungKomplexitaet`

**Grund:** Multi-Service Namenskollisions-Vermeidung (gleicher Pattern wie Steinschutz)

---

## 🔄 Multi-Service Field-Präfix Pattern

**WICHTIG für Partner-Services:**

Die 4 Partner-Services (Versicherung, Folierung, Steinschutz, Werbebeklebung) nutzen **Service-Präfixe** bei Field-Namen wenn sie als **Additional Services** in einem Fahrzeug gespeichert werden.

**Beispiel:**

```javascript
// Partner-Anfrage (PRIMARY Service)
{
    serviceTyp: 'steinschutz',
    serviceData: {
        umfang: 'vollverklebung'  // ← KEIN Präfix
    }
}

// Fahrzeug (ADDITIONAL Service)
{
    serviceTyp: 'lackier',  // PRIMARY
    additionalServices: [
        {
            serviceTyp: 'steinschutz',
            serviceDetails: {
                steinschutzUmfang: 'vollverklebung'  // ← MIT Präfix!
            }
        }
    ]
}
```

**Warum?** Verhindert Field-Kollisionen bei Multi-Service-Fahrzeugen (z.B. Folierung + Werbebeklebung beide haben `umfang`-Field)

**Normalisierung:** `normalizeServiceData()` Funktionen in `anfrage-detail.html` und `admin-anfragen.html` handeln beide Varianten via Fallback-Chains:
```javascript
normalized.umfang = rawData.umfang || rawData.steinschutzUmfang || '';
```

---

_Created: 2025-10-31 during Manual Test Session_
_Last Updated: 2025-11-15 (4 Partner-Services dokumentiert)_
