/**
 * Firebase Configuration für PRODUCTION (GitHub Pages)
 *
 * Diese Datei enthält die echten Firebase Credentials für die Production-Umgebung.
 * Sie wird NICHT ins Git committed (.gitignore) aus Security-Gründen.
 *
 * ⚠️ ACTION REQUIRED:
 * Bitte Firebase Credentials eintragen aus:
 * https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/settings/general/web
 *
 * Projekt: auto-lackierzentrum-mosbach
 * Location: europe-west3 (Frankfurt) - DSGVO-konform
 *
 * @fileoverview Firebase configuration and Multi-Tenant helper functions
 */

/**
 * ============================================
 * TYPE DEFINITIONS (JSDoc)
 * ============================================
 */

/**
 * Firestore document ID (always a string in Firebase)
 * @typedef {string} FahrzeugId
 */

/**
 * Firestore document ID for customers
 * @typedef {string} KundeId
 */

/**
 * Firestore document ID for employees
 * @typedef {string} MitarbeiterId
 */

/**
 * Workshop ID used for Multi-Tenant isolation
 * @typedef {string} WerkstattId
 * @example 'mosbach', 'heidelberg', 'mannheim'
 */

/**
 * Collection name without werkstatt suffix
 * @typedef {string} BaseCollection
 * @example 'fahrzeuge', 'kunden', 'mitarbeiter', 'kalender'
 */

// CRITICAL FIX RUN #46: Auto-detect CI/Test Environment
// Problem (RUN #45): useEmulator hardcoded to false → Playwright tests hit production → quota exhausted
// Solution: Detect environment and auto-enable emulators for tests
//
// Detection Logic:
// 1. CI Environment (GitHub Actions): process.env.CI === 'true'
// 2. Playwright Tests: navigator.webdriver === true
// 3. Localhost Development: window.location.hostname === 'localhost'
//
// Production (GitHub Pages): All checks false → useEmulator = false

const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowserEnvironment = typeof window !== 'undefined';

let useEmulator = false;

if (isNodeEnvironment) {
  // Node.js environment (should not happen in browser, but check anyway)
  useEmulator = process.env.CI === 'true' || process.env.USE_EMULATOR === 'true';
  console.log('🔥 Firebase Config Loading (Node.js)...');
  console.log('  CI Environment:', process.env.CI);
  console.log('  USE_EMULATOR:', process.env.USE_EMULATOR);
} else if (isBrowserEnvironment) {
  // Browser environment (normal case)
  const isPlaywrightTest = navigator.webdriver === true;
  const forceEmulator = window.location.search.includes('useEmulator=true');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isEmulatorPort = window.location.port === '8000'; // Playwright http-server port

  // NEW LOGIC: Only use emulator if:
  // 1. Playwright test (automated testing)
  // 2. Explicitly requested via ?useEmulator=true URL parameter
  // 3. Running on port 8000 (Playwright test server)
  useEmulator = isPlaywrightTest || forceEmulator || isEmulatorPort;

  console.log('🔥 Firebase Config Loading (Browser)...');
  console.log('  Environment Detection:');
  console.log('    - Playwright Test (navigator.webdriver):', isPlaywrightTest);
  console.log('    - Force Emulator (URL param ?useEmulator=true):', forceEmulator);
  console.log('    - Localhost:', isLocalhost);
  console.log('    - Emulator Port (8000):', isEmulatorPort);
  console.log('    - Current Hostname:', window.location.hostname);
  console.log('    - Current Port:', window.location.port);
}

console.log('  ✅ Use Emulator:', useEmulator);
console.log('  ✅ Target:', useEmulator ? 'EMULATORS (localhost:8080/9199)' : 'PRODUCTION Firebase (europe-west3)');

// ✅ Firebase Credentials aus Git History wiederhergestellt (RUN #45)
const firebaseConfig = {
  apiKey: "AIzaSyDuiIZdBGvNb3rYGOOw44QIxt-zesya3Kg",
  authDomain: "auto-lackierzentrum-mosbach.firebaseapp.com",
  projectId: "auto-lackierzentrum-mosbach",
  storageBucket: "auto-lackierzentrum-mosbach.firebasestorage.app",
  messagingSenderId: "298750297417",
  appId: "1:298750297417:web:16a9d14d3bb5d9bf83c698",
  measurementId: "G-9VZEB0XR38"
};

// Initialize Firebase (wrapped in DOMContentLoaded to ensure SDK loaded)
let firebaseApp;
let db;
let storage;
let auth;
let functions;

// ============================================
// FIX: AI Agent Race Condition (Session 2025-10-29)
// ============================================
// Problem: window.firebaseInitialized war ein Boolean, kein Promise
// Result: AI Agent startete VOR Firebase-Initialisierung → "db not initialized" Error
// Lösung: Echtes Promise erstellen, das in DOMContentLoaded resolved wird
window.firebaseInitialized = new Promise((resolve) => {
    window._resolveFirebaseReady = resolve; // Resolver speichern
});

// CRITICAL FIX RUN #17: Define window.firebaseApp IMMEDIATELY with Arrow Functions (Closure)
// Problem (Run #16): Functions used `db` at DEFINITION time → db was undefined
// Solution: Arrow Functions evaluate `db` at EXECUTION time (closure over outer scope)
// The actual Firebase instances (firebaseApp, db, storage) will be set in DOMContentLoaded
window.firebaseApp = {
  app: null,
  db: () => db,
  storage: () => storage,
  auth: () => auth,

  // ✅ BUG FIX #1: saveFahrzeug() function (gefunden durch Bug Hunter Workflow)
  // Problem: annahme.html ruft firebaseApp.saveFahrzeug() auf, aber Funktion existierte nicht
  // Impact: Fahrzeuge konnten NICHT gespeichert werden → CRITICAL BUG
  // Fix: Funktion hinzugefügt mit Firestore .set() operation
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein (Firestore erwartet String, nicht Number!)
  saveFahrzeug: async (data) => {
    // 🛡️ DEFENSIVE: Validate data parameter
    if (!data || typeof data !== 'object') {
      console.error('❌ saveFahrzeug: data ist undefined oder kein Object');
      throw new Error('saveFahrzeug: data parameter ist erforderlich');
    }
    if (data.id == null) {
      console.error('❌ saveFahrzeug: data.id ist undefined');
      throw new Error('saveFahrzeug: data.id ist erforderlich');
    }

    try {
      await window.getCollection('fahrzeuge').doc(String(data.id)).set(data);
      console.log('✅ Fahrzeug in Firestore gespeichert:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Fehler beim Speichern in Firestore:', error);
      throw error;
    }
  },

  // ✅ BUG FIX #2: updateFahrzeug() function (gefunden durch Bug Hunter Workflow)
  // Problem: annahme.html ruft firebaseApp.updateFahrzeug() auf, aber Funktion existierte nicht
  // Impact: Nachannahme (Partner-Portal Updates) konnten NICHT funktionieren → CRITICAL BUG
  // Fix: Funktion hinzugefügt mit Firestore .update() operation
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein
  updateFahrzeug: async (id, updates) => {
    try {
      await window.getCollection('fahrzeuge').doc(String(id)).update({
        ...updates,
        lastModified: Date.now()
      });
      console.log('✅ Fahrzeug aktualisiert:', id);
      return id;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren:', error);
      throw error;
    }
  },

  // ✅ BUG FIX #3: saveKunde() function
  // Problem: kunden.html ruft firebaseApp.saveKunde() auf, aber Funktion existierte nicht
  // Impact: Neue Kunden konnten NICHT in Firebase gespeichert werden → CRITICAL BUG
  // Fix: Funktion hinzugefügt mit Firestore .set() operation
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein
  saveKunde: async (data) => {
    try {
      await window.getCollection('kunden').doc(String(data.id)).set(data);
      console.log('✅ Kunde in Firestore gespeichert:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Fehler beim Speichern des Kunden:', error);
      throw error;
    }
  },

  // ✅ BUG FIX #4: updateKunde() function
  // Problem: kunden.html ruft firebaseApp.updateKunde() auf, aber Funktion existierte nicht
  // Impact: Kunden konnten NICHT bearbeitet werden, Rabatt-Konditionen nicht gespeichert → CRITICAL BUG
  // Fix: Funktion hinzugefügt mit Firestore .update() operation
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein
  updateKunde: async (id, updates) => {
    try {
      await window.getCollection('kunden').doc(String(id)).update({
        ...updates,
        lastModified: Date.now()
      });
      console.log('✅ Kunde aktualisiert:', id);
      return id;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Kunden:', error);
      throw error;
    }
  },

  // Helper Functions - CHANGED TO ARROW FUNCTIONS for closure access to `db`
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // ✅ BUG #4 FIX: Added pagination support with optional limit parameter (default: 50)
  getAllFahrzeuge: async (limit = 50) => {
    const snapshot = await window.getCollection('fahrzeuge')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // 🐛 BUG FIX: Sicherstellen dass statusHistory immer vorhanden ist (für PRODUKTIONSFORTSCHRITT in Abnahme-PDF)
        statusHistory: data.statusHistory || []
      };
    });
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // ✅ BUG #4 FIX: Added pagination support with optional limit parameter (default: 50)
  getAllKunden: async (limit = 50) => {
    const snapshot = await window.getCollection('kunden')
      .orderBy('name', 'asc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein
  deleteFahrzeug: async (id) => {
    await window.getCollection('fahrzeuge').doc(String(id)).delete();
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // 🐛 BUG FIX: Document ID muss String sein
  deleteKunde: async (id) => {
    await window.getCollection('kunden').doc(String(id)).delete();
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  savePhotosToFirestore: async (fahrzeugId, photos, type = 'vorher') => {
    const photosRef = window.getCollection('fahrzeuge')
      .doc(String(fahrzeugId))
      .collection('fotos')
      .doc(type);

    await photosRef.set({
      photos: photos,
      count: photos.length,
      lastUpdated: Date.now()
    });
  },

  // ✅ BUG FIX #5: loadPhotosFromFirestore() function (CRITICAL for abnahme.html)
  // Problem: abnahme.html Line 1062 ruft firebaseApp.loadPhotosFromFirestore() auf, aber Funktion existierte nicht
  // Impact: PDF-Erstellung schlägt fehl, weil "vorher" Fotos nicht geladen werden können → CRITICAL BUG
  // Fix: Funktion hinzugefügt zum Laden von Fotos aus Firestore Subcollection
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  loadPhotosFromFirestore: async (fahrzeugId, type = 'vorher') => {
    try {
      const photosRef = window.getCollection('fahrzeuge')
        .doc(String(fahrzeugId))
        .collection('fotos')
        .doc(type);

      const doc = await photosRef.get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`✅ Fotos geladen (${type}): ${data.photos?.length || 0} Fotos`);
        return data.photos || [];
      }
      console.log(`ℹ️ Keine Fotos gefunden für ${type}`);
      return [];
    } catch (error) {
      console.error(`❌ Fehler beim Laden der ${type} Fotos:`, error);
      return [];
    }
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  loadAllPhotosFromFirestore: async (fahrzeugId) => {
    try {
      const vorherDoc = await window.getCollection('fahrzeuge')
        .doc(String(fahrzeugId))
        .collection('fotos')
        .doc('vorher')
        .get();

      const nachherDoc = await window.getCollection('fahrzeuge')
        .doc(String(fahrzeugId))
        .collection('fotos')
        .doc('nachher')
        .get();

      return {
        vorher: vorherDoc.exists ? (vorherDoc.data().photos || []) : [],
        nachher: nachherDoc.exists ? (nachherDoc.data().photos || []) : []
      };
    } catch (error) {
      console.error('❌ Fehler beim Laden der Fotos:', error);
      return { vorher: [], nachher: [] };
    }
  },

  savePhotosLocal: (fahrzeugId, photos, type = 'vorher') => {
    const key = `fahrzeug_${fahrzeugId}_fotos_${type}`;
    localStorage.setItem(key, JSON.stringify(photos));
    console.log(`✅ Fotos in LocalStorage gespeichert: ${key} (${photos.length} Fotos)`);
  },

  // ✅ ALIAS: getFahrzeugFotos() → loadAllPhotosFromFirestore() (für liste.html Kompatibilität)
  getFahrzeugFotos: async (fahrzeugId) => {
    return await window.firebaseApp.loadAllPhotosFromFirestore(fahrzeugId);
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  // ✅ BUG #4 FIX: Added pagination support with optional limit parameter (default: 50)
  listenToFahrzeuge: (callback, limit = 50) => {
    return window.getCollection('fahrzeuge')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot(snapshot => {
        const fahrzeuge = [];
        snapshot.forEach(doc => {
          fahrzeuge.push({ id: doc.id, ...doc.data() });
        });
        callback(fahrzeuge);
      });
  },

  // 🛡️ PERFORMANCE FIX Phase 1.1: Optimized listener for Kanban Board
  // - Filters on Firestore level (not client-side) → fewer documents transferred
  // - Excludes 'abgeschlossen' status → only active vehicles loaded
  // - Uses composite index: status (asc) + createdAt (desc)
  // WARNING: Requires Firestore composite index! Create at:
  // https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore/indexes
  listenToActiveFahrzeuge: (callback, limit = 200) => {
    console.log('⚡ [PERF] listenToActiveFahrzeuge: Firestore-side status filter active');
    return window.getCollection('fahrzeuge')
      .where('status', '!=', 'abgeschlossen')
      .orderBy('status')  // Required for != filter
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .onSnapshot(snapshot => {
        const fahrzeuge = [];
        snapshot.forEach(doc => {
          fahrzeuge.push({ id: doc.id, ...doc.data() });
        });
        console.log(`⚡ [PERF] Loaded ${fahrzeuge.length} active vehicles (Firestore-filtered)`);
        callback(fahrzeuge);
      }, error => {
        // Fallback if composite index missing
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.warn('⚠️ Composite index missing! Falling back to listenToFahrzeuge()');
          console.warn('   → Create index at: https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore/indexes');
          // Graceful degradation to old method
          return window.firebaseApp.listenToFahrzeuge(callback, limit);
        }
        console.error('❌ listenToActiveFahrzeuge error:', error);
      });
  },

  // CRITICAL FIX RUN #15: Add registriereKundenbesuch function
  // CRITICAL FIX RUN #17: Convert to arrow function for closure access
  // CRITICAL FIX RUN #43: Fixed all references in HTML files (firebaseApp → window.firebaseApp)
  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  registriereKundenbesuch: async (kundeData) => {
    try {
      // Backward compatibility: Accept string or object
      const kundenname = typeof kundeData === 'string' ? kundeData : kundeData.name;

      if (!kundenname) {
        console.error('❌ Kein Kundenname angegeben!');
        return null;
      }

      // Check if customer exists
      const snapshot = await window.getCollection('kunden')
        .where('name', '==', kundenname)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        // Update existing customer
        const doc = snapshot.docs[0];
        const kundeId = doc.id;
        const existingData = doc.data();
        const updates = {
          anzahlBesuche: (existingData.anzahlBesuche || 0) + 1,
          letzterBesuch: new Date().toISOString()
        };

        // Update with new data if provided
        if (typeof kundeData === 'object') {
          if (kundeData.email && !existingData.email) {
            updates.email = kundeData.email.toLowerCase();
            // BUGFIX 2025-11-04: Auto-generate partnerCode from email
            if (!existingData.partnerCode) {
              updates.partnerCode = kundeData.email.split('@')[0].toLowerCase();
            }
          }
          if (kundeData.telefon && !existingData.telefon) updates.telefon = kundeData.telefon;
          if (kundeData.notizen) {
            updates.notizen = (existingData.notizen || '') + '\n' + kundeData.notizen;
          }
          // BUGFIX 2025-11-04: Support tags if provided
          if (kundeData.tags && !existingData.tags) {
            updates.tags = kundeData.tags;
          }
        }

        await window.getCollection('kunden').doc(String(kundeId)).update(updates);
        console.log(`✅ Besuch registriert für: ${kundenname} (${updates.anzahlBesuche}. Besuch)`);
        return kundeId;
      } else {
        // Create new customer
        const email = typeof kundeData === 'object' ? (kundeData.email || '') : '';
        const neuerKunde = {
          id: 'kunde_' + Date.now(),
          name: kundenname,
          telefon: typeof kundeData === 'object' ? (kundeData.telefon || '') : '',
          email: email.toLowerCase(),
          // BUGFIX 2025-11-04: Use partnerCode (not partnerId) - auto-generate from email
          partnerCode: email ? email.split('@')[0].toLowerCase() : '',
          notizen: typeof kundeData === 'object' ? (kundeData.notizen || '') : '',
          // BUGFIX 2025-11-04: Support tags
          tags: typeof kundeData === 'object' ? (kundeData.tags || []) : [],
          erstbesuch: new Date().toISOString(),
          letzterBesuch: new Date().toISOString(),
          anzahlBesuche: 1
        };

        await window.getCollection('kunden').doc(neuerKunde.id).set(neuerKunde);
        console.log(`✅ Neuer Kunde erstellt: ${kundenname} (ID: ${neuerKunde.id})`);
        console.log(`   📧 Email: ${neuerKunde.email || 'N/A'}`);
        console.log(`   📞 Telefon: ${neuerKunde.telefon || 'N/A'}`);
        console.log(`   🔑 Partner-Code: ${neuerKunde.partnerCode || 'N/A'}`);
        return neuerKunde.id;
      }
    } catch (error) {
      console.error('❌ Fehler beim Registrieren des Besuchs:', error);
      console.error('   Details:', error.message);
      return null;
    }
  }
};

// ============================================
// MULTI-TENANT SUPPORT (Phase 2)
// ============================================

/**
 * Get collection name with werkstattId suffix
 * @param {string} baseCollection - Base collection name (e.g., 'fahrzeuge', 'kunden')
 * @returns {string} Collection name with werkstattId (e.g., 'fahrzeuge_mosbach')
 *
 * Example Usage:
 *   const collectionName = window.getCollectionName('fahrzeuge'); // 'fahrzeuge_mosbach'
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

/**
 * Get Firestore collection with automatic werkstattId suffix
 * @param {string} baseCollection - Base collection name (e.g., 'fahrzeuge', 'kunden')
 * @returns {firebase.firestore.CollectionReference} Firestore collection reference
 *
 * Example Usage:
 *   const fahrzeugeRef = window.getCollection('fahrzeuge'); // db.collection('fahrzeuge_mosbach')
 *   const snapshot = await fahrzeugeRef.get();
 */
window.getCollection = function(baseCollection) {
  const collectionName = window.getCollectionName(baseCollection);

  if (!db) {
    console.error('❌ getCollection: Firebase db not initialized!');
    throw new Error('Firebase db not initialized');
  }

  return db.collection(collectionName);
};

/**
 * Get current werkstattId from logged-in user
 * @returns {string|null} werkstattId or null if not logged in
 *
 * Example Usage:
 *   const werkstattId = window.getWerkstattId(); // 'mosbach'
 */
window.getWerkstattId = function() {
  const currentUser = window.authManager?.getCurrentUser();
  return currentUser?.werkstattId || null;
};

/**
 * ============================================
 * ID COMPARISON UTILITY (DRY Pattern)
 * ============================================
 * Centralized ID comparison function to handle String/Number type inconsistencies.
 *
 * @param {string|number|null|undefined} id1 - First ID to compare
 * @param {string|number|null|undefined} id2 - Second ID to compare
 * @returns {boolean} True if IDs are equal (after String conversion)
 *
 * @example
 * // Firestore IDs are strings, but JS might have numbers
 * compareIds('1761584927579', 1761584927579) // → true
 * compareIds('123', '123') // → true
 * compareIds(null, 123) // → false
 */
window.compareIds = function(id1, id2) {
  // Handle null/undefined
  if (id1 == null || id2 == null) return false;

  // Convert both to strings and compare
  return String(id1) === String(id2);
};

/**
 * ============================================
 * LOADING STATES (UX Enhancement)
 * ============================================
 * Centralized loading indicator for async operations
 */

let currentLoader = null;

/**
 * Show loading overlay with custom message
 * @param {string} message - Loading message to display
 * @returns {HTMLElement} Loader element (for manual removal if needed)
 *
 * @example
 * const loader = showLoading('Fahrzeuge werden geladen...');
 * const data = await fetchData();
 * hideLoading();
 */
window.showLoading = function(message = 'Lädt...') {
  // Remove existing loader if any
  if (currentLoader) {
    currentLoader.remove();
  }

  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p class="loading-message">${message}</p>
    </div>
  `;

  // Add CSS if not already present
  if (!document.getElementById('loading-states-css')) {
    const style = document.createElement('style');
    style.id = 'loading-states-css';
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }

      .loading-content {
        background: white;
        padding: 32px 48px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007aff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .loading-message {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(loader);
  currentLoader = loader;
  return loader;
};

/**
 * Hide currently displayed loading overlay
 */
window.hideLoading = function() {
  if (currentLoader) {
    currentLoader.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      if (currentLoader) {
        currentLoader.remove();
        currentLoader = null;
      }
    }, 200);
  }
};

/**
 * Show loading, execute async function, hide loading
 * @param {Function} asyncFn - Async function to execute
 * @param {string} message - Loading message
 * @returns {Promise<any>} Result of async function
 *
 * @example
 * const data = await withLoading(
 *   () => firebaseApp.getAllFahrzeuge(),
 *   'Fahrzeuge werden geladen...'
 * );
 */
window.withLoading = async function(asyncFn, message = 'Lädt...') {
  showLoading(message);
  try {
    const result = await asyncFn();
    return result;
  } finally {
    hideLoading();
  }
};

/**
 * ============================================
 * INPUT VALIDATION (Data Quality)
 * ============================================
 * Validation functions for user inputs
 */

/**
 * Validate Farbnummer (Paint Code)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateFarbnummer('A1B');
 * if (!result.valid) alert(result.error);
 */
window.validateFarbnummer = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim().toUpperCase();

  // Farbnummer: 2-6 Zeichen, nur A-Z und 0-9
  const pattern = /^[A-Z0-9]{2,6}$/;

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Ungültige Farbnummer! Format: 2-6 Zeichen (A-Z, 0-9). Beispiel: A1B, LC9Z, C7A',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate VIN/FIN (Vehicle Identification Number)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateVIN('WVWZZZ1JZYW123456');
 * if (!result.valid) alert(result.error);
 */
window.validateVIN = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim().toUpperCase();

  // VIN must be exactly 17 characters
  if (trimmed.length !== 17) {
    return {
      valid: false,
      error: 'VIN/FIN muss exakt 17 Zeichen lang sein!',
      value: trimmed
    };
  }

  // VIN cannot contain I, O, Q (to avoid confusion with 1, 0)
  if (/[IOQ]/i.test(trimmed)) {
    return {
      valid: false,
      error: 'VIN/FIN darf keine Buchstaben I, O oder Q enthalten!',
      value: trimmed
    };
  }

  // VIN must be alphanumeric
  if (!/^[A-Z0-9]{17}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'VIN/FIN darf nur Buchstaben und Zahlen enthalten!',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate Email Address
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateEmail('kunde@example.de');
 * if (!result.valid) alert(result.error);
 */
window.validateEmail = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim().toLowerCase();

  // RFC 5322 simplified email regex
  const pattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Ungültige E-Mail-Adresse! Beispiel: kunde@example.de',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate Phone Number (German format)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validatePhone('+49 6261 123456');
 * if (!result.valid) alert(result.error);
 */
window.validatePhone = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim();

  // Allow: +49, 0049, 0, spaces, dashes, parentheses
  // Minimum 6 digits (local number), maximum 15 digits (international format)
  const digitsOnly = trimmed.replace(/[^\d]/g, '');

  if (digitsOnly.length < 6 || digitsOnly.length > 15) {
    return {
      valid: false,
      error: 'Ungültige Telefonnummer! Beispiel: +49 6261 123456 oder 06261 123456',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate Kennzeichen (License Plate - German format)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateKennzeichen('MOS-CG 123');
 * if (!result.valid) alert(result.error);
 */
window.validateKennzeichen = function(value) {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      error: 'Kennzeichen ist ein Pflichtfeld!',
      value: ''
    };
  }

  const trimmed = value.trim().toUpperCase();

  // German license plate: 1-3 letters (city), optional dash/space, 1-2 letters, space, 1-4 digits
  // Examples: MOS-CG 123, HD AB 1234, B MW 9999
  const pattern = /^[A-Z]{1,3}[\s-]?[A-Z]{1,2}\s?\d{1,4}$/;

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Ungültiges Kennzeichen! Format: MOS-CG 123 oder HD AB 1234',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};


/**
 * Validate Reifengröße (Tire Size)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateReifengroesse('205/55 R16 91V');
 * if (!result.valid) alert(result.error);
 */
window.validateReifengroesse = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim().toUpperCase();

  // Reifengröße: 3 digits / 2 digits SPACE R 2 digits optional: SPACE 2-3 digits + letter
  // Examples: 205/55 R16, 225/45 R17 94W, 195/65R15 91H
  const pattern = /^\d{3}\/\d{2}\s?R\d{2}(\s?\d{2,3}[A-Z])?$/;

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Ungültige Reifengröße! Format: 205/55 R16 oder 225/45 R17 94W',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate Scheibentyp (Window Glass Type)
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateScheibentyp('Frontscheibe');
 * if (!result.valid) alert(result.error);
 */
window.validateScheibentyp = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim();

  // Valid glass types
  const validTypes = [
    'Frontscheibe',
    'Heckscheibe',
    'Seitenscheibe vorne links',
    'Seitenscheibe vorne rechts',
    'Seitenscheibe hinten links',
    'Seitenscheibe hinten rechts',
    'Dreieckscheibe',
    'Glasdach',
    'Panoramadach'
  ];

  if (!validTypes.includes(trimmed)) {
    return {
      valid: false,
      error: 'Ungültiger Scheibentyp! Bitte aus Liste wählen.',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Validate Lackschaden-Position
 * @param {string} value - Input value
 * @returns {Object} { valid: boolean, error: string|null, value: string }
 *
 * @example
 * const result = validateLackschadenPosition('Stoßstange vorne');
 * if (!result.valid) alert(result.error);
 */
window.validateLackschadenPosition = function(value) {
  if (!value || value.trim() === '') {
    return { valid: true, error: null, value: '' }; // Optional field
  }

  const trimmed = value.trim();

  // Valid positions
  const validPositions = [
    'Stoßstange vorne',
    'Stoßstange hinten',
    'Motorhaube',
    'Kotflügel vorne links',
    'Kotflügel vorne rechts',
    'Kotflügel hinten links',
    'Kotflügel hinten rechts',
    'Tür vorne links',
    'Tür vorne rechts',
    'Tür hinten links',
    'Tür hinten rechts',
    'Dach',
    'Heckklappe',
    'Schweller links',
    'Schweller rechts',
    'Spiegel links',
    'Spiegel rechts'
  ];

  if (!validPositions.includes(trimmed)) {
    return {
      valid: false,
      error: 'Ungültige Position! Bitte aus Liste wählen.',
      value: trimmed
    };
  }

  return { valid: true, error: null, value: trimmed };
};

/**
 * Get Service Icon (Emoji) for serviceTyp
 * Centralized mapping to ensure consistency across app
 * @param {string} serviceTyp - Service type (case-insensitive)
 * @returns {string} Emoji icon for the service
 *
 * @example
 * const icon = window.getServiceIcon('lackierung'); // Returns '🎨'
 * const icon = window.getServiceIcon('REIFEN');     // Returns '🛞'
 */
window.getServiceIcon = function(serviceTyp) {
  if (!serviceTyp) return '📋'; // Default icon
  
  const normalized = serviceTyp.toLowerCase().trim();
  
  // Service icon mapping
  const icons = {
    // Hauptservices
    'lackierung': '🎨',
    'lackier': '🎨',
    'paint': '🎨',
    
    'reifen': '🛞',
    'tire': '🛞',
    'tyre': '🛞',
    
    'mechanik': '🔧',
    'mechanic': '🔧',
    'repair': '🔧',
    
    'pflege': '✨',
    'detailing': '✨',
    'cleaning': '✨',
    
    'tuev': '📋',
    'tüv': '📋',
    'inspection': '📋',
    
    'versicherung': '📄',
    'insurance': '📄',
    
    // Zusatzservices
    'glas': '🔍',
    'glass': '🔍',
    'scheibe': '🔍',
    'windshield': '🔍',
    
    'klima': '❄️',
    'ac': '❄️',
    'klimaanlage': '❄️',
    
    'dellen': '🔨',
    'dent': '🔨',
    'pdr': '🔨',
    
    // Fallbacks
    'service': '🔧',
    'wartung': '🔧',
    'default': '📋'
  };
  
  return icons[normalized] || icons['default'];
};

/**
 * Firestore Error Boundary - Wraps async functions with centralized error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Context description for error logging (e.g., "loadVehicles")
 * @param {boolean} showToast - Whether to show error toast to user (default: true)
 * @returns {Promise} Result of asyncFn or null on error
 *
 * @example
 * const vehicles = await window.withFirestoreErrorHandling(
 *   async () => {
 *     const snapshot = await window.getCollection('fahrzeuge').get();
 *     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 *   },
 *   'loadVehicles'
 * );
 */
window.withFirestoreErrorHandling = async function(asyncFn, context, showToast = true) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error(`❌ Firestore Error [${context}]:`, error);
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    
    // User-friendly error messages
    let userMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    
    if (error.code === 'permission-denied') {
      userMessage = '⛔ Zugriff verweigert. Bitte prüfen Sie Ihre Berechtigungen.';
    } else if (error.code === 'unavailable') {
      userMessage = '📡 Keine Verbindung zur Datenbank. Bitte prüfen Sie Ihre Internetverbindung.';
    } else if (error.code === 'not-found') {
      userMessage = '🔍 Daten nicht gefunden.';
    } else if (error.code === 'already-exists') {
      userMessage = '⚠️ Daten existieren bereits.';
    } else if (error.code === 'failed-precondition') {
      userMessage = '❌ Anfrage fehlgeschlagen. Möglicherweise fehlt ein Index.';
    } else if (error.code === 'unauthenticated') {
      userMessage = '🔐 Nicht angemeldet. Bitte melden Sie sich an.';
    }
    
    if (showToast && typeof window.showToast === 'function') {
      window.showToast(`${userMessage} (Context: ${context})`, 'error', 6000);
    }
    
    // Return null to allow callers to handle gracefully
    return null;
  }
};


// Define initFirebase() helper for compatibility
window.initFirebase = async function() {
  console.log('🔧 RUN #68: [1/3] initFirebase() called');
  console.log('   window.firebaseInitialized:', window.firebaseInitialized);

  // If Firebase already initialized, return immediately
  if (window.firebaseInitialized) {
    console.log('✅ RUN #68: [1/3] Already initialized, skipping');
    return Promise.resolve();
  }

  // RUN #68: Polling with timeout instead of event listener (more reliable)
  const maxWaitTime = 10000; // 10 seconds
  const checkInterval = 200; // Check every 200ms
  const startTime = Date.now();

  console.log('⏳ RUN #68: [2/3] Waiting for Firebase initialization...');
  console.log('   Max wait time: 10s, polling every 200ms');

  while (!window.firebaseInitialized) {
    if (Date.now() - startTime > maxWaitTime) {
      console.error('❌ RUN #68: [2/3] Timeout after 10 seconds!');
      console.error('   Diagnostics:');
      console.error('     window.firebaseApp:', !!window.firebaseApp);
      console.error('     window.db:', !!window.db);
      console.error('     window.storage:', !!window.storage);
      throw new Error('RUN #68: Firebase initialization timeout');
    }

    const elapsed = Date.now() - startTime;
    if (elapsed % 1000 < checkInterval) {
      console.log(`⏳ RUN #68: Polling... (${Math.floor(elapsed / 1000)}s elapsed)`);
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.log('✅ RUN #68: [3/3] Firebase initialized successfully');
  console.log('   Time taken:', (Date.now() - startTime) + 'ms');
  return Promise.resolve();
};

// Wait for DOM and all scripts to load before initializing Firebase
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔄 DOMContentLoaded event fired - starting Firebase initialization...');

  try {
    console.log('🔥 Initializing Firebase App...');
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized');

    // Connect to Emulators if in CI/Test mode
    // 🔧 FIX (2025-12-12): Re-check emulator conditions at runtime
    // Problem: `useEmulator` evaluated at script load might be wrong due to timing
    const shouldUseEmulator = useEmulator ||
                              window.location.port === '8000' ||
                              navigator.webdriver === true ||
                              window.location.search.includes('useEmulator=true');
    console.log('🔍 Emulator check at DOMContentLoaded:', {
      useEmulatorVar: useEmulator,
      port: window.location.port,
      webdriver: navigator.webdriver,
      urlParam: window.location.search.includes('useEmulator=true'),
      finalDecision: shouldUseEmulator
    });

    // 🔍 DEBUG: Store emulator decision for test inspection
    window.__emulatorDebug = {
      shouldUseEmulator,
      useEmulatorVar: useEmulator,
      port: window.location.port,
      webdriver: navigator.webdriver,
      urlParam: window.location.search.includes('useEmulator=true'),
      timestamp: new Date().toISOString()
    };

    if (shouldUseEmulator) {
      console.log('🔥 Connecting to Firebase Emulators...');
      console.log('  Firestore: localhost:8080');
      console.log('  Storage: localhost:9199');

      db = firebaseApp.firestore();
      storage = firebase.storage();  // ✅ FIX: Use firebase.storage() instead of firebaseApp.storage()
      auth = firebase.auth();  // Initialize Auth

      // Connect Firestore to Emulator
      try {
        db.useEmulator('localhost', 8080);
        console.log('✅ Firestore connected to Emulator (localhost:8080)');
        window.__emulatorDebug.firestoreEmulator = 'connected';
      } catch (e) {
        console.warn('⚠️ Firestore Emulator connection:', e.message);
        window.__emulatorDebug.firestoreEmulator = 'error: ' + e.message;
      }

      // Connect Storage to Emulator
      try {
        storage.useEmulator('localhost', 9199);
        console.log('✅ Storage connected to Emulator (localhost:9199)');
      } catch (e) {
        console.warn('⚠️ Storage Emulator connection:', e.message);
      }

      // Connect Auth to Emulator
      try {
        auth.useEmulator('http://localhost:9099');
        console.log('✅ Auth connected to Emulator (localhost:9099)');
      } catch (e) {
        console.warn('⚠️ Auth Emulator connection:', e.message);
      }

      // CRITICAL FIX: Expose db, storage, and auth IMMEDIATELY (not 50 lines later!)
      // Problem: initFirebase() returns BEFORE window.db is set (Lines 100-104 vs 158)
      // Initialize Functions
      functions = firebase.functions();
      console.log('✅ Functions connected (Emulator)');

      // Solution: Set window.db, storage, auth, and functions RIGHT AFTER creation
      window.db = db;
      window.storage = storage;
      window.auth = auth;
      window.functions = functions;
      console.log('✅ IMMEDIATE: window.db, window.storage, window.auth, and window.functions exposed');
    } else {
      // Use real Firebase (Production/Staging)
      db = firebaseApp.firestore();
      storage = firebase.storage();  // ✅ FIX: Use firebase.storage() instead of firebaseApp.storage()
      auth = firebase.auth();  // Initialize Auth

      // Initialize Functions with error handling (SDK might not be loaded)
      // 🆕 PHASE 2.4: Set region to europe-west3 (DSGVO compliance)
      try {
        if (firebase.functions) {
          functions = firebase.app().functions('europe-west3');
          console.log('✅ Functions connected (Production - europe-west3)');
        } else {
          console.warn('⚠️ Functions SDK not available (optional)');
          functions = null;
        }
      } catch (e) {
        console.warn('⚠️ Functions initialization failed:', e.message);
        functions = null;
      }

      console.log('✅ Firestore connected (Production)');
      console.log('✅ Storage connected (Production)');
      console.log('✅ Auth connected (Production)');

      // CRITICAL FIX: Expose db, storage, auth, and functions IMMEDIATELY
      window.db = db;
      window.storage = storage;
      window.auth = auth;
      window.functions = functions;
      console.log('✅ IMMEDIATE: window.db, window.storage, window.auth, and window.functions exposed');
    }

    // Update window.firebaseApp.app with initialized instance
    window.firebaseApp.app = firebaseApp;

    // Mark as initialized & resolve Promise
    window.firebaseInitialized = true;

    // ✅ FIX: Resolve Promise for AI Agent (Session 2025-10-29)
    if (window._resolveFirebaseReady) {
        window._resolveFirebaseReady(true);
        console.log('✅ Firebase initialization Promise resolved');
    }

    console.log('✅ Firebase fully initialized');

    // Dispatch custom event for tests
    window.dispatchEvent(new Event('firebaseReady'));

    // NOTE: window.db and window.storage already exposed immediately after creation
    // NOTE: window.firebaseApp object structure defined at Line 39 (BEFORE DOMContentLoaded)
    // This ensures loadAnfrage() can access firebaseApp functions right after script loads
    console.log('✅ Global db and storage variables confirmed available');
    console.log('✅ Firebase Config loaded successfully (PRODUCTION)');
    console.log('  Project ID: ' + firebaseConfig.projectId);
    console.log('  Emulator Mode: ' + useEmulator);

  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    window.firebaseInitialized = false;

    // ✅ FIX: Reject Promise on error (Session 2025-10-29)
    if (window._resolveFirebaseReady) {
        window._resolveFirebaseReady(false); // Resolve with false instead of reject (prevents unhandled rejection)
        console.error('❌ Firebase initialization Promise resolved with false');
    }

    throw error;
  }
});

// RUN #44: Production Firebase Config created
// Date: 2025-10-16
// Fixes: 404 Error on GitHub Pages (firebase-config-RUN24.js not found)

// ============================================
// AGI TRAINING HELPERS (Phase 1 - 2025-12-11)
// ============================================

/**
 * Get all labeled photos for ML export
 * @returns {Promise<Array>} Array of { fahrzeugId, schadenLabels, url, ... }
 */
window.getLabeledPhotos = async function() {
    const fahrzeuge = window.getCollection('fahrzeuge');
    const snapshot = await fahrzeuge.get();

    const labeledPhotos = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.schaedensfotos && Array.isArray(data.schaedensfotos)) {
            data.schaedensfotos.forEach((foto, index) => {
                if (foto.schadenLabels) {
                    labeledPhotos.push({
                        fahrzeugId: doc.id,
                        fotoIndex: index,
                        url: foto.url,
                        schadenLabels: foto.schadenLabels,
                        labeledAt: foto.labeledAt,
                        labeledBy: foto.labeledBy,
                        confidence: foto.confidence,
                        damageCode: foto.damageCode,
                        // Fahrzeug-Kontext fuer ML
                        kennzeichen: data.kennzeichen,
                        marke: data.marke,
                        modell: data.modell,
                        baujahrVon: data.baujahrVon
                    });
                }
            });
        }
    });

    console.log(`[AGI Training] ${labeledPhotos.length} gelabelte Fotos gefunden`);
    return labeledPhotos;
};

/**
 * Get AGI training statistics
 * @returns {Promise<Object>} Statistics about labeled data
 */
window.getAGITrainingStats = async function() {
    const labeledPhotos = await window.getLabeledPhotos();

    const stats = {
        totalLabeledPhotos: labeledPhotos.length,
        byPosition: {},
        byDamageType: {},
        bySeverity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        byConfidence: { sicher: 0, unsicher: 0 },
        uniqueVehicles: new Set()
    };

    labeledPhotos.forEach(photo => {
        const labels = photo.schadenLabels;
        if (labels) {
            // Position
            if (labels.position) {
                stats.byPosition[labels.position] = (stats.byPosition[labels.position] || 0) + 1;
            }
            // Damage Type
            if (labels.schadensart) {
                stats.byDamageType[labels.schadensart] = (stats.byDamageType[labels.schadensart] || 0) + 1;
            }
            // Severity
            if (labels.schweregrad) {
                stats.bySeverity[labels.schweregrad]++;
            }
        }
        // Confidence
        if (photo.confidence) {
            stats.byConfidence[photo.confidence]++;
        }
        // Unique vehicles
        stats.uniqueVehicles.add(photo.fahrzeugId);
    });

    stats.uniqueVehicles = stats.uniqueVehicles.size;

    console.log('[AGI Training] Stats:', stats);
    return stats;
};

/**
 * Export training data as JSON (for ML pipeline)
 * @returns {Promise<string>} JSON string of training data
 */
window.exportTrainingData = async function() {
    const labeledPhotos = await window.getLabeledPhotos();
    const stats = await window.getAGITrainingStats();

    const exportData = {
        exportDate: new Date().toISOString(),
        werkstattId: window.werkstattId || window.getWerkstattId(),
        stats: stats,
        trainingData: labeledPhotos.map(photo => ({
            // ML Input Features
            damageCode: photo.damageCode,
            position: photo.schadenLabels?.position,
            schadensart: photo.schadenLabels?.schadensart,
            schweregrad: photo.schadenLabels?.schweregrad,
            tiefe: photo.schadenLabels?.tiefe,
            reparaturart: photo.schadenLabels?.reparaturart,
            // Vehicle Context
            marke: photo.marke,
            modell: photo.modell,
            baujahr: photo.baujahrVon,
            // Quality Indicator
            confidence: photo.confidence,
            labeledBy: photo.labeledBy
        }))
    };

    console.log(`[AGI Training] Export: ${exportData.trainingData.length} Datensaetze`);
    return JSON.stringify(exportData, null, 2);
};

// ============================================
// AGI TRAINING SPRINT 2: ARBEITSZEITEN HELPERS
// ============================================

/**
 * Save work time record to Firestore
 * @param {Object} arbeitszeitData - Work time data
 * @returns {Promise<string>} Document ID
 */
window.saveArbeitszeit = async function(arbeitszeitData) {
    await window.firebaseInitialized;
    const collectionName = window.getCollectionName('arbeitszeiten');

    const docRef = await db.collection(collectionName).add({
        ...arbeitszeitData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[AGI Sprint 2] Arbeitszeit gespeichert: ${docRef.id}`);
    return docRef.id;
};

/**
 * Get all work times for a vehicle
 * @param {string} fahrzeugId - Vehicle ID
 * @returns {Promise<Array>} Array of work time records
 */
window.getArbeitszeitenForFahrzeug = async function(fahrzeugId) {
    await window.firebaseInitialized;
    const collectionName = window.getCollectionName('arbeitszeiten');

    const snapshot = await db.collection(collectionName)
        .where('fahrzeugId', '==', fahrzeugId)
        .orderBy('startzeit', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get work time statistics for ML training
 * @returns {Promise<Object>} Statistics about work times
 */
window.getArbeitszeitenStats = async function() {
    await window.firebaseInitialized;
    const collectionName = window.getCollectionName('arbeitszeiten');

    const snapshot = await db.collection(collectionName).get();

    const stats = {
        totalRecords: 0,
        totalMinuten: 0,
        byArbeitsart: {},
        bySkillLevel: {},
        bySchwierigkeit: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avgDauerByArbeitsart: {},
        materialVerbrauch: {}
    };

    const dauerByArbeitsart = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        stats.totalRecords++;
        stats.totalMinuten += data.dauerMinuten || 0;

        // By work type
        if (data.arbeitsart) {
            stats.byArbeitsart[data.arbeitsart] = (stats.byArbeitsart[data.arbeitsart] || 0) + 1;
            dauerByArbeitsart[data.arbeitsart] = dauerByArbeitsart[data.arbeitsart] || [];
            dauerByArbeitsart[data.arbeitsart].push(data.dauerMinuten || 0);
        }

        // By skill level
        if (data.mitarbeiterSkillLevel) {
            stats.bySkillLevel[data.mitarbeiterSkillLevel] = (stats.bySkillLevel[data.mitarbeiterSkillLevel] || 0) + 1;
        }

        // By difficulty
        if (data.schwierigkeit) {
            stats.bySchwierigkeit[data.schwierigkeit]++;
        }

        // Material usage
        if (data.materialVerbrauch && Array.isArray(data.materialVerbrauch)) {
            data.materialVerbrauch.forEach(m => {
                if (m.typ) {
                    stats.materialVerbrauch[m.typ] = stats.materialVerbrauch[m.typ] || { menge: 0, kosten: 0 };
                    stats.materialVerbrauch[m.typ].menge += m.menge || 0;
                    stats.materialVerbrauch[m.typ].kosten += m.kosten || 0;
                }
            });
        }
    });

    // Calculate averages
    Object.keys(dauerByArbeitsart).forEach(art => {
        const durations = dauerByArbeitsart[art];
        stats.avgDauerByArbeitsart[art] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    });

    console.log('[AGI Sprint 2] Arbeitszeiten Stats:', stats);
    return stats;
};

/**
 * Export work time data for ML training
 * @returns {Promise<string>} JSON string of training data
 */
window.exportArbeitszeitenTrainingData = async function() {
    await window.firebaseInitialized;
    const collectionName = window.getCollectionName('arbeitszeiten');

    const snapshot = await db.collection(collectionName).get();
    const stats = await window.getArbeitszeitenStats();

    const exportData = {
        exportDate: new Date().toISOString(),
        werkstattId: window.werkstattId || window.getWerkstattId(),
        stats: stats,
        trainingData: snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                // ML Input Features
                arbeitsart: data.arbeitsart,
                dauerMinuten: data.dauerMinuten,
                mitarbeiterSkillLevel: data.mitarbeiterSkillLevel,
                schwierigkeit: data.schwierigkeit,
                // Material context
                materialVerbrauch: data.materialVerbrauch || [],
                // Time context
                startzeit: data.startzeit?.toDate?.()?.toISOString(),
                // Vehicle link (for joining with damage labels)
                fahrzeugId: data.fahrzeugId,
                // Notes for qualitative analysis
                notizen: data.notizen
            };
        })
    };

    console.log(`[AGI Sprint 2] Export: ${exportData.trainingData.length} Arbeitszeit-Datensaetze`);
    return JSON.stringify(exportData, null, 2);
};

// ============================================
// 🤖 AGI TRAINING SPRINT 3: KVA-FEEDBACK
// ============================================

/**
 * Speichert KVA-Feedback fuer ein Fahrzeug in Firestore
 * @param {string} fahrzeugId - ID des Fahrzeugs
 * @param {Object} feedbackData - Feedback-Daten von KVAFeedback.saveFeedback()
 * @returns {Promise<boolean>} Erfolg
 */
window.saveKVAFeedbackToFirestore = async function(fahrzeugId, feedbackData) {
    if (!window.db || !window.werkstattId) {
        console.warn('[KVA-FEEDBACK] Firestore nicht verfuegbar');
        return false;
    }

    try {
        const fahrzeugRef = window.getCollection('fahrzeuge').doc(fahrzeugId);

        // KVA-Feedback direkt im Fahrzeug-Dokument speichern
        await fahrzeugRef.update({
            // Tatsaechliche Kosten und Abweichung
            kpiTatsaechlicheKosten: feedbackData.tatsaechlicheKosten,
            kpiAbweichung: feedbackData.abweichung,
            kpiAbweichungProzent: feedbackData.abweichungProzent,

            // ML-Training Felder
            kpiAbweichungsKategorie: feedbackData.kategorie,
            kpiAbweichungsGruende: feedbackData.gruende || [],
            kpiLernnotiz: feedbackData.notiz || '',

            // Metadaten
            kpiFeedbackTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            kpiFeedbackVersion: 'v1.0'
        });

        console.log(`✅ [KVA-FEEDBACK] Firestore Update erfolgreich fuer ${fahrzeugId}`);
        return true;
    } catch (error) {
        console.error('❌ [KVA-FEEDBACK] Firestore Update fehlgeschlagen:', error);
        return false;
    }
};

/**
 * Laedt KVA-Feedback-Statistiken fuer ML-Analyse
 * @param {Object} options - Filter-Optionen
 * @returns {Promise<Object>} Statistiken
 */
window.getKVAFeedbackStats = async function(options = {}) {
    if (!window.db || !window.werkstattId) {
        console.warn('[KVA-FEEDBACK] Firestore nicht verfuegbar');
        return null;
    }

    const { startDate, endDate } = options;

    try {
        let query = window.getCollection('fahrzeuge')
            .where('status', '==', 'abgeschlossen')
            .where('kpiTatsaechlicheKosten', '>', 0);

        const snapshot = await query.get();

        if (snapshot.empty) {
            return { count: 0, stats: null };
        }

        const feedbackData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.kpiKostenvoranschlag && data.kpiTatsaechlicheKosten) {
                feedbackData.push({
                    id: doc.id,
                    kva: data.kpiKostenvoranschlag,
                    tatsaechlich: data.kpiTatsaechlicheKosten,
                    abweichung: data.kpiAbweichung || 0,
                    abweichungProzent: data.kpiAbweichungProzent || 0,
                    kategorie: data.kpiAbweichungsKategorie || 'UNBEKANNT',
                    gruende: data.kpiAbweichungsGruende || [],
                    timestamp: data.kpiFeedbackTimestamp
                });
            }
        });

        // Statistiken berechnen
        const stats = {
            count: feedbackData.length,
            avgAbweichungProzent: feedbackData.length > 0
                ? feedbackData.reduce((sum, d) => sum + d.abweichungProzent, 0) / feedbackData.length
                : 0,
            kategorien: {},
            gruende: {}
        };

        // Kategorien zaehlen
        feedbackData.forEach(d => {
            stats.kategorien[d.kategorie] = (stats.kategorien[d.kategorie] || 0) + 1;
            d.gruende.forEach(g => {
                stats.gruende[g] = (stats.gruende[g] || 0) + 1;
            });
        });

        console.log(`[KVA-FEEDBACK] Stats geladen: ${stats.count} Eintraege, Avg ${stats.avgAbweichungProzent.toFixed(1)}%`);
        return { count: stats.count, stats, data: feedbackData };
    } catch (error) {
        console.error('❌ [KVA-FEEDBACK] Fehler beim Laden der Stats:', error);
        return null;
    }
};

/**
 * Exportiert KVA-Feedback-Daten fuer ML-Training
 * @returns {Promise<string>} JSON-Export
 */
window.exportKVAFeedbackTrainingData = async function() {
    if (!window.db || !window.werkstattId) {
        console.warn('[KVA-FEEDBACK] Firestore nicht verfuegbar');
        return null;
    }

    try {
        const snapshot = await window.getCollection('fahrzeuge')
            .where('status', '==', 'abgeschlossen')
            .where('kpiTatsaechlicheKosten', '>', 0)
            .get();

        const trainingData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.kpiKostenvoranschlag && data.kpiTatsaechlicheKosten) {
                trainingData.push({
                    // Fahrzeug-Features
                    marke: data.marke || '',
                    modell: data.modell || '',
                    baujahr: data.baujahr || '',
                    fahrzeugTyp: `${data.marke}_${data.modell}`.toLowerCase().replace(/\s+/g, '_'),

                    // Schadensbeschreibung
                    schadensBeschreibung: data.notizen || '',
                    serviceTyp: data.serviceTyp || 'lack',

                    // KVA vs. Tatsaechlich
                    kvaKosten: data.kpiKostenvoranschlag,
                    tatsaechlicheKosten: data.kpiTatsaechlicheKosten,
                    abweichung: data.kpiAbweichung || 0,
                    abweichungProzent: data.kpiAbweichungProzent || 0,

                    // ML-Labels
                    kategorie: data.kpiAbweichungsKategorie || 'UNBEKANNT',
                    gruende: data.kpiAbweichungsGruende || [],
                    lernnotiz: data.kpiLernnotiz || '',

                    // Metadaten
                    abschlussDatum: data.prozessTimestamps?.abgeschlossen || null,
                    feedbackTimestamp: data.kpiFeedbackTimestamp?.toDate?.()?.toISOString() || null
                });
            }
        });

        const exportData = {
            version: '1.0',
            werkstattId: window.werkstattId,
            exportDate: new Date().toISOString(),
            totalRecords: trainingData.length,
            trainingData
        };

        console.log(`[AGI Sprint 3] KVA-Export: ${trainingData.length} Datensaetze`);
        return JSON.stringify(exportData, null, 2);
    } catch (error) {
        console.error('❌ [KVA-FEEDBACK] Export fehlgeschlagen:', error);
        return null;
    }
};

// Log AGI Training ready
console.log('✅ [AGI Training] Helper functions loaded');
console.log('   - window.getLabeledPhotos()');
console.log('   - window.getAGITrainingStats()');
console.log('   - window.exportTrainingData()');
console.log('   - window.saveArbeitszeit()');
console.log('   - window.getArbeitszeitenForFahrzeug()');
console.log('   - window.getArbeitszeitenStats()');
console.log('   - window.exportArbeitszeitenTrainingData()');
console.log('   - window.saveKVAFeedbackToFirestore()');
console.log('   - window.getKVAFeedbackStats()');
console.log('   - window.exportKVAFeedbackTrainingData()');
