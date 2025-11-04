# Risk Assessment - Multi-Tenant Partner Registration Testing

**Version:** 2.0
**Generated:** 2025-11-03
**Session:** Pre-Testing Risk Analysis

---

## Executive Summary

Based on comprehensive dependency analysis, I have identified **18 potential failure points** across 5 risk categories:

| Risk Category | Critical | High | Medium | Low | Total |
|---------------|----------|------|---------|-----|-------|
| **Multi-Tenant Isolation** | 3 | 2 | 1 | 0 | **6** |
| **Firebase Dependencies** | 2 | 3 | 2 | 1 | **8** |
| **Security Rules** | 1 | 2 | 1 | 0 | **4** |
| **Data Consistency** | 0 | 2 | 2 | 1 | **5** |
| **User Experience** | 0 | 1 | 3 | 1 | **5** |
| **TOTAL** | **6** | **10** | **9** | **3** | **28** |

**Focus Areas:**
1. 🔥 **CRITICAL:** Bug #8 Verification (werkstattId isolation)
2. 🔥 **CRITICAL:** Custom Claims propagation after assignment
3. 🔥 **CRITICAL:** Race conditions during Firebase init

---

## Risk Category 1: Multi-Tenant Isolation

### RISK 1.1 - werkstattId Not Set After Login ⭐⭐⭐⭐⭐ CRITICAL

**Description:**
Bug #8 fix (Commit 35ae4eb) sets `window.werkstattId` dynamically in auth-manager.js. If this fails, werkstätten see wrong data.

**Failure Scenario:**
```javascript
// testnov11 werkstatt logs in
loginWerkstatt('testnov11@...', password)
  → SUCCESS but window.werkstattId stays undefined
  → window.getCollectionName('kunden') checks window.werkstattId → undefined
  → Falls back to authManager.getCurrentUser().werkstattId → 'testnov11' (OK)

// BUT if authManager also fails:
  → window.getCollectionName('kunden') → 'kunden' (NO SUFFIX!)
  → Accesses GLOBAL kunden collection (DEPRECATED)
  → WRONG DATA or EMPTY RESULTS
```

**Root Cause:**
- auth-manager.js Line 207: `window.werkstattId = currentWerkstatt.werkstattId;`
- If `currentWerkstatt.werkstattId` is undefined → window.werkstattId = undefined
- getCollectionName() falls back incorrectly

**Mitigation:**
```javascript
// Check in console after login:
console.log('window.werkstattId:', window.werkstattId);           // Should be 'testnov11'
console.log('authManager:', window.authManager.getCurrentUser()); // Should have werkstattId
```

**Test Case:** TEST 8 - Multi-Tenant Isolation Verification

**Impact:** 🔥 **CRITICAL** - Data isolation complete failure

**Probability:** Low (fix is simple, but MUST verify)

---

### RISK 1.2 - werkstattId Not Restored After Page Reload ⭐⭐⭐⭐⭐ CRITICAL

**Description:**
On page reload, Firebase Auth state is restored via `onAuthStateChanged()`. If werkstattId not set (Line 483), user sees wrong data.

**Failure Scenario:**
```javascript
// User logged in as testnov11
// User refreshes page (F5)
  → onAuthStateChanged() fires
  → Restores user from localStorage
  → Sets window.werkstattId = currentWerkstatt.werkstattId (Line 483)

// IF LINE 483 MISSING or FAILS:
  → window.werkstattId stays undefined
  → Page loads with wrong collection names
```

**Root Cause:**
- auth-manager.js Line 483 MUST execute every page load
- Depends on 'firebaseReady' event firing correctly

**Mitigation:**
- Hard refresh (Cmd+Shift+R) before each test
- Check console: `🔒 window.werkstattId restored to: ...`

**Test Case:** TEST 8 (Part 2 - After logout/login)

**Impact:** 🔥 **CRITICAL** - Session persistence failure

**Probability:** Low (fix is in place)

---

### RISK 1.3 - Hardcoded werkstattId Missed in One File ⭐⭐⭐⭐ HIGH

**Description:**
Bug #8 fix removed hardcoded `window.werkstattId = 'mosbach'` from 8 files. If one file was missed, that page will have wrong isolation.

**Files Changed (Commit 35ae4eb):**
1. kunden.html
2. annahme.html
3. abnahme.html
4. kanban.html
5. liste.html
6. kalender.html
7. material.html
8. index.html

**Verification:**
```bash
# Check for any remaining hardcoded werkstattId:
grep -r "window.werkstattId = 'mosbach'" *.html
# Should return NO RESULTS
```

**Test Case:** TEST 8 (Check multiple pages)

**Impact:** 🔥 **HIGH** - Partial isolation failure

**Probability:** Very Low (already committed, but verify manually)

---

### RISK 1.4 - getCollectionName() Priority Order Wrong ⭐⭐⭐⭐ HIGH

**Description:**
`window.getCollectionName()` checks werkstattId in priority order. If order is wrong, fallback may override correct value.

**Current Priority (firebase-config.js):**
```javascript
1. window.werkstattId (set by auth-manager after login)
2. authManager.getCurrentUser().werkstattId
3. localStorage 'partner' → werkstattId
4. Fallback: baseCollectionName (no suffix)
```

**Failure Scenario:**
- localStorage has old werkstattId from previous login
- window.werkstattId not set yet (race condition)
- getCollectionName() uses localStorage value (WRONG!)

**Mitigation:**
- Clear localStorage before testing
- Hard refresh before tests

**Test Case:** TEST 8 (Login as testnov11 after mosbach)

**Impact:** 🔥 **HIGH** - Cross-contamination

**Probability:** Low (priority order tested)

---

### RISK 1.5 - Global Collections Accessed with Suffix ⭐⭐⭐ MEDIUM

**Description:**
Some collections should NEVER have werkstattId suffix (users, partners for pending). If code mistakenly uses `window.getCollection('users')`, it returns `users_mosbach` (WRONG!).

**Global Collections:**
- `users` - Auth data (ALWAYS global)
- `partners` - Pending registrations (global until assigned)

**Correct Usage:**
```javascript
// ✅ CORRECT (for global collections):
window.db.collection('users')
window.db.collection('partners').where('status', '==', 'pending')

// ❌ WRONG (would add suffix):
window.getCollection('users')      // → 'users_mosbach' (NO SUCH COLLECTION!)
window.getCollection('partners')   // → 'partners_mosbach' (different purpose!)
```

**Verification:**
```bash
# Check for incorrect usage:
grep -r "getCollection('users')" *.html *.js
grep -r "getCollection('partners')" pending-registrations.html
# Should return NO RESULTS in pending-registrations.html
```

**Test Case:** TEST 1, TEST 4 (Verify Firestore queries)

**Impact:** 🔥 **MEDIUM** - Query fails, no data returned

**Probability:** Low (code review done)

---

### RISK 1.6 - Collection Naming Inconsistency ⭐ LOW

**Description:**
Collections must follow pattern: `{base}_{werkstattId}`. If naming is inconsistent (e.g., `kunden-mosbach` instead of `kunden_mosbach`), queries fail.

**Mitigation:**
- Already standardized in firebase-config.js
- Security Rules enforce pattern

**Impact:** Low - Would fail immediately in testing

**Probability:** Very Low

---

## Risk Category 2: Firebase Dependencies

### RISK 2.1 - Firebase SDK Load Order Wrong ⭐⭐⭐⭐⭐ CRITICAL

**Description:**
Firebase SDK must load in correct order. If firestore loads before app, initialization fails.

**Correct Order (registrierung.html):**
```html
1. firebase-app-compat.js         ← MUST BE FIRST
2. firebase-firestore-compat.js
3. firebase-storage-compat.js
4. firebase-auth-compat.js
5. firebase-config.js              ← Initializes with credentials
6. auth-manager.js                 ← Uses window.db, window.auth
```

**Failure Symptom:**
```javascript
// Console error:
"Cannot read property 'Firestore' of undefined"
"window.db is not defined"
```

**Test Case:** TEST 1 (Check console on page load)

**Impact:** 🔥 **CRITICAL** - Complete app failure

**Probability:** Very Low (already deployed, but verify with hard refresh)

---

### RISK 2.2 - firebaseInitialized Flag Not Set ⭐⭐⭐⭐⭐ CRITICAL

**Description:**
Many HTML files wait for `window.firebaseInitialized === true` before Firestore operations. If flag never set, infinite timeout.

**Failure Scenario:**
```javascript
// In kunden.html:
let authCheckAttempts = 0;
const authCheckInterval = setInterval(async () => {
  authCheckAttempts++;
  if (window.firebaseInitialized && window.werkstattId) {
    clearInterval(authCheckInterval);
    // Load data...
  }
  if (authCheckAttempts >= 20) {
    clearInterval(authCheckInterval);
    console.error('Firebase initialization timeout');
    // USER SEES EMPTY PAGE
  }
}, 250);
```

**Root Cause:**
- firebase-config.js must set `window.firebaseInitialized = true`
- If Firebase init fails (network error, invalid config), flag never set

**Mitigation:**
```javascript
// Check console:
console.log('window.firebaseInitialized:', window.firebaseInitialized); // Should be true
```

**Test Case:** TEST 1 (Check console immediately on page load)

**Impact:** 🔥 **CRITICAL** - App hangs, no data loads

**Probability:** Very Low (deployed, but network issues possible)

---

### RISK 2.3 - Firebase Auth Not Ready Before Query ⭐⭐⭐⭐ HIGH

**Description:**
If Firestore query runs before Firebase Auth loads, query may succeed but Security Rules deny access (permission error).

**Failure Scenario:**
```javascript
// pending-registrations.html loads:
loadPendingRegistrations() called immediately
  → db.collection('partners').where('status', '==', 'pending').get()
  → Firebase Auth NOT READY YET
  → Security Rules check: isAdmin() → request.auth = null → DENY
  → Console: "Missing or insufficient permissions"
```

**Root Cause:**
- Security Rules depend on `request.auth.uid` and `request.auth.token.role`
- If auth not loaded, these are null

**Mitigation:**
- Wait for 'firebaseReady' event before queries
- Check `firebase.auth().currentUser !== null` before queries

**Test Case:** TEST 4 (Check for permission errors in console)

**Impact:** 🔥 **HIGH** - No data shown, user confused

**Probability:** Low (firebaseReady event implemented)

---

### RISK 2.4 - Custom Claims Not Refreshed After Assignment ⭐⭐⭐⭐ HIGH

**Description:**
After admin assigns werkstattId, `ensurePartnerAccount` Cloud Function sets Custom Claims. Partner must force token refresh before claims are active.

**Failure Scenario:**
```javascript
// Admin assigns partner to mosbach
assignPartner(partnerId)
  → Update partners/{uid}: werkstattId='mosbach', status='active'
  → Copy to partners_mosbach/{uid}
  → Call ensurePartnerAccount Cloud Function
    → Sets Custom Claims: werkstattId='mosbach', role='partner'

// Partner logs in IMMEDIATELY (before token refresh):
  → Firebase Auth succeeds
  → BUT: request.auth.token.werkstattId = undefined (old token!)
  → Security Rules: belongsToWerkstatt('mosbach') → FALSE
  → Query partners_mosbach → "Missing or insufficient permissions"
```

**Root Cause:**
- JWT tokens cached by Firebase SDK
- Custom Claims update requires `user.getIdToken(true)` (force refresh)

**Mitigation:**
- ensurePartnerAccount function should wait 2-3 seconds
- Partner app should force token refresh on login

**Test Case:** TEST 6 (Partner Login After Approval)

**Impact:** 🔥 **HIGH** - Partner can't access data after activation

**Probability:** Medium (timing-dependent)

---

### RISK 2.5 - Firestore Offline Persistence Conflict ⭐⭐⭐ MEDIUM

**Description:**
If Firestore offline persistence enabled, cached data may override fresh queries.

**Failure Scenario:**
```javascript
// User logged in as mosbach (yesterday)
// Data cached: kunden_mosbach → 10 customers

// User logs in as testnov11 (today)
// window.werkstattId = 'testnov11' (correct)
// BUT: Firestore returns cached 'kunden_mosbach' data (WRONG!)
```

**Mitigation:**
- Hard refresh clears cache
- Check Firestore settings in firebase-config.js

**Test Case:** TEST 8 (After switching werkstätten)

**Impact:** 🔥 **MEDIUM** - Stale data shown

**Probability:** Low (offline persistence likely disabled)

---

### RISK 2.6 - Firebase Functions Region Mismatch ⭐⭐⭐ MEDIUM

**Description:**
Cloud Functions deployed to `europe-west3`. If frontend calls wrong region, function not found.

**Verification:**
```javascript
// In pending-registrations.html:
const ensurePartnerAccount = firebase.app().functions('europe-west3')
  .httpsCallable('ensurePartnerAccount');
```

**Failure Symptom:**
```
"Cloud Function ensurePartnerAccount not found"
```

**Test Case:** TEST 5 (Assignment triggers function)

**Impact:** 🔥 **MEDIUM** - Custom Claims not set

**Probability:** Low (region specified in code)

---

### RISK 2.7 - Firebase Storage Quota Exceeded ⭐⭐ LOW

**Description:**
If Firebase Storage quota exceeded (free tier: 5GB), file uploads fail.

**Impact:** Low - Not tested in this session

**Probability:** Very Low

---

### RISK 2.8 - Firebase Network Timeout ⭐ LOW

**Description:**
Slow network may cause timeout errors.

**Mitigation:**
- Retry logic in place
- User sees loading spinner

**Impact:** Low - Temporary issue

**Probability:** Low

---

## Risk Category 3: Security Rules

### RISK 3.1 - Security Rules Not Deployed ⭐⭐⭐⭐⭐ CRITICAL

**Description:**
If Firestore Security Rules not deployed to production, all queries fail with permission errors.

**Verification:**
```bash
cd functions
firebase deploy --only firestore:rules --project auto-lackierzentrum-mosbach
```

**Failure Symptom:**
```
"Missing or insufficient permissions" (every query)
```

**Test Case:** TEST 1 (Check console immediately)

**Impact:** 🔥 **CRITICAL** - Complete app failure

**Probability:** Very Low (rules deployed in session 2025-11-03)

---

### RISK 3.2 - Security Rules Block Self-Registration ⭐⭐⭐⭐ HIGH

**Description:**
`partners` collection rules MUST allow authenticated users to create with `status='pending'`. If rule too restrictive, registration fails.

**Current Rule (firestore.rules:108):**
```javascript
allow create: if isAuthenticated()
              && request.resource.data.status == 'pending'
              && request.resource.data.partnerId == request.auth.uid
              && request.resource.data.werkstattId == null
              && request.resource.data.keys().hasAll([
                  'partnerId', 'kundenname', 'email',
                  'plz', 'stadt', 'region', 'status', 'createdAt'
              ]);
```

**Risk:**
- If `createdAt` field missing from auth-manager.js → Rule denies
- If `werkstattId` not null → Rule denies

**Test Case:** TEST 1 (Partner Registration)

**Impact:** 🔥 **HIGH** - Registration fails

**Probability:** Low (rule matches code)

---

### RISK 3.3 - Security Rules Block Admin Approval ⭐⭐⭐⭐ HIGH

**Description:**
Admin must be able to update `partners/{uid}` to set werkstattId + status. If `isAdmin()` function wrong, approval fails.

**Current Rule (firestore.rules:115):**
```javascript
allow read, write: if isAdmin();
```

**isAdmin() Definition:**
```javascript
function isAdmin() {
  return request.auth.token.role == 'admin'
      || request.auth.token.role == 'superadmin';
}
```

**Risk:**
- If admin Custom Claims not set → isAdmin() = false → DENY
- If role is 'werkstatt' (not admin) → DENY

**Test Case:** TEST 5 (Assignment)

**Impact:** 🔥 **HIGH** - Admin can't approve partners

**Probability:** Low (admin role tested)

---

### RISK 3.4 - Security Rules Allow Cross-Werkstatt Access ⭐⭐⭐ MEDIUM

**Description:**
`partners_{werkstattId}` rules must prevent cross-werkstatt access. If `belongsToWerkstatt()` function wrong, mosbach can read heidelberg data.

**Current Rule:**
```javascript
function belongsToWerkstatt(wId) {
  return request.auth.token.werkstattId == wId;
}

match /partners_{werkstattId}/{partnerId} {
  allow read: if belongsToWerkstatt(werkstattId);
}
```

**Risk:**
- If Custom Claims not set → werkstattId = undefined → ALLOW (wrong!)

**Test Case:** TEST 8 (Multi-Tenant Isolation)

**Impact:** 🔥 **MEDIUM** - Security breach

**Probability:** Low (Custom Claims required)

---

## Risk Category 4: Data Consistency

### RISK 4.1 - Assignment Creates Incomplete Copy ⭐⭐⭐⭐ HIGH

**Description:**
When admin assigns partner, data copied from `partners/{uid}` to `partners_{werkstattId}/{uid}`. If copy fails, partner activated but no data in werkstatt collection.

**Code (pending-registrations.html:851):**
```javascript
// 1. Update global partners
await window.db.collection('partners').doc(partnerId).update({
  werkstattId, status: 'active', assignedAt: timestamp
});

// 2. Copy to werkstatt-specific collection
await window.db.collection(`partners_${werkstattId}`).doc(partnerId).set({
  ...partner,  // Spread operator copies all fields
  werkstattId, status: 'active', assignedAt: timestamp
});

// 3. Update users
await window.db.collection('users').doc(partnerId).update({
  status: 'active'
});
```

**Failure Scenario:**
- Step 1 succeeds
- Step 2 fails (network error, permission error)
- Step 3 succeeds
- **Result:** Partner status='active' but no data in `partners_mosbach`!

**Mitigation:**
- Use Firestore batched writes (atomic)
- Rollback on error

**Test Case:** TEST 5 (Check Firestore after assignment)

**Impact:** 🔥 **HIGH** - Data inconsistency

**Probability:** Medium (no transaction used)

---

### RISK 4.2 - users/{uid} Not Updated After Assignment ⭐⭐⭐⭐ HIGH

**Description:**
If `users/{uid}.status` not updated to 'active', partner can't login (getUserStatus() blocks).

**Code (pending-registrations.html:851):**
```javascript
// Must execute:
await window.db.collection('users').doc(partnerId).update({
  status: 'active'
});
```

**Failure Scenario:**
- Assignment succeeds
- users/{uid} update fails
- Partner tries to login → getUserStatus() returns 'pending' → BLOCKED

**Test Case:** TEST 6 (Partner Login)

**Impact:** 🔥 **HIGH** - Partner can't login

**Probability:** Medium (separate query, may fail)

---

### RISK 4.3 - Duplicate Partner IDs in Different Werkstätten ⭐⭐⭐ MEDIUM

**Description:**
If same uid appears in `partners_mosbach` and `partners_heidelberg`, data conflict.

**Failure Scenario:**
- Partner registered, assigned to mosbach
- Admin mistakenly assigns AGAIN to heidelberg
- Partner now in both werkstätten (WRONG!)

**Mitigation:**
- Check `partners/{uid}.werkstattId` before assignment
- Prevent re-assignment in UI

**Test Case:** Not in test plan (edge case)

**Impact:** 🔥 **MEDIUM** - Data duplication

**Probability:** Low (UI disables after assignment)

---

### RISK 4.4 - PLZ-Matching Returns Wrong Werkstatt ⭐⭐⭐ MEDIUM

**Description:**
`suggestWerkstatt()` uses confidence scores. If algorithm wrong, partner assigned to wrong werkstatt.

**Algorithm (pending-registrations.html:648):**
```javascript
// 98%: Exact PLZ match
if (partnerPlz === werkstatt.plz) → 98%

// 85%: PLZ prefix match (first 2 digits)
if (partnerPlz.substring(0,2) === werkstatt.plz.substring(0,2)) → 85%

// 70%: PLZ proximity (within 100 units)
if (Math.abs(partnerPlz - werkstatt.plz) <= 100) → 70%

// 60%: Stadt name match
if (partner.stadt === werkstatt.stadt) → 60%
```

**Risk:**
- PLZ 74821 (Mosbach) vs PLZ 74722 (Buchen) → Diff = 99 → 70% confidence (proximity)
- But Buchen is 30km away (NOT same werkstatt!)

**Test Case:** TEST 4, TEST 5 (Check confidence scores)

**Impact:** 🔥 **MEDIUM** - Wrong assignment (admin can override)

**Probability:** Low (admin reviews before approval)

---

### RISK 4.5 - Rejected Partner Leaves Orphaned Auth Account ⭐⭐ LOW

**Description:**
When admin rejects partner, Firestore documents deleted but Firebase Auth account remains.

**Code (pending-registrations.html:rejectPartner):**
```javascript
// Deletes:
await window.db.collection('partners').doc(partnerId).delete();
await window.db.collection('users').doc(partnerId).delete();

// Does NOT delete:
firebase.auth().deleteUser(partnerId); // Admin SDK required!
```

**Mitigation:**
- Manual cleanup in Firebase Console
- Orphaned accounts can't login (no users/{uid} document)

**Impact:** Low - Security not compromised

**Probability:** High (by design)

---

## Risk Category 5: User Experience

### RISK 5.1 - Admin Badge Not Updated After Assignment ⭐⭐⭐⭐ HIGH

**Description:**
Admin dashboard shows pending count badge. If badge not updated after assignment, admin confused.

**Code (admin-dashboard.html:updatePendingBadge):**
```javascript
const pendingSnap = await db.collection('partners')
  .where('status', '==', 'pending')
  .get();

const count = pendingSnap.size;
badge.textContent = count;
```

**Failure Scenario:**
- Admin assigns partner → status='active'
- Badge query re-runs → count decreases → badge updates
- BUT: If real-time listener not attached → badge stays same → CONFUSING

**Test Case:** TEST 3, TEST 5 (Check badge after assignment)

**Impact:** 🔥 **MEDIUM** - UX confusion

**Probability:** Low (real-time listener implemented)

---

### RISK 5.2 - PLZ-Region Warning Not Shown ⭐⭐⭐ MEDIUM

**Description:**
If partner enters mismatched PLZ + Region, warning should show. If validation fails, partner may be assigned to wrong werkstatt.

**Code (registrierung.html:559):**
```javascript
function validatePLZRegion() {
  const plz = document.getElementById('plz').value.trim();
  const region = document.getElementById('region').value;
  const warningDiv = document.getElementById('plzRegionWarning');

  if (plz.length >= 2 && region && region !== 'andere') {
    const plzPrefix = plz.substring(0, 2);
    const expectedRegion = PLZ_REGION_MAP[plzPrefix];

    if (expectedRegion && expectedRegion !== region) {
      warningDiv.style.display = 'block'; // ⚠️ Show warning
    }
  }
}
```

**Failure Scenario:**
- Partner enters PLZ 69124 (Heidelberg) + Region "Mosbach" (WRONG!)
- Validation fails (JavaScript error) → Warning not shown
- Partner submits → Assigned to wrong werkstatt

**Test Case:** TEST 2 (PLZ-Region Validation)

**Impact:** 🔥 **MEDIUM** - Wrong assignment

**Probability:** Low (simple validation code)

---

### RISK 5.3 - Empty State Not Shown When No Pending Registrations ⭐⭐⭐ MEDIUM

**Description:**
If no pending registrations, admin should see "Keine ausstehenden Registrierungen" message. If empty state not shown, admin confused.

**Test Case:** TEST 4 (After all assignments)

**Impact:** Low - UX issue only

**Probability:** Low

---

### RISK 5.4 - Filter Buttons Don't Work ⭐⭐⭐ MEDIUM

**Description:**
pending-registrations.html has filter buttons (Alle, Mosbach, Heidelberg, Ohne Empfehlung). If filters broken, admin can't find specific partners.

**Test Case:** TEST 4 (Click filter buttons)

**Impact:** Low - Workaround: scroll

**Probability:** Low

---

### RISK 5.5 - Hard Refresh Required After Deployment ⭐ LOW

**Description:**
GitHub Pages cache may serve old version. User sees outdated code.

**Mitigation:**
- Hard refresh (Cmd+Shift+R) before testing
- Wait 2-3 minutes after push

**Impact:** Low - Testing issue only

**Probability:** High (expected behavior)

---

## Risk Mitigation Strategy

### Pre-Testing Checks (MANDATORY):

1. **Verify Deployment:**
   ```bash
   cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
   git log --oneline | head -5
   # Should show commits: 636730e, 35ae4eb, 3d147ad, 93b8ff9, a62e37f
   ```

2. **Verify Security Rules Deployed:**
   - Open Firebase Console → Firestore → Rules
   - Check "Last deployed" timestamp (should be 2025-11-03)

3. **Verify Cloud Functions Deployed:**
   - Open Firebase Console → Functions
   - Check `ensurePartnerAccount` exists (europe-west3)

4. **Hard Refresh Browser:**
   - Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)
   - Clear console before each test

5. **Check Console for werkstattId:**
   ```javascript
   console.log('window.werkstattId:', window.werkstattId);
   console.log('firebaseInitialized:', window.firebaseInitialized);
   ```

---

### During Testing Watchlist:

**Console Errors to Watch For:**

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `Missing or insufficient permissions` | Security Rules deny OR auth not ready | Wait for firebaseReady event |
| `Firebase initialization timeout` | firebaseInitialized flag not set | Check firebase-config.js loaded |
| `werkstattId timeout` | werkstattId not set after login | Check auth-manager.js Line 207 |
| `Fahrzeug nicht gefunden` | ID type mismatch (String vs Number) | Use String() comparison |
| `Cannot read property 'collection' of undefined` | window.db not initialized | Check Firebase SDK load order |
| `werkstattId is undefined` | Bug #8 not fixed | Check hardcoded values removed |

---

### Post-Testing Verification:

1. **Check Firestore Data Consistency:**
   - `partners/{uid}`: werkstattId set, status='active'
   - `partners_mosbach/{uid}`: Complete copy exists
   - `users/{uid}`: status='active'

2. **Verify Custom Claims:**
   ```javascript
   // In partner console after login:
   firebase.auth().currentUser.getIdTokenResult().then(token => {
     console.log('Custom Claims:', token.claims);
     // Should show: { werkstattId: 'mosbach', role: 'partner', partnerId: '...' }
   });
   ```

3. **Verify Multi-Tenant Isolation:**
   - Login as mosbach → Check window.werkstattId
   - Login as testnov11 → Check window.werkstattId (different!)
   - Verify collections: kunden_mosbach vs kunden_testnov11

---

## Risk Priority for Testing

### Must Test (CRITICAL Risks):

1. ✅ **RISK 1.1** - werkstattId set after login (TEST 8)
2. ✅ **RISK 1.2** - werkstattId restored after reload (TEST 8)
3. ✅ **RISK 2.1** - Firebase SDK load order (TEST 1)
4. ✅ **RISK 2.2** - firebaseInitialized flag (TEST 1)
5. ✅ **RISK 2.4** - Custom Claims after assignment (TEST 6)
6. ✅ **RISK 3.1** - Security Rules deployed (TEST 1)

### Should Test (HIGH Risks):

1. ✅ **RISK 1.3** - Hardcoded werkstattId missed (TEST 8)
2. ✅ **RISK 1.4** - getCollectionName priority (TEST 8)
3. ✅ **RISK 2.3** - Auth ready before query (TEST 4)
4. ✅ **RISK 3.2** - Self-registration allowed (TEST 1)
5. ✅ **RISK 3.3** - Admin approval allowed (TEST 5)
6. ✅ **RISK 4.1** - Assignment copy complete (TEST 5)
7. ✅ **RISK 4.2** - users/{uid} updated (TEST 6)
8. ✅ **RISK 5.1** - Badge updated (TEST 3, TEST 5)

### Nice to Test (MEDIUM Risks):

- RISK 1.5 - Global collections (TEST 1, TEST 4)
- RISK 2.5 - Offline persistence (TEST 8)
- RISK 2.6 - Functions region (TEST 5)
- RISK 3.4 - Cross-werkstatt access (TEST 8)
- RISK 4.3 - Duplicate partner IDs (Not in test plan)
- RISK 4.4 - PLZ-matching accuracy (TEST 4, TEST 5)
- RISK 5.2 - PLZ-Region warning (TEST 2)
- RISK 5.3 - Empty state (TEST 4)
- RISK 5.4 - Filter buttons (TEST 4)

### Optional (LOW Risks):

- Can skip during initial testing session

---

**Generated by:** Claude Code (QA Lead)
**Session:** Pre-Testing Risk Analysis (2025-11-03)
**Next:** Create TEST_PREREQUISITES.md + TESTING_READINESS_REPORT.md
