# 🏢 Multi-Tenant System - Code-Referenz

**Purpose:** Vollständige Dokumentation des Multi-Tenant Systems in der Fahrzeugannahme App

**Zuletzt aktualisiert:** 2025-10-31 (Test Session)

---

## 🎯 Overview

Die App unterstützt **mehrere Werkstätten (Tenants)** mit vollständiger Daten-Isolierung:

| Werkstatt | werkstattId | Collections | Status |
|-----------|-------------|-------------|--------|
| **Mosbach** | `mosbach` | `fahrzeuge_mosbach`, `kunden_mosbach`, etc. | ✅ Production |
| **Heidelberg** | `heidelberg` | `fahrzeuge_heidelberg`, `kunden_heidelberg`, etc. | ✅ Ready |
| **Heilbronn** | `heilbronn` | `fahrzeuge_heilbronn`, `kunden_heilbronn`, etc. | ✅ Ready |

**Architecture Pattern:**
```
Global Collection Pattern (DEPRECATED):
  ❌ fahrzeuge → Shared by all werkstätten

Multi-Tenant Pattern (ACTIVE):
  ✅ fahrzeuge_mosbach → Only Mosbach data
  ✅ fahrzeuge_heidelberg → Only Heidelberg data
```

---

## 📍 Core Concepts

### 1. Collection Naming Convention

**Pattern:** `{baseCollection}_{werkstattId}`

**Examples:**
```javascript
'fahrzeuge' + '_mosbach'   → 'fahrzeuge_mosbach'
'kunden' + '_heidelberg'   → 'kunden_heidelberg'
'kalender' + '_heilbronn'  → 'kalender_heilbronn'
```

### 2. Two-Priority werkstattId Detection

**Priority 1: window.werkstattId** (Partner-App, Early Init)
- Set in `<head>` tag: `window.werkstattId = 'mosbach';`
- Available immediately
- Used by Partner-App

**Priority 2: authManager** (Main App, Auth-based)
- Loaded from Firestore `users` collection
- Set after successful login
- Used by Main App (Werkstatt + Mitarbeiter)

---

## 📍 Code Locations

### 1. Helper Functions

**File:** `firebase-config.js`
**Lines:** 405-449

#### getCollectionName() (Lines 405-429)

```javascript
/**
 * Get collection name with automatic werkstattId suffix
 * @param {string} baseCollection - Base collection name (e.g., 'fahrzeuge', 'kunden')
 * @returns {string} Collection name with werkstattId (e.g., 'fahrzeuge_mosbach')
 */
window.getCollectionName = function(baseCollection) {
  // 🆕 BUG #1 FIX: PRIORITY 1 - Check window.werkstattId (Partner-App pattern)
  if (window.werkstattId) {
    const collectionName = `${baseCollection}_${window.werkstattId}`;
    console.log(`🏢 getCollectionName [window]: ${baseCollection} → ${collectionName}`);
    return collectionName;
  }

  // PRIORITY 2 - Check auth-manager (Main App pattern)
  const currentUser = window.authManager?.getCurrentUser();
  if (currentUser?.werkstattId) {
    const collectionName = `${baseCollection}_${currentUser.werkstattId}`;
    console.log(`🏢 getCollectionName [authManager]: ${baseCollection} → ${collectionName}`);
    return collectionName;
  }

  // 🆕 FALLBACK: Error werfen statt silent failure!
  console.error('❌ CRITICAL: getCollectionName - werkstattId nicht gefunden!', {
    'window.werkstattId': window.werkstattId,
    'authManager exists': !!window.authManager,
    'currentUser': currentUser,
    baseCollection: baseCollection
  });
  throw new Error(`werkstattId required for collection '${baseCollection}' but not found`);
};
```

**Detection Logic:**
1. Check `window.werkstattId` first (early init, Partner-App)
2. If not found, check `authManager.getCurrentUser().werkstattId` (Main App)
3. If neither found, throw error (prevent silent failures!)

---

#### getCollection() (Lines 440-449)

```javascript
/**
 * Get Firestore collection with automatic werkstattId suffix
 * @param {string} baseCollection - Base collection name (e.g., 'fahrzeuge', 'kunden')
 * @returns {firebase.firestore.CollectionReference} Firestore collection reference
 */
window.getCollection = function(baseCollection) {
  const collectionName = window.getCollectionName(baseCollection);

  if (!db) {
    console.error('❌ getCollection: Firebase db not initialized!');
    throw new Error('Firebase db not initialized');
  }

  return db.collection(collectionName);
};
```

**Usage:**
```javascript
// ✅ CORRECT - Auto-appends werkstattId
const fahrzeuge = window.getCollection('fahrzeuge');
// → Returns db.collection('fahrzeuge_mosbach')

const snapshot = await fahrzeuge.get();
```

---

#### getWerkstattId() (Lines 458+)

```javascript
/**
 * Get current werkstattId from logged-in user
 * @returns {string|null} werkstattId or null if not logged in
 */
window.getWerkstattId = function() {
  const currentUser = window.authManager?.getCurrentUser();
  return currentUser?.werkstattId || window.werkstattId || null;
};
```

---

### 2. Early werkstattId Initialization

**File:** All HTML pages (annahme.html, liste.html, kanban.html, etc.)
**Lines:** 4-8 in `<head>` tag

```html
<!-- Bug #5 Fix: Early werkstattId initialization -->
<script>
    window.werkstattId = 'mosbach';
    console.log('✅ werkstattId set early:', window.werkstattId);
</script>
```

**Why Early Init?**
- Prevents "werkstattId timeout" errors
- Ensures werkstattId is available BEFORE Firebase loads
- Required for auth-check polling pattern

---

### 3. Auth Manager Integration

**File:** `js/auth-manager.js`
**Lines:** 414-478

```javascript
firebase.auth().onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    console.log('🔐 Firebase Auth State Changed:', firebaseUser.email);

    // Fetch user data from Firestore
    const userDoc = await db.collection('users').doc(firebaseUser.uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      currentAuthUser = firebaseUser;
      currentWerkstatt = userData;

      // 🏢 Set global werkstattId from user data
      window.werkstattId = userData.werkstattId;

      console.log('✅ Current Auth User (Werkstatt):', userData);
      console.log('   WerkstattID:', userData.werkstattId);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('authReady', { detail: userData }));
    }
  } else {
    console.log('🔐 No user logged in');
    currentAuthUser = null;
    currentWerkstatt = null;
  }
});
```

**Flow:**
1. User logs in → Firebase Auth
2. Fetch user document from `users` collection
3. Extract `werkstattId` from user data
4. Set `window.werkstattId = userData.werkstattId`
5. Dispatch `authReady` event

---

## 🔒 Firestore Security Rules

**File:** `firestore.rules`

### Multi-Tenant Collections (Lines 251-315)

```javascript
// ============================================
// MULTI-TENANT COLLECTIONS (werkstatt-specific)
// Using wildcard pattern: /{collection}_{werkstatt}/{docId}
// ============================================

// Fahrzeuge Collections: fahrzeuge_mosbach, fahrzeuge_heidelberg, etc.
match /{fahrzeugeCollection}/{vehicleId} {
  allow read, write: if fahrzeugeCollection.matches('fahrzeuge_.*')
                     && (isAdmin() || (isMitarbeiter() && isActive()));

  // Subcollections: Fotos
  match /fotos/{photoId} {
    allow read, write: if fahrzeugeCollection.matches('fahrzeuge_.*')
                       && (isAdmin() || (isMitarbeiter() && isActive()));
  }
}

// Kunden Collections: kunden_mosbach, kunden_heidelberg, etc.
match /{kundenCollection}/{kundeId} {
  allow read, write: if kundenCollection.matches('kunden_.*')
                     && (isAdmin() || (isMitarbeiter() && isActive()));
}

// Mitarbeiter Collections: mitarbeiter_mosbach, mitarbeiter_heidelberg, etc.
match /{mitarbeiterCollection}/{mitarbeiterId} {
  allow read, write: if mitarbeiterCollection.matches('mitarbeiter_.*') && isAdmin();
  allow read: if mitarbeiterCollection.matches('mitarbeiter_.*') && isMitarbeiter() && isActive();
  allow create, delete: if mitarbeiterCollection.matches('mitarbeiter_.*') && isAdmin();
}

// Kalender Collections: kalender_mosbach, kalender_heidelberg, etc.
match /{kalenderCollection}/{terminId} {
  allow read, write: if kalenderCollection.matches('kalender_.*')
                     && (isAdmin() || (isMitarbeiter() && isActive()));
  allow read: if kalenderCollection.matches('kalender_.*') && isPartner() && isActive() && isOwner(resource.data.partnerId);
}

// Material Requests Collections: materialRequests_mosbach, etc.
match /{materialCollection}/{requestId} {
  allow read, write: if materialCollection.matches('materialRequests_.*')
                     && (isAdmin() || (isMitarbeiter() && isActive()));
}

// Einstellungen Collections: einstellungen_mosbach, etc.
match /{einstellungenCollection}/{docId} {
  allow read, write: if einstellungenCollection.matches('einstellungen_.*') && isAdmin();
  allow read: if einstellungenCollection.matches('einstellungen_.*') && isMitarbeiter() && isActive();
}
```

**Wildcard Pattern:** `/{collection}_{werkstatt}/{docId}`
- Matches: `fahrzeuge_mosbach`, `fahrzeuge_heidelberg`, etc.
- Uses regex: `fahrzeugeCollection.matches('fahrzeuge_.*')`
- Enforces role-based access (Admin, Mitarbeiter, Partner)

---

### Partner Anfragen Multi-Tenant (Lines 350-386)

```javascript
match /{anfrageCollection}/{anfrageId} {
  // Admins: Full access to all werkstätten anfragen
  allow read, write: if anfrageCollection.matches('partnerAnfragen_.*')
                     && (isAdmin());

  // Mitarbeiter: Full access to werkstatt-specific anfragen
  allow read, write: if anfrageCollection.matches('partnerAnfragen_.*')
                     && ((isMitarbeiter() && isActive()));

  // Partners: Can create and read their own anfragen
  allow create: if anfrageCollection.matches('partnerAnfragen_.*')
                && isPartner() && isActive();

  allow read: if anfrageCollection.matches('partnerAnfragen_.*')
              && isPartner() && isActive()
              && isOwner(resource.data.partnerId);

  // Subcollection: Chat Messages
  match /chat/{messageId} {
    allow read, write: if anfrageCollection.matches('partnerAnfragen_.*')
                       && (isAdmin() || (isMitarbeiter() && isActive()));

    allow read, write: if anfrageCollection.matches('partnerAnfragen_.*')
                       && isPartner() && isActive()
                       && isOwner(get(/databases/$(database)/documents/$(anfrageCollection)/$(anfrageId)).data.partnerId);
  }
}
```

---

## 📊 Multi-Tenant Collections List

| Base Collection | Multi-Tenant Pattern | Access Control |
|-----------------|----------------------|----------------|
| `fahrzeuge` | `fahrzeuge_{werkstattId}` | Admin, Mitarbeiter |
| `kunden` | `kunden_{werkstattId}` | Admin, Mitarbeiter |
| `mitarbeiter` | `mitarbeiter_{werkstattId}` | Admin (write), Mitarbeiter (read) |
| `kalender` | `kalender_{werkstattId}` | Admin, Mitarbeiter, Partner (read-only) |
| `materialRequests` | `materialRequests_{werkstattId}` | Admin, Mitarbeiter |
| `einstellungen` | `einstellungen_{werkstattId}` | Admin (write), Mitarbeiter (read) |
| `partnerAnfragen` | `partnerAnfragen_{werkstattId}` | Admin, Mitarbeiter, Partner (own) |
| `chatNotifications` | `chatNotifications_{werkstattId}` | Admin (write), Mitarbeiter (read) |
| `mitarbeiterNotifications` | `mitarbeiterNotifications_{werkstattId}` | Admin, Mitarbeiter (own) |

---

## 🔄 Usage Patterns

### Pattern 1: Standard Collection Access

```javascript
// ✅ CORRECT - Multi-Tenant safe
const fahrzeuge = window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'
const snapshot = await fahrzeuge.get();

fahrzeuge.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

### Pattern 2: Add Document

```javascript
// ✅ CORRECT
const fahrzeuge = window.getCollection('fahrzeuge');
const docRef = await fahrzeuge.add({
  kennzeichen: 'HD-AB 123',
  kunde: { name: 'Max Mustermann' },
  serviceTyp: 'reifen',
  status: 'neu',
  createdAt: Date.now(),
  werkstattId: window.werkstattId  // ← Optional, for double-check
});

console.log('Fahrzeug created:', docRef.id);
```

### Pattern 3: Update Document

```javascript
// ✅ CORRECT
const fahrzeuge = window.getCollection('fahrzeuge');
await fahrzeuge.doc(vehicleId).update({
  status: 'in-bearbeitung',
  lastModified: Date.now()
});
```

### Pattern 4: Delete Document

```javascript
// ✅ CORRECT
const fahrzeuge = window.getCollection('fahrzeuge');
await fahrzeuge.doc(vehicleId).delete();
```

### Pattern 5: Realtime Listener

```javascript
// ✅ CORRECT
const fahrzeuge = window.getCollection('fahrzeuge');
const unsubscribe = fahrzeuge.onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      console.log('New vehicle:', change.doc.data());
    }
  });
});

// Cleanup
window.listenerRegistry.registerFirestore(unsubscribe, 'Fahrzeuge Listener');
```

---

## ⚠️ Common Errors

### Error 1: "werkstattId timeout"

**Symptom:**
```
❌ Firebase initialization timeout
```

**Cause:** `window.werkstattId` not set before auth-check polling

**Fix:**
```html
<!-- Add to <head> tag BEFORE Firebase SDKs -->
<script>
    window.werkstattId = 'mosbach';
    console.log('✅ werkstattId set early:', window.werkstattId);
</script>
```

---

### Error 2: "werkstattId required but not found"

**Symptom:**
```
❌ CRITICAL: getCollectionName - werkstattId nicht gefunden!
Error: werkstattId required for collection 'fahrzeuge' but not found
```

**Cause:** Neither `window.werkstattId` nor `authManager.getCurrentUser().werkstattId` is set

**Debug:**
```javascript
// Check werkstattId sources
console.log('window.werkstattId:', window.werkstattId);
console.log('authManager:', window.authManager);
console.log('currentUser:', window.authManager?.getCurrentUser());
```

**Fix:**
1. Ensure early init in `<head>` tag
2. Ensure user is logged in (for Main App)
3. Check Firestore `users` collection has `werkstattId` field

---

### Error 3: Data from Wrong Werkstatt

**Symptom:** Mosbach sees Heidelberg data (or vice versa)

**Cause:** Using `db.collection()` instead of `window.getCollection()`

**Wrong:**
```javascript
// ❌ BYPASSES Multi-Tenant isolation!
const fahrzeuge = db.collection('fahrzeuge');  // → Global collection
```

**Correct:**
```javascript
// ✅ Multi-Tenant safe
const fahrzeuge = window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'
```

---

### Error 4: "Missing or insufficient permissions"

**Symptom:**
```
FirebaseError: Missing or insufficient permissions
```

**Cause:** Trying to access collection without proper role

**Check:**
1. User role: `console.log(window.authManager?.getCurrentUser()?.role)`
2. User status: `console.log(window.authManager?.getCurrentUser()?.status)`
3. WerkstattId matches: `console.log(window.werkstattId)`

**Roles & Access:**
- `admin` / `werkstatt`: Full access to all collections
- `mitarbeiter`: Read/write access (if `status === 'active'`)
- `partner`: Read-only access to own data
- `kunde`: Read-only access to own data

---

## 🧪 Testing Multi-Tenant Isolation

### Test 1: Create Vehicle in Mosbach

```javascript
// Setup
window.werkstattId = 'mosbach';

// Create
const fahrzeuge = window.getCollection('fahrzeuge');
const docRef = await fahrzeuge.add({
  kennzeichen: 'MOS-TEST-1',
  kunde: { name: 'Test Mosbach' },
  serviceTyp: 'reifen',
  status: 'neu'
});

// Verify collection name
console.log('Expected: fahrzeuge_mosbach');
console.log('Actual:', window.getCollectionName('fahrzeuge'));
```

**Expected Console:**
```
🏢 getCollectionName [window]: fahrzeuge → fahrzeuge_mosbach
Expected: fahrzeuge_mosbach
Actual: fahrzeuge_mosbach
```

---

### Test 2: Switch to Heidelberg (Same Tab)

```javascript
// Switch werkstattId
window.werkstattId = 'heidelberg';

// Query should now return DIFFERENT data
const fahrzeuge = window.getCollection('fahrzeuge');
const snapshot = await fahrzeuge.get();

console.log('Heidelberg vehicles:', snapshot.size);
// Should NOT include 'MOS-TEST-1' from Mosbach
```

**Expected:**
- Mosbach data is NOT visible
- Only Heidelberg-specific data returned

---

### Test 3: Firestore Console Verification

**Steps:**
1. Open Firebase Console → Firestore Database
2. Check collections list
3. **Expected Collections:**
   ```
   fahrzeuge_mosbach       (6 documents)
   fahrzeuge_heidelberg    (0 documents)
   kunden_mosbach          (2 documents)
   kunden_heidelberg       (0 documents)
   ```

4. Click `fahrzeuge_mosbach` → Should see 'MOS-TEST-1'
5. Click `fahrzeuge_heidelberg` → Should be empty

---

## 📈 Migration from Global to Multi-Tenant

### Legacy Collections (DEPRECATED)

These collections exist for backward compatibility but are **NO LONGER USED**:

```
❌ fahrzeuge            (global, deprecated)
❌ kunden               (global, deprecated)
❌ kalender             (global, deprecated)
❌ material             (global, deprecated)
❌ partnerAnfragen      (global, deprecated)
```

**Firestore Rules:**
- Lines 90-189: Legacy rules kept for read-only access
- Comment: "⚠️ DEPRECATED: Use {collection}_{werkstatt} instead"

---

### Migration Script (Conceptual)

**NOT YET IMPLEMENTED** - Manual migration for now

```javascript
// Conceptual migration script
async function migrateFahrzeugeToMultiTenant() {
  const globalFahrzeuge = db.collection('fahrzeuge');
  const snapshot = await globalFahrzeuge.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const werkstattId = data.werkstattId || 'mosbach';  // Default fallback

    // Copy to multi-tenant collection
    const targetCollection = db.collection(`fahrzeuge_${werkstattId}`);
    await targetCollection.doc(doc.id).set(data);

    console.log(`Migrated ${doc.id} → fahrzeuge_${werkstattId}`);
  }
}
```

---

## 🔗 Related References

- [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md) - Firebase Initialization (werkstattId early init)
- [REFERENCE_VEHICLE_INTAKE.md](REFERENCE_VEHICLE_INTAKE.md) - How annahme.html uses getCollection()
- [REFERENCE_PARTNER_APP.md](REFERENCE_PARTNER_APP.md) - Partner-App werkstattId pattern
- [CODEBASE_INDEX.md](CODEBASE_INDEX.md) - Master Index

---

_Created: 2025-10-31 during Manual Test Session_
_Last Updated: 2025-10-31_
