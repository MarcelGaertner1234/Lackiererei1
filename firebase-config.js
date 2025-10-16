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
 */

// PRODUCTION Mode - NO Emulator
const useEmulator = false;

console.log('🔥 Firebase Config Loading...');
console.log('  Environment: PRODUCTION (GitHub Pages)');
console.log('  Use Emulator: NO');

// ✅ Firebase Credentials aus Git History wiederhergestellt (RUN #45)
const firebaseConfig = {
  apiKey: "AIzaSyD-ulIZd6GvNb3rVGQu44QtXt-zeeva3Kg",
  authDomain: "auto-lackierzentrum-mosbach.firebaseapp.com",
  projectId: "auto-lackierzentrum-mosbach",
  storageBucket: "auto-lackierzentrum-mosbach.firebasestorage.app",
  messagingSenderId: "298750297417",
  appId: "1:298750297417:web:16a0d14d3bb5d9bf83c698",
  measurementId: "G-9VZE8QXR38"
};

// Initialize Firebase (wrapped in DOMContentLoaded to ensure SDK loaded)
let firebaseApp;
let db;
let storage;

// CRITICAL FIX RUN #17: Define window.firebaseApp IMMEDIATELY with Arrow Functions (Closure)
// Problem (Run #16): Functions used `db` at DEFINITION time → db was undefined
// Solution: Arrow Functions evaluate `db` at EXECUTION time (closure over outer scope)
// The actual Firebase instances (firebaseApp, db, storage) will be set in DOMContentLoaded
window.firebaseApp = {
  app: null,
  db: () => db,
  storage: () => storage,

  // Helper Functions - CHANGED TO ARROW FUNCTIONS for closure access to `db`
  getAllFahrzeuge: async () => {
    const snapshot = await db.collection('fahrzeuge').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getAllKunden: async () => {
    const snapshot = await db.collection('kunden').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  deleteFahrzeug: async (id) => {
    await db.collection('fahrzeuge').doc(id).delete();
  },

  deleteKunde: async (id) => {
    await db.collection('kunden').doc(id).delete();
  },

  savePhotosToFirestore: async (fahrzeugId, photos, type = 'vorher') => {
    const photosRef = db.collection('fahrzeuge')
      .doc(String(fahrzeugId))
      .collection('fotos')
      .doc(type);

    await photosRef.set({
      photos: photos,
      count: photos.length,
      lastUpdated: Date.now()
    });
  },

  savePhotosLocal: (fahrzeugId, photos, type = 'vorher') => {
    const key = `fahrzeug_${fahrzeugId}_fotos_${type}`;
    localStorage.setItem(key, JSON.stringify(photos));
    console.log(`✅ Fotos in LocalStorage gespeichert: ${key} (${photos.length} Fotos)`);
  },

  listenToFahrzeuge: (callback) => {
    return db.collection('fahrzeuge')
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
  registriereKundenbesuch: async (kundeData) => {
    try {
      // Backward compatibility: Accept string or object
      const kundenname = typeof kundeData === 'string' ? kundeData : kundeData.name;

      if (!kundenname) {
        console.error('❌ Kein Kundenname angegeben!');
        return null;
      }

      // Check if customer exists
      const snapshot = await db.collection('kunden')
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

        await db.collection('kunden').doc(kundeId).update(updates);
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

        await db.collection('kunden').doc(neuerKunde.id).set(neuerKunde);
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

// Define initFirebase() helper for compatibility
window.initFirebase = async function() {
  // If Firebase already initialized, return immediately
  if (window.firebaseInitialized) {
    console.log('✅ initFirebase() called (already initialized)');
    return Promise.resolve();
  }

  // Otherwise, wait for firebaseReady event
  console.log('⏳ initFirebase() waiting for Firebase initialization...');
  await new Promise(resolve => {
    if (window.firebaseInitialized) {
      resolve();
    } else {
      window.addEventListener('firebaseReady', resolve, { once: true });
    }
  });
  console.log('✅ initFirebase() resolved - Firebase ready');
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
      storage = firebaseApp.storage();

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

      // CRITICAL FIX: Expose db and storage IMMEDIATELY (not 50 lines later!)
      // Problem: initFirebase() returns BEFORE window.db is set (Lines 100-104 vs 158)
      // Solution: Set window.db RIGHT AFTER creation
      window.db = db;
      window.storage = storage;
      console.log('✅ IMMEDIATE: window.db and window.storage exposed');
    } else {
      // Use real Firebase (Production/Staging)
      db = firebaseApp.firestore();
      storage = firebaseApp.storage();
      console.log('✅ Firestore connected (Production)');
      console.log('✅ Storage connected (Production)');

      // CRITICAL FIX: Expose db and storage IMMEDIATELY
      window.db = db;
      window.storage = storage;
      console.log('✅ IMMEDIATE: window.db and window.storage exposed');
    }

    // Update window.firebaseApp.app with initialized instance
    window.firebaseApp.app = firebaseApp;

    // Mark as initialized
    window.firebaseInitialized = true;
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
    throw error;
  }
});

// RUN #44: Production Firebase Config created
// Date: 2025-10-16
// Fixes: 404 Error on GitHub Pages (firebase-config-RUN24.js not found)
