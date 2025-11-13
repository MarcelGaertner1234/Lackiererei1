# 🐛 18 CRITICAL ERROR PATTERNS

**Complete Error Pattern Documentation from 9 Production Debugging Sessions (Nov 2025)**

This document contains **18 battle-tested error patterns** discovered during production debugging sessions. Each pattern includes:
- **Symptom** - What you see in the console
- **Root Cause** - Why it happens
- **Fix** - How to solve it (with code examples)
- **Lesson Learned** - Key takeaway to prevent future occurrences

**Debugging Time Saved:** ~22-29h by knowing these patterns!

---

## 📊 Quick Reference Table

| # | Pattern | Debugging Time | Priority |
|---|---------|----------------|----------|
| 1 | [Multi-Tenant Violation](#pattern-1-multi-tenant-violation) | 30min-1h | 🔴 CRITICAL |
| 2 | [Firebase Initialization Timeout](#pattern-2-firebase-initialization-timeout) | 15-30min | 🔴 CRITICAL |
| 3 | [ID Type Mismatch](#pattern-3-id-type-mismatch) | 10-20min | 🟡 HIGH |
| 4 | [Listener Registry Missing](#pattern-4-listener-registry-missing) | 5-10min | 🟡 HIGH |
| 5 | [PDF Pagination Overflow](#pattern-5-pdf-pagination-overflow) | 1-2h | 🟢 MEDIUM |
| 6 | [Firestore Security Rules Pattern Collision](#pattern-6-firestore-security-rules-pattern-collision) | **4h** | 🔴 CRITICAL |
| 7 | [Field Name Inconsistency](#pattern-7-field-name-inconsistency) | 2-3h | 🔴 CRITICAL |
| 8 | [Duplicate Vehicle Creation](#pattern-8-duplicate-vehicle-creation-race-condition) | 1-2h | 🟡 HIGH |
| 9 | [Service Worker Response Errors](#pattern-9-service-worker-response-errors) | 1-2h | 🟡 HIGH |
| 10 | [Firestore Composite Index Missing](#pattern-10-firestore-composite-index-missing) | 30min-1h | 🟢 MEDIUM |
| 11 | [Nested Transaction Problem](#pattern-11-nested-transaction-problem) | **2h** | 🔴 CRITICAL |
| 12 | [Counter Security Rules Missing](#pattern-12-counter-security-rules-missing) | 1-2h | 🔴 CRITICAL |
| 13 | [Mobile Media Query Breakpoint Gap](#pattern-13-mobile-media-query-breakpoint-gap) | 1-2h | 🟡 HIGH |
| 14 | [Dark Mode Opacity Too Low](#pattern-14-dark-mode-opacity-too-low) | 30min-1h | 🟢 MEDIUM |
| 15 | [Storage Rules Missing](#pattern-15-storage-rules-missing-403-forbidden) | 1-2h | 🔴 CRITICAL |
| 16 | [Path Structure Must Match Security Rules](#pattern-16-path-structure-must-match-security-rules) | 30min-2h | 🔴 CRITICAL |
| 17 | [CollectionReference vs String Type Error](#pattern-17-collectionreference-vs-string-type-error) | 1h | 🟡 HIGH |
| 18 | [Function Existence Verification](#pattern-18-function-existence-verification) | 5-10min | 🟢 MEDIUM |

**Total Debugging Time Saved:** 22-29 hours

---

## Pattern 1: Multi-Tenant Violation

### Symptom
```javascript
// Console Output:
"🏢 getCollectionName [window]: fahrzeuge → fahrzeuge_mosbach"
```

### Root Cause
Direct `db.collection('fahrzeuge')` usage without suffix → Global collection leak!

### Fix
```javascript
// ❌ FALSCH - Direct access
const fahrzeuge = db.collection('fahrzeuge');  // → Global leak!

// ✅ RICHTIG - Use helper
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach
```

### Lesson Learned
**ALWAYS use `window.getCollection()` for tenant-scoped collections**

**Exceptions (NOT multi-tenant):**
- `users` (global user auth)
- `settings` (per werkstatt, but no suffix)
- `partnerAutoLoginTokens` (global tokens)

**Debugging Time:** 30min-1h

---

## Pattern 2: Firebase Initialization Timeout

### Symptom
```javascript
"Firebase initialization timeout"
```

### Root Cause
Firebase SDK not loaded OR werkstattId not set before Firebase init

### Fix
```javascript
// ✅ ALWAYS await firebaseInitialized
await window.firebaseInitialized;
const werkstattId = window.werkstattId;  // Pre-initialized from localStorage
```

### Lesson Learned
Check `<script>` tag order, ensure werkstattId is pre-initialized from localStorage

**HTML Structure:**
```html
<head>
    <!-- Firebase SDKs FIRST -->
    <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js"></script>

    <!-- Firebase Config SECOND (initializes Firebase) -->
    <script src="firebase-config.js"></script>
</head>
```

**Debugging Time:** 15-30min

---

## Pattern 3: ID Type Mismatch

### Symptom
```javascript
"Fahrzeug nicht gefunden" // Even though ID is correct!
```

### Root Cause
String vs Number comparison (e.g., `"123" !== 123`)

### Fix
```javascript
// ❌ FALSCH
const vehicle = vehicles.find(v => v.id === vehicleId);

// ✅ RICHTIG - Type-safe comparison
const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
```

### Lesson Learned
**ALWAYS use `String()` for ID comparisons in Firebase** (auto-generated IDs are strings)

**Debugging Time:** 10-20min

---

## Pattern 4: Listener Registry Missing

### Symptom
```javascript
"Cannot read properties of undefined (reading 'registerDOM')"
```

### Root Cause
`listener-registry.js` not loaded or loaded too late

### Fix
```html
<!-- ✅ Load in <head>, NOT at end of body -->
<head>
    <script src="listener-registry.js"></script>
</head>
```

### Lesson Learned
Core utilities must load BEFORE page content scripts

**Debugging Time:** 5-10min

---

## Pattern 5: PDF Pagination Overflow

### Symptom
```javascript
"✅ PDF erstellt erfolgreich"
// BUT: First page is cut off!
```

### Root Cause
Page-break check too late (y > 250) → Content exceeds page before break

### Fix
```javascript
// ❌ FALSCH - Check too late
if (y > 250) { pdf.addPage(); y = 20; }

// ✅ RICHTIG - Earlier checks
if (y > 230) { pdf.addPage(); y = 20; }
if (y > 220) { pdf.addPage(); y = 20; }  // Even safer
if (y > 200) { pdf.addPage(); y = 20; }  // Conservative
```

### Lesson Learned
Page-break checks need buffer (20-50px from page bottom)

**Debugging Time:** 1-2h

---

## Pattern 6: Firestore Security Rules Pattern Collision

**⚠️ CRITICAL - 4h debugging time!**

### Symptom
```javascript
"❌ Permission denied: Missing or insufficient permissions"
```

### Root Cause
Wildcard patterns match before specific patterns

**Bug Example:**
```javascript
// firestore.rules (WRONG ORDER!)
match /{chatCollection}/{id} { ... }         // Line 295 - matches FIRST
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 547 - NEVER REACHED!
```

### Fix
```javascript
// ✅ CORRECT ORDER - Specific → General
match /bonusAuszahlungen_mosbach/{id} { ... } // Line 63 - FIRST (specific)
match /{bonusCollection}/{id} { ... }         // Line 72 - SECOND (pattern)
match /{chatCollection}/{id} { ... }          // Line 295 - LAST (wildcard)
```

### Lesson Learned
**Pattern order is CRITICAL in Firestore Rules!**
- Order patterns TOP-TO-BOTTOM (specific → general)
- Hardcoded collection names FIRST
- Pattern collections SECOND
- Wildcard collections LAST

**Testing Method:**
1. Add `allow read, write: if true` to top-level temporarily
2. Use Firebase Rules Playground to verify which rule matches
3. Check line numbers - earlier rules win

**Debugging Time:** 4 hours (longest debugging session!)

---

## Pattern 7: Field Name Inconsistency

### Symptom
```javascript
"✅ Fahrzeug created successfully"
// BUT: Status updates don't sync to Partner Portal!
```

### Root Cause
Different field names in creation paths

**Example:**
```javascript
// Partner path: anfrageId
// Admin path: partnerAnfrageId
// Result: Status sync broken!
```

### Fix
```javascript
// ✅ Standardize field names across ALL creation paths
const fahrzeugData = {
    partnerAnfrageId: anfrageId,  // ✅ Standardized everywhere
    // ...
};
```

### Lesson Learned
**Field name consistency is CRITICAL for multi-path flows!**

**Migration Required:**
```html
<!-- migrate-partneranfrageid.html -->
<script>
  // Update ALL documents with old field name
  const batch = db.batch();
  fahrzeugDocs.forEach(doc => {
    if (doc.data().anfrageId) {
      batch.update(doc.ref, {
        partnerAnfrageId: doc.data().anfrageId
      });
    }
  });
  await batch.commit();
</script>
```

**Debugging Time:** 2-3h per bug!

---

## Pattern 8: Duplicate Vehicle Creation (Race Condition)

### Symptom
```javascript
"✅ Fahrzeug created" (x2 in different tabs)
// Result: Double Kanban entries!
```

### Root Cause
No duplicate prevention in Admin creation path

### Fix
**3-Layer Duplicate Check:**
```javascript
// Layer 1: Check anfrage.fahrzeugAngelegt flag
const anfrageDoc = await db.collection(partnerAnfragenCol).doc(anfrageId).get();
if (anfrageDoc.data().fahrzeugAngelegt) {
  alert('Fahrzeug bereits angelegt!');
  return;
}

// Layer 2: Query by partnerAnfrageId
const queryByAnfrageId = await window.getCollection('fahrzeuge')
  .where('partnerAnfrageId', '==', anfrageId)
  .get();
if (!queryByAnfrageId.empty) {
  alert('Fahrzeug bereits vorhanden!');
  return;
}

// Layer 3: Query by kennzeichen (natural key)
const queryByKennzeichen = await window.getCollection('fahrzeuge')
  .where('kennzeichen', '==', kennzeichen.toUpperCase())
  .get();
if (!queryByKennzeichen.empty) {
  alert('Kennzeichen bereits vorhanden!');
  return;
}

// ALL 3 checks passed → Create vehicle
```

### Lesson Learned
**ALWAYS implement duplicate prevention at ALL entry points!**
- Race conditions WILL happen in production
- Don't assume "user won't do that"
- 3-layer check: Flag + Reference ID + Natural Key

**Debugging Time:** 1-2h

---

## Pattern 9: Service Worker Response Errors

### Symptom
```javascript
"❌ Failed to convert value to 'Response'"
"❌ Background update failed: https://www.google.com/images/cleardot.gif"
```

### Root Cause
`staleWhileRevalidate` catch block returned undefined

### Fix
```javascript
// ❌ WRONG - Returns undefined in catch
return staleWhileRevalidate(request).catch(err => {
  console.error('Background update failed:', err);
});

// ✅ FIX 1: Return valid Response object in catch
return staleWhileRevalidate(request).catch(err => {
  return new Response('Network error', {
    status: 408,
    statusText: 'Request Timeout',
    headers: { 'Content-Type': 'text/plain' }
  });
});

// ✅ FIX 2: Filter external Google resources from caching
if ((url.hostname.includes('google') || url.hostname.includes('gstatic')) &&
    !url.pathname.includes('firebase')) {
  return fetch(request); // Network-only, no caching
}
```

### Lesson Learned
**Service Worker error handling MUST return valid Response!**

**Debugging Time:** 1-2h

---

## Pattern 10: Firestore Composite Index Missing

### Symptom
```javascript
"❌ Fehler beim Erstellen der PDF: The query requires an index.
You can create it here: [Firebase Console link]"
```

### Root Cause
Multiple where clauses on different fields require Index

**Example:**
```javascript
// zeiterfassung PDF export
.where('mitarbeiterId', '==', X)
.where('datum', '>=', Y)
.where('datum', '<=', Z)
.where('status', '==', 'completed')
```

### Fix
**Create Composite Index in Firebase Console:**
- Fields: mitarbeiterId (ASC), status (ASC), datum (ASC)

**OR update firestore.indexes.json:**
```json
{
  "indexes": [
    {
      "collectionGroup": "zeiterfassung_mosbach",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "mitarbeiterId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "datum", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Lesson Learned
**Document Index requirements UPFRONT in feature spec!**
- Provide Firebase Console link in error message
- Test queries in Emulator (indexes not required there!)
- Production will fail without indexes

**Debugging Time:** 30min-1h

---

## Pattern 11: Nested Transaction Problem

**⚠️ CRITICAL - 2h debugging time!**

### Symptom
```javascript
"✅ Rechnung erstellt: RE-2025-11-0042"
// BUT: Sometimes transaction fails or creates duplicates!
```

### Root Cause
Nested Transactions - calling transaction INSIDE another transaction

**Bug Example (kanban.html):**
```javascript
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
```

### Fix
```javascript
// ✅ Execute invoice creation BEFORE main transaction
let rechnungData = null;
if (newStatus === 'fertig') {
  // autoCreateRechnung() runs its transaction first
  rechnungData = await autoCreateRechnung(fahrzeugId, fahrzeugData);
  if (rechnungData) {
    updateData.rechnung = rechnungData;  // Add to prepared data
  }
}

// THEN start main transaction with prepared updateData
await db.runTransaction(async (transaction) => {
  const doc = await transaction.get(fahrzeugRef);
  transaction.update(fahrzeugRef, updateData);  // updateData already contains rechnung
});
```

### Lesson Learned
**NEVER call functions that start transactions INSIDE a transaction!**
- Always prepare data BEFORE transaction
- Then pass prepared data to transaction
- Pattern: Execute helper functions FIRST, then start main transaction

**Debugging Time:** 2 hours

---

## Pattern 12: Counter Security Rules Missing

**⚠️ CRITICAL - 1-2h debugging time!**

### Symptom
```javascript
"❌ Permission denied: Missing or insufficient permissions (counter update)"
"❌ Fehler beim Erstellen der Rechnung"
```

### Root Cause
Firestore collection `counters_{werkstattId}` had NO Security Rules!

**Result:**
ALL invoice creation attempts fail with Permission Denied

### Fix
**Add Counter Security Rules (firestore.rules):**
```javascript
match /{countersCollection}/{counterId} {
  // Admin/Werkstatt: Full read access
  allow read: if countersCollection.matches('counters_.*')
              && isAdmin();

  // Mitarbeiter (Active): Read-only access
  allow read: if countersCollection.matches('counters_.*')
              && isMitarbeiter()
              && isActive();

  // Admin/Werkstatt: Full write access for counter updates
  allow create, update: if countersCollection.matches('counters_.*')
                        && isAdmin();
}
```

### Lesson Learned
**When adding new collections, ALWAYS add Security Rules IMMEDIATELY!**
- Don't assume "it will work"
- Test with actual Firebase (not Emulator, which ignores rules)
- Debugging time saved: 1-2h by adding rules upfront

**Debugging Time:** 1-2 hours

---

## Pattern 13: Mobile Media Query Breakpoint Gap

### Symptom
```javascript
// No errors in console!
// BUT: User reports "Buttons sind abgeschnitten" with screenshot showing 465px device
```

### Root Cause
Media Query only triggered at ≤400px

**Example:**
```css
@media (max-width: 400px) {
  .header-actions {
    display: grid;  // Grid layout for mobile
  }
}
```

**Problem:**
- User's device was 465px (iPhone landscape, small tablet)
- 465px falls between 400px and 768px = NO MATCH
- Desktop styles applied → Buttons cut off

### Fix
```css
// Increase breakpoint to cover gap
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
```

### Lesson Learned
**Test BETWEEN breakpoints (393px, 450px, 500px, 768px)**
1. Media queries cascade - ALWAYS reset inherited properties (flex:1 → flex:none)
2. User testing with real devices reveals gaps that emulator misses!

**Debugging Time:** 1-2h

---

## Pattern 14: Dark Mode Opacity Too Low

### Symptom
```javascript
// No errors in console!
// BUT: User reports "im darkmode sind die schriften schwerlesbar"
```

### Root Cause
Text opacity too low on dark background

**CSS Variables:**
```css
:root {
  --text-primary: rgba(255,255,255,0.9);    // 12.3:1 contrast - OK
  --text-secondary: rgba(255,255,255,0.6);  // 3.5:1 contrast - WCAG FAIL!
}
```

**WCAG Standards:**
- AA: 4.5:1 minimum for normal text
- AAA: 7:1 minimum for normal text
- Opacity 0.6 on dark background = 3.5:1 = FAIL!

### Fix
```css
[data-theme="dark"] {
  --text-primary: rgba(255,255,255,0.95);   // 13.5:1 - AAA ✅
  --text-secondary: rgba(255,255,255,0.75); // 10.2:1 - AAA ✅
}

// Fix specific elements with hardcoded low opacity
[data-theme="dark"] .filter-pill {
  color: rgba(255,255,255,0.95) !important;  // ✅ 13.5:1 AAA
}
```

### Lesson Learned
**ALWAYS test Dark Mode with WCAG contrast checker (7:1+ for AAA)**
1. User screenshots are CRITICAL - they show real accessibility problems
2. Opacity 0.6 or lower is NEVER acceptable on dark backgrounds
3. Check EVERY element type (buttons, pills, placeholders, labels, meta text)

**Debugging Time:** 30min-1h

---

## Pattern 15: Storage Rules Missing (403 Forbidden)

**⚠️ CRITICAL - 1-2h debugging time!**

### Symptom
```javascript
"❌ POST https://firebasestorage.googleapis.com/.../material_photos/req_123.jpg 403 (Forbidden)"
"❌ Firebase Storage: User does not have permission to access 'material_photos/req_123.jpg'"
```

### Root Cause
`storage.rules` file has NO match block for the upload path

**IMPORTANT:** Storage Rules are SEPARATE from Firestore Rules!

### Fix
**Add Storage Rules (storage.rules):**
```javascript
match /material_photos/{requestId}/{fileName} {
  allow read: if true;  // Public read for material database
  allow write: if request.auth != null
               && request.resource.size < 10 * 1024 * 1024  // Max 10 MB
               && (request.auth.token.role == 'admin'
                   || request.auth.token.role == 'werkstatt'
                   || request.auth.token.role == 'lager'
                   || request.auth.token.role == 'superadmin');
}
```

**Deploy Command:**
```bash
firebase deploy --only storage  # ✅ Correct
firebase deploy --only firestore  # ❌ Wrong - won't deploy storage.rules!
```

### Lesson Learned
**Storage Rules ≠ Firestore Rules (separate files, separate deployment)**
1. ALWAYS add Storage Rules when creating new upload features
2. Test uploads in production (Emulator behaves differently)
3. Document upload paths in storage.rules comments
4. Debugging time saved: 1-2h by knowing this pattern

**Debugging Time:** 1-2 hours

---

## Pattern 16: Path Structure Must Match Security Rules

**⚠️ CRITICAL - 30min-2h debugging time!**

### Symptom
```javascript
"❌ POST https://firebasestorage.googleapis.com/.../material_photos/req_123.jpg 403 (Forbidden)"
// Still 403 AFTER deploying Storage Rules!
```

### Root Cause
Upload path structure doesn't match Security Rules pattern

**Mismatch Example:**
```javascript
// Upload code: 1-level path
const fileName = `material_photos/${requestId}_${timestamp}.jpg`;
// → material_photos/req_123_1699876543.jpg (1 level after material_photos/)

// Security Rule: 2-level path
match /material_photos/{requestId}/{fileName} { ... }
// → material_photos/{requestId}/{fileName} (2 levels: requestId + fileName)

// Result: Path doesn't match → Rule doesn't apply → 403 Forbidden!
```

### Fix
```javascript
// Align upload path with Security Rule structure
const fileName = `material_photos/${requestId}/${timestamp}.jpg`;
// → material_photos/req_123/1699876543.jpg (2 levels - MATCHES rule!)
```

**Alternative (less organized):**
```javascript
// Change Security Rule to 1-level
match /material_photos/{fileName} { ... }
// → material_photos/{fileName} (1 level)
```

### Lesson Learned
**Path structure MUST EXACTLY match Security Rules patterns**
1. 1-level vs 2-level paths are completely different patterns
2. Test Storage Rules by uploading actual files (not just reading rules)
3. Use descriptive path structures (2-level better for organization)
4. Debugging time: ~30min if you know this pattern, 2h+ if you don't

**Debugging Time:** 30min-2 hours

---

## Pattern 17: CollectionReference vs String Type Error

### Symptom
```javascript
"❌ TypeError: n.indexOf is not a function"
// Very cryptic error from Firebase SDK internals!
```

### Root Cause
`window.getCollection()` returns CollectionReference object, NOT string

**Bug Example:**
```javascript
const materialCollection = window.getCollection('materialRequests');
// → materialCollection is CollectionReference object (has methods like .doc(), .add())

// ❌ Double-wrapping CollectionReference
const docRef = db.collection(materialCollection).doc(requestId);
// db.collection() expects STRING, but got CollectionReference object!
// → Firebase SDK tries to call .indexOf() on object → TypeError!
```

### Fix
```javascript
// ✅ Use CollectionReference directly (no wrapping)
const docRef = window.getCollection('materialRequests').doc(requestId);
// window.getCollection() already returns CollectionReference - use directly!
```

**Code Comparison:**
```javascript
// BEFORE (Double-wrapping):
const materialCollection = window.getCollection('materialRequests');
const docRef = db.collection(materialCollection).doc(id);  // ❌ TypeError

// AFTER (Direct usage):
const docRef = window.getCollection('materialRequests').doc(id);  // ✅ Works
```

### Lesson Learned
**window.getCollection() returns CollectionReference, NOT string**
1. NEVER wrap CollectionReference in db.collection() again
2. Use directly: .doc(id), .add(data), .where(), .orderBy()
3. Firebase SDK type errors are often cryptic (indexOf, split, etc.)
4. When you see "n.indexOf is not a function" → Check for type mismatch
5. Debugging time: ~1h to identify, instant fix once understood

**Debugging Time:** 1 hour

---

## Pattern 18: Function Existence Verification

### Symptom
```javascript
"❌ ReferenceError: loadMaterialRequests is not defined"
// at material.html:2501
```

### Root Cause
Function call to non-existent function

**Bug Example:**
```javascript
await loadMaterialRequests();  // ❌ This function doesn't exist in material.html!
```

### Fix
**Method 1: Search codebase for function definition**
```bash
grep -r "function loadMaterialRequests" .
grep -r "const loadMaterialRequests" .
# → No results = Function doesn't exist!
```

**Method 2: Find similar/correct function name**
```bash
grep -r "MaterialRequests" material.html
# → Found: setupMaterialRequestsListener() at line 2204
```

**Correct Code:**
```javascript
setupMaterialRequestsListener();  // ✅ This function exists!
// Note: Real-time listener, no await needed
```

### Lesson Learned
**ALWAYS verify function existence before calling**
1. Use grep/search to find correct function names
2. Real-time listeners (setup*Listener) don't need await
3. ReferenceError = Function not defined OR typo in name
4. Common pattern: load* vs setup* vs init* prefixes
5. Check function location: Same file? Imported? Global?

**Debugging Time:** 5-10min with systematic search

---

## 🎯 Summary

**Total Patterns:** 18
**Total Debugging Time Saved:** 22-29 hours

**Top 5 Most Critical Patterns:**
1. **Pattern 6:** Firestore Security Rules Pattern Collision (4h debugging!)
2. **Pattern 11:** Nested Transaction Problem (2h debugging!)
3. **Pattern 7:** Field Name Inconsistency (2-3h debugging per bug!)
4. **Pattern 12:** Counter Security Rules Missing (1-2h debugging!)
5. **Pattern 15:** Storage Rules Missing (1-2h debugging!)

**Quick Prevention Checklist:**
- [ ] Use `window.getCollection()` for all tenant-scoped collections
- [ ] Await `firebaseInitialized` before any Firestore operations
- [ ] Use `String(id)` for all ID comparisons
- [ ] Load `listener-registry.js` in `<head>`
- [ ] Page-break checks at y > 220 (not y > 250)
- [ ] Order Security Rules: Specific → Pattern → Wildcard
- [ ] Standardize field names across ALL creation paths
- [ ] Implement 3-layer duplicate prevention
- [ ] Return valid Response in Service Worker catch blocks
- [ ] Document Composite Index requirements upfront
- [ ] Never nest transactions - prepare data BEFORE transaction
- [ ] Add Security Rules when creating new collections
- [ ] Test between mobile breakpoints (450px, 500px, 600px)
- [ ] Dark Mode contrast minimum 7:1 (WCAG AAA)
- [ ] Add Storage Rules with `firebase deploy --only storage`
- [ ] Match upload paths to Security Rules (1-level vs 2-level)
- [ ] Use CollectionReference directly (no double-wrapping)
- [ ] Verify function existence with grep before calling

---

_Last Updated: 2025-11-13 by Claude Code (Sonnet 4.5)_
_Version: 1.0 - Complete 18 Pattern Documentation_
_Source: NEXT_AGENT_MANUAL_TESTING_PROMPT.md + App CLAUDE.md_
_For full Testing Guide, see: [TESTING.md](TESTING.md)_
_For Best Practices, see: [BEST_PRACTICES.md](BEST_PRACTICES.md)_
