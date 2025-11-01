# 📚 Firebase Initialization - Code-Referenz

**Purpose:** Vollständige Dokumentation des Firebase Initialization Patterns in der Fahrzeugannahme App

**Zuletzt aktualisiert:** 2025-10-31 (Test Session)

---

## 🎯 Overview

Die App verwendet ein **2-stufiges Firebase Initialization Pattern** mit:
1. **Early werkstattId Setup** (im `<head>` Tag)
2. **Promise-based Firebase Init** (async, wartet auf SDK)
3. **Auth State Listener** (2-Stage Authentication)
4. **Multi-Tenant Collection Helper** (werkstattId auto-append)

---

## 📍 Code Locations

### 1. Early werkstattId Setup

**File:** Alle HTML-Dateien (index.html, annahme.html, liste.html, kanban.html, etc.)
**Lines:** Zeile 4-8 im `<head>`

```html
<!-- Bug #5 Fix: Early werkstattId initialization -->
<script>
    window.werkstattId = 'mosbach';
    console.log('✅ werkstattId set early:', window.werkstattId);
</script>
```

**Purpose:**
- WerkstattId MUSS vor allen Firebase-Operationen gesetzt sein
- Verhindert "werkstattId timeout" Errors
- Ermöglicht sofortigen Zugriff auf window.werkstattId

---

### 2. Firebase SDK Loading

**File:** Alle HTML-Dateien
**Lines:** Varies per file

**Example (annahme.html lines 34-40):**
```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-functions-compat.js"></script>
<script src="firebase-config.js?v=a4192c4"></script>
```

**Order wichtig:**
1. Firebase SDKs (app, firestore, storage, auth, functions)
2. firebase-config.js (unser Custom Config)

---

### 3. Firebase Config Initialization

**File:** `firebase-config.js`
**Lines:** 50-162 (Firebase Credentials + Initialization)

#### Firebase Credentials (Lines 98-109)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDuiIZdBGvNb3rYGOOw44QIxt-zesya3Kg",
  authDomain: "auto-lackierzentrum-mosbach.firebaseapp.com",
  projectId: "auto-lackierzentrum-mosbach",
  storageBucket: "auto-lackierzentrum-mosbach.firebasestorage.app",
  messagingSenderId: "764653849524",
  appId: "1:764653849524:web:fad5c23f1a01e2d8ddc99a",
  measurementId: "G-SXQVLSPKTN"
};
```

#### Environment Detection (Lines 61-95)

```javascript
// CRITICAL FIX RUN #46: Auto-detect CI/Test Environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowserEnvironment = typeof window !== 'undefined';

let useEmulator = false;

if (isBrowserEnvironment) {
  const isPlaywrightTest = navigator.webdriver === true;
  const forceEmulator = window.location.search.includes('useEmulator=true');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Only use emulator if:
  // 1. Playwright test (automated testing)
  // 2. Explicitly requested via ?useEmulator=true URL parameter
  useEmulator = isPlaywrightTest || forceEmulator;

  console.log('🔥 Firebase Config Loading (Browser)...');
  console.log('  ✅ Use Emulator:', useEmulator);
  console.log('  ✅ Target:', useEmulator ? 'EMULATORS' : 'PRODUCTION Firebase (europe-west3)');
}
```

**Purpose:**
- Auto-detect wenn Emulators verwendet werden sollen
- Production Default (useEmulator = false)
- Nur bei Playwright Tests oder explizitem `?useEmulator=true` Parameter

---

### 4. DOMContentLoaded Initialization

**File:** `firebase-config.js`
**Lines:** 1086-1195

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 DOMContentLoaded event fired - starting Firebase initialization...');

  console.log('🔥 Initializing Firebase App...');
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized');

  // Initialize Firestore
  db = firebase.firestore();

  // Connect to Emulators if needed
  if (useEmulator) {
    db.useEmulator('localhost', 8080);
    console.log('✅ Firestore connected to EMULATOR (localhost:8080)');
  } else {
    console.log('✅ Firestore connected (Production)');
  }

  // Initialize Storage
  storage = firebase.storage();
  if (useEmulator) {
    storage.useEmulator('localhost', 9199);
  }

  // Initialize Auth
  auth = firebase.auth();

  // Initialize Functions
  functions = firebase.functions('europe-west3');
  if (useEmulator) {
    functions.useEmulator('localhost', 5001);
  }

  // Expose globally
  window.db = db;
  window.storage = storage;
  window.auth = auth;
  window.functions = functions;

  // Resolve initialization promise
  resolveFirebaseInit(true);
  console.log('✅ Firebase initialization Promise resolved');
});
```

**Pattern:**
1. Wait for DOM
2. Initialize Firebase App
3. Initialize Services (Firestore, Storage, Auth, Functions)
4. Connect to Emulators (if needed)
5. Expose globally via `window.*`
6. Resolve Promise

---

### 5. Firebase Initialization Promise

**File:** `firebase-config.js`
**Lines:** 173-180

```javascript
let resolveFirebaseInit;
let firebaseInitialized = new Promise((resolve) => {
  resolveFirebaseInit = resolve;
});

// Expose promise globally
window.firebaseInitialized = firebaseInitialized;
```

**Usage in App:**

```javascript
// Wait for Firebase to be ready
await window.firebaseInitialized;

// Now safe to use Firestore
const collection = window.getCollection('fahrzeuge');
```

**Why Promise?**
- Firebase SDK loads asynchronously
- Prevents "db not initialized" errors
- Allows awaiting in async functions

---

## 🔄 Multi-Tenant Collection Helper

### getCollectionName() Function

**File:** `firebase-config.js`
**Lines:** 405-429

```javascript
window.getCollectionName = function(baseCollection) {
  // PRIORITY 1 - Check window.werkstattId (Partner-App pattern)
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

  // FALLBACK: Error werfen statt silent failure!
  console.error('❌ CRITICAL: getCollectionName - werkstattId nicht gefunden!');
  throw new Error(`werkstattId required for collection '${baseCollection}' but not found`);
};
```

**Purpose:**
- Auto-appends werkstattId to collection name
- `fahrzeuge` → `fahrzeuge_mosbach`
- Ensures Multi-Tenant data isolation

---

### getCollection() Function

**File:** `firebase-config.js`
**Lines:** 440-449

```javascript
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
// ✅ CORRECT - Multi-Tenant safe
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach
const snapshot = await fahrzeuge.get();

// ❌ WRONG - Bypasses Multi-Tenant isolation
const fahrzeuge = db.collection('fahrzeuge');  // → Global collection!
```

---

## 🔐 Auth State Listener

**File:** `auth-manager.js`
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

      // Set global werkstattId
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

**Purpose:**
- Listens to Firebase Auth state changes
- Fetches user data from Firestore `users` collection
- Sets `window.werkstattId` from user data
- Dispatches `authReady` event for other components

---

## 📊 Auth-Check Polling Pattern (Legacy)

**Note:** Einige Seiten verwenden noch ein Polling-Pattern. Dieses sollte durch das Event-System ersetzt werden.

**Example (alte Partner-App Seiten):**

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
}, 250);  // Check every 250ms, max 20 attempts = 5 seconds
```

**Better Approach (Event-based):**

```javascript
window.addEventListener('authReady', async (event) => {
  const userData = event.detail;
  console.log('Auth ready:', userData);

  // Now safe to load data
  await loadFahrzeuge();
});
```

---

## 🧪 Test Results (Session 2025-10-31)

### SCHRITT 1.1 Console Logs:

```
✅ werkstattId set early: mosbach
🔥 Firebase Config Loading (Browser)...
  ✅ Use Emulator: false
  ✅ Target: PRODUCTION Firebase (europe-west3)
✅ Firebase App initialized
✅ Functions connected (Production - europe-west3)
✅ Firestore connected (Production)
✅ Storage connected (Production)
✅ Auth connected (Production)
✅ Firebase initialization Promise resolved
🔐 Firebase Auth State Changed: werkstatt-mosbach@auto-lackierzentrum.de
✅ Current Auth User (Werkstatt): {werkstattId: 'mosbach', role: 'werkstatt', ...}
🏢 getCollectionName [window]: partnerAnfragen → partnerAnfragen_mosbach
```

**Status:** ✅ **WORKING PERFECTLY**

---

## 🔍 Common Patterns

### Pattern 1: Wait for Firebase before Firestore Ops

```javascript
// In async function
await window.firebaseInitialized;
const collection = window.getCollection('fahrzeuge');
const snapshot = await collection.get();
```

### Pattern 2: Check if Firebase is Ready (Synchronous)

```javascript
if (window.firebaseInitialized && window.werkstattId) {
  // Safe to use Firestore
  const collection = window.getCollection('fahrzeuge');
}
```

### Pattern 3: Listen for Auth Ready Event

```javascript
window.addEventListener('authReady', async (event) => {
  const userData = event.detail;
  // Load user-specific data
});
```

---

## ⚠️ Common Errors

### Error 1: "db not initialized"

**Cause:** Trying to use Firestore before Firebase is initialized

**Fix:**
```javascript
// ❌ WRONG
const snapshot = db.collection('fahrzeuge').get();

// ✅ CORRECT
await window.firebaseInitialized;
const snapshot = window.getCollection('fahrzeuge').get();
```

### Error 2: "werkstattId timeout"

**Cause:** werkstattId not pre-initialized before auth-check polling

**Fix:**
```javascript
// Add early werkstattId setup in <head>
window.werkstattId = 'mosbach';
```

### Error 3: "Missing or insufficient permissions"

**Cause:** User not authenticated or wrong role

**Fix:**
- Ensure user is logged in
- Check Firestore Rules
- Verify werkstattId matches collection suffix

---

## 📝 Development Guidelines

### When adding a new page:

1. **Add Early werkstattId Setup:**
   ```html
   <script>
       window.werkstattId = 'mosbach';
   </script>
   ```

2. **Include Firebase SDKs:**
   ```html
   <script src="firebase-config.js"></script>
   <script src="js/auth-manager.js"></script>
   ```

3. **Wait for Firebase:**
   ```javascript
   document.addEventListener('DOMContentLoaded', async () => {
       await window.firebaseInitialized;
       // Now safe to use Firestore
   });
   ```

4. **Use Multi-Tenant Helper:**
   ```javascript
   const collection = window.getCollection('fahrzeuge');  // NOT db.collection()
   ```

---

## 🔗 Related References

- [REFERENCE_MULTI_TENANT.md](REFERENCE_MULTI_TENANT.md) - Multi-Tenant System Details
- [REFERENCE_VEHICLE_INTAKE.md](REFERENCE_VEHICLE_INTAKE.md) - How annahme.html uses Firebase
- [CODEBASE_INDEX.md](CODEBASE_INDEX.md) - Master Index

---

_Created: 2025-10-31 during Manual Test Session_
_Last Updated: 2025-10-31_
