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
  useEmulator = isPlaywrightTest || forceEmulator;

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
  getAllFahrzeuge: async () => {
    const snapshot = await window.getCollection('fahrzeuge').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // ✅ PHASE 5.1: Multi-Tenant Migration - Nutzt jetzt window.getCollection()
  getAllKunden: async () => {
    const snapshot = await window.getCollection('kunden').get();
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
  listenToFahrzeuge: (callback) => {
    return window.getCollection('fahrzeuge')
      .onSnapshot(snapshot => {
        const fahrzeuge = [];
        snapshot.forEach(doc => {
          fahrzeuge.push({ id: doc.id, ...doc.data() });
        });
        callback(fahrzeuge);
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
          if (kundeData.email && !existingData.email) updates.email = kundeData.email;
          if (kundeData.telefon && !existingData.telefon) updates.telefon = kundeData.telefon;
          if (kundeData.partnerId && !existingData.partnerId) updates.partnerId = kundeData.partnerId;
          if (kundeData.notizen) {
            updates.notizen = (existingData.notizen || '') + '\n' + kundeData.notizen;
          }
        }

        await window.getCollection('kunden').doc(String(kundeId)).update(updates);
        console.log(`✅ Besuch registriert für: ${kundenname} (${updates.anzahlBesuche}. Besuch)`);
        return kundeId;
      } else {
        // Create new customer
        const neuerKunde = {
          id: 'kunde_' + Date.now(),
          name: kundenname,
          telefon: typeof kundeData === 'object' ? (kundeData.telefon || '') : '',
          email: typeof kundeData === 'object' ? (kundeData.email || '') : '',
          partnerId: typeof kundeData === 'object' ? (kundeData.partnerId || '') : '',
          notizen: typeof kundeData === 'object' ? (kundeData.notizen || '') : '',
          erstbesuch: new Date().toISOString(),
          letzterBesuch: new Date().toISOString(),
          anzahlBesuche: 1
        };

        await window.getCollection('kunden').doc(neuerKunde.id).set(neuerKunde);
        console.log(`✅ Neuer Kunde erstellt: ${kundenname} (ID: ${neuerKunde.id})`);
        console.log(`   📧 Email: ${neuerKunde.email || 'N/A'}`);
        console.log(`   📞 Telefon: ${neuerKunde.telefon || 'N/A'}`);
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
  // Get current user from auth-manager
  const currentUser = window.authManager?.getCurrentUser();

  if (!currentUser) {
    console.warn('⚠️ getCollectionName: Kein User eingeloggt, verwende BaseCollection:', baseCollection);
    return baseCollection;
  }

  // Check for werkstattId (set after workshop login)
  const werkstattId = currentUser.werkstattId;

  if (!werkstattId) {
    console.warn('⚠️ getCollectionName: User hat keine werkstattId, verwende BaseCollection:', baseCollection);
    return baseCollection;
  }

  const collectionName = `${baseCollection}_${werkstattId}`;
  console.log(`🏢 getCollectionName: ${baseCollection} → ${collectionName}`);
  return collectionName;
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
    if (useEmulator) {
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
      } catch (e) {
        console.warn('⚠️ Firestore Emulator connection:', e.message);
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
      try {
        if (firebase.functions) {
          functions = firebase.functions();
          console.log('✅ Functions connected (Production)');
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
