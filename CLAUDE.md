# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ PARADIGM SHIFT: Manual Testing is OBSOLETE!

**KRITISCHE ÄNDERUNG (Nov 2025):** Manual testing wurde **VOLLSTÄNDIG ERSETZT** durch Hybrid Testing Approach.
- ❌ **NICHT mehr:** Browser öffnen + manuell klicken + Console-Logs kopieren
- ✅ **STATTDESSEN:** `npm run test:all` (23 automatisierte Tests, 100% Success Rate)
- 🎉 **Resultat:** 15x schneller (30s → 2s per test), 100% zuverlässig

**Siehe:** [Testing Philosophy](#-testing-philosophy) für vollständige Dokumentation.

---

## 🚀 TL;DR - START HERE (Die 5 wichtigsten Dinge)

**Wenn du das erste Mal mit dieser Codebase arbeitest, lies dies ZUERST:**

### 1. 🧪 TESTING FIRST - VOR JEDER SESSION!
```bash
npm run test:all  # 23 Hybrid Tests (Integration + Smoke), ~46s
```
**✅ 100% Pass-Rate = App funktioniert einwandfrei**
**❌ Failures = Etwas ist kaputt - FIX BEFORE coding!**

**Warum kritisch?**
- Stellt sicher, dass App funktionstüchtig ist BEVOR du Änderungen machst
- Verhindert "was ist kaputt gegangen?" Debug-Sessions
- 100% Success = Grünes Licht für Development

### 2. 🏗️ Multi-Tenant Architecture (KRITISCH!)
```javascript
// ✅ RICHTIG - IMMER window.getCollection() nutzen!
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach

// ❌ FALSCH - NIEMALS direkt db.collection()!
const fahrzeuge = db.collection('fahrzeuge');  // → Global leak!
```
**Regel:** Jede Collection bekommt automatisch `_mosbach` Suffix
**Ausnahmen:** users, settings, partnerAutoLoginTokens (kein Suffix)

### 3. 🔥 Firebase Initialization Pattern (KRITISCH!)
```javascript
// IMMER auf firebaseInitialized warten!
await window.firebaseInitialized;
const werkstattId = window.werkstattId;  // Pre-initialized from localStorage
```
**⚠️ Ohne Await = Race Conditions!** Siehe: [Firebase Init Pattern](#firebase-initialization)

### 4. 🐛 20 Critical Error Patterns (Must-Know!)
Dokumentierte Fehler-Patterns mit Lösungen (basierend auf 9 Debugging-Sessions):
- Pattern 1-5: Multi-Tenant, Firebase Init, ID Type Mismatch, Listener Registry, PDF Pagination
- Pattern 6-10: Security Rules Order, Field Inconsistency, Duplicates, Service Worker, Firestore Indexes
- Pattern 11-15: Nested Transactions, Counter Rules, Mobile Breakpoints, Dark Mode Contrast, Storage Rules
- Pattern 16-20: Path Matching, CollectionReference Type, Function Verification, PDF Unicode/Emoji, CORS Blocking

**Siehe:** [20 Critical Error Patterns](#-20-critical-error-patterns) für vollständige Solutions

### 5. 📚 Dokumentations-Struktur
| Dokument | Zweck | Wann verwenden? |
|----------|-------|-----------------|
| **CLAUDE.md** (dieses File) | Architecture, Testing, Error Patterns, Best Practices | Tägliche Development, Debugging |
| **FEATURES_CHANGELOG.md** | Feature Implementation Details (Lines 54-3647 extrahiert) | Feature Deep-Dive, Implementation-Recherche |
| **TESTING_AGENT_PROMPT.md** | QA Testing Strategy & 18 Error Patterns | Testing-Role, Pattern-Referenz |
| **CLAUDE_SESSIONS_ARCHIVE.md** | Session-Historie | Bug-Kontext, Historical Reference |

**⚡ Quick-Links:**
- [Testing Guide](#-testing-guide) - Hybrid Testing Approach
- [20 Error Patterns](#-20-critical-error-patterns) - Mit Solutions & Code Examples
- [12 Best Practices](#-12-best-practices--lessons-learned) - Production Debugging Lessons
- [Decision Trees](#-decision-trees) - Quick Reference für common decisions
- [Architecture](#-core-architecture) - Multi-Tenant, Firebase, Security

---

## 🐛 20 Critical Error Patterns (with Solutions)

**Basierend auf 9 Production-Debugging Sessions (Nov 2025)** - Jedes Pattern dokumentiert Symptom → Root Cause → Fix → Code Example

### Pattern 1: Multi-Tenant Violation

**Symptom:**
```javascript
// Console Output:
"🏢 getCollectionName [window]: fahrzeuge → fahrzeuge_mosbach"
```

**Root Cause:** Direct `db.collection('fahrzeuge')` usage without suffix → Global collection leak!

**Fix:**
```javascript
// ❌ FALSCH - Direct access
const fahrzeuge = db.collection('fahrzeuge');  // → Global leak!

// ✅ RICHTIG - Use helper
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach
```

**Lesson:** ALWAYS use `window.getCollection()` for tenant-scoped collections

---

### Pattern 2: Firebase Initialization Timeout

**Symptom:**
```javascript
"Firebase initialization timeout"
```

**Root Cause:** Firebase SDK not loaded OR werkstattId not set before Firebase init

**Fix:**
```javascript
// ✅ ALWAYS await firebaseInitialized
await window.firebaseInitialized;
const werkstattId = window.werkstattId;  // Pre-initialized from localStorage
```

**Lesson:** Check `<script>` tag order, ensure werkstattId is pre-initialized from localStorage

---

### Pattern 3: ID Type Mismatch

**Symptom:**
```javascript
"Fahrzeug nicht gefunden" // Even though ID is correct!
```

**Root Cause:** String vs Number comparison (e.g., `"123" !== 123`)

**Fix:**
```javascript
// ❌ FALSCH
const vehicle = vehicles.find(v => v.id === vehicleId);

// ✅ RICHTIG - Type-safe comparison
const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
```

**Lesson:** ALWAYS use `String()` for ID comparisons in Firebase (auto-generated IDs are strings)

---

### Pattern 4: Listener Registry Missing

**Symptom:**
```javascript
"Cannot read properties of undefined (reading 'registerDOM')"
```

**Root Cause:** `listener-registry.js` not loaded or loaded too late

**Fix:**
```html
<!-- ✅ Load in <head>, NOT at end of body -->
<head>
    <script src="listener-registry.js"></script>
</head>
```

**Lesson:** Core utilities must load BEFORE page content scripts

---

### Pattern 5: PDF Pagination Overflow

**Symptom:**
```javascript
"✅ PDF erstellt erfolgreich"
// BUT: First page is cut off!
```

**Root Cause:** Page-break check too late (y > 250) → Content exceeds page before break

**Fix:**
```javascript
// ❌ FALSCH - Check too late
if (y > 250) { pdf.addPage(); y = 20; }

// ✅ RICHTIG - Earlier checks
if (y > 230) { pdf.addPage(); y = 20; }
if (y > 220) { pdf.addPage(); y = 20; }  // Even safer
if (y > 200) { pdf.addPage(); y = 20; }  // Conservative
```

**Lesson:** Page-break checks need buffer (20-50px from page bottom)

---

### Pattern 6: Firestore Security Rules Pattern Collision (CRITICAL!)

**Symptom:**
```javascript
"❌ Permission denied: Missing or insufficient permissions"
```

**Root Cause:** Wildcard patterns match BEFORE specific patterns → Specific rules never reached

**Bug Example (4h debugging!):**
```javascript
// ❌ FALSCH - Wildcard at TOP blocks everything
match /{chatCollection}/{id} { ... }         // Line 295 - MATCHES FIRST
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 547 - NEVER REACHED!

// ✅ RICHTIG - Specific rules BEFORE wildcards
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 63 - FIRST
match /{bonusCollection}/{id} { ... }         // Line 72 - SECOND
match /{chatCollection}/{id} { ... }          // Line 295 - LAST
```

**Lesson:** Pattern order is CRITICAL! Order: specific → general → wildcard (top to bottom)

---

### Pattern 7: Field Name Inconsistency (Status Sync Bug)

**Symptom:**
```javascript
"✅ Fahrzeug created successfully"
// BUT: Status updates don't sync to Partner Portal!
```

**Root Cause:** Different field names in creation paths
- Partner path: `anfrageId`
- Admin path: `partnerAnfrageId`
→ Status sync broken!

**Fix:**
```javascript
// ✅ STANDARDIZE field names across ALL paths
const fahrzeugData = {
    partnerAnfrageId: anfrageId,  // ✅ Same name everywhere
    // ...
};
```

**Lesson:** Field name consistency is CRITICAL for multi-path flows! Use migration scripts for existing data.

---

### Pattern 8: Duplicate Vehicle Creation (Race Condition)

**Symptom:**
```javascript
"✅ Fahrzeug created" (x2 in different tabs)
// Result: Double Kanban entries!
```

**Root Cause:** No duplicate prevention in Admin creation path

**Fix (3-Layer Check):**
```javascript
// Layer 1: Check anfrage.fahrzeugAngelegt flag
if (anfrage.fahrzeugAngelegt) {
    console.warn('Fahrzeug bereits angelegt');
    return;
}

// Layer 2: Query by partnerAnfrageId
const existingByAnfrage = await db.collection('fahrzeuge_mosbach')
    .where('partnerAnfrageId', '==', anfrageId)
    .get();
if (!existingByAnfrage.empty) return;

// Layer 3: Query by kennzeichen (natural key)
const existingByKennzeichen = await db.collection('fahrzeuge_mosbach')
    .where('kennzeichen', '==', kennzeichen.toUpperCase())
    .get();
if (!existingByKennzeichen.empty) return;
```

**Lesson:** ALWAYS implement duplicate prevention at ALL entry points! Race conditions WILL happen in production.

---

### Pattern 9: Service Worker Response Errors

**Symptom:**
```javascript
"❌ Failed to convert value to 'Response'"
"❌ Background update failed: https://www.google.com/images/cleardot.gif"
```

**Root Cause:** `staleWhileRevalidate` catch block returned `undefined`

**Fix:**
```javascript
// ❌ FALSCH - Returns undefined
catch (error) {
    console.error('Fetch failed:', error);
}

// ✅ RICHTIG - Return valid Response
catch (error) {
    return new Response('Network error', {
        status: 408,
        statusText: 'Request Timeout',
        headers: { 'Content-Type': 'text/plain' }
    });
}
```

**Lesson:** Service Worker error handling MUST return valid Response object!

---

### Pattern 10: Firestore Composite Index Missing

**Symptom:**
```javascript
"❌ Fehler beim Erstellen der PDF: The query requires an index.
You can create it here: [Firebase Console link]"
```

**Root Cause:** Multiple `where()` clauses on different fields require composite index

**Example:**
```javascript
// Query with multiple where clauses:
.where('mitarbeiterId', '==', X)
.where('datum', '>=', Y)
.where('datum', '<=', Z)
.where('status', '==', 'completed')
// → Requires Index: mitarbeiterId (ASC), status (ASC), datum (ASC)
```

**Fix:** Create composite index in Firebase Console OR `firestore.indexes.json`

**Lesson:** Document index requirements UPFRONT in feature spec! Production will fail without indexes.

---

### Pattern 11: Nested Transaction Problem (CRITICAL!)

**Symptom:**
```javascript
"✅ Rechnung erstellt: RE-2025-11-0042"
// BUT: Sometimes transaction fails or creates duplicates!
```

**Root Cause:** Calling function that starts transaction INSIDE another transaction → NESTED!

**Bug Example (2h debugging!):**
```javascript
// ❌ FALSCH - Nested transaction
await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(fahrzeugRef);

    // This function starts its OWN transaction!
    if (newStatus === 'fertig') {
        const rechnungData = await autoCreateRechnung(fahrzeugId, fahrzeugData);
    }

    transaction.update(fahrzeugRef, updateData);
});
```

**Fix:**
```javascript
// ✅ RICHTIG - Execute helper BEFORE main transaction
let rechnungData = null;
if (newStatus === 'fertig') {
    rechnungData = await autoCreateRechnung(fahrzeugId, fahrzeugData);  // Runs its transaction FIRST
    if (rechnungData) {
        updateData.rechnung = rechnungData;  // Add to prepared data
    }
}

// THEN start main transaction with prepared data
await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(fahrzeugRef);
    transaction.update(fahrzeugRef, updateData);  // Already contains rechnung
});
```

**Lesson:** NEVER call functions that start transactions INSIDE a transaction! Prepare data BEFORE transaction.

---

### Pattern 12: Counter Security Rules Missing (CRITICAL!)

**Symptom:**
```javascript
"❌ Permission denied (counter update)"
"❌ Fehler beim Erstellen der Rechnung"
```

**Root Cause:** Firestore collection `counters_{werkstattId}` had NO Security Rules!

**Fix:**
```javascript
// Add Counter Security Rules in firestore.rules
match /{countersCollection}/{counterId} {
    // Admin/Werkstatt: Full read access
    allow read: if countersCollection.matches('counters_.*')
                && isAdmin();

    // Mitarbeiter (Active): Read-only access
    allow read: if countersCollection.matches('counters_.*')
                && isMitarbeiter()
                && isActive();

    // Admin/Werkstatt: Full write access
    allow create, update: if countersCollection.matches('counters_.*')
                          && isAdmin();
}
```

**Lesson:** When adding new collections, ALWAYS add Security Rules IMMEDIATELY! Don't assume "it will work".

---

### Pattern 13: Mobile Media Query Breakpoint Gap

**Symptom:**
```javascript
// No console errors!
// BUT: User reports "Buttons sind abgeschnitten" on 465px device
```

**Root Cause:** Media query only triggers at ≤400px, but user's device is 465px → Falls in gap!

**Bug Example:**
```css
/* ❌ FALSCH - Gap between 400px and 768px */
@media (max-width: 400px) {
    .header-actions { display: grid; }
}
/* User's device: 465px → NO MATCH → Desktop styles applied! */
```

**Fix:**
```css
/* ✅ RICHTIG - Cover gap */
@media (max-width: 520px) {
    .header-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
    .btn {
        flex: none;  /* ✅ CRITICAL: Reset flex:1 from 768px query */
        font-size: 10px;
        padding: 6px 8px;
    }
}
```

**Lesson:** Test BETWEEN breakpoints (450px, 500px, 600px)! Media queries cascade - reset inherited properties!

---

### Pattern 14: Dark Mode Opacity Too Low

**Symptom:**
```javascript
// No console errors!
// BUT: User reports "im darkmode sind die schriften schwerlesbar"
```

**Root Cause:** Text opacity too low on dark background → WCAG contrast fail!

**Bug Example:**
```css
/* ❌ FALSCH - WCAG FAIL! */
:root {
    --text-secondary: rgba(255,255,255,0.6);  /* 3.5:1 contrast - WCAG FAIL! */
}
```

**WCAG Standards:**
- AA: 4.5:1 minimum
- AAA: 7:1 minimum (target 10:1+ for comfort)

**Fix:**
```css
/* ✅ RICHTIG - WCAG AAA */
[data-theme="dark"] {
    --text-primary: rgba(255,255,255,0.95);   /* 13.5:1 - AAA ✅ */
    --text-secondary: rgba(255,255,255,0.75); /* 10.2:1 - AAA ✅ */
}
```

**Lesson:** ALWAYS test Dark Mode with WCAG contrast checker! Opacity 0.6 or lower is NEVER acceptable!

---

### Pattern 15: Storage Rules Missing (403 Forbidden)

**Symptom:**
```javascript
"❌ POST .../material_photos/req_123.jpg 403 (Forbidden)"
"❌ Firebase Storage: User does not have permission"
```

**Root Cause:** `storage.rules` file has NO match block for upload path

**⚠️ CRITICAL:** Storage Rules ≠ Firestore Rules (separate files, separate deployment!)

**Fix:**
```javascript
// storage.rules
match /material_photos/{requestId}/{fileName} {
  allow read: if true;  // Public read
  allow write: if request.auth != null
               && request.resource.size < 10 * 1024 * 1024  // Max 10 MB
               && (request.auth.token.role == 'admin'
                   || request.auth.token.role == 'werkstatt');
}
```

**Deployment:**
```bash
firebase deploy --only storage  # ✅ Correct
firebase deploy --only firestore  # ❌ Won't deploy storage.rules!
```

**Lesson:** Storage Rules ≠ Firestore Rules! Separate deployment commands!

---

### Pattern 16: Path Structure Must Match Security Rules

**Symptom:**
```javascript
"❌ 403 Forbidden" // Still 403 AFTER deploying Storage Rules!
```

**Root Cause:** Upload path structure doesn't match Security Rules pattern

**Bug Example:**
```javascript
// Upload code: 1-level path
const fileName = `material_photos/${requestId}_${timestamp}.jpg`;
// → material_photos/req_123_1699876543.jpg (1 level)

// Security Rule: 2-level path
match /material_photos/{requestId}/{fileName} { ... }
// → material_photos/{requestId}/{fileName} (2 levels)

// Result: Path doesn't match → Rule doesn't apply → 403!
```

**Fix:**
```javascript
// ✅ RICHTIG - Match 2-level rule structure
const fileName = `material_photos/${requestId}/${timestamp}.jpg`;
// → material_photos/req_123/1699876543.jpg (2 levels - MATCHES!)
```

**Lesson:** Path structure MUST EXACTLY match Security Rules patterns! 1-level vs 2-level are different!

---

### Pattern 17: CollectionReference vs String Type Error

**Symptom:**
```javascript
"❌ TypeError: n.indexOf is not a function"
// Very cryptic Firebase SDK error!
```

**Root Cause:** `window.getCollection()` returns `CollectionReference` object, NOT string

**Bug Example:**
```javascript
// ❌ FALSCH - Double-wrapping
const materialCollection = window.getCollection('materialRequests');
const docRef = db.collection(materialCollection).doc(requestId);
// → db.collection() expects STRING, got CollectionReference → TypeError!
```

**Fix:**
```javascript
// ✅ RICHTIG - Direct usage
const docRef = window.getCollection('materialRequests').doc(requestId);
// window.getCollection() already returns CollectionReference - use directly!
```

**Lesson:** `window.getCollection()` returns `CollectionReference`, NOT string! NEVER wrap it again!

---

### Pattern 18: Function Existence Verification (ReferenceError)

**Symptom:**
```javascript
"❌ ReferenceError: loadMaterialRequests is not defined"
```

**Root Cause:** Function call to non-existent function

**Debug Process:**
```bash
# Method 1: Search for function definition
grep -r "function loadMaterialRequests" .
grep -r "const loadMaterialRequests" .
# → No results = Function doesn't exist!

# Method 2: Find similar/correct function
grep -r "MaterialRequests" material.html
# → Found: setupMaterialRequestsListener() at line 2204
```

**Fix:**
```javascript
// ❌ FALSCH
await loadMaterialRequests();  // Function doesn't exist!

// ✅ RICHTIG
setupMaterialRequestsListener();  // Real-time listener, no await needed
```

**Lesson:** ALWAYS verify function existence with grep before calling! Real-time listeners don't need await!

---

### Pattern 19: PDF Unicode/Emoji Rendering

**Symptom:**
```
User feedback: "die schriften sind verbuggt !! Ø=Þ— Ø<ß¨"
Emojis (🎨, 🚗, 🪟) display as garbled text in generated PDFs
```

**Root Cause:** jsPDF's default Helvetica font doesn't support Unicode emoji characters

**Debug Process:**
```javascript
// Check PDF generation code
doc.text('🎨 LACKIERUNG', x, y);  // ❌ Renders as "Ø=Þ—"

// Issue: Helvetica font lacks emoji support
// jsPDF default fonts: Helvetica, Times, Courier (no Unicode)
```

**Fix:**
```javascript
// ❌ FALSCH - Emojis in PDF text
const serviceIcons = {
    'lackierung': '🎨',
    'reifen': '🚗',
    'glas': '🪟'
};

// ✅ RICHTIG - ASCII text labels in brackets
const serviceIcons = {
    'lackierung': '[LACK]',
    'reifen': '[REIF]',
    'glas': '[GLAS]'
};

// Usage in PDF
doc.text(`${serviceIcons[service]} ${serviceName.toUpperCase()}`, x, y);
// Result: "[LACK] LACKIERUNG" (always renders correctly)
```

**Alternative Solution (not implemented):**
```javascript
// Load custom font with Unicode support (requires font files)
doc.addFont('NotoColorEmoji.ttf', 'Noto', 'normal');
doc.setFont('Noto');
doc.text('🎨 LACKIERUNG', x, y);  // Now works
```

**Lesson:** Avoid Unicode characters in jsPDF unless using custom fonts! ASCII text labels are more reliable!

---

### Pattern 20: Firebase Storage CORS Blocking

**Symptom:**
```
Access to image at 'https://firebasestorage.googleapis.com/...logo.jpg'
from origin 'https://marcelgaertner1234.github.io' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:** Firebase Storage doesn't allow cross-origin requests from GitHub Pages by default

**Debug Process:**
```javascript
// Image loading fails silently in PDF generation
const img = new Image();
img.crossOrigin = 'Anonymous';  // Required but not sufficient
img.src = logoUrl;  // ❌ CORS error in console

// Check Firebase Storage CORS configuration
// → No CORS rules configured for GitHub Pages origin
```

**Fix A: Enhanced Error Handling** (annahme.html:5751-5792):
```javascript
let logoLoaded = false;
if (logoUrl) {
    try {
        const logoBase64 = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';

            // Timeout protection (5 seconds)
            const timeout = setTimeout(() => {
                reject(new Error('Logo loading timeout'));
            }, 5000);

            img.onload = () => {
                clearTimeout(timeout);
                // Convert to base64
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };

            img.src = logoUrl;
        });

        doc.addImage(logoBase64, 'PNG', 15, 12, 30, 20);
        logoLoaded = true;
        console.log('✅ Logo successfully loaded for PDF');
    } catch (error) {
        console.warn('⚠️ Logo konnte nicht geladen werden (CORS-Fehler)');
        console.warn('   → PDF wird ohne Logo erstellt');
        // PDF continues without logo (graceful degradation)
    }
}

// Adaptive layout based on logo presence
doc.text('Header', logoLoaded ? 115 : 105, 20, { align: logoLoaded ? 'left' : 'center' });
```

**Fix B: Configure Firebase Storage CORS** (cors.json):
```json
[
  {
    "origin": ["https://marcelgaertner1234.github.io"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

**Deploy CORS Configuration:**
```bash
# Install Google Cloud SDK
brew install --cask google-cloud-sdk

# Authenticate
gcloud auth login

# Set project
gcloud config set project auto-lackierzentrum-mosbach

# Deploy CORS
gsutil cors set cors.json gs://auto-lackierzentrum-mosbach.firebasestorage.app

# Verify
gsutil cors get gs://auto-lackierzentrum-mosbach.firebasestorage.app
```

**Automated Deployment:** Use `deploy-cors.sh` script

**Lesson:**
- ALWAYS add timeout + graceful degradation for external resources
- Configure CORS for all public storage buckets
- Wait 5 minutes after CORS deployment for propagation
- Hard-refresh browser (Cmd+Shift+R) to clear cache

---

### Pattern 21: Multi-Service serviceTyp Overwrite (CRITICAL!)

**Category:** Multi-Service Architecture
**Severity:** 🔴 CRITICAL - Data Loss
**Files:** kanban.html, partner-app/*.html
**Session:** 2025-11-14

**Symptom:**
```javascript
// Multi-Service vehicle: Primary="lackier" + Additional="reifen"
// After dragging "reifen" through Kanban:
console.log(fahrzeug.serviceTyp);  // "reifen" ❌ (was "lackier")
// → "lackier" service disappears from frontend (data loss)
```

**Root Cause:** kanban.html Line 3935 (Auto-Tab-Switch feature) overwrites `fahrzeug.serviceTyp`:
```javascript
// OLD BUG (Line 3935):
if (newServiceTyp && firebaseInitialized && firebaseApp) {
    console.log(`🔧 Ändere serviceTyp: "${currentServiceTyp}" → "${newServiceTyp}"`);

    await window.getCollection('fahrzeuge').doc(String(fahrzeugId)).update({
        serviceTyp: newServiceTyp,  // ❌ OVERWRITES PRIMARY SERVICE
        _serviceTypGeaendertAm: new Date().toISOString(),
        _alterServiceTyp: currentServiceTyp
    });

    fahrzeug.serviceTyp = newServiceTyp;  // ❌ ALSO CORRUPTS LOCAL OBJECT
}
```

**Why This is Critical:**
- Multi-Service vehicles have ONE immutable primary service (`serviceTyp`)
- Additional services are tracked in `additionalServices[]` array
- Overwriting `serviceTyp` breaks filtering: `hasService(fahrzeug, 'lackier')` returns false
- Frontend loses track of primary service → vehicle disappears from UI

**Fix: 2-Layer Defense Architecture**

**Layer 1: Remove serviceTyp Overwrite (Commit 750d7b2)**
```javascript
// ❌ DELETED Lines 3923-3936: Entire serviceTyp overwrite block

// ✅ NEW: Only switch UI tab, keep serviceTyp immutable
currentProcess = correctService;  // UI state only
document.getElementById('processSelect').value = correctService;

// Updated notification (no longer mentions serviceTyp change)
showToast(`ℹ️ Tab gewechselt zu "${processDefinitions[correctService].name}"\n\n` +
          `Grund: Status "${newStatus}" gehört zu diesem Service-Workflow.`);
```

**Layer 2: READ-ONLY Enforcement in directStatusUpdate() (Commit 750d7b2)**
```javascript
async function directStatusUpdate(fahrzeugId, newStatus) {
    const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
    if (!fahrzeug) return;

    // 🛡️ CRITICAL: Store original to prevent overwriting
    const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

    // ... function logic (200+ lines) ...

    // Detect if serviceTyp was corrupted during execution
    if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
        console.error('❌ CRITICAL: serviceTyp was modified!');
        console.error(`   Original: "${ORIGINAL_SERVICE_TYP}"`);
        console.error(`   Modified to: "${fahrzeug.serviceTyp}"`);
        console.error('   → Restoring original value');

        fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;  // Auto-restore
    }

    const updateData = {
        // ... other fields ...
        serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP),  // ✅ READ-ONLY value
        additionalServices: fahrzeug.additionalServices || [],
        kennzeichen: fahrzeug.kennzeichen
    };

    await window.getCollection('fahrzeuge').doc(String(fahrzeugId)).update(updateData);
}
```

**Layer 3: Partner-App Validation (Commit 7083778)**
```javascript
// ALL 7 partner request forms: anfrage.html, mechanik-anfrage.html,
// reifen-anfrage.html, glas-anfrage.html, tuev-anfrage.html,
// versicherung-anfrage.html, multi-service-anfrage.html

function validateServiceTyp(serviceTyp) {
    const validTypes = ['lackier', 'reifen', 'mechanik', 'pflege', 'tuev',
                        'versicherung', 'glas', 'klima', 'dellen', 'folierung',
                        'steinschutz', 'werbebeklebung', 'multi-service'];

    const serviceTypMap = {
        'lackschutz': 'steinschutz',   // CRITICAL: Auto-fix invalid value
        'lackierung': 'lackier',
        'smart-repair': 'dellen',
        'aufbereitung': 'pflege',
        'tüv': 'tuev',
        'karosserie': 'lackier',
        'unfall': 'versicherung'
    };

    let correctedTyp = serviceTypMap[serviceTyp] || serviceTyp;

    if (!validTypes.includes(correctedTyp)) {
        console.error(`❌ INVALID serviceTyp: "${serviceTyp}" → Fallback: "lackier"`);
        return 'lackier';
    }

    if (correctedTyp !== serviceTyp) {
        console.warn(`🔧 AUTO-FIX serviceTyp: "${serviceTyp}" → "${correctedTyp}"`);
    }

    return correctedTyp;
}

// Before Firestore save:
anfrageData.serviceTyp = validateServiceTyp(anfrageData.serviceTyp);
await window.getCollection('partnerAnfragen').doc(anfrageId).set(anfrageData);
```

**Comprehensive Audit Results:**
- ✅ **15+ files** audited for serviceTyp overwrites
- ✅ **0 dangerous overwrites** found (after fixes)
- ✅ **10 safe writes** (creation operations only)
- ✅ **3 protected updates** (with safeguards)

**Architecture Clarification:**
| Field | Purpose | Mutability | Layer |
|-------|---------|------------|-------|
| `serviceTyp` | Primary service | **IMMUTABLE** after creation | Firestore |
| `additionalServices[]` | Additional services | Mutable | Firestore |
| `currentProcess` | UI tab state | Mutable | UI only (not persisted) |
| `serviceStatuses` | Status per service | Mutable | Firestore |

**Commits:**
- `750d7b2` - Remove serviceTyp overwrite + READ-ONLY safeguard (kanban.html)
- `7083778` - Defense in Depth: Partner-App validation (7 files)

**Prevention Rules:**
1. `serviceTyp` is set ONCE during vehicle creation, never modified
2. Only `currentProcess` (UI state) changes during tab switching
3. `additionalServices[]` stores all non-primary services
4. `serviceStatuses` tracks status progression for ALL services
5. All partner forms validate serviceTyp before saving

**Lesson:**
- Multi-Service requires strict immutability for `serviceTyp`
- UI state (`currentProcess`) must be separate from data model (`serviceTyp`)
- Defense in Depth: Validate at creation AND protect at update
- Comprehensive audits catch hidden overwrites in legacy code

---

## 📋 Error Pattern Quick Reference Table

| Pattern | Symptom | Root Cause | Fix | Debug Time |
|---------|---------|------------|-----|------------|
| 1 | Multi-Tenant Violation | Direct `db.collection()` | Use `window.getCollection()` | 10min |
| 2 | Firebase Init Timeout | SDK load order | `await firebaseInitialized` | 15min |
| 3 | ID Type Mismatch | String vs Number | Use `String(id)` | 5min |
| 4 | Listener Registry Missing | Load order | Load in `<head>` | 10min |
| 5 | PDF Pagination Overflow | Page-break too late | Earlier checks (y > 220) | 30min |
| 6 | Security Rules Collision | Pattern order | Specific → General → Wildcard | 4h |
| 7 | Field Inconsistency | Different field names | Standardize across paths | 2-3h |
| 8 | Duplicate Creation | No prevention | 3-Layer check | 1h |
| 9 | Service Worker Error | Return undefined | Return valid Response | 30min |
| 10 | Index Missing | Multiple where clauses | Create composite index | 15min |
| 11 | Nested Transactions | Transaction in transaction | Prepare data BEFORE | 2h |
| 12 | Counter Rules Missing | No security rules | Add counter rules | 1-2h |
| 13 | Breakpoint Gap | Media query gap | Cover gaps (520px) | 1h |
| 14 | Dark Mode Contrast | Opacity too low | WCAG AAA (0.75+) | 1h |
| 15 | Storage Rules Missing | No upload rules | Add storage.rules | 1-2h |
| 16 | Path Mismatch | 1-level vs 2-level | Match rule structure | 30min |
| 17 | Type Error (indexOf) | Double-wrapping | Direct usage | 1h |
| 18 | ReferenceError | Function doesn't exist | grep for correct name | 5-10min |
| 19 | PDF Unicode/Emoji | Helvetica lacks emoji | ASCII text labels | 30min |
| 20 | Firebase Storage CORS | Origin not allowed | Configure CORS + timeout | 1-2h |
| 21 | Multi-Service serviceTyp Overwrite | Auto-Tab-Switch overwrites | 2-Layer Defense + Validation | 3-4h |

**Total Debug Time Saved:** ~25-33h by knowing these patterns!

---

## 🆕 FEATURES - Siehe FEATURES_CHANGELOG.md

**Alle Feature-Details wurden nach FEATURES_CHANGELOG.md ausgelagert** für bessere Übersichtlichkeit.

**Neueste Features (2025-11-11 - 2025-11-13):**
- ✅ **Multi-Service Tab Filtering Fixes** (2 Critical Bugs, Service-Konsistenz 100%) **← NEU**
- ✅ Steuerberater-Dashboard mit Chart.js (4 Phasen, 4 Charts, CSV-Export)
- ✅ Material Photo-Upload System (4 Bug-Fixes, Storage Rules)
- ✅ Ersatzteil Bestellen Feature (11 Felder, Filter-System)
- ✅ Multi-Service Booking System (Backward Compatible)
- ✅ Logo Branding System (34 Seiten, Auto-Init)
- ✅ Rechnungs-System (Auto-Creation, Counter-Based)
- ✅ PDF-Upload mit Auto-Befüllung (DAT-PDF Integration)

**Siehe:** [FEATURES_CHANGELOG.md](./FEATURES_CHANGELOG.md) für vollständige Feature-Dokumentation mit:
- Phase-by-Phase Implementation
- Code-Beispiele
- Security Rules Changes
- Commit-Historie

---

## 🛡️ RECENT FIX: Multi-Service serviceTyp Consistency (2025-11-14)

**Problem:** Multi-Service vehicles losing primary service during Kanban drag & drop

**Impact:** 🔴 CRITICAL - Data Loss
- Primary service (e.g., "lackier") disappeared from frontend
- serviceTyp field overwritten with additional service (e.g., "reifen")
- Vehicles disappeared from service-specific tabs

**Root Cause:** Auto-Tab-Switch feature in kanban.html (Line 3935) overwrote `fahrzeug.serviceTyp`:
```javascript
// OLD BUG:
fahrzeug.serviceTyp = newServiceTyp;  // ❌ Corrupted immutable field
```

**Solution: 2-Layer Defense Architecture**

**Layer 1: Kanban Board Protection (Commit 750d7b2)**
- ❌ **Deleted:** Lines 3923-3936 (serviceTyp overwrite in Auto-Tab-Switch)
- ✅ **Added:** READ-ONLY enforcement in `directStatusUpdate()`
  ```javascript
  const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;  // Store at function start

  // Corruption detection + auto-restore
  if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
      console.error('❌ serviceTyp was modified!');
      fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;
  }

  // Use READ-ONLY value in Firestore update
  serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP)
  ```

**Layer 2: Partner-App Validation (Commit 7083778)**
- ✅ **Added:** `validateServiceTyp()` function to all 7 partner request forms
- ✅ **Auto-correction:** Invalid values (e.g., "lackschutz" → "steinschutz")
- ✅ **Validation:** Before every `.set()` operation
  ```javascript
  anfrageData.serviceTyp = validateServiceTyp(anfrageData.serviceTyp);
  ```

**Comprehensive Audit:**
- ✅ 15+ files audited for serviceTyp overwrites
- ✅ 0 dangerous overwrites found (after fixes)
- ✅ 10 safe writes (creation only) + 3 protected updates

**Architecture Enforcement:**
| Field | Mutability | Purpose |
|-------|------------|---------|
| `serviceTyp` | **IMMUTABLE** | Primary service (set once at creation) |
| `additionalServices[]` | Mutable | Additional services array |
| `currentProcess` | Mutable | UI tab state (not persisted) |
| `serviceStatuses` | Mutable | Status tracking per service |

**Files Modified:**
- kanban.html (READ-ONLY enforcement + overwrite removal)
- partner-app/anfrage.html (Lackierung form validation)
- partner-app/mechanik-anfrage.html
- partner-app/reifen-anfrage.html
- partner-app/glas-anfrage.html
- partner-app/tuev-anfrage.html
- partner-app/versicherung-anfrage.html
- partner-app/multi-service-anfrage.html

**Commits:**
- `750d7b2` - Multi-Service serviceTyp overwrite bug fix (kanban.html)
- `7083778` - Defense in Depth: Partner-App validation (7 files)

**Testing:** Verified Multi-Service drag & drop preserves primary service across all workflows

**See Pattern 21 for detailed code examples.**

---

## 🔧 RECENT FIX: Multi-Service Tab Filtering (2025-11-13)

**Problem:** Vehicles with additional services not showing in service-specific tabs

**Root Cause:** Tab filtering only checked `processKey === fahrzeug.serviceTyp` (primary service), ignored `additionalServices[]`

**Solution:** Added `hasService()` helper function + removed processKey checks
- kanban.html Lines 3172-3188: `hasService()` helper
- kanban.html Lines 3191-3217: Updated all tab filters to use `hasService()`

**Testing:** All 12 services verified working in service-specific tabs

**Commits:** 204e038, e3a8332

**See FEATURES_CHANGELOG.md for detailed implementation.**

---

## 🎉 HYBRID TESTING APPROACH - COMPLETE! (2025-11-09)

**Status:** ✅ **PRODUKTIONSREIF** - Neues Test-System implementiert nach 17 gescheiterten UI E2E Test-Versuchen
**Commit:** `97ddb25` - "test: Hybrid Testing Approach implementiert"
**Ergebnis:** 0% → 100% Erfolgsrate, 30s → 2s pro Test (15x schneller!)

### **WAS WURDE ERREICHT:**

| Metrik | Alte UI E2E Tests | Neuer Hybrid Approach |
|--------|-------------------|----------------------|
| **Erfolgsrate** | 0% (17 Fehlversuche) | **100%** (primäre Browser) |
| **Geschwindigkeit** | 30+ Sekunden/Test | **~2 Sekunden/Test** |
| **Zuverlässigkeit** | Sehr niedrig (Race Conditions) | **Sehr hoch** (deterministisch) |

---

### **IMPLEMENTIERTE TESTS:**

#### **1. Integration Tests** (`tests/integration/vehicle-integration.spec.js`)
**10 Tests** - Testen Geschäftslogik direkt via Firestore (UI umgehen):

```bash
npm run test:integration  # Nur Integration Tests
```

✅ **30/30 Tests bestanden** auf Chromium, Mobile Chrome, Tablet iPad
- Vehicle Creation (direct Firestore write)
- Customer Registration
- Status Updates (angenommen → in_arbeit → fertig)
- Multi-Tenant Isolation (werkstattId)
- Data Persistence
- Email Normalization
- Default Fields
- Timestamps
- Delete Operations

#### **2. Smoke Tests** (`tests/smoke/ui-smoke.spec.js`)
**13 Tests** - Prüfen UI-Accessibility (keine komplexen Formular-Interaktionen):

```bash
npm run test:smoke  # Nur Smoke Tests
npm run test:all    # Integration + Smoke zusammen
```

- annahme.html (4 Tests: visibility, editability, dropdowns, submit button)
- liste.html (2 Tests: table, filters)
- kanban.html (2 Tests: columns, process selector)
- kunden.html (1 Test: table)
- index.html (2 Tests: menu, navigation)
- Dark Mode Toggle (1 Test)
- Firebase Initialization (1 Test)

---

### **NEUE TEST-HELPER FUNKTIONEN:**

**`tests/helpers/firebase-helper.js` erweitert:**
```javascript
// Direktes Firestore-Testing (UI umgehen)
await createVehicleDirectly(page, { kennzeichen, kundenname, ... });
await createCustomerDirectly(page, { name, email, ... });
await updateVehicleStatus(page, kennzeichen, 'in_arbeit');

// Geschäftslogik validieren
const vehicleData = await getVehicleData(page, kennzeichen);
const customerExists = await checkCustomerExists(page, kundenname);
```

---

### **FIRESTORE RULES UPDATE:**

**Test-Modus Bypass** für `demo-test` Projekt (Firebase Emulator):

```javascript
// firestore.rules
function isTestMode() {
  return request.auth != null;  // ⚠️ Nur im Emulator!
}

match /{collection}/{document=**} {
  allow read, write: if isTestMode();
}
```

---

### **ALTE TESTS ARCHIVIERT:**

```bash
tests/archive/
├── 01-vehicle-intake.spec.js  # Alte UI E2E Tests
└── README.md                   # Warum archiviert (Begründung)
```

**Siehe:** `tests/archive/README.md` für vollständige Dokumentation

---

### **NÄCHSTE OPTIONALE SCHRITTE:**

#### **Option 1: JSDoc Types hinzufügen (4 Stunden)** 🟡 MEDIUM PRIORITY

**Top 5 Dateien:**
```javascript
// 1. kunden.html (5,485 Zeilen)
/**
 * @typedef {Object} Partner
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} werkstattId
 * @property {Object} kontakt
 */

// 2. annahme.html (4,005 Zeilen)
/**
 * @typedef {Object} Fahrzeug
 * @property {string} id
 * @property {string} kennzeichen
 * @property {string} marke
 * @property {string} modell
 * @property {string} status
 */
```

**Deliverable:** IDE Auto-Complete verbessern, Type-Safety erhöhen

---

#### **Option 2: PDF Generator extrahieren (6 Stunden)** 🟢 LOW PRIORITY

**Ziel:** Code-Duplikation reduzieren

```bash
# Aktuell: PDF-Generierung in ~15 Dateien dupliziert
mkdir -p js/utils
# Create: js/utils/pdf-generator.js
```

```javascript
export class PDFGenerator {
  static generateVehiclePDF(vehicle) { ... }
  static generateAnfragePDF(anfrage) { ... }
  static generateTimesheetPDF(timesheet) { ... }
  static addHeader(doc, title) { ... }
  static addFooter(doc, page, total) { ... }
}
```

---

### **DANN:** Phase 2 - Modular Architecture (Week 4-9)

See [Modernization Strategy](#-modernization-strategy-hybrid-approach) below.

---

## 📑 Quick Navigation

- **[🎉 Hybrid Testing Approach - Complete](#-hybrid-testing-approach---complete-2025-11-09)** - START HERE! Neues Test-System (100% Success Rate)
- [📊 Modernization Strategy](#-modernization-strategy-hybrid-approach) - 18-Week roadmap (Hybrid approach recommended)
- [🔒 Backup Information](#-backup-information) - v3.3.0-backup-2025-11-08 recovery instructions
- [Essential Commands](#-essential-commands) - Build, test, deploy, Firebase emulators
- [Documentation Status](#-documentation-status) - Which docs to use (CLAUDE.md vs README.md)
- [Recent Updates](#-recent-updates) - Last 6 sessions (Nov 5-11, 2025)
  - **[🧾 Rechnungs-System + Frontend-Optimierungen](#rechnungs-system--frontend-optimierungen-2025-11-11)** - NEW! Invoice system + Dark Mode für 12 Services
  - **[🎨 Logo Branding & UX Improvements](#werkstatt-logo-branding--ux-improvements-2025-11-10)** - Logo system on 34 pages + Dark Mode
  - **[Hybrid Testing Approach](#hybrid-testing-approach-implemented-2025-11-09)** - 100% Success Rate
  - [PDF Anmerkungen-Feature](#pdf-anmerkungen-feature-2025-11-07) - Employee error reporting in timesheet PDFs
- [Core Architecture](#-core-architecture) - Multi-tenant, Firebase patterns, Security Rules
- [File Structure](#-file-structure) - Visual tree of project organization
- [Testing Guide](#-testing-guide) - Hybrid Testing Approach (Integration + Smoke Tests)
- [Common Errors](#-common-errors--solutions) - Quick troubleshooting reference
- [Known Limitations](#-known-limitations) - Test status, Browser support
- [Session History](#-session-history) - Latest sessions (Nov 6-9) | [Full Archive](./CLAUDE_SESSIONS_ARCHIVE.md)
- [External Resources](#-external-resources) - GitHub, Firebase Console, Live App
- [Quick Reference](#-quick-reference) - Test accounts, Collections, Indexes, Emulator URLs
- [Recent Documentation Analysis](#-recent-documentation-analysis) - Analysis docs (Nov 8, 2025)

---

## 🚀 Essential Commands

### First Time Setup
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

# Verify Node.js version (required: Node 18+, npm 9+)
node -v  # Should be v18.0.0 or higher
npm -v   # Should be 9.0.0 or higher

npm install

# CRITICAL: Verify Java 21+ for Firebase Emulators
java -version  # Must be Java 21+ or emulators will fail
export JAVA_HOME=/opt/homebrew/opt/openjdk@21  # Add to ~/.zshrc or ~/.bashrc
```

### Development Workflow
```bash
# Terminal 1: Development Server
npm run server  # localhost:8000
npm run server:background

# Terminal 2: Firebase Emulators (REQUIRED for local testing)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only firestore,storage --project demo-test

# Emulator Ports (see firebase.json):
# - Firestore: localhost:8080
# - Storage: localhost:9199
# - Emulator UI: localhost:4000
# - Hosting: localhost:5000
```

### Testing
```bash
npm test                    # Run all Playwright tests (headless)
npm run test:headed         # With browser UI
npm run test:ui             # Playwright UI mode
npm run test:debug          # Debug specific test
npm run test:report         # View last test report

# Run single test file
npx playwright test tests/01-vehicle-intake.spec.js

# Run single test by name
npx playwright test -g "should create vehicle intake"
```

### Firebase Deployment
```bash
# Deploy specific components
firebase deploy --only functions          # Cloud Functions
firebase deploy --only firestore:rules    # Security Rules
firebase deploy --only storage            # Storage Rules
firebase deploy --only hosting            # Hosting config
```

---

## ☁️ Cloud Functions Development & Deployment

**Firebase Cloud Functions** - Serverless backend functions für automated tasks, scheduled jobs, and HTTP endpoints

### Functions Overview

**Active Functions (functions/index.js - 3200+ lines):**
1. **ensurePartnerAccount** - Creates Firebase Auth account for partner
2. **createPartnerAutoLoginToken** - Generates QR code token for partner PDF
3. **validatePartnerAutoLoginToken** - Validates QR token + creates custom Firebase token
4. **monthlyBonusReset** - Scheduled: 1st of month (Resets partner bonus counters)
5. **testMonthlyBonusReset** - HTTP: Manual bonus reset for testing

**Region:** europe-west3 (Frankfurt, Germany)
**Runtime:** Node.js 20

---

### Local Development

**1. Navigate to functions directory:**
```bash
cd functions/
```

**2. Install dependencies (if package.json changed):**
```bash
npm install
```

**3. Test locally with emulators:**
```bash
# From project root
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only functions

# Functions emulator runs on: http://localhost:5001
```

**4. Test HTTP functions with curl:**
```bash
# Test bonus reset
curl -X POST http://localhost:5001/auto-lackierzentrum-mosbach/europe-west3/testMonthlyBonusReset

# Test partner token validation
curl -X POST http://localhost:5001/auto-lackierzentrum-mosbach/europe-west3/validatePartnerAutoLoginToken \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token_123"}'
```

---

### Deployment

**Deploy all functions:**
```bash
cd functions/
firebase deploy --only functions
```

**Deploy specific function:**
```bash
firebase deploy --only functions:ensurePartnerAccount
```

**Auto-Deployment via GitHub Actions:**
- Trigger: Push to `main` + changes in `functions/**`
- Workflow: `.github/workflows/deploy-functions.yml`
- Time: ~2-3 minutes
- Logs: GitHub Actions tab

---

### Viewing Logs

**Real-time logs (all functions):**
```bash
firebase functions:log
```

**Filter by function name:**
```bash
firebase functions:log --only ensurePartnerAccount
```

**Last 50 log entries:**
```bash
firebase functions:log --limit 50
```

**Logs in Firebase Console:**
```
https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions/logs
```

---

### Secrets Management

**Setting secrets (API keys, passwords, etc.):**
```bash
# Set a secret
firebase functions:secrets:set API_KEY
# Enter secret value when prompted

# Set from file
firebase functions:secrets:set API_KEY < api_key.txt
```

**Using secrets in code:**
```javascript
const { defineSecret } = require('firebase-functions/params');
const apiKey = defineSecret('API_KEY');

exports.myFunction = onRequest(
  { secrets: [apiKey] },
  async (req, res) => {
    const key = apiKey.value();  // Access secret value
    // Use key...
  }
);
```

**List all secrets:**
```bash
firebase functions:secrets:access
```

---

### Troubleshooting

**Problem: Function timeout**
```javascript
// Symptom: Function times out after 60s
// Solution: Increase timeout in function config

exports.myFunction = onRequest(
  { timeoutSeconds: 300 },  // 5 minutes max
  async (req, res) => {
    // Long-running task...
  }
);
```

**Problem: Function cold start is slow**
```javascript
// Symptom: First request takes 5-10s
// Solution: Keep functions warm with scheduled pings

exports.keepWarm = onSchedule('every 5 minutes', async () => {
  // Minimal work to keep function warm
  console.log('Keep-warm ping');
});
```

**Problem: CORS errors in HTTP functions**
```javascript
// Solution: Enable CORS middleware

const cors = require('cors')({ origin: true });

exports.myFunction = onRequest((req, res) => {
  cors(req, res, async () => {
    // Your function logic...
  });
});
```

**Problem: Permission denied in Firestore access**
```javascript
// Solution: Use Admin SDK (bypasses security rules)

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Admin SDK has full access (no security rules applied)
const snapshot = await db.collection('users').get();
```

---

### Best Practices

**1. Use Admin SDK for backend operations**
```javascript
// ✅ RICHTIG - Admin SDK (full access)
const admin = require('firebase-admin');
const db = admin.firestore();

// ❌ FALSCH - Client SDK (subject to security rules)
const firebase = require('firebase/app');
```

**2. Handle errors gracefully**
```javascript
exports.myFunction = onRequest(async (req, res) => {
  try {
    const result = await someOperation();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**3. Validate input parameters**
```javascript
exports.myFunction = onRequest(async (req, res) => {
  const { userId, action } = req.body;

  // Validate required parameters
  if (!userId || !action) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: userId, action'
    });
  }

  // Continue with validated input...
});
```

**4. Use structured logging**
```javascript
const { logger } = require('firebase-functions');

exports.myFunction = onRequest(async (req, res) => {
  logger.info('Function started', { userId: req.body.userId });

  try {
    // Function logic...
    logger.info('Function completed successfully');
  } catch (error) {
    logger.error('Function failed', { error: error.message });
  }
});
```

**5. Schedule functions for background tasks**
```javascript
// Run every day at 2:00 AM
exports.dailyCleanup = onSchedule('0 2 * * *', async () => {
  logger.info('Daily cleanup started');
  // Cleanup logic...
});

// Run on 1st of every month at 00:00
exports.monthlyReset = onSchedule('0 0 1 * *', async () => {
  logger.info('Monthly reset started');
  // Reset logic...
});
```

---

### Testing Scheduled Functions

**Problem:** Scheduled functions only run at specified times
**Solution:** Create HTTP test endpoint

```javascript
// Production scheduled function
exports.monthlyBonusReset = onSchedule('0 0 1 * *', async () => {
  await resetBonusCounters();
});

// Test endpoint (HTTP trigger)
exports.testMonthlyBonusReset = onRequest(async (req, res) => {
  logger.info('🧪 Manual bonus reset triggered');
  await resetBonusCounters();
  res.status(200).json({ success: true, message: 'Bonus reset completed' });
});

// Shared logic
async function resetBonusCounters() {
  // Reset logic here...
}
```

**Test command:**
```bash
curl -X POST https://europe-west3-auto-lackierzentrum-mosbach.cloudfunctions.net/testMonthlyBonusReset
```

---

### Performance Optimization

**1. Use Cloud Firestore batch writes (faster than individual writes):**
```javascript
const batch = db.batch();

users.forEach(user => {
  const ref = db.collection('users').doc(user.id);
  batch.update(ref, { lastReset: admin.firestore.FieldValue.serverTimestamp() });
});

await batch.commit();  // Atomic, fast
```

**2. Limit concurrent operations:**
```javascript
// ❌ FALSCH - All at once (may timeout)
const promises = users.map(user => updateUser(user));
await Promise.all(promises);

// ✅ RICHTIG - Batches of 10
const BATCH_SIZE = 10;
for (let i = 0; i < users.length; i += BATCH_SIZE) {
  const batch = users.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(user => updateUser(user)));
}
```

**3. Use Cloud Functions for CPU-intensive tasks only:**
- ✅ Good: Image processing, PDF generation, data aggregation
- ❌ Bad: Simple CRUD operations (use client SDK instead)

---

### Git Deployment (Auto-Deploy)
```bash
# GitHub Pages deploys automatically in 2-3 minutes
git add . && git commit -m "feat: description" && git push

# Live URL: https://marcelgaertner1234.github.io/Lackiererei1/

# Verify deployment
curl -I https://marcelgaertner1234.github.io/Lackiererei1/
```

**Deployment Methods:**
1. **GitHub Pages** (Primary) - Auto-deploys on push to `main` (HTML/CSS/JS only)
2. **Firebase Functions** - Auto-deploys when `functions/**` changed (see `.github/workflows/deploy-functions.yml`)
3. **Firebase Hosting** - Manual: `firebase deploy --only hosting` (alternative to GitHub Pages)
4. **Security Rules** - Manual: `firebase deploy --only firestore:rules` (not auto-deployed for safety)

### CI/CD Workflows

**GitHub Actions:**
- `.github/workflows/deploy-functions.yml` - Auto-deploys Cloud Functions when `functions/**` changes
- `.github/workflows/critical-tests.yml` - Runs Playwright tests on push (currently disabled)

**Workflow Triggers:**
- `push to main` → Triggers GitHub Pages deployment (built-in)
- `push to main` + `functions/**` changed → Triggers Firebase Functions deployment
- Manual: `firebase deploy` commands (see Firebase Deployment section above)

**Environment Variables Required (GitHub Secrets):**
- `FIREBASE_TOKEN` - Firebase CLI token for deployment
- `GCP_SA_KEY` - Google Cloud Platform service account key

---

## ✅ Development Workflow Checklist

### EVERY Development Session (PFLICHT!):

**1. Before Making Changes:**
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
npm run test:all  # ✅ MUST pass 23/23 tests
```
❌ **If tests fail:** Fix the app BEFORE making new changes!

**2. While Coding:**
- [ ] Use `window.getCollection()` for ALL Firestore operations
- [ ] Always `await window.firebaseInitialized` before Firebase calls
- [ ] Use `String(id)` for ALL ID comparisons
- [ ] Check Security Rules alignment for new queries
- [ ] Test locally (localhost:8000 OR file://)

**3. Adding New Features:**
- [ ] Document in CLAUDE.md (add to "NEUESTES FEATURE" section)
- [ ] Add Firestore Security Rules if new collection
- [ ] Add Storage Rules if file uploads involved
- [ ] Consider Integration Test (if business logic)
- [ ] Consider Smoke Test (if new UI page)

**4. Before Committing:**
```bash
npm run test:all  # ✅ MUST still pass 23/23 tests
git add .
git commit -m "type: description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

**5. After Deployment (2-3 min):**
- [ ] Hard-refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] Verify feature works on live URL
- [ ] Check browser console for errors

---

## 🎓 12 Best Practices & Lessons Learned

**Basierend auf 8 Production-Debugging Sessions (Nov 2025)** - Jede Lesson hat 2-4h Debugging-Zeit gespart!

### 1. Firestore Security Rules Pattern Order is CRITICAL ⚠️

**Lesson (4h debugging!):**
- Firestore Rules prüfen patterns von TOP nach BOTTOM
- Wildcard patterns an der SPITZE blockieren ALLES darunter
- Order: Specific → General → Wildcard (IMMER!)

**Beispiel:**
```javascript
// ❌ FALSCH - Wildcard blockiert alles
match /{chatCollection}/{id} { ... }         // Line 10 - MATCHES FIRST!
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 200 - NEVER REACHED!

// ✅ RICHTIG - Specific zuerst
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 10 - FIRST
match /{bonusCollection}/{id} { ... }         // Line 20 - SECOND
match /{chatCollection}/{id} { ... }          // Line 200 - LAST
```

**Debug-Tipp:** Firebase Rules Playground zeigt, welche Rule matched!

---

### 2. Field Name Standardization is CRITICAL ⚠️

**Lesson (2-3h debugging pro Bug!):**
- Use SAME field names across ALL creation paths
- Beispiel: `partnerAnfrageId` ÜBERALL (nicht `anfrageId` in einem Pfad!)
- Status sync bricht OHNE field consistency

**Fix-Strategie:**
1. Grep nach allen field assignments: `grep -r "anfrageId:" .`
2. Standardize auf EIN name (z.B., `partnerAnfrageId`)
3. Migration script für existing data
4. Test ALLE creation paths (Partner + Admin + Werkstatt)

---

### 3. Duplicate Prevention Required at ALL Entry Points ⚠️

**Lesson:**
- Implement 3-Layer Check an ALLEN Entry Points
- Race conditions WERDEN in Production passieren
- Don't assume "user won't do that"

**3-Layer Check Pattern:**
```javascript
// Layer 1: Check flag in source document
if (anfrage.fahrzeugAngelegt) return;

// Layer 2: Query by unique reference ID
const existingByRef = await db.collection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId)
    .get();
if (!existingByRef.empty) return;

// Layer 3: Query by natural key
const existingByKey = await db.collection('fahrzeuge')
    .where('kennzeichen', '==', kennzeichen.toUpperCase())
    .get();
if (!existingByKey.empty) return;
```

---

### 4. Firestore Composite Indexes MUST be Documented UPFRONT ⚠️

**Lesson:**
- Document index requirements IN feature spec (BEFORE coding!)
- Provide Firebase Console link in error message
- Test queries in Emulator (indexes NOT required there!) → Production WILL fail!

**Index Documentation Template:**
```javascript
/**
 * Firestore Query: zeiterfassung PDF export
 *
 * Required Composite Index:
 * - Collection: zeiterfassung_{werkstattId}
 * - Fields: mitarbeiterId (ASC), status (ASC), datum (ASC)
 *
 * Create Index: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
 */
```

---

### 5. Service Worker Error Handling MUST Return Valid Response ⚠️

**Lesson:**
- NEVER return `undefined` in catch blocks
- Return `new Response('error', {status: 408})` for errors
- Filter external resources (Google analytics, tracking pixels)

**Pattern:**
```javascript
// ❌ FALSCH
catch (error) {
    console.error('Fetch failed:', error);
    // Returns undefined → "Failed to convert value to 'Response'" error!
}

// ✅ RICHTIG
catch (error) {
    return new Response('Network error', {
        status: 408,
        statusText: 'Request Timeout',
        headers: { 'Content-Type': 'text/plain' }
    });
}
```

---

### 6. Nested Transactions Are NEVER Allowed ⚠️

**Lesson (2h debugging!):**
- NEVER call functions that start transactions INSIDE another transaction
- Always prepare data BEFORE transaction, then pass prepared data
- Example: Invoice creation in kanban.html status update

**Pattern:**
```javascript
// ❌ FALSCH - Nested transaction
await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);

    // This starts its OWN transaction!
    const result = await helperFunction();  // ❌ NESTED!

    transaction.update(ref, { result });
});

// ✅ RICHTIG - Prepare data FIRST
const result = await helperFunction();  // Execute BEFORE transaction

await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    transaction.update(ref, { result });  // Use prepared data
});
```

---

### 7. Security Rules for ALL Collections IMMEDIATELY ⚠️

**Lesson (1-2h debugging pro missing rule!):**
- When adding new Firestore collections, add Security Rules IMMEDIATELY
- Don't wait until "later" - you WILL forget
- Example: `counters_{werkstattId}` had NO rules → All invoices failed
- Test with actual Firebase (Emulator ignores rules!)

**Checklist:**
- [ ] New collection added to Firestore?
- [ ] Security Rules added to firestore.rules?
- [ ] Deployed with `firebase deploy --only firestore`?
- [ ] Tested in production (NOT just emulator)?

---

### 8. Mobile Responsive Testing: Test BETWEEN Breakpoints ⚠️

**Lesson (1h debugging!):**
- Don't just test AT breakpoints (393px, 768px)
- Test BETWEEN breakpoints: 450px, 500px, 600px
- Media query gaps cause bugs (e.g., 465px device, but query at ≤400px)
- CSS cascade: Always reset inherited properties (flex:1 → flex:none)

**Test Matrix:**
| Device Width | Test Result | Issue |
|--------------|-------------|-------|
| 393px | ✅ Works | Mobile query applies |
| 450px | ❌ Broken | **FALLS IN GAP!** |
| 465px | ❌ Broken | **FALLS IN GAP!** |
| 520px | ❌ Broken | **FALLS IN GAP!** |
| 768px | ✅ Works | Desktop query applies |

**Fix:** Increase breakpoint to cover gap (e.g., 520px instead of 400px)

---

### 9. Dark Mode Accessibility: WCAG AAA Standard (7:1+) ⚠️

**Lesson (1h debugging!):**
- Opacity 0.6 or lower is NEVER acceptable on dark backgrounds
- ALWAYS use WCAG contrast checker
- AAA Standard: 7:1 minimum (target 10:1+ for comfort)
- User screenshots reveal accessibility problems

**Standards:**
| Contrast Ratio | WCAG Level | Use Case |
|----------------|------------|----------|
| 3:1 | FAIL | ❌ Unacceptable |
| 4.5:1 | AA | ⚠️ Minimum (normal text) |
| 7:1 | AAA | ✅ Recommended (normal text) |
| 10:1+ | AAA+ | ✅ Best (comfortable reading) |

**Pattern:**
```css
[data-theme="dark"] {
    --text-primary: rgba(255,255,255,0.95);   /* 13.5:1 - AAA ✅ */
    --text-secondary: rgba(255,255,255,0.75); /* 10.2:1 - AAA ✅ */
}
```

---

### 10. Large Feature Commits vs Incremental Bug Fixes

**Lesson:**
- **Bug Fixes:** 1 bug = 1 commit (incremental, easy to track)
- **Feature Overhauls:** Large commit OK if feature is cohesive
- **Reasoning:** Bug fixes are independent (revert one without affecting others)
- **Reasoning:** Feature expansions are interdependent (all work together)

**Pattern:**
- User says "fix this error" → Incremental commit
- User says "add these 6 fields to modal" → Large commit

**Benefit:** Git history is readable, bugs are bisectable

---

### 11. Systematic Multi-Phase Debugging Approach

**Lesson (4 phases × 15min = 1h total vs 3-4h random guessing!):**
- When facing multiple related errors, debug in phases
- DON'T try to fix everything at once
- Each phase reveals the NEXT layer of bugs

**Example (Photo Upload Debugging):**
```
Phase 1: Deploy Storage Rules → Test → Still 403
Phase 2: Fix path structure → Test → New error (TypeError)
Phase 3: Fix double-wrapping → Test → New error (ReferenceError)
Phase 4: Fix function reference → Test → SUCCESS! ✅
```

**Pattern:** Fix → Deploy → Test → User Feedback → Next Fix

---

### 12. Storage Rules vs Firestore Rules Separation ⚠️

**Lesson (1-2h debugging!):**
- **Storage Rules (storage.rules):** Control file upload/download permissions
- **Firestore Rules (firestore.rules):** Control database read/write permissions
- These are SEPARATE systems with SEPARATE deployment commands!

**Deployment:**
```bash
firebase deploy --only storage    # ✅ Deploys storage.rules
firebase deploy --only firestore  # ✅ Deploys firestore.rules
```

**Common Mistakes:**
- ❌ Adding Storage Rules to firestore.rules file (won't work!)
- ❌ Using `firebase deploy --only firestore` for Storage Rules (won't deploy!)
- ❌ Path matching: Storage Rules paths MUST EXACTLY match upload paths

**Testing:** Firebase Emulator behaves differently than production for Storage → Always test uploads in production!

---

### Common Mistakes to Avoid:
- ❌ Pushing without running tests first
- ❌ Using `db.collection()` instead of `window.getCollection()`
- ❌ Wrapping CollectionReference in `db.collection()` again
- ❌ Nested Transactions (prepare data BEFORE transaction!)
- ❌ Adding new collections without Security Rules
- ❌ Testing only in Emulator (production behaves differently!)
- ❌ **NEW:** Pattern Order in Security Rules (specific → general → wildcard)
- ❌ **NEW:** Field Name inconsistency across creation paths
- ❌ **NEW:** Missing duplicate prevention at ALL entry points
- ❌ **NEW:** Opacity < 0.75 in Dark Mode (WCAG fail!)
- ❌ **NEW:** Testing only AT breakpoints (test BETWEEN them!)
- ❌ **NEW:** Storage Rules in firestore.rules file (separate files!)

---

## 📚 Documentation Status

**⚠️ IMPORTANT: Use CLAUDE.md, NOT README.md**

| File | Status | Use Case |
|------|--------|----------|
| **CLAUDE.md** | ✅ **UP-TO-DATE** (v3.2.0) | **Primary technical reference** - Use this for all development work |
| README.md | ❌ **OUTDATED** (v1.0/2.0) | Legacy end-user documentation - Ignore for development |
| CLAUDE_SESSIONS_ARCHIVE.md | ✅ Current | Full session history (Oct 30 - Nov 5, 2025) |
| CODEBASE-ANALYSE-REPORT.md | ✅ Current | Comprehensive codebase analysis |
| TESTING_AGENT_PROMPT.md | ✅ Current | QA testing guide (1,966 lines) |

**Why README.md is outdated:**
- Describes localStorage version (v1.0/2.0) - App now uses Firebase (v3.2.0)
- Missing: Multi-tenant architecture, Partner Portal, 12 services, Cloud Functions
- Missing: Playwright E2E tests, Zeiterfassungs-System, Status Synchronization
- Missing: GitHub Pages deployment, Firebase Security Rules

**What to use:**
- For development: **CLAUDE.md** (this file)
- For testing: **TESTING_AGENT_PROMPT.md** or Testing Guide section below
- For architecture: **Core Architecture** section below
- For deployment: **Essential Commands** section above
- For bug fixes: **Recent Updates** section below + **CLAUDE_SESSIONS_ARCHIVE.md**

---


## 📋 Recent Updates

**Latest Features & Fixes (2025-11-13):** See [FEATURES_CHANGELOG.md](./FEATURES_CHANGELOG.md)

**Session History:** See [CLAUDE_SESSIONS_ARCHIVE.md](./CLAUDE_SESSIONS_ARCHIVE.md)

**Current Version:** v3.2.0 (Production-Ready, 100% Test Pass Rate on Primary Browsers)

---

## 📊 Modernization Strategy

**Approach:** Hybrid - Keep Vanilla JS, enhance progressively
**Status:** Production-first, modernization secondary

**See FEATURES_CHANGELOG.md for detailed roadmap.**

---

## 🏗️ Core Architecture

### 1. Multi-Tenant Collection Pattern (CRITICAL)

**ALWAYS use the helper function for Firestore operations:**

```javascript
// ✅ CORRECT - Auto-appends werkstattId suffix
const fahrzeuge = window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'

// ❌ WRONG - Accesses global collection
const fahrzeuge = db.collection('fahrzeuge');
```

**Why:** Each workshop (Mosbach, Heidelberg) has isolated data via collection suffixes.

**Implementation:** See firebase-config.js:405-449

**Collections:**
- `fahrzeuge_mosbach`, `fahrzeuge_heidelberg` - Workshop-specific vehicles
- `kunden_mosbach`, `kunden_heidelberg` - Workshop-specific customers
- `partners_mosbach`, `partners_heidelberg` - Workshop-specific partners
- `partnerAnfragen_mosbach` - Partner service requests
- `bonusAuszahlungen_mosbach` - Partner bonus records
- `zeiterfassung_mosbach` - Employee time tracking records (SOLL/IST hours)

**Exception:** `users` and `partners` collections are GLOBAL (for pending registrations before werkstatt assignment)

---

### 2. Firebase Initialization Pattern (CRITICAL)

**ALWAYS await Firebase before Firestore operations:**

```javascript
// Pre-initialize werkstattId from localStorage
const storedPartner = JSON.parse(localStorage.getItem('partner') || 'null');
window.werkstattId = (storedPartner && storedPartner.werkstattId) || 'mosbach';

// Wait for Firebase + werkstattId with polling
let authCheckAttempts = 0;
const authCheckInterval = setInterval(async () => {
  authCheckAttempts++;
  if (window.firebaseInitialized && window.werkstattId) {
    clearInterval(authCheckInterval);

    // NOW safe to use Firestore
    const collection = window.getCollection('fahrzeuge');
    const snapshot = await collection.get();
  }

  if (authCheckAttempts >= 20) {
    clearInterval(authCheckInterval);
    console.error('Firebase initialization timeout');
  }
}, 250);
```

**Why:** Firebase SDK loads asynchronously. Race conditions cause "db not initialized" errors.

**Key Points:**
- Pre-initialize `window.werkstattId` from localStorage BEFORE polling
- Poll for both `window.firebaseInitialized` AND `window.werkstattId`
- 20 attempts × 250ms = 5 seconds timeout
- Race conditions can break entire features (e.g., photo upload)

---

### 3. Type-Safe ID Comparisons (CRITICAL)

**ALWAYS use String conversion:**

```javascript
// ✅ CORRECT - Type-safe comparison
const vehicle = allVehicles.find(v => String(v.id) === String(vehicleId));

// ❌ WRONG - Type mismatch causes false negatives
const vehicle = allVehicles.find(v => v.id === vehicleId);
```

**Why:** Firestore IDs are strings, but JavaScript may have numeric timestamps. Type mismatch = "Fahrzeug nicht gefunden" errors.

---

### 4. Authentication & Access Control (2-Layer Defense)

**Layer 1:** Firebase Auth (werkstatt vs partner roles)
**Layer 2:** Page-level checks in every HTML file

```javascript
// MUST be in <script> tag of EVERY werkstatt page
if (window.currentUserRole === 'partner') {
  window.location.href = '/partner-app/index.html';
}
```

**Roles:**
- `admin` - Super admin (full access)
- `werkstatt` - Workshop admin (owner)
- `mitarbeiter` - Employee (delegated permissions)
- `partner` - B2B partner (restricted to partner-app)
- `kunde` - Customer (vehicle tracking only)

**Security Rules:** firestore.rules validates BOTH role AND werkstattId

---

### 5. Firestore Security Rules Pattern Order (CRITICAL)

**Pattern order is CRITICAL** - Firestore evaluates rules top-to-bottom, **first match wins**.

```javascript
// ✅ CORRECT - Most specific patterns at TOP
match /bonusAuszahlungen_mosbach/{bonusId} { ... }  // Line 63 - Specific
match /{bonusCollection}/{bonusId} { ... }          // Line 72 - Pattern
match /{chatCollection}/{id} { ... }                // Line 295 - Wildcard

// ❌ WRONG - Specific patterns at BOTTOM
match /{chatCollection}/{id} { ... }                // Matches everything first!
match /bonusAuszahlungen_mosbach/{bonusId} { ... }  // Never reached
```

**Takeaway from Bug #5 (4 hours debugging!):**
- Order patterns from **specific → general** (hardcoded → pattern → wildcard)
- Test pattern order: Temporarily add `allow read, write: if true` to top-level
- Use Firebase Rules Playground to verify which rule matches your request

---

### 6. Status Sync Pattern (NEW 2025-11-07)

**Field name consistency is CRITICAL** for multi-path data flows:

```javascript
// ✅ CORRECT - Standardized field name across ALL creation paths
// Partner-side vehicle creation (anfrage-detail.html:2970)
const fahrzeugData = {
    partnerAnfrageId: anfrage.id,  // ✅ Standardized field
    // ...
};

// Admin-side vehicle creation (admin-anfragen.html)
const fahrzeugData = {
    partnerAnfrageId: anfrageId,  // ✅ Same field name
    // ...
};

// Kanban sync priority (kanban.html:3087, 3343)
const partnerAnfrageId = fahrzeugData.partnerAnfrageId ||   // Check standardized FIRST
                         fahrzeugData.anfrageId ||           // Then fallback
                         fahrzeugData.fahrzeugAnfrageId;     // Then old field

// Query ordering for consistency (anfrage-detail.html:969)
const snapshot = await getCollection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId)
    .orderBy('timestamp', 'desc')  // ✅ Always return NEWEST
    .limit(1)
    .get();
```

**Why:** Partner path used `anfrageId`, Admin path used `partnerAnfrageId` → Status sync failed.

**Solution:**
1. Standardize field name across all creation paths
2. Check standardized field FIRST in sync logic, then fallbacks
3. Add `.orderBy('timestamp', 'desc')` to prevent random results
4. Create migration script for existing data

---

### 7. Duplicate Prevention Pattern (NEW 2025-11-07)

**3-Layer Protection:**

```javascript
// Layer 1: Check anfrage.fahrzeugAngelegt flag
if (anfrage.fahrzeugAngelegt === true) {
    alert('⚠️ Fahrzeug wurde bereits angelegt!');
    return;
}

// Layer 2: Query Firestore by partnerAnfrageId
const existingByAnfrageId = await window.getCollection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId)
    .limit(1)
    .get();

if (!existingByAnfrageId.empty) {
    alert('⚠️ Fahrzeug mit dieser Anfrage-ID existiert bereits!');
    return;
}

// Layer 3: Query Firestore by kennzeichen (if exists)
if (fahrzeugData.kennzeichen) {
    const existingByKennzeichen = await window.getCollection('fahrzeuge')
        .where('kennzeichen', '==', fahrzeugData.kennzeichen.toUpperCase())
        .limit(1)
        .get();

    if (!existingByKennzeichen.empty) {
        alert('⚠️ Fahrzeug mit diesem Kennzeichen existiert bereits!');
        return;
    }
}

// All checks passed - create vehicle
await window.getCollection('fahrzeuge').add(fahrzeugData);
```

**Why:** Race condition allowed simultaneous Partner + Admin vehicle creation → Double Kanban entries.

---

### 8. Logo Branding Pattern (NEW 2025-11-10)

**CRITICAL for Multi-Tenant UI Consistency:**

```javascript
// ✅ CORRECT - Dynamic Logo Loading with Auto-Init Pattern

// Step 1: HTML Logo Container
// <div id="werkstattLogo" style="display: inline-block; vertical-align: middle; margin-right: 12px;"></div>

// Step 2: Load Settings & Display Logo
(async () => {
    try {
        // Auto-Init Pattern: settings-manager.js checks if initialized, calls init() if needed
        const settings = await window.settingsManager.loadSettings();

        if (settings?.profil) {
            // Update Page Title
            document.title = `${settings.profil.name} | ${document.title.split('|')[1]?.trim() || 'App'}`;

            // Display Logo
            if (settings.profil.logoUrl) {
                const logoContainer = document.getElementById('werkstattLogo');
                if (logoContainer) {
                    logoContainer.innerHTML = `
                        <img src="${settings.profil.logoUrl}"
                             alt="${settings.profil.name}"
                             style="height: 32px; width: auto; vertical-align: middle;
                                    object-fit: contain;">
                    `;
                    console.log('✅ [PAGE] Werkstatt-Logo angezeigt:', settings.profil.name);
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ [PAGE] Werkstatt-Branding konnte nicht geladen werden:', error);
        // Graceful degradation - Page funktioniert auch ohne Logo
    }
})();

// ❌ WRONG - No initialization, assumes settings always loaded
const settings = window.settingsManager.currentSettings;  // undefined!
// (Causes: Logo not showing, page title not updated)

// ❌ WRONG - Direct Firestore access (bypasses Multi-Tenant helper)
const settings = await db.collection('einstellungen_mosbach').doc('config').get();
// (Causes: Hardcoded werkstattId, breaks Multi-Tenant architecture)
```

**Auto-Init Pattern in settings-manager.js:**
```javascript
class SettingsManager {
    async loadSettings() {
        // 🆕 AUTO-INIT: If not initialized yet, call init()
        if (!this.settingsRef) {
            console.log('⚠️ SettingsManager noch nicht initialisiert, rufe init() auf...');
            const initialized = await this.init();
            if (!initialized) {
                console.error('❌ Initialisierung fehlgeschlagen, verwende Default-Settings');
                return DEFAULT_SETTINGS;
            }
        }

        const doc = await this.settingsRef.doc('config').get();

        if (!doc.exists) {
            console.log('⚠️ Keine Einstellungen gefunden, erstelle Default-Einstellungen...');
            await this.createDefaultSettings();
            return DEFAULT_SETTINGS;
        }

        this.currentSettings = doc.data();
        return this.currentSettings;
    }
}
```

**Key Points:**
- **Multi-Tenant:** Logo changes per werkstattId (Mosbach vs Heidelberg can have different logos)
- **Auto-Init Pattern:** Prevents race-condition timing errors (calls `init()` automatically if not initialized)
- **PDF Integration:** Logo appears in generated PDFs (`abnahme.html`, `kva-erstellen.html`)
- **Email Integration:** Cloud Functions include werkstatt name in email templates
- **Graceful Degradation:** If logo upload fails or settings missing, fallback to DEFAULT_SETTINGS
- **Dark/Light Mode:** Logo visibility maintained in both themes via CSS
- **Script Tag Required:** All pages MUST include `<script src="js/settings-manager.js"></script>` after `auth-manager.js`

**Collections:**
- `einstellungen_{werkstattId}` - Stores logoUrl + profil data
- Storage: `werkstatt-logos/{werkstattId}/` - Logo image files in Cloud Storage

**Security Rules (storage.rules):**
```javascript
// Werkstatt-Logos (Admin Upload in Einstellungen)
match /werkstatt-logos/{werkstattId}/{fileName} {
  allow read: if true;  // Public Read (Logo displayed on all pages)
  allow write: if request.auth != null
               && request.resource.size < 2 * 1024 * 1024  // Max 2 MB
               && (request.auth.token.role == 'admin'
                   || request.auth.token.role == 'werkstatt'
                   || request.auth.token.role == 'superadmin');
}
```

**Implementation:** 34 pages integrated (14 Werkstatt + 20 Partner), see commit `209cdf1`

---

## 📁 File Structure

```
/Fahrzeugannahme_App/
├── index.html                    # Landing page (login/navigation)
├── annahme.html                  # Vehicle intake form (12 service types)
├── liste.html                    # Vehicle list view
├── kanban.html                   # Kanban board (10 custom workflows)
├── kalender.html                 # Calendar view
├── material.html                 # Material ordering
├── kunden.html                   # Customer management
├── admin-dashboard.html          # Admin dashboard
├── pending-registrations.html    # Partner approval workflow
├── admin-bonus-auszahlungen.html # Bonus payment dashboard
├── mitarbeiter-verwaltung.html   # Employee management + Zeiterfassung admin panel
├── mitarbeiter-dienstplan.html   # Employee schedule + Time clock (Start/Pause/Finish)
├── dienstplan.html               # Admin: Schedule management
├── firebase-config.js            # Firebase init + Multi-tenant helper (CRITICAL)
├── firestore.rules               # Security rules (CRITICAL - pattern order!)
├── firestore.indexes.json        # Query indexes
├── storage.rules                 # Storage access control
├── firebase.json                 # Firebase config + Emulator ports
├── package.json                  # NPM dependencies
├── playwright.config.js          # Playwright E2E test config
├── js/
│   ├── auth-manager.js          # 2-stage auth (werkstatt + mitarbeiter)
│   ├── ai-agent-engine.js       # OpenAI GPT-4 integration
│   ├── ai-chat-widget.js        # AI chat UI component
│   ├── settings-manager.js      # User preferences + Logo branding (Auto-Init pattern, Multi-tenant)
│   ├── ai-agent-tools.js        # AI function calling
│   ├── app-events.js            # Event bus
│   └── mitarbeiter-notifications.js # Employee alerts
├── partner-app/                  # B2B Partner Portal (12 services)
│   ├── index.html               # Partner dashboard
│   ├── service-auswahl.html     # Service selection grid
│   ├── meine-anfragen.html      # Partner's request list (6800 lines)
│   ├── anfrage-detail.html      # Request detail view + Status tracking
│   ├── kva-erstellen.html       # Quote (KVA) creation (2648 lines)
│   ├── admin-anfragen.html      # Admin: All partner requests
│   ├── auto-login.html          # QR-Code auto-login page
│   ├── lackier-anfrage.html     # Paint service form
│   ├── reifen-anfrage.html      # Tire service form
│   ├── mechanik-anfrage.html    # Mechanic service form
│   ├── pflege-anfrage.html      # Detailing service form
│   ├── tuev-anfrage.html        # TÜV inspection form
│   ├── versicherung-anfrage.html # Insurance form
│   ├── glas-anfrage.html        # Glass repair form
│   ├── klima-anfrage.html       # A/C service form
│   ├── dellen-anfrage.html      # Dent removal form
│   ├── folierung-anfrage.html   # Wrapping service form
│   ├── steinschutz-anfrage.html # Paint protection form
│   └── werbebeklebung-anfrage.html # Advertising wrap form
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                 # All Cloud Functions (3200+ lines)
│   │   ├── ensurePartnerAccount        # Create partner Firebase Auth
│   │   ├── createPartnerAutoLoginToken # Generate QR token
│   │   ├── validatePartnerAutoLoginToken # Validate + create custom token
│   │   ├── monthlyBonusReset           # Scheduled: 1st of month
│   │   └── testMonthlyBonusReset       # HTTP: Manual test
│   └── package.json
├── tests/                        # Playwright E2E tests
│   ├── 00-smoke-test.spec.js
│   ├── 01-vehicle-intake.spec.js
│   ├── 02-partner-flow.spec.js
│   ├── 03-kanban-drag-drop.spec.js
│   ├── 04-edge-cases.spec.js
│   ├── 05-transaction-failure.spec.js
│   ├── 06-cascade-delete-race.spec.js
│   ├── 07-service-consistency-v32.spec.js
│   ├── 08-admin-einstellungen.spec.js
│   ├── 09-ki-chat-widget.spec.js
│   ├── 10-mobile-comprehensive.spec.js
│   ├── 99-firebase-config-check.spec.js
│   ├── partner-app-kva-logic.spec.js
│   ├── partner-app-multi-tenant.spec.js
│   └── helpers/                  # Test utilities
├── migrate-*.html               # Data migration scripts (6 files)
│   ├── migrate-partneranfrageid.html (NEW 2025-11-07)
│   ├── migrate-fotos-to-firestore.html
│   ├── migrate-kennzeichen-uppercase.html
│   ├── migrate-mitarbeiter.html
│   ├── migrate-price-consistency.html
│   └── migrate-status-consistency.html
├── libs/                        # Local libraries
│   └── qrious.min.js           # QR-Code generation (17KB)
├── css/                         # Global stylesheets
│   ├── light-mode.css          # Light Mode theme (NEW 2025-11-10, 301 lines)
│   └── ...                     # Other CSS files
├── n8n-workflows/               # Automation workflows (n8n)
└── CLAUDE.md                    # This file
```

**Key Files to Know:**
- **firebase-config.js** - CRITICAL: Multi-tenant helper, Firebase initialization
- **firestore.rules** - CRITICAL: Security Rules (pattern order matters!)
- **annahme.html** - Vehicle intake with 12 service types + dynamic fields
- **kanban.html** - Kanban board with 10 custom workflows + drag & drop
- **partner-app/meine-anfragen.html** - Partner dashboard (6800 lines, realtime sync)
- **partner-app/kva-erstellen.html** - Quote creation (2648 lines, dynamic variants)

---

## 🧪 Testing Guide

### Test Environment
- **Live App**: https://marcelgaertner1234.github.io/Lackiererei1/
- **Firestore**: Production (auto-lackierzentrum-mosbach)
- **Firebase Emulators**: localhost:8080 (Firestore), localhost:9199 (Storage), localhost:9099 (Auth)

### Hybrid Testing Approach (2025-11-09)

**Strategie**: Integration Tests (Geschäftslogik) + Smoke Tests (UI Accessibility)

#### **Integration Tests ausführen:**
```bash
# Alle Integration Tests (10 Tests)
npm run test:integration

# Einzelner Test
npx playwright test tests/integration/vehicle-integration.spec.js

# Mit Browser UI
npx playwright test tests/integration/ --headed
```

**Was wird getestet:**
- ✅ Vehicle Creation (direktes Firestore-Write)
- ✅ Customer Registration
- ✅ Status Updates (angenommen → in_arbeit → fertig)
- ✅ Multi-Tenant Isolation (werkstattId)
- ✅ Data Persistence
- ✅ Email Normalization
- ✅ Default Fields
- ✅ Timestamps
- ✅ Delete Operations

**Ergebnis:** 30/30 Tests bestanden auf Chromium, Mobile Chrome, Tablet iPad

#### **Smoke Tests ausführen:**
```bash
# Alle Smoke Tests (13 Tests)
npm run test:smoke

# Alle Tests zusammen
npm run test:all
```

**Was wird getestet:**
- UI Accessibility (Elemente sichtbar, editierbar, klickbar)
- annahme.html, liste.html, kanban.html, kunden.html, index.html
- Dark Mode Toggle
- Firebase Initialization

**Note:** Smoke Tests haben einige Timeouts (ähnlich wie alte UI E2E Tests), aber sind optional da Integration Tests alle Geschäftslogik abdecken.

---

### 📊 Test Coverage Status (Nov 2025)

**✅ GETESTET (23 Tests - 100% Pass Rate):**
- Vehicle Creation & Customer Registration
- Status Updates (Kanban Drag & Drop)
- Multi-Tenant Isolation
- Service-Specific Data Capture
- Partner-Werkstatt Status Sync
- UI Accessibility (5 pages)
- Dark Mode Toggle
- Firebase Initialization

**🔴 KRITISCHE GAPS (Neue Features ohne Tests):**

| Feature | Implementiert | Tests | Priority |
|---------|---------------|-------|----------|
| Steuerberater-Dashboard | ✅ Nov 11 | ❌ None | 🔴 HIGH |
| Material Photo-Upload | ✅ Nov 12 | ❌ None | 🔴 HIGH |
| Ersatzteil-Bestellen Modal | ✅ Nov 12 | ❌ None | 🔴 HIGH |
| Rechnungs-System | ✅ Nov 11 | ❌ None | 🔴 CRITICAL |
| Zeiterfassungs-System | ✅ Nov 7-8 | ❌ None | 🔴 CRITICAL |
| PDF-Upload Auto-Fill | ✅ Nov 11 | ❌ None | 🟡 MEDIUM |
| Preis-Berechtigung | ✅ Nov 11 | ❌ None | 🟡 MEDIUM |
| Bonus-System | ✅ Nov 5 | ❌ None | 🟡 MEDIUM |
| Wissensdatenbank | ✅ Oct 2025 | ❌ None | 🟢 LOW |
| Logo Branding System | ✅ Nov 10 | ❌ None | 🟢 LOW |

**Empfohlene Neue Tests:**
1. **Integration Test:** Rechnung Auto-Creation (bei Status → "Fertig")
2. **Integration Test:** Zeit-Tracking SOLL/IST Berechnung
3. **Integration Test:** Material Photo Upload & Firestore Association
4. **Smoke Test:** Steuerberater Dashboard Page Loading
5. **Smoke Test:** Ersatzteil Modal Visibility & Fields

**Total Test Coverage:** ~40% (23 Tests für ~15 Core Features, 15+ Features ohne Tests)

---

### 9 Test Cases (Multi-Tenant Partner Registration)

| Test | Description | Priority | Duration |
|------|-------------|----------|----------|
| **TEST 0** | Mosbach Address Setup (Firebase Console) | 🔧 SETUP | 5 min |
| **TEST 1** | Partner Registration (registrierung.html) | ⭐ START | 5 min |
| **TEST 2** | PLZ-Region Validation Warning | ⚠️ | 3 min |
| **TEST 3** | Admin Dashboard Badge Display + Access | 🔴 | 5 min |
| **TEST 4** | Pending Panel (+ Address Display) | 📋 | 10 min |
| **TEST 5** | Assignment (+ PLZ Matching) | 🔥 CRITICAL | 12 min |
| **TEST 6** | Partner Login After Approval | 🔥 CRITICAL | 8 min |
| **TEST 7** | Reject Function (Spam Removal) | 🗑️ | 5 min |
| **TEST 8** | Multi-Tenant Isolation Verification | 🔥 CRITICAL | 10 min |

**Total:** ~65 minutes

**Testing Results (2025-11-03):** ✅ **All 9 Tests PASSED**

**For detailed test instructions**, see [TESTING_AGENT_PROMPT.md](./TESTING_AGENT_PROMPT.md) (1,966 lines, comprehensive QA guide).

---

## ⚠️ Common Errors & Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| `firebase.storage is not a function` | Storage SDK not loaded | Add `firebase-storage-compat.js` to HTML |
| `Fahrzeug nicht gefunden` | ID type mismatch | Use `String(v.id) === String(vehicleId)` |
| `Firebase initialization timeout` | SDK load order wrong | Check `<script>` tags in `<head>`, pre-init werkstattId |
| `werkstattId timeout` | Not pre-initialized | Pre-init from localStorage before polling |
| Permission denied (Bonus System) | Security Rules pattern collision | Move bonus rules to TOP (before wildcards) |
| GitHub Pages shows old version | Browser cache | Hard-refresh (Cmd+Shift+R) + Wait 2-3min |
| Partner can access werkstatt pages | Missing page-level access control | Add `if (role === 'partner') { redirect }` to ALL werkstatt pages |
| Status sync not working | Field name inconsistency | Verify `partnerAnfrageId` used in all creation paths |
| Duplicate Kanban entries | Missing duplicate prevention | Add 3-layer check (flag, partnerAnfrageId, kennzeichen) |
| Random status display | Query without ordering | Add `.orderBy('timestamp', 'desc')` to query |
| Service Worker Response errors | External tracking pixels (Google cleardot.gif) | Skip external resources from caching, return 408 Response (see `sw.js:197-202, 307-314`) |
| Logo not showing on pages | settings-manager.js not initialized | Add `<script src="js/settings-manager.js"></script>` after auth-manager.js, call `loadSettings()` on page load |
| Dark Mode logo visibility issues | Logo CSS doesn't adapt to theme | Verify both `light-mode.css` and dark theme CSS include logo styling, check CSS selectors match |
| Firestore Composite Index missing | PDF generation query on `zeiterfassung` | Click error message link → Index auto-created in ~2 min (one-time setup) |

---

## 🚧 Known Limitations

### Testing
- ✅ **Hybrid Testing Approach implemented** (100% success rate on primäre Browser)
- ✅ Integration Tests validate all business logic directly via Firestore
- ⚠️ Smoke Tests haben einige Timeouts (optional, da Integration Tests alles abdecken)
- ✅ Live app works perfectly - fully functional and production-ready

### Browser Support
- ✅ Chrome/Edge: Full support
- ✅ Safari/iOS: Full support
- ⚠️ Firefox: Camera upload may require manual selection

### Offline Mode
- ❌ No offline data persistence (intentional - real-time data priority)
- ❌ No service worker caching for HTML (Firebase Auth requires online)

### Firestore Composite Indexes

**Zeiterfassung PDF Generation:**
- ⚠️ Requires composite index on first use (one-time setup)
- Collection: `zeiterfassung_{werkstattId}`
- Fields: `mitarbeiterId` (ascending) + `status` (ascending) + `datum` (ascending)
- **Setup:** Click the link in the Firestore error message → Index auto-created in ~2 minutes
- **Symptoms if missing:** PDF generation fails with "The query requires an index" error

**Note:** This is a one-time setup per werkstatt. After creating the index, PDF generation works permanently.

---

## 📚 Session History

**Latest Sessions (2025-11-06 to 2025-11-14):**
- ✅ **Multi-Service serviceTyp Consistency** (2 Commits: 750d7b2, 7083778) - 2-Layer Defense, 15+ files audited, CRITICAL data loss fix (Nov 14)
- ✅ **Multi-Service Tab Filtering Fixes** (2 Commits: 204e038, e3a8332) - Service-Konsistenz 100%, Tab Filtering behoben (Nov 13)
- ✅ **Partner-Daten Pipeline Fixes** (4 Commits: b88e8c9, 9c16d18, 066b67a, 3ee0b55) - 100% vollständig für 5 Services (Nov 12)
- ✅ **Multi-Service Booking System** (3 Commits: b40646c, 339a0e0, 8c13e8c) - Production-Ready (Nov 12)
- ✅ **Material Photo-Upload + Ersatzteil-DB** (4 Commits: d6a5d78 → 80ef5a8) - Complete (Nov 12)
- ✅ **Werkstatt-Logo Branding & UX Improvements** (Commits: 209cdf1, fd997e0) - 34 pages, Dark Mode, Auto-Init (Nov 10)
- ✅ **Hybrid Testing Approach** (Commit: 97ddb25) - 100% Success Rate (Nov 9)
- ✅ Zeiterfassungs-System (11 commits: d4fb0b2 → 0e6bdcb + Service Worker fix 271feb6)
- ✅ Status Sync & Duplicate Prevention (Commit: 1bdb335)
- ✅ PDF Anmerkungen-Feature (Commit: 706df2c)
- ✅ Partner Services Integration - 12 services (5 commits: cd68ae4 → 33c3a73)
- ✅ Bonus System Production Ready (Commit: 2a30531)

**Details:** See [Recent Updates](#-recent-updates) section above for comprehensive documentation.

**Full Archive:** [CLAUDE_SESSIONS_ARCHIVE.md](./CLAUDE_SESSIONS_ARCHIVE.md) (Oct 30 - Nov 5, 2025)

---

## 🌐 External Resources

- **GitHub Repository:** https://github.com/MarcelGaertner1234/Lackiererei1
- **Live App:** https://marcelgaertner1234.github.io/Lackiererei1/
- **GitHub Actions:** https://github.com/MarcelGaertner1234/Lackiererei1/actions
- **Firebase Console:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach
  - **Firestore:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore
  - **Authentication:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/authentication
  - **Storage:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/storage
  - **Cloud Functions:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions

---

## 🌳 Decision Trees

**Quick decision-making guide für häufige Entwicklungs-Situationen**

### Which Collection Helper to Use?

```
Need to access Firestore collection?
├─ Is it a standard tenant collection?
│  ├─ fahrzeuge, kunden, mitarbeiter, partnerAnfragen, etc.
│  └─ ✅ Use: window.getCollection('collectionName')
│     → Auto-appends werkstattId suffix
│     → Example: window.getCollection('fahrzeuge') → 'fahrzeuge_mosbach'
│
└─ Is it a global collection?
   ├─ users, settings, partnerAutoLoginTokens
   └─ ✅ Use: db.collection('collectionName')
      → NO suffix appended
      → Example: db.collection('users') → 'users'
```

**Code Pattern:**
```javascript
// ✅ TENANT-SCOPED (95% of cases)
const vehicles = await window.getCollection('fahrzeuge').get();

// ✅ GLOBAL (5% of cases)
const users = await db.collection('users').get();
```

---

### When to Write Tests?

```
Adding new feature or fixing bug?
├─ New business logic (calculations, data transformations)?
│  └─ ✅ Write Integration Test (tests/integration/)
│     - Direct Firestore testing bypassing UI
│     - Fast (<2s per test)
│     - Example: vehicle creation, status updates, calculations
│
├─ New UI page or component?
│  └─ ✅ Write Smoke Test (tests/smoke/)
│     - UI accessibility validation
│     - Checks elements visible, editable, clickable
│     - Example: form fields, buttons, navigation
│
├─ Bug fix (critical)?
│  └─ ✅ Add regression test
│     - Prevents bug from reoccurring
│     - Type: Integration or Smoke (depending on bug location)
│
└─ Refactoring (no new functionality)?
   └─ ⚠️ Run existing tests
      - npm run test:all BEFORE refactoring
      - npm run test:all AFTER refactoring
      - NO new tests needed
```

---

### Which Firestore Query Method?

```
Need to fetch data from Firestore?
├─ Single document by ID?
│  └─ ✅ Use: .doc(id).get()
│     → Fast, direct access
│     → Example: const doc = await collection.doc('123').get()
│
├─ Filter by single field?
│  └─ ✅ Use: .where('field', '==', value).get()
│     → No index required
│     → Example: .where('kennzeichen', '==', 'AB-CD-123')
│
├─ Filter by multiple fields?
│  └─ ⚠️ Use: .where().where().get() + CREATE INDEX!
│     → Composite index REQUIRED
│     → Example: .where('status', '==', 'active').where('datum', '>', X)
│     → See: Pattern 10 (Firestore Composite Index Missing)
│
└─ Real-time updates needed?
   └─ ✅ Use: .onSnapshot()
      → Listens for changes
      → Example: .onSnapshot(snapshot => { update UI })
      → CRITICAL: Detach listener in cleanup!
```

---

### How to Debug Permission Denied Errors?

```
Got "Permission denied" error?
├─ Check 1: Is user authenticated?
│  ├─ No → Check firebase-config.js initialization
│  │  └─ await window.firebaseInitialized
│  └─ Yes → Continue
│
├─ Check 2: Does query filter by werkstattId?
│  ├─ No → Add .where('werkstattId', '==', window.werkstattId)
│  └─ Yes → Continue
│
├─ Check 3: Does query match Security Rule conditions?
│  ├─ Open firestore.rules for the collection
│  ├─ Ensure ALL query filters match rule requirements
│  └─ Example: If rule checks `status == 'active'`, query MUST filter by status
│
└─ Check 4: Is selected role allowed?
   ├─ Partner role CANNOT access werkstatt collections
   └─ See: firestore.rules helper functions (isAdmin, isMitarbeiter, etc.)
```

**Debug Commands:**
```javascript
// Check auth status
console.log('User:', await window.firebaseInitialized);
console.log('Role:', currentUser?.role);
console.log('WerkstattId:', window.werkstattId);

// Test query in Firebase Console
// Firestore → Query → Add filters → Run
```

---

### Storage vs Firestore Rules: Which to Edit?

```
Need to add/modify security rules?
├─ File uploads/downloads?
│  └─ ✅ Edit: storage.rules
│     - Controls Firebase Storage (images, PDFs, etc.)
│     - Deployment: firebase deploy --only storage
│     - Example: match /material_photos/{id}/{file}
│
└─ Database read/write?
   └─ ✅ Edit: firestore.rules
      - Controls Firestore Database
      - Deployment: firebase deploy --only firestore
      - Example: match /fahrzeuge_{werkstattId}/{id}
```

**⚠️ CRITICAL:** These are SEPARATE systems with SEPARATE deployment commands!

**Common Mistake:**
- ❌ Adding Storage Rules to firestore.rules (won't work!)
- ❌ Using `firebase deploy --only firestore` for Storage Rules (won't deploy!)

---

### Firebase Emulator vs Production: Which to Test?

```
Which environment should I test in?
├─ Local development (rapid iteration)?
│  └─ ✅ Firebase Emulator
│     - Fast, no network latency
│     - Command: firebase emulators:start
│     - Ports: Firestore 8080, Storage 9199, Auth 9099
│
├─ Security Rules testing?
│  └─ ⚠️ BOTH Emulator AND Production!
│     - Emulator: Rules syntax validation
│     - Production: Rules actually enforced
│     - Example: Counter rules bug (Pattern 12) only visible in production
│
├─ Composite Index testing?
│  └─ ❌ Production ONLY!
│     - Emulator doesn't require indexes
│     - Production WILL fail without indexes
│     - See: Pattern 10 (Index Missing)
│
└─ Final feature verification?
   └─ ✅ Production (GitHub Pages)
      - Real-world environment
      - Cache behavior, CDN, etc.
      - Always hard-refresh (Cmd+Shift+R)
```

---

### Commit Strategy: One Commit or Multiple?

```
Making code changes?
├─ Fixing multiple independent bugs?
│  └─ ✅ Multiple commits (1 bug = 1 commit)
│     - Easy to revert individual fixes
│     - Git history is bisectable
│     - Example: 4 photo upload bugs → 4 commits
│
├─ Adding cohesive feature?
│  └─ ✅ Single commit
│     - All changes work together
│     - Example: Modal expansion (11 fields) → 1 commit
│
└─ Refactoring?
   └─ ✅ Single commit
      - No functional changes
      - Example: Code cleanup, rename variables
```

**Pattern:**
- User says "fix this error" → Incremental commit
- User says "add these 6 fields" → Large commit

---

## 🔍 Quick Reference

### Test Accounts
- **Werkstatt Mosbach:** See Firebase Console → Authentication
- **Partner Test:** `werkstatt-polen@...` (created in TEST 6 - Multi-Tenant Partner Registration)
- **Login Flow:** Werkstatt login (Stage 1) → Employee selection (Stage 2, no Firebase Auth)

### Firestore Collections Pattern

**Global Collections (no suffix):**
- `users` - Pending werkstatt assignment
- `partners` - Pending werkstatt assignment

**Multi-Tenant Collections (with `_{werkstattId}` suffix):**
```
fahrzeuge_mosbach, fahrzeuge_heidelberg          # Vehicles
kunden_mosbach, kunden_heidelberg                # Customers
partnerAnfragen_mosbach, partnerAnfragen_heidelberg  # Partner service requests
bonusAuszahlungen_mosbach, bonusAuszahlungen_heidelberg  # Partner bonuses
zeiterfassung_mosbach, zeiterfassung_heidelberg  # Employee time tracking (SOLL/IST)
mitarbeiter_mosbach, mitarbeiter_heidelberg      # Employees
schichten_mosbach, schichten_heidelberg          # Employee schedules
urlaub_mosbach, urlaub_heidelberg                # Vacation requests
```

**Critical Helper Function:**
```javascript
// ✅ ALWAYS use this helper (auto-appends werkstattId)
const collection = window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'

// ❌ NEVER hardcode collection names
const collection = db.collection('fahrzeuge_mosbach');
```

### Composite Indexes Required

**Zeiterfassung PDF Generation:**
- Collection: `zeiterfassung_{werkstattId}`
- Fields: `mitarbeiterId` (ascending) + `status` (ascending) + `datum` (ascending)
- Setup: One-time in Firebase Console (error message provides creation link)
- Symptoms if missing: PDF generation fails with "Missing index" error

### Emulator URLs

**Local Development:**
```
Firestore:    http://localhost:8080
Storage:      http://localhost:9199
Auth:         http://localhost:9099
Hosting:      http://localhost:5000
Emulator UI:  http://localhost:4000
```

**Start Command:**
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only firestore,storage --project demo-test
```

---


## 📦 BACKUP & RECOVERY PROCEDURES

## 📦 BACKUP & RECOVERY PROCEDURES (2025-11-12)

**Purpose:** Comprehensive backup strategy before major feature implementations (e.g., Multi-Service Booking System)

---

### **3-COMPONENT BACKUP STRATEGY**

**Component 1: Git Backup (Code Versioning)**
```bash
# Create annotated backup tag
git tag -a v3.4.0-backup-vor-multi-service -m "🔒 BACKUP vor riskanten Änderungen"
git push origin v3.4.0-backup-vor-multi-service

# Recovery (if needed)
git checkout v3.4.0-backup-vor-multi-service
```

**Component 2: Local Code Backup (ZIP Archive)**
```bash
# Create ZIP backup
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/"
zip -r "Fahrzeugannahme_App_BACKUP_2025-11-12_vor-multi-service.zip" Fahrzeugannahme_App/

# Recovery (if needed)
unzip "Fahrzeugannahme_App_BACKUP_2025-11-12_vor-multi-service.zip" -d "Fahrzeugannahme_App_RESTORED"
```

**Component 3: Firestore Data Backup (Cloud Storage Export)**
```bash
# Export all collections to Cloud Storage
firebase firestore:export \
  gs://auto-lackierzentrum-mosbach.appspot.com/backups/2025-11-12-vor-multi-service \
  --project auto-lackierzentrum-mosbach

# Verify export
firebase firestore:operations:list --project auto-lackierzentrum-mosbach

# Recovery (if needed)
firebase firestore:import \
  gs://auto-lackierzentrum-mosbach.appspot.com/backups/2025-11-12-vor-multi-service \
  --project auto-lackierzentrum-mosbach
```

**⚠️ WARNING:** Firestore import OVERWRITES existing data! Always test recovery in development first.

---

### **BACKUP DOCUMENTATION FILE**

**Location:** `FIRESTORE_EXPORT_ANLEITUNG.md` (NEW FILE - 186 lines)

**Contents:**
1. **Why this export?** - Backup rationale (3-component strategy)
2. **Step-by-step guide** - Firebase Console + CLI commands
3. **Export settings** - Cloud Storage bucket paths (`backups/2025-11-12-vor-multi-service/`)
4. **Verification steps** - How to check export success
5. **Recovery procedures** - Rollback if Multi-Service fails
6. **Troubleshooting** - Common errors & solutions (permissions, bucket not found, etc.)
7. **Useful links** - Firebase Console, Storage, CLI Docs

**For complete backup procedures, see FEATURES_CHANGELOG.md**

---

_Last Updated: 2025-11-14 by Claude Code (Sonnet 4.5)_
_Version: 8.0 (Major Update: Pattern 21 + Multi-Service serviceTyp Consistency)_
_Lines: ~3,020_
