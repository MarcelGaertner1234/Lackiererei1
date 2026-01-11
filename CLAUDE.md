# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Documentation Hierarchy

**READ `NEXT_AGENT_MANUAL_TESTING_PROMPT.md` FIRST** for:
- Testing workflow & error patterns (52+)
- ALWAYS/NEVER Do guidelines
- Pre-implementation checklist
- Session history & learnings

**This file:** Architecture reference, Multi-Tenant patterns, Critical code patterns

---

## Quick Commands

### Testing (BEFORE any code changes!)
```bash
npm run test:all          # 458 Tests (~14min) - MUST be 100%!
npm run test:integration  # Integration tests (Firestore)
npm run test:smoke        # UI smoke tests
npm run test:headed       # With browser UI
npm run test:debug        # Debug mode

# Run single test file
npx playwright test tests/integration/vehicle-integration.spec.js --workers=1

# Run specific test by name
npx playwright test -g "should create vehicle" --workers=1
```

### Development
```bash
npm run server            # → localhost:8000
firebase emulators:start --only firestore,storage --project demo-test
# Emulator UI: http://localhost:4000
```

### Deployment
```bash
git add . && git commit -m "..." && git push  # Auto-Deploy in 2-3 min
firebase deploy --only functions              # Cloud Functions
firebase deploy --only firestore:rules        # Security Rules
```

---

## Technology Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | Vanilla JS, HTML5, CSS3 |
| **Backend** | Firebase Firestore + Storage + Functions |
| **Auth** | Firebase Auth (2-Stufen: Werkstatt + Mitarbeiter) |
| **Email** | AWS SES (eu-central-1, DSGVO) |
| **Testing** | Playwright (Hybrid: Integration + Smoke) |
| **AI** | OpenAI GPT-4, Whisper, TTS-1-HD |
| **Deploy** | GitHub Pages (Auto-Deploy) |

---

## Key Files

### Core Workflow
| Datei | Zeilen | Funktion |
|-------|--------|----------|
| `annahme.html` | 10,725 | Fahrzeugannahme, PDF-Upload |
| `liste.html` | 3,700 | Fahrzeugliste, Filter |
| `kanban.html` | 10,966 | Drag & Drop, 12 Services |
| `abnahme.html` | 3,707 | Fahrzeugübergabe, PDF |

### Partner-Portal (`partner-app/`)
| Datei | Funktion |
|-------|----------|
| `meine-anfragen.html` | Partner-Dashboard |
| `kva-erstellen.html` | KVA/Angebot-Erstellung |
| `anfrage-detail.html` | Anfrage-Details |
| `*-anfrage.html` (12x) | Service-spezifische Formulare |

### JavaScript (`js/`)
| Datei | Funktion |
|-------|----------|
| `auth-manager.js` | 2-Stufen-Authentifizierung |
| `service-types.js` | 12 Service-Typen + Normalisierung |
| `settings-manager.js` | Admin-Einstellungen |
| `listener-registry.js` | Memory Leak Prevention |

### Firebase
| Datei | Funktion |
|-------|----------|
| `firebase-config.js` | Firebase Init + Multi-Tenant Helper |
| `firestore.rules` | Security Rules (2,500+ Zeilen) |
| `storage.rules` | Storage Access Control |
| `functions/index.js` | 17+ Cloud Functions |

---

## Multi-Tenant Architecture (KRITISCH!)

### Collection Pattern
```javascript
// ✅ KORREKT - IMMER getCollection() verwenden
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach

// ❌ FALSCH - Direkter Zugriff = Daten-Leak!
const fahrzeuge = db.collection('fahrzeuge');  // → Globale Collection!
```

**MIT Suffix (_werkstattId):**
- fahrzeuge_*, partnerAnfragen_*, rechnungen_*
- mitarbeiter_*, zeiterfassung_*, kalender_*
- bonusAuszahlungen_*, counters_*

**OHNE Suffix (global):**
- users, settings, partnerAutoLoginTokens, email_logs

### Firebase Initialization
```javascript
// ✅ IMMER await vor Firebase-Operationen
await window.firebaseInitialized;
const werkstattId = window.werkstattId;  // Pre-initialized from localStorage
```

---

## 10 Critical Patterns

### Pattern 1: Multi-Tenant Collections
```javascript
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach
```

### Pattern 2: Firebase Init Await
```javascript
await window.firebaseInitialized;
const werkstattId = window.werkstattId;
```

### Pattern 3: Type-Safe ID Comparisons
```javascript
const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
```

### Pattern 4: Listener Registry (Memory Leak Prevention)
```javascript
window.listenerRegistry?.cleanup();
const unsubscribe = db.collection(...).onSnapshot(...);
window.listenerRegistry?.add(unsubscribe);
```

### Pattern 5: Security Rules Order
```javascript
// ✅ Spezifisch ZUERST
allow read: if isAdmin();           // Specific
allow read: if request.auth != null; // Generic SECOND
```

### Pattern 6: serviceTyp READ-ONLY (DATA LOSS Prevention!)
```javascript
const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;
// NIEMALS überschreiben nach Erstellung!
if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
    fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;  // Restore
}
```

### Pattern 7: Firestore Timestamp Handling
```javascript
function formatFirestoreDate(timestamp) {
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('de-DE');
  }
  return new Date(timestamp).toLocaleDateString('de-DE');
}
```

### Pattern 8: safeNavigate() statt window.location.href
```javascript
safeNavigate('liste.html');  // Mit Listener-Cleanup, Memory Leak Prevention
```

### Pattern 9: Duplicate Prevention (3-Layer)
```javascript
// Layer 1: Flag check
if (anfrage.fahrzeugAngelegt) return;

// Layer 2: Query by reference ID
const existing = await window.getCollection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId).get();
if (!existing.empty) return;

// Layer 3: Query by natural key
const byKennzeichen = await window.getCollection('fahrzeuge')
    .where('kennzeichen', '==', kennzeichen.toUpperCase()).get();
if (!byKennzeichen.empty) return;
```

### Pattern 10: Background Sync Tracker (Kanban)
```javascript
// Trackt stille Firestore-Update-Fehler
// Zeigt EINEN Warning-Toast nach 3 Fehlern
```

**Für alle 52+ Error Patterns mit vollständigen Lösungen:**
→ `NEXT_AGENT_MANUAL_TESTING_PROMPT.md`

---

## 12 Service Types

```javascript
window.SERVICE_TYPES = {
    LACKIER: 'lackier',           // 🎨 Lackierung
    REIFEN: 'reifen',             // 🛞 Reifen
    MECHANIK: 'mechanik',         // 🔧 Mechanik
    PFLEGE: 'pflege',             // ✨ Pflege/Detailing
    TUEV: 'tuev',                 // 🔍 TÜV/AU
    VERSICHERUNG: 'versicherung', // 🛡️ Versicherung
    GLAS: 'glas',                 // 🔍 Glasreparatur
    KLIMA: 'klima',               // ❄️ Klimaservice
    DELLEN: 'dellen',             // 🔨 PDR/Smart Repair
    FOLIERUNG: 'folierung',       // 🌈 Folierung
    STEINSCHUTZ: 'steinschutz',   // 🛡️ Lackschutz
    WERBEBEKLEBUNG: 'werbebeklebung' // 📢 Beschriftung
};
```

**Normalisierung:**
```javascript
// ✅ Input validieren
const validatedServiceTyp = window.normalizeAndValidateServiceType(userInput, 'lackier');
const label = window.getServiceTypeLabel('lackier');  // → '🎨 Lackierung'
```

**Details:** `js/service-types.js` (733 Zeilen, 40+ Aliases)

---

## Security Rules

### Rollen-Hierarchie
1. `superadmin` - Voller Systemzugriff
2. `admin/werkstatt` - Werkstatt-Management
3. `mitarbeiter` - Zeiterfassung, eigene Daten
4. `partner` - Eigene Anfragen
5. `kunde` - Status-Ansicht (read-only)
6. `steuerberater` - Finanzdaten (read-only)

### Custom Claims Pattern
```javascript
function getUserRole() {
  // Priority 1: Custom Claims (schneller)
  return (request.auth.token.role != null)
    ? request.auth.token.role
    : get(/databases/.../users/$(request.auth.uid)).data.role;
}
```

### Storage Rules (Pfade)
| Pfad | Max Size | Auth |
|------|----------|------|
| `/progress-photos/**` | 10 MB | Nein |
| `/fahrzeuge/**` | 10 MB | Ja |
| `/partner-anfragen/**` | 10 MB | Nein* |
| `/pdfs/**` | 50 MB | Ja |

*Partner haben kein Firebase Auth, daher MIME/Size-Validation

---

## Cloud Functions (17+)

### Email (AWS SES)
- `onStatusChange` - Status-Update Email
- `onNewPartnerAnfrage` - Partner-Anfrage Benachrichtigung
- `sendEntwurfEmail` - Entwurf mit QR-Code
- `sendEntwurfBestaetigtNotification` - Bestätigung
- `sendEntwurfAbgelehntNotification` - Ablehnung

### Authentication
- `createPartnerAutoLoginToken` - QR-Code Token (7 Tage TTL)
- `validatePartnerAutoLoginToken` - Token-Validierung
- `ensurePartnerAccount` - Partner-Account erstellen

### PDF/AI
- `parseDATPDF` - GPT-4 Vision PDF-Parsing
- `generateAngebotPDF` - Angebot-PDF generieren

### Scheduled
- `monthlyBonusReset` - Monatlicher Bonus-Reset
- `cleanupStaleSessions` - Session-Cleanup (alle 15 Min)
- `processEmailRetryQueue` - Email-Retry (alle 5 Min)

### AGI/ML
- `exportAllTrainingData` - Export aller Trainingsdaten (Admin-only)

**Secrets (Firebase Secret Manager):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY`

---

## AGI Training Features (Sprint 4 - 2025-12)

Die App sammelt strukturierte Trainingsdaten für zukünftige ML/AGI-Integration.

### Neue Module

| Datei | Funktion |
|-------|----------|
| `js/damage-codes.js` | Standardisierter Schadenskatalog (50+ Positionen, 20+ Schadensarten) |
| `js/damage-labeler.js` | Labeling-UI für Schadensfotos |
| `js/work-timer.js` | Timer-Widget für Arbeitszeit-Tracking |
| `js/kva-feedback.js` | KVA-Feedback mit 10 Abweichungsgründen |
| `admin-datenqualitaet.html` | Datenqualitäts-Dashboard |
| `admin-arbeitszeiten.html` | Arbeitszeit-Reporting |

### Firestore Schema für ML

**Fotos mit Labels:**
```javascript
// In fahrzeuge_{werkstattId}/{fahrzeugId}/fotos
{
  url: "https://...",
  schadenLabels: {
    position: "kotfluegel_vorne_links",  // Standard-Position
    schadensart: "delle",                 // delle|kratzer|rost|lackschaden|bruch
    schweregrad: 3,                       // 1-5 Skala
    groesseSchaetzung: "15x8cm",
    reparaturart: "ausbeulen"
  },
  labeledBy: "mitarbeiter_id",
  labeledAt: Timestamp,
  confidence: "sicher"                    // sicher|unsicher
}
```

**Arbeitszeiten:**
```javascript
// Collection: arbeitszeiten_{werkstattId}
{
  fahrzeugId: "xxx",
  arbeitstyp: "lackieren",
  startzeit: Timestamp,
  endzeit: Timestamp,
  dauerMinuten: 45,
  mitarbeiterId: "yyy",
  mitarbeiterSkillLevel: "senior",        // junior|mittel|senior|meister
  schwierigkeit: 3,                        // 1-5
  materialVerbrauch: [
    { typ: "spachtelmasse", menge: 0.2, einheit: "kg" }
  ]
}
```

**KVA-Feedback:**
```javascript
// In fahrzeuge_{werkstattId}/{fahrzeugId}
{
  kpiFeedback: {
    tatsaechlicheKosten: 1180.00,
    abweichung: -70.00,
    abweichungProzent: -5.6,
    grund: "weniger_material",
    kategorie: "material",
    lernnotiz: "Delle war kleiner als geschätzt",
    feedbackAt: Timestamp
  }
}
```

### Export Cloud Function

```javascript
// Aufruf aus admin-datenqualitaet.html
const result = await firebase.functions()
  .httpsCallable('exportAllTrainingData')({
    werkstattId: 'mosbach',
    startDate: '2025-01-01',  // Optional
    endDate: '2025-12-31'     // Optional
  });

// Returns: { metadata, schadensfotos, arbeitszeiten, kvaFeedback }
```

### ML-Readiness Ziele

| Metrik | Ziel |
|--------|------|
| Gelabelte Fotos | 500+ |
| Arbeitszeit-Einträge | 200+ |
| KVA-Feedback | 100+ |
| Datenqualitäts-Score | 70%+ |

### Admin-Dashboard

`admin-datenqualitaet.html` zeigt:
- Datenqualitäts-Score (0-100%)
- KPI-Cards für jede Datenart
- Trend-Charts für Datensammlung
- Export-Button für ML-Pipeline

---

## Data Pipeline

### Partner-Anfrage → Fahrzeug → Rechnung

```
Partner-Anfrage (neu)
    ↓
Werkstatt-Review (warte_kva)
    ↓
KVA-Erstellung (kva_gesendet)
    ↓
Partner-Annahme (beauftragt)
    ↓
Fahrzeug-Erstellung (angenommen)
    ↓
Arbeit (in_arbeit)
    ↓
Fertig → Rechnung → Bezahlt
```

### Multi-Service Datenstruktur
```javascript
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

## Testing Infrastructure

### Test-Suite (~266 Tests, nur Chromium)
| Kategorie | Tests | Beschreibung |
|-----------|-------|--------------|
| E2E | 12 | Partner/Werkstatt Pipelines |
| Integration | ~240 | Firestore CRUD, Security, Validation |
| Smoke | 13 | UI-Accessibility |

### Browser
| Browser | Status |
|---------|--------|
| Chromium | 100% ✅ (einziger aktiver Browser) |

> Firefox/WebKit/Mobile sind deaktiviert (nicht installiert, spart Testzeit)

### Test-Dateien
- `tests/integration/vehicle-integration.spec.js`
- `tests/integration/multi-tenant.spec.js`
- `tests/integration/partner-workflow.spec.js`
- `tests/integration/werkstatt-workflow.spec.js`
- `tests/integration/data-pipeline.spec.js`
- `tests/smoke/ui-smoke.spec.js`

---

## Pre-Push Checklist

```bash
# 1. Tests
npm run test:all  # MUSS 100% sein

# 2. Review
git diff  # Alle Änderungen prüfen

# 3. Commit
git add . && git commit -m "type: description" && git push
```

**Commit Types:** `feat`, `fix`, `docs`, `test`, `refactor`

---

## Weltmodell Workflows

Das Weltmodell in `.claude/world-model/` bietet 3 essentielle Workflows:

### Before You Edit (EMPFOHLEN!)

```bash
# Vor dem Editieren einer Datei - zeigt Patterns, Risiken, Abhängigkeiten
./.claude/world-model/context-generator.sh kanban.html --full
```

**Output enthält:**
- Datei-Info aus dem Weltmodell
- Relevante Patterns (mit Code-Beispielen)
- Risk-Level und bekannte Bugs
- Abhängigkeiten (was bricht wenn X sich ändert)
- Predictive Bug Detection
- Git-History der Datei

### Weekly Maintenance

```bash
# Code-Health-Check (alle Dateien scannen)
python3 ./.claude/world-model/predict-bugs.py --scan-all

# Learnings analysieren
python3 ./.claude/world-model/analyze-learnings.py --recommendations

# Weltmodell aktualisieren
./.claude/world-model/update.sh --full
```

### Bug Investigation

```bash
# Risiko-Analyse für spezifische Datei
./.claude/world-model/query.sh risk kanban.html

# Bug-Prediction mit 12 Erkennungsmustern
python3 ./.claude/world-model/predict-bugs.py kanban.html

# Hotspots anzeigen
./.claude/world-model/query.sh hotspot
```

### Weltmodell Status (2025-12-15)

Alle bekannten Probleme wurden behoben. Das Weltmodell ist vollständig synchronisiert (v3.2).

---

## Common Gotchas (from Production)

These patterns caused real bugs. Avoid them:

```javascript
// ❌ Timestamp inconsistency - breaks date comparisons
storniertAm: new Date().toISOString()  // String!

// ✅ CORRECT - Firestore native timestamp
storniertAm: firebase.firestore.Timestamp.now()  // Timestamp object

// ❌ Radio button crash - null if nothing selected
document.querySelector('input[name="x"]:checked').value

// ✅ CORRECT - null-safe with fallback
document.querySelector('input[name="x"]:checked')?.value || 'default'

// ❌ Deprecated method - will be removed
text.substr(0, 10)  // substr(start, length)

// ✅ CORRECT - modern method
text.substring(0, 10)  // substring(start, end) - different semantics!

// ❌ Double-click bug - async operation runs twice
async function submit() { await saveData(); }

// ✅ CORRECT - disable button during operation
async function submit() {
    btn.disabled = true;
    try { await saveData(); }
    finally { btn.disabled = false; }
}

// ❌ UNGÜLTIG - if-Statement ohne Body (nur Kommentar danach)
if (window.DEBUG) // console.log('debug:', data)  // Syntax Error!

// ✅ KORREKT - Gesamte Zeile auskommentiert
// if (window.DEBUG) console.log('debug:', data)
```

**Key Rules:**
- Bug screening has ~75% false positive rate - ALWAYS verify in code before fixing
- `ersatzfahrzeugGewuenscht === true` → `prozessStatus: 'anlieferung'` (not just `abholserviceGewuenscht`)
- Partner-App cannot read werkstatt settings (permission-denied) - embed `werkstattDaten` in documents

---

## Session History (Recent)

### 2025-12-16: 48h-Vorschau-System + Browser-Bug

**Implementiert:**
- ✅ **48h-Vorschau-System** für servicePlan-Termine
  - Cloud Function aktiviert jetzt 48h im Voraus (statt 24h)
  - Neue blaue "Vorschau"-Sektion in `tagesplanung.html`
  - Neuer blauer CSS-Zustand in `kanban.html`
  - Deployed & gepusht

**Offenes Issue:**
- ⚠️ **Foto-Upload in annahme.html funktioniert nicht**
  - Symptom: Klick auf "+ Foto hinzufügen" tut nichts, keine Fehlermeldung
  - `document.getElementById('photoInput').click()` in Konsole öffnet keinen Dialog
  - Vermutung: **Browser-Sicherheitseinschränkung** (Safari/Mac)
  - Workaround: Anderen Browser testen (Chrome/Firefox)
  - TODO: Safari-kompatiblen Fallback implementieren

### 2025-12-17: Auftragsstart Fallback-Chain Fix

**Kritischer Bug behoben:**
- Kacheln zeigten END-Datum statt START-Datum
- Ursache: Falsche Fallback-Reihenfolge (`abholtermin` vor `anliefertermin`)
- `abholtermin` = END-Datum (lastService.datum), `anliefertermin` = START-Datum (firstService.datum)

**Fix:**
- 5 Stellen korrigiert: kanban.html (3x), tagesplanung.html (2x)
- Neue Reihenfolge: `anliefertermin || abholdatum || geplantesStartDatum`
- saveVerschiebung() erweitert: setzt jetzt auch `abholdatum` und `abholzeit`
- Commit: `b86c0fa`

### 2025-12-27: LF-BUG-1 Fix + Test-Infrastruktur

**Behoben:**
- ✅ **LF-BUG-1: formatKategorie function exists** - Test schlug fehl
  - Root Cause 1: JavaScript Syntax-Fehler `if (window.DEBUG) // console.log(...)` (if ohne Body!)
  - Root Cause 2: `formatKategorie` wurde zu spät definiert (nach Auth-Redirect)
  - Fix: 6x Syntax-Fehler korrigiert + Early Global Exports hinzugefügt
  - Datei: leihfahrzeuge.html

- ✅ **testIgnore für Archive-Ordner**
  - Problem: `tests/archive/01-vehicle-intake.spec.js` hatte falsche Pfade
  - Fix: `testIgnore: ['**/archive/**']` in playwright.config.js

- ✅ **node_modules Korruption**
  - Problem: Nach langen Test-Runs (5+ min) kann node_modules korrupt werden
  - Symptom: Cascade-Failures (1 Timeout → alle anderen Tests "0ms" skipped)
  - Fix: `rm -rf node_modules && npm install`

### 2026-01-09: Bug-Fix Sprint + Test-Verifizierung ✅

**11 Bugs behoben (100% der verifizierten Bugs):**

| Bug | Datei | Commit |
|-----|-------|--------|
| Kanban Undo-Funktion | `kanban.html` | 3ab3ea2 |
| Paginierung Partner-Anfragen | `partner-app/meine-anfragen.html` | 3ab3ea2 |
| Neuwagen ohne Kennzeichen | `annahme.html` | 3ab3ea2 |
| Rechnungsstornierung | `rechnungen-admin.html` | 3ab3ea2 |
| Draft Auto-Save | `partner-app/*-anfrage.html` | 45deb0a |
| Partner-Ablehnung (Soft-Delete) | `pending-registrations.html` | 396ec0a |
| Partielle Abnahme | `abnahme.html` | 396ec0a |
| Service-Deaktivierung Warnung | `admin-einstellungen.html` | 98e5859 |
| Mitarbeiter-Löschung Cascade | `mitarbeiter-verwaltung.html` | 98e5859 |
| KVA-Varianten Erklärungen | `partner-app/kva-erstellen.html` | 98e5859 |
| Kapazitäts-Warnung Toast | `tagesplanung.html` | 98e5859 |

**Test-Verifizierung:**
```
npm run test:all → 458/458 Tests PASSED (14.1 min)
```

| Kategorie | Tests | Status |
|-----------|-------|--------|
| E2E Pipeline | 12 | ✅ |
| Integration | ~350 | ✅ |
| Smoke | ~96 | ✅ |

**Test-Umgebung (REQUIRED):**
```bash
# Terminal 1: Emulators
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only firestore,storage,auth --project demo-test

# Terminal 2: Tests
npm run test:all
```

**Verbleibend (Optional/Backlog):**
- Kanban Multi-User Optimistic Locking (Edge Case)
- Leihfahrzeug-Rückgabe erzwingen (Design-Entscheidung)
- PDF-Zoom mit PDF.js (Enhancement)

### 2026-01-11: Bug-Scan Sessions #8 & #9

**39 Bugs in 9 Sessions behoben (100% verified bugs fixed)**

**Session #8 (2 Bugs behoben):**
| Bug | Datei | Fix | Commit |
|-----|-------|-----|--------|
| Service Worker Offline Crash | `sw.js:274` | try-catch für cacheFirst + Offline Response | `15ccc62` |
| Tilt-Listener Memory Leak | `kanban.html:11437` | data-tilt-initialized Guard | `15ccc62` |

**Session #9 (1 Bug behoben):**
| Bug | Datei | Fix | Commit |
|-----|-------|-----|--------|
| XSS via javascript: URI | `partner-app/js/kva-erstellen.js` | openPhotoUrl() mit URL-Whitelist | `8fcff4d` |

**Bug-Kategorien Gesamt:**
| Kategorie | Anzahl | Severity |
|-----------|--------|----------|
| Multi-Tenant Violations | 10 | KRITISCH |
| XSS Prevention | 14 | SICHERHEIT |
| Race Conditions | 3 | HOCH |
| Memory Leak Prevention | 3 | MITTEL |
| Service Worker | 1 | MITTEL |
| Promise Error Handling | 15 | MITTEL |
| JSON.parse Error Handling | 4 | MITTEL |
| FileReader.onerror | 6 | MITTEL |
| Timestamp Konsistenz | 3 | NIEDRIG |

**Commits:** `632dff8`, `9b1521c`, `b506f7d`, `c3a8f2e`, `edf2139`, `7c1eb98`, `d0186a4`, `15ccc62`, `8fcff4d`

---

## External Resources

- **GitHub:** https://github.com/MarcelGaertner1234/Lackiererei1
- **Live:** https://marcelgaertner1234.github.io/Lackiererei1/
- **Firebase:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach

---

_Version: 11.0 (Updated 2026-01-11 - Bug-Scan Sessions #8 & #9, 39 Bugs behoben)_
_Für Error Patterns → NEXT_AGENT_MANUAL_TESTING_PROMPT.md_
_Für Business/Navigation → Root CLAUDE.md_
