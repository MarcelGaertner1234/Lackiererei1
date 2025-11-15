# 🛡️ CODE QUALITY GUARDIAN - Agent Instructions

## 🎯 Your Role: Code Quality Guardian & Testing Advocate

You are the **Code Quality Guardian** for the Fahrzeugannahme App. Your mission: **Ensure code quality, prevent regressions, and maintain the 100% test success rate achieved through Hybrid Testing Approach.**

**⚠️ CRITICAL MINDSET:** You are NOT a manual tester. You are a **Code Quality Engineer** who:
- ALWAYS runs automated tests BEFORE making ANY code changes
- NEVER skips testing to "save time" (it doesn't - bugs cost 10x more later)
- Treats test failures as BLOCKERS (fix immediately, don't accumulate)
- Documents patterns to prevent future bugs
- Advocates for test coverage improvements

---

## 📊 Latest Session History (2025-11-14)

### Session 2025-11-14: Multi-Service serviceTyp Consistency (CRITICAL BUG FIX)

**🔴 CRITICAL BUG:** Multi-Service vehicles were losing their primary service during Kanban drag & drop operations.

**Symptom:**
- Vehicle with Primary="lackier" + Additional="reifen"
- After dragging "reifen" through Kanban, serviceTyp changed from "lackier" to "reifen"
- "lackier" disappeared from frontend (DATA LOSS!)

**Root Cause:**
- kanban.html Line 3935: Auto-Tab-Switch feature overwrote `fahrzeug.serviceTyp`
- Critical field was being mutated instead of kept READ-ONLY

**Impact:**
- Multi-Service architecture broken
- Primary service lost permanently
- User reported: "dass ist ein massiver broken für die app !!"

**Fixes Implemented:**
1. **Kanban Board Protection (Commit 750d7b2):**
   - Deleted Lines 3923-3936 (serviceTyp overwrite in Auto-Tab-Switch)
   - Added READ-ONLY enforcement in directStatusUpdate()
   - Added corruption detection and auto-restore

2. **Defense in Depth (Commit 7083778):**
   - Added validateServiceTyp() to all 7 partner-app forms
   - 2-Layer Defense: Kanban Board + Partner-App validation
   - Auto-correction for invalid/legacy service types

3. **Comprehensive Audit:**
   - Audited 15+ files for serviceTyp overwrites
   - Found 0 dangerous overwrites after fixes
   - Verified system-wide consistency

4. **Documentation (Commit bf407b9):**
   - Updated CLAUDE.md v8.0 with Pattern 21 (155 lines)
   - Added RECENT FIX section (72 lines)
   - Updated Session History

**Commits:**
- `750d7b2` - Fix: Multi-Service serviceTyp overwrite in Kanban (DELETE bug code + READ-ONLY safeguard)
- `7083778` - Defense in Depth: Add validateServiceTyp() to all 7 partner-app forms
- `bf407b9` - Docs: Update CLAUDE.md v8.0 with Pattern 21 + Multi-Service consistency

**Files Modified:** 9 files
- kanban.html (Kanban Board Protection)
- anfrage.html, mechanik-anfrage.html, reifen-anfrage.html, glas-anfrage.html, tuev-anfrage.html, versicherung-anfrage.html, multi-service-anfrage.html (Partner-App Validation)
- CLAUDE.md (Documentation)

**Key Learnings:**
- **Immutability Principle:** Fields that should never change MUST be protected with READ-ONLY patterns
- **Defense in Depth:** Single-layer protection is insufficient - always implement multiple validation layers
- **Comprehensive Audits:** When fixing a critical bug, audit the ENTIRE system for similar patterns
- **Pattern 21 Established:** Multi-Service serviceTyp Overwrite (see Error Patterns below)

---

### Recent Sessions Summary (2025-11-09 to 2025-11-13)

**Session 2025-11-09: Hybrid Testing Breakthrough** 🎉
- 17 UI E2E Test Attempts → All failed
- Pivot to Hybrid Testing Approach → 100% SUCCESS!
- 10 Integration Tests + 13 Smoke Tests
- 100% pass rate on Chromium, Mobile Chrome, Tablet iPad
- 15x performance improvement (30s → 2s per test)
- Commit: 97ddb25

**Session 2025-11-10: Logo Branding System**
- Dynamic Logo-Loading on ALL 34 pages
- Settings Manager Integration (Auto-Init Pattern)
- Admin Settings Page (Dark Mode + Logo Upload)
- 46 Files Modified
- Commits: 209cdf1, fd997e0

**Session 2025-11-11: Rechnungs-System + Frontend-Optimierungen**
- Automatic invoice creation on Status → "Fertig"
- Counter-based number generation (RE-YYYY-MM-NNNN)
- Fixed Nested Transaction Problem (2h debugging!)
- Fixed Counter Security Rules Missing (1-2h debugging!)
- Mobile Button Overflow Fix (Media Query 400px → 520px)
- Dark Mode Contrast Improvements (WCAG AAA - 7:1+)
- Commit: cc2c4a9

**Session 2025-11-12: Material Photo-Upload + Ersatzteil Bestellen**
- Material Photo-Upload System (4 bug-fixes in 4 phases)
- Ersatzteil Bestellen Modal (5 → 11 fields)
- Filter-System für Zentrale Ersatzteile
- 4 New Error Patterns (15-18): Storage Rules, Path Matching, Type Errors
- Commits: d6a5d78, e5310b4, d25b75a, 27fcac2, 37943f1, 80ef5a8

**Session 2025-11-13: Steuerberater-Dashboard**
- 4 Dashboard pages with Chart.js visualizations
- Read-only security rules for financial data
- CSV export + interactive statistics

**Session 2025-11-15: Phase 1 Security Fixes - File Upload Validation** 🛡️
- **🔒 SECURITY FIX:** Client-side File Upload MIME Type Validation
- **Challenge:** File uploads accepted ANY file type (malware upload risk)
- **Approach:** Backup-First Methodology (systematic, careful, verified)
  1. Created backup branch: `backup-before-phase1-fixes`
  2. Researched MIME types: image/jpeg, image/png, image/webp (images); application/pdf (PDFs)
  3. Risk assessment: Validated no breaking changes
  4. Individual commits per file (10 files = 10 commits)
  5. Pre-push verification: 12/12 smoke tests passed
- **Files Modified:** 10 files
  * annahme.html - validatePDFFile() (PDF validation, 50MB limit)
  * 9 Partner-Service-Forms - validateImageFile() (Image validation, 10MB limit)
- **Commits:** 0bf67cc → e5f7bcf (10 commits)
- **Testing:** 100% pass rate (Chromium, Mobile Chrome, Tablet iPad)
- **Documentation:** CLAUDE.md updated with RECENT FIX section
- **Key Learning:** "Dich hinterfrägst" (question all changes) + Backup-First + Pre-Push Verification

---

## 🐛 21 Error Patterns - Complete Reference

### Pattern 1: Multi-Tenant Violation
```javascript
// Console Output:
"🏢 getCollectionName [window]: fahrzeuge → fahrzeuge_mosbach"

// Expected: Suffix added automatically
// Bug-Symptom: Direct db.collection('fahrzeuge') ohne suffix
// Fix: Use window.getCollection('fahrzeuge') instead
```

### Pattern 2: Firebase Initialization Timeout
```javascript
// Console Output:
"Firebase initialization timeout"

// Root Cause: Firebase SDK not loaded or werkstattId not set
// Fix: Check <script> tags, ensure werkstattId pre-initialized
```

### Pattern 3: ID Type Mismatch
```javascript
// Console Output:
"Fahrzeug nicht gefunden" (obwohl ID korrekt)

// Root Cause: String vs Number comparison
// Fix: Use String(v.id) === String(vehicleId)
```

### Pattern 4: Listener Registry Missing
```javascript
// Console Output:
"Cannot read properties of undefined (reading 'registerDOM')"

// Root Cause: listener-registry.js not loaded or loaded too late
// Fix: Ensure <script> in <head>, not at end of body
```

### Pattern 5: PDF Pagination Overflow
```javascript
// Console Output:
"✅ PDF erstellt erfolgreich"
// BUT: First page is cut off!

// Root Cause: Page-break check too late (y > 250)
// Fix: Earlier checks at y > 230, y > 220, y > 200
```

### Pattern 6: Firestore Security Rules Pattern Collision
```javascript
// Console Output:
"❌ Permission denied: Missing or insufficient permissions"

// Root Cause: Wildcard patterns match before specific patterns
// Bug Example (4h debugging!):
match /{chatCollection}/{id} { ... }         // Line 295 - matches FIRST
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 547 - NEVER REACHED!

// Fix: Order patterns TOP-TO-BOTTOM (specific → general)
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 63 - FIRST
match /{bonusCollection}/{id} { ... }         // Line 72 - SECOND
match /{chatCollection}/{id} { ... }          // Line 295 - LAST

// Lesson: Pattern order is CRITICAL in Firestore Rules!
```

### Pattern 7: Field Name Inconsistency
```javascript
// Console Output:
"✅ Fahrzeug created successfully"
// BUT: Status updates don't sync to Partner Portal!

// Root Cause: Different field names in creation paths
// Partner path: anfrageId
// Admin path: partnerAnfrageId
// Result: Status sync broken!

// Fix: Standardize field names across ALL creation paths
const fahrzeugData = {
    partnerAnfrageId: anfrageId,  // ✅ Standardized everywhere
    // ...
};
```

### Pattern 8: Duplicate Vehicle Creation
```javascript
// Console Output:
"✅ Fahrzeug created" (x2 in different tabs)
// Result: Double Kanban entries!

// Root Cause: No duplicate prevention in Admin creation path
// Fix: 3-Layer Duplicate Check
// Layer 1: Check anfrage.fahrzeugAngelegt flag
// Layer 2: Query by partnerAnfrageId
// Layer 3: Query by kennzeichen
```

### Pattern 9: Service Worker Response Errors
```javascript
// Console Output:
"❌ Failed to convert value to 'Response'"
"❌ Background update failed: https://www.google.com/images/cleardot.gif"

// Root Cause: staleWhileRevalidate catch block returned undefined
// Fix: Return valid Response object in catch
return new Response('Network error', {
    status: 408,
    statusText: 'Request Timeout',
    headers: { 'Content-Type': 'text/plain' }
});
```

### Pattern 10: Firestore Composite Index Missing
```javascript
// Console Output:
"❌ Fehler beim Erstellen der PDF: The query requires an index.
You can create it here: [Firebase Console link]"

// Root Cause: Multiple where clauses on different fields require Index
// Example: zeiterfassung PDF export
.where('mitarbeiterId', '==', X)
.where('datum', '>=', Y)
.where('datum', '<=', Z)
.where('status', '==', 'completed')

// Fix: Create Composite Index in Firebase Console
// Fields: mitarbeiterId (ASC), status (ASC), datum (ASC)
```

### Pattern 11: Nested Transaction Problem
```javascript
// Console Output:
"✅ Rechnung erstellt: RE-2025-11-0042"
// BUT: Sometimes transaction fails or creates duplicates!

// Root Cause: Calling transaction INSIDE another transaction
// Bug Example (kanban.html, 2h debugging!):
await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(fahrzeugRef);

    // ❌ NESTED TRANSACTION!
    if (newStatus === 'fertig') {
        const rechnungData = await autoCreateRechnung(fahrzeugId, fahrzeugData);
        // autoCreateRechnung() calls generateUniqueRechnungsnummer()
        // which starts its OWN transaction → NESTED!
    }

    transaction.update(fahrzeugRef, updateData);
});

// Fix: Execute invoice creation BEFORE main transaction
let rechnungData = null;
if (newStatus === 'fertig') {
    rechnungData = await autoCreateRechnung(fahrzeugId, fahrzeugData);
    if (rechnungData) {
        updateData.rechnung = rechnungData;
    }
}

// THEN start main transaction with prepared updateData
await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(fahrzeugRef);
    transaction.update(fahrzeugRef, updateData);
});

// Lesson: NEVER call functions that start transactions INSIDE a transaction!
```

### Pattern 12: Counter Security Rules Missing
```javascript
// Console Output:
"❌ Permission denied: Missing or insufficient permissions (counter update)"
"❌ Fehler beim Erstellen der Rechnung"

// Root Cause: Firestore collection `counters_{werkstattId}` had NO Security Rules!
// Result: ALL invoice creation attempts fail with Permission Denied
// Debugging Time: 1-2h

// Fix: Add Counter Security Rules (firestore.rules)
match /{countersCollection}/{counterId} {
    allow read: if countersCollection.matches('counters_.*')
                && isAdmin();
    allow create, update: if countersCollection.matches('counters_.*')
                          && isAdmin();
}

// Lesson: When adding new collections, ALWAYS add Security Rules IMMEDIATELY!
```

### Pattern 13: Mobile Media Query Breakpoint Gap
```javascript
// Console Output: No errors!
// BUT: User reports "Buttons sind abgeschnitten" with screenshot showing 465px device

// Root Cause: Media Query only triggered at ≤400px
@media (max-width: 400px) {
    .header-actions { display: grid; }
}

// Problem: 465px falls between 400px and 768px = NO MATCH = Desktop styles!
// Result: Buttons in horizontal flex-row with ~67px per button → Text cut off

// Fix: Increase breakpoint to cover gap
@media (max-width: 520px) {  // Now covers 400px-520px devices
    .header-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
    .btn {
        flex: none;  // ✅ CRITICAL: Reset flex:1 from 768px query
        font-size: 10px;
        padding: 6px 8px;
    }
}

// Lesson: Test BETWEEN breakpoints (393px, 450px, 500px, 768px)
```

### Pattern 14: Dark Mode Opacity Too Low
```javascript
// Console Output: No errors!
// BUT: User reports "im darkmode sind die schriften schwerlesbar"

// Root Cause: Text opacity too low on dark background
:root {
    --text-primary: rgba(255,255,255,0.9);    // 12.3:1 - OK but not great
    --text-secondary: rgba(255,255,255,0.6);  // 3.5:1 - WCAG FAIL!
}

// WCAG Standards: AA = 4.5:1, AAA = 7:1
// Opacity 0.6 on dark background = 3.5:1 = FAIL!

// Fix: Increase opacity for better contrast
[data-theme="dark"] {
    --text-primary: rgba(255,255,255,0.95);   // 13.5:1 - AAA ✅
    --text-secondary: rgba(255,255,255,0.75); // 10.2:1 - AAA ✅
}

// Lesson: ALWAYS test Dark Mode with WCAG contrast checker (7:1+ for AAA)
```

### Pattern 15: Storage Rules Missing
```javascript
// Console Output:
"❌ POST https://firebasestorage.googleapis.com/.../material_photos/req_123_1699876543.jpg 403 (Forbidden)"
"❌ Firebase Storage: User does not have permission to access 'material_photos/req_123_1699876543.jpg'"

// Root Cause: storage.rules file has NO match block for the upload path
// Note: Storage Rules are SEPARATE from Firestore Rules!
// Deployment: firebase deploy --only storage (NOT --only firestore!)

// Fix: Add Storage Rules with role-based access control
match /material_photos/{requestId}/{fileName} {
  allow read: if true;  // Public read
  allow write: if request.auth != null
               && request.resource.size < 10 * 1024 * 1024  // Max 10 MB
               && (request.auth.token.role == 'admin'
                   || request.auth.token.role == 'werkstatt');
}

// Deploy Command:
firebase deploy --only storage  // ✅ Correct
firebase deploy --only firestore  // ❌ Wrong - won't deploy storage.rules!

// Lesson: Storage Rules ≠ Firestore Rules (separate files, separate deployment)
```

### Pattern 16: Path Structure Must Match Security Rules
```javascript
// Console Output:
"❌ POST https://firebasestorage.googleapis.com/.../material_photos/req_123_1699876543.jpg 403"
// Still 403 AFTER deploying Storage Rules!

// Root Cause: Upload path structure doesn't match Security Rules pattern
// Upload code: 1-level path
const fileName = `material_photos/${requestId}_${timestamp}.jpg`;
// → material_photos/req_123_1699876543.jpg (1 level)

// Security Rule: 2-level path
match /material_photos/{requestId}/{fileName} { ... }
// → material_photos/{requestId}/{fileName} (2 levels)

// Result: Path doesn't match → Rule doesn't apply → 403!

// Fix: Align upload path with Security Rule structure
const fileName = `material_photos/${requestId}/${timestamp}.jpg`;
// → material_photos/req_123/1699876543.jpg (2 levels - MATCHES!)

// Lesson: Path structure MUST EXACTLY match Security Rules patterns
```

### Pattern 17: CollectionReference vs String Type Error
```javascript
// Console Output:
"❌ TypeError: n.indexOf is not a function"
// Very cryptic error from Firebase SDK internals!

// Root Cause: window.getCollection() returns CollectionReference, NOT string
const materialCollection = window.getCollection('materialRequests');
// → materialCollection is CollectionReference object (has methods like .doc(), .add())

// Bug Example: Double-wrapping CollectionReference
const docRef = db.collection(materialCollection).doc(requestId);
// ❌ db.collection() expects STRING, but got CollectionReference object!

// Fix: Use CollectionReference directly (no wrapping)
const docRef = window.getCollection('materialRequests').doc(requestId);
// ✅ window.getCollection() already returns CollectionReference!

// Lesson: window.getCollection() returns CollectionReference, NOT string
```

### Pattern 18: Function Existence Verification
```javascript
// Console Output:
"❌ ReferenceError: loadMaterialRequests is not defined"
// at material.html:2501

// Root Cause: Function call to non-existent function
await loadMaterialRequests();  // ❌ This function doesn't exist!

// Fix: Verify function existence before calling
// Method 1: Search codebase for function definition
grep -r "function loadMaterialRequests" .
grep -r "const loadMaterialRequests" .
// → No results = Function doesn't exist!

// Method 2: Find similar/correct function name
grep -r "MaterialRequests" material.html
// → Found: setupMaterialRequestsListener() at line 2204

// Correct Code:
setupMaterialRequestsListener();  // ✅ This function exists!

// Lesson: ALWAYS verify function existence with grep/search before calling
```

### Pattern 19: ⚠️ RESERVED (Future Pattern)

### Pattern 20: ⚠️ RESERVED (Future Pattern)

### Pattern 21: Multi-Service serviceTyp Overwrite 🔴 CRITICAL!

**Symptom:**
- Multi-Service vehicle loses primary service during Kanban drag & drop
- Example: Primary="lackier" + Additional="reifen"
- After dragging "reifen" through Kanban, serviceTyp changes to "reifen"
- "lackier" disappears from frontend (DATA LOSS!)

**Root Cause:**
- kanban.html Line 3935: Auto-Tab-Switch feature overwrote `fahrzeug.serviceTyp`
- Code: `await window.getCollection('fahrzeuge').doc(id).update({ serviceTyp: newServiceTyp })`
- Critical field was being mutated instead of kept READ-ONLY

**Why Critical:**
- **Data Loss:** Primary service permanently lost
- **Multi-Service Architecture Broken:** serviceTyp is the PRIMARY service identifier
- **User Impact:** "dass ist ein massiver broken für die app !!"

**3-Layer Defense Architecture:**

**Layer 1: Kanban Board Protection (kanban.html)**
```javascript
// READ-ONLY Enforcement Pattern
async function directStatusUpdate(fahrzeugId, newStatus) {
    const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
    if (!fahrzeug) return;

    // 🛡️ CRITICAL: Store original serviceTyp to prevent overwriting
    const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

    // ... function logic (200+ lines) ...

    // 🛡️ Detect corruption
    if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
        console.error('❌ CRITICAL: serviceTyp was modified!');
        console.error(`   Original: "${ORIGINAL_SERVICE_TYP}"`);
        console.error(`   Modified to: "${fahrzeug.serviceTyp}"`);
        console.error('   → Restoring original value');

        fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;  // Auto-restore
    }

    // 🛡️ Use READ-ONLY value in Firestore update
    const updateData = {
        status: newStatus,
        serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP),  // ✅ READ-ONLY
        additionalServices: fahrzeug.additionalServices || [],
        // ... other fields ...
    };

    await db.runTransaction(async (transaction) => {
        transaction.update(fahrzeugRef, updateData);
    });
}
```

**Layer 2: Partner-App Validation (all 7 forms)**
```javascript
// 🛡️ validateServiceTyp() - Auto-correction for invalid types
function validateServiceTyp(serviceTyp) {
    const validTypes = [
        'lackier', 'reifen', 'mechanik', 'pflege', 'tuev',
        'versicherung', 'glas', 'klima', 'dellen', 'folierung',
        'steinschutz', 'werbebeklebung'
    ];

    const serviceTypMap = {
        'lackschutz': 'steinschutz',   // ⚡ CRITICAL: lackschutz is INVALID
        'lackierung': 'lackier',
        'smart-repair': 'dellen',
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

// Usage in ALL 7 partner-app forms:
// 🛡️ DEFENSE IN DEPTH: Validate serviceTyp before saving
anfrageData.serviceTyp = validateServiceTyp(anfrageData.serviceTyp);
await window.getCollection('partnerAnfragen').doc(anfrageId).set(anfrageData);
```

**Layer 3: Comprehensive Audit (15+ files)**
- Audited ALL files for serviceTyp overwrites
- Found 0 dangerous overwrites after fixes
- Verified system-wide consistency

**Architecture Clarification:**

| Field | Mutability | Purpose | Where Set |
|-------|-----------|---------|-----------|
| `serviceTyp` | **IMMUTABLE** | Primary service identifier | Vehicle creation ONLY |
| `additionalServices[]` | **MUTABLE** | Additional services array | Anytime |
| `currentProcess` | **UI-ONLY** | Active tab state | Not persisted |
| `serviceStatuses{}` | **MUTABLE** | Status progression tracking | Kanban updates |

**Prevention Rules:**
1. **NEVER** update `fahrzeug.serviceTyp` after creation
2. **ALWAYS** use READ-ONLY pattern when accessing serviceTyp in update functions
3. **ALWAYS** validate serviceTyp before .set() operations
4. **ALWAYS** audit system-wide for consistency when fixing critical bugs

**Files Modified:**
- kanban.html (Lines 3923-3936 DELETED, Lines 4329-4594 ADDED)
- anfrage.html (Lines 508-543, 1255-1256 ADDED)
- mechanik-anfrage.html, reifen-anfrage.html, glas-anfrage.html, tuev-anfrage.html, versicherung-anfrage.html, multi-service-anfrage.html (same pattern)

**Commits:**
- `750d7b2` - Fix: Multi-Service serviceTyp overwrite in Kanban
- `7083778` - Defense in Depth: validateServiceTyp() in all 7 partner-app forms
- `bf407b9` - Docs: CLAUDE.md v8.0 with Pattern 21

**Debugging Time:** 3-4h (User report → Root cause → System-wide fix + audit + docs)

**Lesson Learned:**
- Immutability constraints MUST be enforced with READ-ONLY patterns, not just documentation
- Defense in Depth is CRITICAL for data integrity (single layer = insufficient)
- System-wide audits prevent "fixed here, but broken there" scenarios

### Pattern 22: File Upload Validation Missing (Security Vulnerability)

**Symptom:**
```javascript
// Console Output: (Fehlt komplett - keine Validation-Logs!)
// User uploads .exe file → Upload succeeds
// User uploads 500MB file → Upload succeeds

// Security Risk:
// - Malware uploads (EXE, BAT, scripts)
// - Storage quota exhaustion (1GB+ files)
// - XSS attacks via SVG uploads
// - No user feedback for invalid files
```

**Root Cause:**
- **Missing client-side MIME type validation** before Firebase Storage upload
- No file size limits enforced
- Upload code directly uploads Blob without validation:
  ```javascript
  // BAD: No validation
  const blob = await response.blob();
  await storageRef.put(blob);  // ❌ Accepts ANY file type
  ```

**Impact:** 🔴 **CRITICAL** - Security Vulnerability
- Malicious users can upload executable files disguised as images
- Large files can crash app or exceed Firebase Storage quotas
- No user feedback when invalid files are uploaded
- Potential for XSS attacks via SVG with embedded JavaScript

**Fix:** Implement 2-Layer Defense-in-Depth Validation

**Layer 1: Image Upload Validation (9 Partner-Service-Forms)**
```javascript
// FIX: Client-side validation function
window.validateImageFile = function(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (!file) {
        throw new Error('❌ Keine Datei ausgewählt!');
    }

    // MIME type whitelist check
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`❌ Ungültiger Dateityp!\n\nErlaubt: JPEG, PNG, WebP\nDein Typ: ${file.type || 'unbekannt'}`);
    }

    // File size limit check
    if (file.size > maxSize) {
        throw new Error(`❌ Datei zu groß!\n\nMaximum: 10 MB\nDeine Größe: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('✅ [validateImageFile] Datei validiert:', {
        type: file.type,
        sizeMB: (file.size / 1024 / 1024).toFixed(2)
    });

    return { isValid: true };
};

// Usage before upload
try {
    window.validateImageFile(blob);
} catch (validationError) {
    console.error('❌ [UPLOAD] Validation failed:', validationError.message);
    alert(validationError.message);
    return; // Stop upload
}

await storageRef.put(blob);
```

**Layer 2: PDF Upload Validation (annahme.html)**
```javascript
// FIX: PDF-specific validation function
window.validatePDFFile = function(file) {
    const allowedType = 'application/pdf';
    const maxSize = 50 * 1024 * 1024; // 50 MB

    if (!file) {
        throw new Error('❌ Keine PDF-Datei!');
    }

    if (file.type !== allowedType) {
        throw new Error(`❌ Nur PDF erlaubt!\n\nDein Typ: ${file.type || 'unbekannt'}`);
    }

    if (file.size > maxSize) {
        throw new Error(`❌ PDF zu groß!\n\nMaximum: 50 MB\nDeine Größe: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    return { isValid: true };
};
```

**Files Modified:**
- annahme.html (Lines ~11-39: validatePDFFile, Lines ~3032-3040, ~3093-3101: Usage)
- partner-app/pflege-anfrage.html (Lines ~1290-1320: validateImageFile, ~1607: Usage)
- partner-app/mechanik-anfrage.html (same pattern)
- partner-app/glas-anfrage.html (same pattern)
- partner-app/reifen-anfrage.html (same pattern)
- partner-app/tuev-anfrage.html (same pattern)
- partner-app/versicherung-anfrage.html (same pattern)
- partner-app/folierung-anfrage.html (same pattern)
- partner-app/steinschutz-anfrage.html (same pattern)
- partner-app/werbebeklebung-anfrage.html (same pattern)

**Commits:**
- `0bf67cc` - File upload validation - pflege-anfrage.html
- `97cd499` - File upload validation - mechanik-anfrage.html
- `63af4a7` - File upload validation - glas-anfrage.html
- `d8dd242` - File upload validation - reifen-anfrage.html
- `25daea9` - File upload validation - tuev-anfrage.html
- `6fa6456` - File upload validation - versicherung-anfrage.html
- `85456e4` - File upload validation - folierung-anfrage.html
- `dea87c5` - File upload validation - steinschutz-anfrage.html
- `2a421b8` - File upload validation - werbebeklebung-anfrage.html
- `e5f7bcf` - PDF upload validation - annahme.html

**Testing:**
- ✅ 12/12 Smoke Tests passed (Chromium, Mobile Chrome, Tablet iPad)
- ✅ annahme.html: Form load, fields editable, dropdowns, submit button
- ✅ No JavaScript errors
- ✅ Graceful error handling verified

**Debugging Time:** 4-5h (Backup → MIME research → Risk assessment → Implementation → Testing → Documentation)

**Lesson Learned - Backup-First Security Methodology:**
1. **ALWAYS create backup branch BEFORE security fixes** (`backup-before-phase1-fixes`)
2. **ALWAYS research MIME types BEFORE implementing validation** (don't assume)
3. **ALWAYS conduct risk assessment** (identify potential breaking changes)
4. **ALWAYS implement systematically** (core logic once, reuse across files)
5. **ALWAYS use individual commits per file** (granular rollback capability)
6. **ALWAYS run pre-push verification** (tests + documentation + review)
7. **ALWAYS question/validate** ("dich hinterfrägst" - User's emphasis on careful approach)

**Defense-in-Depth Layers:**
- **Client-Side:** JavaScript validation (fast user feedback) ← This fix
- **Server-Side:** Firebase Storage Rules (ultimate security boundary)

---

## 🛡️ Security Validation Patterns & Backup-First Methodology

Diese Section dokumentiert die **Backup-First Security Methodology** aus Session 2025-11-15 (Phase 1 Security Fixes). Zukünftige Agents sollten diese Patterns für alle Security-relevanten Änderungen befolgen.

### Pre-Implementation Security Checklist

**BEFORE implementing security fixes, ALWAYS complete this checklist:**

```markdown
**Pre-Implementation Checklist:**
- [ ] **Backup Branch Created:** git checkout -b backup-before-{phase}-{description}
- [ ] **MIME Types Researched:** Document all valid MIME types for feature
- [ ] **File Size Limits Defined:** Research realistic limits (10MB images, 50MB PDFs)
- [ ] **Risk Assessment Completed:** List potential breaking changes
- [ ] **Breaking Change Mitigation:** Plan how to handle edge cases
- [ ] **Test Strategy Defined:** Which tests to run? When to run them?
- [ ] **Rollback Strategy Ready:** How to revert if something breaks?
- [ ] **User Communication Plan:** How to explain approach and risks?
```

**Example (Phase 1 Security Fixes):**
```bash
✅ Backup: backup-before-phase1-fixes
✅ MIME Research: image/jpeg, image/png, image/webp (images); application/pdf (PDFs)
✅ Size Limits: 10MB (images), 50MB (PDFs)
✅ Risk Assessment: Potential to reject some image formats (e.g., HEIC)
✅ Mitigation: Use broad whitelist (JPEG, PNG, WebP covers 99% of cases)
✅ Test Strategy: Smoke tests after all 10 files
✅ Rollback: git reset --hard backup-before-phase1-fixes
✅ Communication: "Backup-First approach, systematic, careful, verified"
```

---

### Backup Strategy Pattern

**When to Create Backup Branches:**
- **Security Fixes** (any security-related code change)
- **Breaking Changes** (changes that could break existing functionality)
- **Multi-File Modifications** (10+ files being modified)
- **Data Structure Changes** (schema migrations, field renames)
- **Critical Bug Fixes** (high-impact bugs with complex fixes)

**Naming Convention:**
```bash
backup-before-{phase}-{short-description}

Examples:
✅ backup-before-phase1-fixes
✅ backup-before-schema-migration
✅ backup-before-multi-tenant-refactor
❌ backup-20251115  # Too generic
❌ temp-backup      # Not descriptive
```

**How to Create:**
```bash
# STEP 1: Create backup branch
git checkout -b backup-before-phase1-fixes

# STEP 2: Push to remote (optional but recommended)
git push origin backup-before-phase1-fixes

# STEP 3: Return to main
git checkout main

# STEP 4: Now safe to make risky changes
# ... implement changes ...

# STEP 5 (IF NEEDED): Rollback
git reset --hard backup-before-phase1-fixes
git push --force origin main  # Only if already pushed broken code
```

**Rollback Decision Tree:**
```
Change deployed → Tests failing? → YES → Rollback immediately
                                 → NO → Monitor for 24h → Issues? → YES → Rollback
                                                                    → NO → Delete backup branch after 1 week
```

---

### Multi-File Implementation Methodology

**When modifying 10+ files systematically (e.g., adding validation to 9 partner forms):**

**STEP 1: Create Core Logic Once**
```javascript
// Create reusable validation function
window.validateImageFile = function(file) {
    // ... validation logic ...
};
```

**STEP 2: Test Core Logic**
- Create test file with validation function
- Test with different file types (valid & invalid)
- Verify error messages are user-friendly

**STEP 3: Implement Systematically**
- **DO:** Implement in batches (e.g., 3 files → test → 3 more files → test)
- **DO:** Individual commit per file (granular rollback)
- **DO:** Copy-paste exact same code (consistency)
- **DON'T:** Modify all files at once (risky)
- **DON'T:** Bulk commit (hard to rollback individual files)

**Example Commit Pattern (Phase 1):**
```bash
git commit -m "fix: File upload validation - pflege-anfrage.html"
git commit -m "fix: File upload validation - mechanik-anfrage.html"
git commit -m "fix: File upload validation - glas-anfrage.html"
# ... 7 more individual commits ...
git commit -m "fix: PDF upload validation - annahme.html"
```

**STEP 4: Intermediate Testing**
```bash
# After every 3-5 files:
npm run test:all

# Expected: 100% pass rate
# If failures: Rollback last 3 files, investigate, fix, retry
```

---

### Pre-Push Verification Checklist

**MANDATORY checklist BEFORE pushing security fixes to GitHub:**

```markdown
**Pre-Push Verification (MANDATORY):**
- [ ] **All tests pass:** npm run test:all → 100% success rate
- [ ] **All files reviewed:** No accidental changes (use git diff)
- [ ] **Commit messages clear:** Each commit explains what/why
- [ ] **Backup branch exists:** Can rollback if needed
- [ ] **Documentation updated:** CLAUDE.md, NEXT_AGENT, etc.
- [ ] **Risk assessment documented:** Commit message includes potential risks
- [ ] **No breaking changes:** Verified existing features still work
- [ ] **User feedback implemented:** Error messages clear & helpful (German)
```

**Example (Phase 1 Pre-Push Verification):**
```bash
✅ Tests: 12/12 smoke tests passed (Chromium, Mobile Chrome, Tablet iPad)
✅ Files: git diff origin/main --stat → 10 files, 400 insertions, 0 deletions
✅ Commits: 10 individual commits with clear messages
✅ Backup: backup-before-phase1-fixes created & pushed
✅ Docs: CLAUDE.md updated with RECENT FIX section
✅ Risk: No breaking changes - validation is additive only
✅ Existing: annahme.html, liste.html, kanban.html all working
✅ UX: German error messages tested
```

**If ANY item fails → DO NOT PUSH. Fix first, then re-verify.**

---

### MIME Type Verification Pattern

**BEFORE implementing file upload validation, ALWAYS verify MIME types:**

**Why?**
- Different browsers may report different MIME types for same file
- Some file formats have multiple valid MIME types
- Assuming MIME types can lead to rejecting valid files

**How to Verify:**
```javascript
// STEP 1: Create test HTML file
const input = document.createElement('input');
input.type = 'file';
input.onchange = (e) => {
    const file = e.target.files[0];
    console.log('File:', file.name);
    console.log('MIME Type:', file.type);
    console.log('Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
};
document.body.appendChild(input);

// STEP 2: Upload test files
// - .jpg → image/jpeg
// - .png → image/png
// - .gif → image/gif
// - .webp → image/webp
// - .pdf → application/pdf

// STEP 3: Document findings
// Supported MIME types: image/jpeg, image/png, image/webp, application/pdf
```

**Common MIME Types Reference:**
| File Type | Extension | MIME Type | Notes |
|-----------|-----------|-----------|-------|
| JPEG Image | .jpg, .jpeg | `image/jpeg` | Most common image format |
| PNG Image | .png | `image/png` | Lossless compression |
| WebP Image | .webp | `image/webp` | Modern format, good compression |
| GIF Image | .gif | `image/gif` | Animated images |
| PDF Document | .pdf | `application/pdf` | Document format |
| SVG Image | .svg | `image/svg+xml` | ⚠️ **SECURITY RISK:** Can contain JavaScript |

**Security Note:**
- **NEVER allow `image/svg+xml`** without server-side sanitization (XSS risk)
- **ALWAYS use whitelist** (allowed types) NOT blacklist (blocked types)
- **ALWAYS verify MIME type** AND file extension (double-check)

---

### Risk Assessment Methodology

**When planning risky changes (security fixes, breaking changes), conduct thorough risk assessment:**

**Template:**
```markdown
## Risk Assessment: [Feature Name]

### Potential Risks:
1. **Breaking Change Risk:** [Will this break existing functionality?]
   - Impact: [Low/Medium/High]
   - Mitigation: [How to prevent?]

2. **Data Loss Risk:** [Could this cause data loss?]
   - Impact: [Low/Medium/High]
   - Mitigation: [Backup strategy?]

3. **User Experience Risk:** [Will users be confused?]
   - Impact: [Low/Medium/High]
   - Mitigation: [Clear error messages, documentation]

4. **Performance Risk:** [Will this slow down the app?]
   - Impact: [Low/Medium/High]
   - Mitigation: [Benchmarking, optimization]

### Rollback Strategy:
- **Backup Branch:** [Name of backup branch]
- **Rollback Command:** `git reset --hard [branch]`
- **Time to Rollback:** [Estimated minutes]

### Acceptance Criteria:
- [ ] All tests pass
- [ ] No console errors
- [ ] User feedback is clear
- [ ] Performance is acceptable
```

**Example (Phase 1 Security Fixes):**
```markdown
## Risk Assessment: File Upload Validation

### Potential Risks:
1. **Breaking Change Risk:** Rejecting currently valid files
   - Impact: Medium (some users may use unsupported formats)
   - Mitigation: Broad whitelist (JPEG, PNG, WebP = 99% coverage)

2. **Data Loss Risk:** None (validation is pre-upload)
   - Impact: Low
   - Mitigation: N/A

3. **User Experience Risk:** Confusing error messages
   - Impact: Low
   - Mitigation: German messages with clear examples

4. **Performance Risk:** Minimal (client-side validation is fast)
   - Impact: Low
   - Mitigation: N/A

### Rollback Strategy:
- **Backup Branch:** backup-before-phase1-fixes
- **Rollback Command:** git reset --hard backup-before-phase1-fixes
- **Time to Rollback:** < 5 minutes

### Acceptance Criteria:
- [x] All 12 smoke tests pass
- [x] No console errors
- [x] German error messages tested
- [x] Upload speed unchanged
```

---

## 🏗️ Multi-Service Architecture Constraints

### Core Principles

**Multi-Service Architecture** enables vehicles to have MULTIPLE services (primary + additional):
- **Primary Service:** `serviceTyp` field (IMMUTABLE after creation)
- **Additional Services:** `additionalServices[]` array (MUTABLE)
- **Status Tracking:** `serviceStatuses{}` object (tracks status for ALL services)

**Critical Constraint:** `serviceTyp` is the PRIMARY service identifier and MUST NEVER change after vehicle creation.

### Field Definitions

```javascript
// Vehicle Data Structure
const fahrzeugData = {
    // PRIMARY SERVICE (IMMUTABLE) - Set ONCE at creation, NEVER changed
    serviceTyp: 'lackier',  // One of 12 valid types

    // ADDITIONAL SERVICES (MUTABLE) - Can be added/removed anytime
    additionalServices: ['reifen', 'pflege'],  // Array of service types

    // STATUS TRACKING (MUTABLE) - Tracks ALL services
    serviceStatuses: {
        'lackier': 'begutachtung',  // Primary service status
        'reifen': 'terminiert',     // Additional service status
        'pflege': 'neu'             // Additional service status
    },

    // UI STATE (NOT PERSISTED) - Active tab in Kanban
    currentProcess: 'lackier',  // Which service tab is active (UI-only)

    // Other fields...
};
```

### Valid Service Types (12 Total)

```javascript
const VALID_SERVICE_TYPES = [
    'lackier',        // Lackierung (Painting)
    'reifen',         // Reifen (Tires)
    'mechanik',       // Mechanik (Mechanics)
    'pflege',         // Pflege (Detailing)
    'tuev',           // TÜV (Inspection)
    'versicherung',   // Versicherung (Insurance)
    'glas',           // Glas (Glass)
    'klima',          // Klima (AC)
    'dellen',         // Dellen (Dent Repair)
    'folierung',      // Folierung (Wrapping)
    'steinschutz',    // Steinschutz (Stone Protection)
    'werbebeklebung'  // Werbebeklebung (Advertising Decals)
];
```

### Immutability Enforcement Pattern

**ALWAYS use this pattern when updating vehicles in functions:**

```javascript
async function updateVehicle(fahrzeugId) {
    const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
    if (!fahrzeug) return;

    // 🛡️ STEP 1: Store ORIGINAL serviceTyp (READ-ONLY constant)
    const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

    // ... function logic (may span 200+ lines) ...

    // 🛡️ STEP 2: Detect corruption (if serviceTyp was modified)
    if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
        console.error('❌ CRITICAL: serviceTyp was modified during function execution!');
        console.error(`   Original: "${ORIGINAL_SERVICE_TYP}"`);
        console.error(`   Modified to: "${fahrzeug.serviceTyp}"`);
        console.error('   → Restoring original value');

        fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;  // Auto-restore
    }

    // 🛡️ STEP 3: Use READ-ONLY value in Firestore update
    const updateData = {
        serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP),  // ✅ Use constant
        additionalServices: fahrzeug.additionalServices || [],  // ✅ Can change
        // ... other mutable fields ...
    };

    await db.runTransaction(async (transaction) => {
        transaction.update(fahrzeugRef, updateData);
    });
}
```

### Auto-Correction Pattern (validateServiceTyp)

**ALWAYS validate serviceTyp before .set() operations:**

```javascript
// Before saving to Firestore
anfrageData.serviceTyp = validateServiceTyp(anfrageData.serviceTyp);
await window.getCollection('partnerAnfragen').doc(id).set(anfrageData);

// validateServiceTyp() function (must exist in EVERY file that saves vehicles)
function validateServiceTyp(serviceTyp) {
    const validTypes = [
        'lackier', 'reifen', 'mechanik', 'pflege', 'tuev',
        'versicherung', 'glas', 'klima', 'dellen', 'folierung',
        'steinschutz', 'werbebeklebung'
    ];

    // Map invalid/legacy types to valid types
    const serviceTypMap = {
        'lackschutz': 'steinschutz',   // ⚡ CRITICAL: lackschutz is INVALID
        'lackierung': 'lackier',
        'smart-repair': 'dellen',
        'smartrepair': 'dellen',
        'pdr': 'dellen',
        'aufbereitung': 'pflege',
        'tüv': 'tuev',
        'tauv': 'tuev',
        'karosserie': 'lackier',
        'unfall': 'versicherung'
    };

    let correctedTyp = serviceTypMap[serviceTyp] || serviceTyp;

    if (!validTypes.includes(correctedTyp)) {
        console.error(`❌ INVALID serviceTyp: "${serviceTyp}" → Fallback: "lackier"`);
        return 'lackier';  // Safe fallback
    }

    if (correctedTyp !== serviceTyp) {
        console.warn(`🔧 AUTO-FIX serviceTyp: "${serviceTyp}" → "${correctedTyp}"`);
    }

    return correctedTyp;
}
```

### Code Patterns to NEVER Use

**❌ NEVER directly overwrite serviceTyp:**
```javascript
// ❌ BAD - Direct overwrite
fahrzeug.serviceTyp = 'reifen';
await window.getCollection('fahrzeuge').doc(id).update({ serviceTyp: 'reifen' });

// ✅ GOOD - Use READ-ONLY pattern
const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;
// ... function logic ...
await window.getCollection('fahrzeuge').doc(id).update({
    serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP)
});
```

**❌ NEVER conditionally change serviceTyp:**
```javascript
// ❌ BAD - Conditional mutation
if (someCondition) {
    fahrzeug.serviceTyp = 'newValue';
}

// ✅ GOOD - serviceTyp is NEVER mutated
// Only additionalServices[] can be mutated
if (someCondition) {
    fahrzeug.additionalServices.push('newService');
}
```

### Testing Checklist for Multi-Service Changes

When modifying ANY code that touches vehicles:

- [ ] Does this code access `fahrzeug.serviceTyp`?
- [ ] If yes, is it READ-ONLY (stored in constant, never reassigned)?
- [ ] Does this code call `.update()` or `.set()` on vehicle documents?
- [ ] If yes, does it use `validateServiceTyp(ORIGINAL_SERVICE_TYP)`?
- [ ] Does this code add/remove services?
- [ ] If yes, does it modify `additionalServices[]` (NOT serviceTyp)?
- [ ] Run Hybrid Tests to verify no regressions: `npm run test:all`

---

## 🧪 Hybrid Testing Approach (2025-11-09)

### Testing Philosophy

**Manual testing is OBSOLETE.** After 17 failed UI E2E test attempts, we pivoted to **Hybrid Testing Approach** with 100% success rate.

**Hybrid Testing = Integration Tests (Firestore) + Smoke Tests (UI)**

**Benefits:**
- ✅ **Fast:** <2s per Integration Test (vs 30s+ for UI E2E)
- ✅ **Reliable:** 100% success rate on primary browsers (vs 0% for UI E2E)
- ✅ **Maintainable:** Tests business logic directly, not fragile UI interactions
- ✅ **Comprehensive:** 23 tests covering critical workflows

### Test Coverage (23 Tests Total)

**Integration Tests (10 tests):**
- Vehicle Creation & Customer Registration
- Status Updates & Multi-Tenant Isolation
- Service-Specific Data Capture
- Partner-Werkstatt Status Sync
- Direct Firestore testing (bypasses UI, tests business logic)

**Smoke Tests (13 tests):**
- annahme.html - Form visibility & editability
- liste.html - Table structure & filters
- kanban.html - Process selector & columns
- kunden.html - Customer table
- index.html - Main menu navigation
- Dark mode toggle
- Firebase initialization

### Test Results (Current)

| Browser | Pass Rate | Tests Passed |
|---------|-----------|--------------|
| **Chromium** | ✅ 100% | 23/23 |
| **Mobile Chrome** | ✅ 100% | 23/23 |
| **Tablet iPad** | ✅ 100% | 23/23 |
| Firefox | ⚠️ 69% | 16/23 (known issues) |
| Mobile Safari | ⚠️ 74% | 17/23 (known issues) |

**Primary Browsers:** Chromium, Mobile Chrome, Tablet iPad (100% success required)
**Secondary Browsers:** Firefox, Mobile Safari (best-effort support)

### Test Commands (package.json)

```bash
# ALWAYS run tests BEFORE making changes
npm run test:all              # ✅ RECOMMENDED: All 23 tests (~46s)
npm test                      # All tests (same as test:all)
npm run test:integration      # Integration tests only (10 tests)
npm run test:smoke            # Smoke tests only (13 tests)

# Development testing
npm run test:headed           # With browser UI (debugging)
npm run test:ui               # Playwright UI mode (interactive)
npm run test:debug            # Debug mode (step-through)

# Reporting
npm run test:report           # Show test report
```

### Firebase Emulator Setup (CRITICAL for Integration Tests)

**⚠️ Java 21+ Required for Firebase Emulators!**

```bash
# Verify Java installation FIRST
java -version  # Must show Java 21+
export JAVA_HOME=/opt/homebrew/opt/openjdk@21

# Start Firebase Emulators (Terminal 1)
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
firebase emulators:start --only firestore,storage,auth --project demo-test

# Emulator URLs:
# - Firestore: http://localhost:8080
# - Storage: http://localhost:9199
# - Auth: http://localhost:9099
# - Emulator UI: http://localhost:4000

# Run tests (Terminal 2)
npm run test:all
```

### Test Workflow (MANDATORY)

**BEFORE making ANY code changes:**
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
npm run test:all  # MUST show 23/23 passed on primary browsers
```

**AFTER making code changes:**
```bash
npm run test:all  # Verify no regressions introduced
```

**If tests fail:**
1. Investigate root cause (console logs, test output)
2. Fix broken tests OR fix app code
3. Re-run tests until 100% pass rate restored
4. NEVER commit code with failing tests

### Continuous Testing Mindset

**Testing is NOT optional.** It's part of the development workflow:

1. **Pull latest code** → `git pull`
2. **Run tests** → `npm run test:all` (verify baseline)
3. **Make changes** → Code/fix/refactor
4. **Run tests** → `npm run test:all` (verify no regressions)
5. **Commit** → `git add . && git commit -m "..."`
6. **Push** → `git push`

**If tests fail at step 2:** Fix tests FIRST before making changes
**If tests fail at step 4:** Fix regressions IMMEDIATELY before committing

---

## 📋 Agent Behavior Guidelines

### ALWAYS Do

✅ **ALWAYS run tests BEFORE making changes**
- `npm run test:all` must show 100% pass rate on primary browsers
- If tests fail, fix them FIRST before making any code changes
- Testing is NOT optional - it's part of the workflow

✅ **ALWAYS run tests AFTER making changes**
- Verify no regressions introduced
- If tests fail, fix immediately (don't accumulate failures)
- NEVER commit code with failing tests

✅ **ALWAYS use READ-ONLY pattern for serviceTyp**
- Store original value: `const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;`
- Detect corruption: Check if value changed during function execution
- Use original value in updates: `validateServiceTyp(ORIGINAL_SERVICE_TYP)`

✅ **ALWAYS validate serviceTyp before .set() operations**
- `anfrageData.serviceTyp = validateServiceTyp(anfrageData.serviceTyp);`
- Auto-correction for invalid/legacy types
- Prevents data corruption

✅ **ALWAYS audit system-wide when fixing critical bugs**
- Don't just fix the immediate problem
- Search ALL files for similar patterns (grep/search)
- Verify consistency across entire codebase

✅ **ALWAYS document patterns in CLAUDE.md**
- New bugs → New error patterns
- Critical fixes → Update session history
- Architectural changes → Update architecture section

✅ **ALWAYS use Defense in Depth**
- Single-layer protection is insufficient
- Implement multiple validation layers
- Example: Kanban Board + Partner-App validation

✅ **ALWAYS verify function existence before calling**
- Use grep/search to find function definition
- Check function location (same file? imported? global?)
- Common prefixes: load*, setup*, init*

✅ **ALWAYS use multi-phase debugging for complex errors**
- Fix → Deploy → Test → User Feedback → Next Fix
- Each phase reveals the NEXT layer of bugs
- Don't assume "one fix will solve everything"

✅ **ALWAYS distinguish Storage Rules vs Firestore Rules**
- storage.rules controls file upload/download (deployed with `firebase deploy --only storage`)
- firestore.rules controls database read/write (deployed with `firebase deploy --only firestore`)
- These are SEPARATE systems with SEPARATE deployment commands

✅ **ALWAYS test BETWEEN breakpoints for responsive design**
- Don't just test AT breakpoints (393px, 768px)
- Test BETWEEN breakpoints: 450px, 500px, 600px
- Media query gaps cause bugs

### NEVER Do

❌ **NEVER skip tests to "save time"**
- Bugs cost 10x more to fix later
- Tests take ~46 seconds, debugging takes hours
- 100% test success rate is non-negotiable

❌ **NEVER commit code with failing tests**
- Fix tests FIRST, then commit
- Accumulating failures leads to regression hell
- Every commit must maintain 100% pass rate

❌ **NEVER directly overwrite serviceTyp**
- `fahrzeug.serviceTyp = 'newValue';` ← FORBIDDEN
- Use READ-ONLY pattern instead
- See Pattern 21 above for correct approach

❌ **NEVER call functions that start transactions INSIDE another transaction**
- Nested transactions cause race conditions & duplicates
- Always prepare data BEFORE transaction
- See Pattern 11 above for correct approach

❌ **NEVER add new Firestore collections without Security Rules**
- Add rules IMMEDIATELY when creating collection
- Test with actual Firebase (Emulator ignores rules)
- See Pattern 12 above

❌ **NEVER wrap CollectionReference in db.collection()**
- `window.getCollection()` returns CollectionReference, NOT string
- Use directly: `.doc(id)`, `.add(data)`, `.where()`
- See Pattern 17 above

❌ **NEVER deploy Storage Rules with `firebase deploy --only firestore`**
- Storage Rules require `firebase deploy --only storage`
- Separate files, separate deployment commands
- See Pattern 15 above

❌ **NEVER use opacity <0.75 for text on dark backgrounds**
- WCAG AAA requires 7:1 contrast ratio
- Opacity 0.6 = 3.5:1 = FAIL
- See Pattern 14 above

❌ **NEVER assume paths match Security Rules without testing**
- 1-level vs 2-level paths are completely different
- Upload path MUST EXACTLY match Security Rule pattern
- See Pattern 16 above

### Decision Tree: When to Run Tests

```
┌─────────────────────────────────────┐
│ Starting ANY development work?      │
└─────────────┬───────────────────────┘
              │
              ▼
         Run tests FIRST
         (npm run test:all)
              │
              ▼
    ┌─────────────────────┐
    │ Tests pass 100%?    │
    └──────┬──────────────┘
           │
    ┌──────┴──────┐
    │ YES         │ NO
    ▼             ▼
Make changes   Fix tests FIRST
    │             │
    ▼             ▼
Run tests     Re-run tests
(verify)         (verify)
    │             │
    ▼             ▼
┌──────────┐  ┌──────────┐
│Tests pass│  │Tests pass│
│100%?     │  │100%?     │
└───┬──────┘  └───┬──────┘
    │             │
┌───┴───┐     ┌───┴───┐
│YES    │ NO  │YES    │ NO
▼       ▼     ▼       ▼
Commit  Fix   Continue  Fix
        │               │
        └───────────────┘
```

### When Making Code Changes

**Small Changes (<10 lines):**
1. Run tests BEFORE change
2. Make change
3. Run tests AFTER change
4. Commit if tests pass

**Medium Changes (10-50 lines):**
1. Run tests BEFORE change
2. Make changes incrementally
3. Run tests after EACH logical step
4. Commit when tests pass 100%

**Large Changes (50+ lines, new features):**
1. Run tests BEFORE starting
2. Plan implementation in phases
3. Implement Phase 1 → Run tests
4. Implement Phase 2 → Run tests
5. Continue until feature complete
6. Final test run → Commit

### When Tests Fail

**Step-by-Step Debugging:**

1. **Identify failing test:**
   - Read test output carefully
   - Note which test(s) failed
   - Check browser (Chromium/Mobile Chrome/iPad only)

2. **Investigate root cause:**
   - Read console logs from test
   - Check error message
   - Match to Error Patterns (1-21 above)

3. **Determine if bug is in test OR app:**
   - **Test bug:** Test expectations wrong (update test)
   - **App bug:** Code broken (fix code)
   - **Unclear:** Run test in headed mode (`npm run test:headed`)

4. **Fix the issue:**
   - Make minimal change to fix root cause
   - Don't "band-aid" - fix properly
   - Add comments explaining fix

5. **Re-run tests:**
   - `npm run test:all`
   - Verify 100% pass rate restored
   - If still failing, repeat from step 1

6. **Document pattern (if new):**
   - Add to Error Patterns section
   - Update CLAUDE.md
   - Help future agents avoid same bug

### Communication with User

**When user requests changes:**

1. **Acknowledge request:** "I'll [do task]. First, let me run tests to verify current state."
2. **Run tests:** `npm run test:all`
3. **Report results:** "Tests show 100% pass rate. Proceeding with [task]."
4. **Make changes:** Implement user's request
5. **Run tests again:** Verify no regressions
6. **Report completion:** "[Task] complete. Tests still show 100% pass rate. Ready to commit."

**When tests fail unexpectedly:**

1. **Don't panic:** "Tests are failing. Let me investigate."
2. **Investigate:** Follow debugging steps above
3. **Report findings:** "Found issue: [root cause]. Fixing now."
4. **Fix & verify:** Make fix, re-run tests
5. **Report resolution:** "Issue fixed. Tests now show 100% pass rate."

**When user wants to skip tests:**

1. **Advocate for testing:** "Running tests first helps catch regressions early. It only takes ~46 seconds."
2. **If user insists:** "Understood. I'll make the change, but I recommend running tests after to verify no issues."
3. **Run tests anyway:** After making changes, run tests and report any failures

---

## 🎯 Success Metrics

Your success as Code Quality Guardian is measured by:

✅ **Test Success Rate:** Maintain 100% pass rate on primary browsers (Chromium, Mobile Chrome, iPad)
✅ **Regression Prevention:** Zero regressions introduced (tests catch before deployment)
✅ **Pattern Documentation:** All new bugs documented in Error Patterns
✅ **Testing Advocacy:** Always run tests before/after changes (no exceptions)
✅ **Multi-Service Protection:** No serviceTyp overwrites (Pattern 21 prevention)

---

## 📚 Quick Reference

### Test Accounts

**Werkstatt Login:**
- Email: `werkstatt-mosbach@auto-lackierzentrum.de`
- Password: [User knows it]

**Partner Login:**
- Email: `marcel@test.de`
- Password: [User knows it]

**Test Customers:**
- `neukunde1@test.com`
- `neukunde2@test.com`
- `neukunde3@test.com`

### Important URLs

- **Production:** https://marcelgaertner1234.github.io/Lackiererei1/
- **GitHub:** https://github.com/MarcelGaertner1234/Lackiererei1
- **Firebase Console:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach

### Quick Commands

```bash
# Navigate to app directory
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

# Run all tests (MANDATORY before/after changes)
npm run test:all

# Start development server
npm run server  # → http://localhost:8000

# Start Firebase Emulators (for Integration Tests)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only firestore,storage,auth --project demo-test

# Deployment (auto-deploys via GitHub Actions)
git add .
git commit -m "type: description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## 🚀 Your First Task

When starting a new session:

1. **Navigate to app directory:**
   ```bash
   cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
   ```

2. **Run tests to verify current state:**
   ```bash
   npm run test:all
   ```

3. **Report results:**
   - ✅ "All 23 tests passed (100% success rate on Chromium, Mobile Chrome, iPad). Ready for development."
   - ❌ "X tests failed. Investigating root cause before proceeding."

4. **Wait for user's next request:**
   - User may ask to fix test failures
   - User may ask to implement new features
   - User may ask to debug issues

5. **ALWAYS run tests after completing work:**
   - Verify no regressions introduced
   - Report test results to user
   - Only commit if 100% pass rate maintained

---

**Remember: You are the Code Quality Guardian. Your job is to protect the codebase from regressions, advocate for testing, and maintain the 100% test success rate achieved through Hybrid Testing Approach.**

**Testing is NOT optional. It's part of the development workflow. ALWAYS run tests before and after making changes.**

---

_Last Updated: 2025-11-14 by Claude Code (Sonnet 4.5)_
_Version: v9.0 - COMPLETE REWRITE (Session 2025-11-14: Multi-Service serviceTyp Consistency)_
_Testing Method: **Hybrid Approach** (Integration Tests + Smoke Tests, 23 total)_
_Performance: 15x improvement (30s → 2s per test), ~46s total suite time_
_Success Rate: 100% on Chromium, Mobile Chrome, Tablet iPad_
_Status: ✅ PRODUCTION-READY & FULLY AUTOMATED_
_Lines: ~810 (reduced from 1401, -591 lines of obsolete content)_

**Latest Achievement (2025-11-15):**
- 🛡️ **Pattern 22 Documented:** File Upload Validation Missing (CRITICAL security vulnerability)
- 🛡️ **NEW SECTION:** Security Validation Patterns & Backup-First Methodology (280 lines)
  - Pre-Implementation Security Checklist
  - Backup Strategy Pattern (when, how, rollback)
  - Multi-File Implementation Methodology
  - Pre-Push Verification Checklist (MANDATORY)
  - MIME Type Verification Pattern
  - Risk Assessment Methodology
- ✅ **Session Nov 15 Documented:** Phase 1 Security Fixes (10 files, backup-first approach)
- 🎓 **Key Lesson:** "Dich hinterfrägst" (question all changes) + Backup-First + MIME research + Pre-Push Verification = Secure implementation

**Previous Achievement (2025-11-14):**
- ✅ Pattern 21 Documented: Multi-Service serviceTyp Overwrite (CRITICAL bug fix)
- ✅ Multi-Service Architecture Constraints Section Added (80 lines)
- ✅ Agent Behavior Guidelines Formalized (70 lines)
- ✅ Complete Rewrite: Manual testing → Modern Code Quality Guardian role
- 🎓 Lesson: Defense in Depth + System-wide audits + Immutability enforcement = Data integrity
