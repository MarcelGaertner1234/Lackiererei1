# Dependency Map - Multi-Tenant Partner Registration System

**Version:** 2.0
**Generated:** 2025-11-03
**Session:** Pre-Testing Dependency Analysis

---

## 1. Frontend Dependencies

### registrierung.html
**Purpose:** Partner self-service registration form

**Script Dependencies (in load order):**
```html
1. Firebase SDK (CDN):
   - firebase-app-compat.js (v9.22.0)
   - firebase-firestore-compat.js
   - firebase-storage-compat.js
   - firebase-auth-compat.js

2. Local Scripts:
   - firebase-config.js?v=4412ea9  → Initializes Firebase
   - js/auth-manager.js            → registerUser() function
   - listener-registry.js          → Event management

3. External Libraries:
   - Feather Icons (unpkg.com)
```

**Key Functions:**
- `window.authManager.registerUser(userData)` → Called on form submit
- `validatePLZRegion()` → Live validation (PLZ_REGION_MAP)
- `checkIfSuperAdmin()` → Shows werkstatt creation form if super-admin

**Global Variables Used:**
- `window.auth` (Firebase Auth)
- `window.db` (Firestore)
- `window.authManager` (Auth Manager instance)
- `window.firebaseInitialized` (Boolean flag)

**Data Flow:**
```
User fills form
  → Validate PLZ (5 digits)
  → Validate Region match
  → registerUser() called
    → Firebase Auth createUser()
    → users/{uid} created (status: pending)
    → partners/{uid} created (werkstattId: null)
    → Email verification sent
  → Success message shown
```

---

### pending-registrations.html
**Purpose:** Admin panel for approving pending partner registrations

**Script Dependencies (in load order):**
```html
1. Firebase SDK (CDN):
   - firebase-app-compat.js
   - firebase-firestore-compat.js
   - firebase-auth-compat.js
   - firebase-storage-compat.js
   - firebase-functions-compat.js  ← NEEDED for ensurePartnerAccount

2. Local Scripts:
   - firebase-config.js?v=4412ea9

3. External Libraries:
   - Feather Icons
```

**Key Functions:**
- `loadAllWerkstaetten()` → Loads active werkstätten from users collection
- `loadPendingRegistrations()` → Loads partners with status='pending'
- `suggestWerkstatt(plz, region)` → PLZ-based matching (98%, 85%, 70%, 60%)
- `assignPartner(partnerId)` → Assigns werkstattId + activates account
- `rejectPartner(partnerId)` → Deletes partner (spam removal)

**Global Variables Used:**
- `window.db` (Firestore)
- `allWerkstaetten` (Array) → Loaded once on page init
- `pendingRegistrations` (Array) → Real-time listener
- `currentFilter` (String) → Filter state

**Data Flow:**
```
Admin opens page
  → loadAllWerkstaetten() (reads users where role='werkstatt', status='active')
    → Extracts: id, name, email, adresse{plz, stadt, strasse, hausnummer, telefon}
  → loadPendingRegistrations() (reads partners where status='pending')
    → For each partner:
      → suggestWerkstatt(partner.plz, partner.region)
        → Exact PLZ match → 98% confidence
        → PLZ prefix match → 85% confidence
        → PLZ proximity → 70% confidence
        → Stadt match → 60% confidence
      → Render card with color-coding (green/yellow/red)
  → Admin clicks "Zuordnen & Aktivieren"
    → assignPartner(partnerId)
      → Update partners/{uid}: werkstattId, status='active', assignedAt
      → Copy to partners_{werkstattId}/{uid}
      → Update users/{uid}: status='active'
      → ensurePartnerAccount Cloud Function (sets Custom Claims)
  → Partner removed from list (real-time update)
```

---

### admin-dashboard.html
**Purpose:** Admin dashboard with pending registration badge

**Dependencies:**
- Same Firebase SDK as pending-registrations.html
- firebase-config.js
- Feather Icons

**Key Functions:**
- `updatePendingBadge()` → Counts partners with status='pending'
- Updates button badge + stat-card badge

**Data Flow:**
```
Admin opens dashboard
  → updatePendingBadge()
    → db.collection('partners').where('status', '==', 'pending').get()
    → Count → Update badge elements
    → If count > 0: Show pulsing red badge
```

---

## 2. JavaScript Module Dependencies

### js/auth-manager.js
**Purpose:** Authentication + user management

**Key Functions:**

#### `registerUser(userData)`
**Dependencies:**
- `window.auth.createUserWithEmailAndPassword()` (Firebase Auth)
- `window.db.collection('users')` (Firestore)
- `window.db.collection('partners')` (Firestore - if role='partner')

**Flow:**
```javascript
1. Validate input (email, password, name, role)
2. If role='partner':
   - Validate PLZ (5 digits, numeric)
   - Validate stadt, region (required)
3. Create Firebase Auth account
4. Create users/{uid} document:
   - uid, email, name, company, role
   - status: 'pending'
   - plz, stadt, region
5. If role='partner':
   - Create partners/{uid} document:
     - partnerId, kundenname, email, plz, stadt, region
     - status: 'pending'
     - werkstattId: null
6. Send email verification
7. Return user object
```

#### `loginWerkstatt(email, password)`
**Dependencies:**
- `window.auth.signInWithEmailAndPassword()`
- `window.db.collection('users').doc(uid).get()`

**Critical Change (Bug #8 Fix - Commit 35ae4eb):**
```javascript
// Line 207 (ADDED):
window.werkstattId = currentWerkstatt.werkstattId;
console.log('🔒 window.werkstattId set to:', window.werkstattId);
```

**Why Critical:**
- `window.getCollectionName()` checks `window.werkstattId` FIRST
- Without this, hardcoded values would override
- Now dynamically set after successful login

#### Firebase Auth State Listener
**Critical Change (Bug #8 Fix - Commit 35ae4eb):**
```javascript
// Line 483 (ADDED):
window.werkstattId = currentWerkstatt.werkstattId;
console.log('🔒 window.werkstattId restored to:', window.werkstattId);
```

**Why Critical:**
- Restores werkstattId on page reload
- Ensures multi-tenant isolation persists across sessions

---

### firebase-config.js
**Purpose:** Firebase initialization + collection helper functions

**Key Functions:**

#### `window.getCollectionName(baseCollectionName)`
**Logic (Priority Order):**
```javascript
1. Check window.werkstattId (set by auth-manager.js after login)
2. Check authManager.getCurrentUser().werkstattId
3. Check localStorage 'partner' → werkstattId
4. Fallback: return baseCollectionName (no suffix)
```

**Why Priority Matters:**
- **Pre-Bug #8 Fix:** Hardcoded `window.werkstattId = 'mosbach'` in HTML overrode everything
- **Post-Bug #8 Fix:** `window.werkstattId` only set dynamically, ensuring correct isolation

#### `window.getCollection(baseCollectionName)`
**Wrapper:**
```javascript
return window.db.collection(window.getCollectionName(baseCollectionName));
```

**Examples:**
```javascript
// mosbach werkstatt logged in:
window.getCollection('kunden') → db.collection('kunden_mosbach')

// testnov11 werkstatt logged in:
window.getCollection('kunden') → db.collection('kunden_testnov11')

// Global collections (no suffix):
window.db.collection('users')    → 'users' (always global)
window.db.collection('partners') → 'partners' (global for pending only)
```

---

## 3. Firestore Security Rules Dependencies

### partners collection (Global)
**Purpose:** Pending partner registrations BEFORE werkstatt assignment

**Rules:**
```javascript
match /partners/{partnerId} {
  // Self-registration
  allow create: if isAuthenticated()
                && request.resource.data.status == 'pending'
                && request.resource.data.partnerId == request.auth.uid
                && request.resource.data.werkstattId == null
                && request.resource.data.keys().hasAll([
                    'partnerId', 'kundenname', 'email',
                    'plz', 'stadt', 'region', 'status', 'createdAt'
                ]);

  // Admin full access
  allow read, write: if isAdmin();

  // Partner can read own document (even when pending)
  allow read: if isAuthenticated() && isOwner(partnerId);
}
```

**Critical Requirements:**
- ✅ `status` MUST be 'pending'
- ✅ `werkstattId` MUST be null
- ✅ All location fields required: plz, stadt, region
- ✅ `partnerId` MUST match authenticated user's uid

---

### partners_{werkstattId} collections (Multi-Tenant)
**Purpose:** Active partners AFTER admin assignment

**Rules:**
```javascript
match /partners_{werkstattId}/{partnerId} {
  // Admin full access
  allow read, write: if isAdmin();

  // Partners: Read own + assigned werkstatt
  allow read: if isPartner()
              && isActive()
              && (isOwner(partnerId) || belongsToSameWerkstatt(werkstattId));

  // Werkstatt: Full access to own partners
  allow read, write: if isWerkstatt()
                      && isActive()
                      && belongsToWerkstatt(werkstattId);
}
```

**Custom Function Dependencies:**
```javascript
function belongsToWerkstatt(wId) {
  return request.auth.token.werkstattId == wId;
}

function isOwner(userId) {
  return request.auth.uid == userId
      || (exists(/databases/$(database)/documents/users/$(request.auth.uid))
          && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.uid == userId);
}

function isAdmin() {
  return request.auth.token.role == 'admin'
      || request.auth.token.role == 'superadmin';
}
```

---

## 4. Cloud Functions Dependencies

### ensurePartnerAccount
**Purpose:** Sets Custom Claims for partner after werkstatt assignment

**Trigger:** Called manually from pending-registrations.html after assignment

**Dependencies:**
- Firebase Admin SDK (functions/node_modules)
- Firestore read: `partners/{partnerId}`
- Firestore read: `partners_{werkstattId}/{partnerId}`

**Flow:**
```javascript
1. Read partners/{partnerId} to verify werkstattId exists
2. Read partners_{werkstattId}/{partnerId} to verify copy exists
3. Set Custom Claims:
   - role: 'partner'
   - werkstattId: '{werkstattId}'
   - partnerId: '{partnerId}'
4. Force token refresh on client
```

**Critical:**
- Custom Claims enable instant access checks
- Faster than Firestore lookups (JWT cached)
- Required for Security Rules: `request.auth.token.werkstattId`

---

## 5. Data Flow Dependencies

### Registration → Assignment → Login

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Partner Registration (registrierung.html)              │
├─────────────────────────────────────────────────────────────────┤
│ User fills form (name, email, password, PLZ, stadt, region)    │
│  ↓                                                               │
│ registerUser() (auth-manager.js)                                │
│  ↓                                                               │
│ Firebase Auth: createUser() → {uid}                             │
│  ↓                                                               │
│ Firestore writes:                                               │
│  • users/{uid}:                                                 │
│     - status: 'pending'                                         │
│     - plz, stadt, region                                        │
│  • partners/{uid}:                                              │
│     - status: 'pending'                                         │
│     - werkstattId: null                                         │
│     - plz, stadt, region                                        │
│  ↓                                                               │
│ Email verification sent                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Admin Approval (pending-registrations.html)            │
├─────────────────────────────────────────────────────────────────┤
│ Admin opens pending-registrations.html                          │
│  ↓                                                               │
│ loadAllWerkstaetten():                                          │
│  • Read users where role='werkstatt', status='active'          │
│  • Extract: id, name, email, adresse{plz, stadt, ...}          │
│  ↓                                                               │
│ loadPendingRegistrations():                                     │
│  • Read partners where status='pending'                         │
│  • For each: suggestWerkstatt(plz, region)                     │
│    - 98%: Exact PLZ match                                      │
│    - 85%: PLZ prefix match                                     │
│    - 70%: PLZ proximity                                        │
│    - 60%: Stadt match                                          │
│  ↓                                                               │
│ Admin clicks "Zuordnen & Aktivieren"                            │
│  ↓                                                               │
│ assignPartner(partnerId):                                       │
│  • Update partners/{uid}:                                       │
│     - werkstattId: 'mosbach'                                   │
│     - status: 'active'                                         │
│     - assignedAt: timestamp                                    │
│  • Copy to partners_mosbach/{uid}                              │
│  • Update users/{uid}:                                         │
│     - status: 'active'                                         │
│  • Call ensurePartnerAccount Cloud Function                    │
│     - Set Custom Claims (werkstattId, role, partnerId)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Partner Login (partner-app/index.html)                 │
├─────────────────────────────────────────────────────────────────┤
│ Partner enters email + password                                 │
│  ↓                                                               │
│ Firebase Auth: signInWithEmailAndPassword()                    │
│  ↓                                                               │
│ getUserStatus() (auth-manager.js):                             │
│  • Read users/{uid}                                            │
│  • Check status === 'active' → ✅ Allow                        │
│  • If 'pending' → ❌ Block with message                        │
│  ↓                                                               │
│ Custom Claims loaded:                                           │
│  • request.auth.token.werkstattId = 'mosbach'                 │
│  • request.auth.token.role = 'partner'                        │
│  • request.auth.token.partnerId = '{uid}'                     │
│  ↓                                                               │
│ Redirect to partner-app/service-auswahl.html                   │
│  ↓                                                               │
│ Access partners_mosbach data (Security Rules check)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Critical Dependencies for Bug #8 Fix

### Problem (Pre-Fix):
```javascript
// In kunden.html, annahme.html, abnahme.html, kanban.html, liste.html,
// kalender.html, material.html, index.html:

<script>
  window.werkstattId = 'mosbach';  // ❌ HARDCODED
</script>
```

**Result:**
- testnov11 werkstatt logged in → `window.werkstattId = 'mosbach'` (hardcoded)
- `window.getCollectionName('kunden')` → 'kunden_mosbach' (WRONG!)
- testnov11 sees mosbach data → **CRITICAL SECURITY ISSUE**

### Solution (Post-Fix - Commit 35ae4eb):

**1. Removed hardcoded werkstattId from 8 HTML files:**
```javascript
// New comment in <head>:
<script>
  // werkstattId will be set dynamically by auth-manager.js after login
  // This ensures proper multi-tenant data isolation
</script>
```

**2. Set werkstattId dynamically in auth-manager.js (2 locations):**

**Location 1: After successful login (Line 207):**
```javascript
async function loginWerkstatt(email, password) {
  // ... login logic ...

  // ✅ Set global werkstattId for all pages
  window.werkstattId = currentWerkstatt.werkstattId;
  console.log('🔒 window.werkstattId set to:', window.werkstattId);
}
```

**Location 2: On auth state restore (Line 483):**
```javascript
window.addEventListener('firebaseReady', () => {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user && userData.role === 'werkstatt') {
      // ... restore user data ...

      // ✅ Set global werkstattId for all pages
      window.werkstattId = currentWerkstatt.werkstattId;
      console.log('🔒 window.werkstattId restored to:', window.werkstattId);
    }
  });
});
```

**Result:**
- testnov11 werkstatt logs in → `window.werkstattId = 'testnov11'` (dynamic)
- `window.getCollectionName('kunden')` → 'kunden_testnov11' (CORRECT!)
- testnov11 sees only testnov11 data → **ISOLATION FIXED** ✅

---

## 7. Address-System Dependencies (NEW - Commit 636730e)

### setup-werkstatt.html
**New Fields Added:**
```html
<input id="strasse" placeholder="z.B. Industriestraße">
<input id="hausnummer" placeholder="z.B. 12">
<input id="plz" pattern="[0-9]{5}" placeholder="z.B. 74821">
<input id="stadt" placeholder="z.B. Mosbach">
<input id="telefon" placeholder="z.B. +49 6261 123456" (optional)>
```

**Firestore Write:**
```javascript
await window.db.collection('users').doc(uid).set({
  // ... existing fields ...
  adresse: {
    strasse: strasse,
    hausnummer: hausnummer,
    plz: plz,
    stadt: stadt,
    telefon: telefon || null
  }
});
```

### pending-registrations.html
**loadAllWerkstaetten() Enhancement:**
```javascript
allWerkstaetten = snapshot.docs.map(doc => {
  const data = doc.data();
  return {
    id: data.werkstattId,
    name: data.name,
    email: data.email,
    // ✅ NEW: Extract address fields
    plz: data.adresse?.plz || null,
    stadt: data.adresse?.stadt || null,
    strasse: data.adresse?.strasse || null,
    hausnummer: data.adresse?.hausnummer || null,
    telefon: data.adresse?.telefon || null
  };
});
```

**PLZ-Matching Algorithm:**
```javascript
function suggestWerkstatt(partnerPlz, partnerRegion) {
  // 98%: Exact PLZ match
  if (partnerPlz) {
    const exactMatch = allWerkstaetten.find(w => w.plz === partnerPlz);
    if (exactMatch) return { werkstatt: exactMatch.id, confidence: 98 };
  }

  // 85%: PLZ prefix match (first 2 digits)
  if (partnerPlz) {
    const partnerPrefix = partnerPlz.substring(0, 2);
    const prefixMatch = allWerkstaetten.find(w =>
      w.plz && w.plz.substring(0, 2) === partnerPrefix
    );
    if (prefixMatch) return { werkstatt: prefixMatch.id, confidence: 85 };
  }

  // 70%: PLZ proximity (within 10km radius - approximation)
  if (partnerPlz) {
    const partnerNum = parseInt(partnerPlz);
    const proximityMatch = allWerkstaetten.find(w => {
      if (!w.plz) return false;
      const werkstattNum = parseInt(w.plz);
      const diff = Math.abs(werkstattNum - partnerNum);
      return diff <= 100; // ~10km radius
    });
    if (proximityMatch) return { werkstatt: proximityMatch.id, confidence: 70 };
  }

  // 60%: Stadt name match
  if (partnerRegion) {
    const stadtMatch = allWerkstaetten.find(w =>
      w.stadt && w.stadt.toLowerCase() === partnerRegion.toLowerCase()
    );
    if (stadtMatch) return { werkstatt: stadtMatch.id, confidence: 60 };
  }

  // No match
  return { werkstatt: null, confidence: 0 };
}
```

---

## 8. Summary: Critical Dependency Chain

```
Firebase SDK (9.22.0)
  → firebase-config.js (Firebase init)
    → window.firebaseInitialized = true (flag)
      → auth-manager.js (Authentication)
        → registerUser() → Creates users/{uid} + partners/{uid}
        → loginWerkstatt() → Sets window.werkstattId (Bug #8 fix)
          → window.getCollectionName() → Appends werkstattId suffix
            → window.getCollection() → Returns correct collection
              → pending-registrations.html
                → loadAllWerkstaetten() → Loads werkstätten with addresses
                → suggestWerkstatt() → PLZ-based matching (98%)
                → assignPartner() → Assigns + activates
                  → ensurePartnerAccount Cloud Function
                    → Custom Claims set
                      → Partner can login
                        → Access werkstatt-specific data ✅
```

---

## 9. Testing Dependencies

### Required Test Environment:
1. ✅ GitHub Pages deployment (live)
2. ✅ Firebase Production database (auto-lackierzentrum-mosbach)
3. ✅ Firestore Security Rules deployed
4. ✅ Cloud Functions deployed (europe-west3)

### Required Test Data:
1. ✅ mosbach werkstatt exists
   - Email: werkstatt-mosbach@auto-lackierzentrum.de
   - Has address with PLZ 74821
2. ✅ testnov11 werkstatt exists
   - Email: werkstatt-test-nov2025@auto-lackierzentrum.de
   - Password: GG1BG61G
   - Should have 0 kunden (new werkstatt)
3. ❓ Klaus Mark partner (PLZ 74821) - May need manual creation

### Browser Requirements:
- Firebase SDK v9.22.0 compatible (Chrome, Firefox, Safari latest)
- Console access (F12)
- localStorage enabled
- Cookies enabled

---

**Generated by:** Claude Code (QA Lead)
**Session:** Pre-Testing Dependency Analysis (2025-11-03)
