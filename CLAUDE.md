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
npm run test:all          # 49 Tests (~90s) - MUST be 100%!
npm run test:integration  # 36 Firestore tests
npm run test:smoke        # 13 UI tests
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
| `functions/index.js` | 16+ Cloud Functions |

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

## Cloud Functions (16+)

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

**Secrets (Firebase Secret Manager):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY`

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

### Test-Suite (49 Tests)
| Kategorie | Tests | Beschreibung |
|-----------|-------|--------------|
| Integration | 36 | Direkte Firestore-Operationen |
| Smoke | 13 | UI-Accessibility |

### Erfolgsrate
| Browser | Rate |
|---------|------|
| Chromium | 100% ✅ |
| Mobile Chrome | 100% ✅ |
| iPad | 100% ✅ |
| Firefox | 69% ⚠️ |
| Mobile Safari | 74% ⚠️ |

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
```

**Key Rules:**
- Bug screening has ~75% false positive rate - ALWAYS verify in code before fixing
- `ersatzfahrzeugGewuenscht === true` → `prozessStatus: 'anlieferung'` (not just `abholserviceGewuenscht`)
- Partner-App cannot read werkstatt settings (permission-denied) - embed `werkstattDaten` in documents

---

## External Resources

- **GitHub:** https://github.com/MarcelGaertner1234/Lackiererei1
- **Live:** https://marcelgaertner1234.github.io/Lackiererei1/
- **Firebase:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach

---

_Version: 10.1 (Updated 2025-12-09)_
_Für Error Patterns → NEXT_AGENT_MANUAL_TESTING_PROMPT.md_
_Für Business/Navigation → Root CLAUDE.md_
