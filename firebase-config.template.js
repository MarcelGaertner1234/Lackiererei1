/**
 * Firebase Configuration Template für CI/CD (GitHub Actions)
 *
 * Diese Datei wird in GitHub Actions verwendet wenn firebase-config.js
 * nicht verfügbar ist (wegen .gitignore).
 *
 * Verwendet Firebase Emulators statt echtem Firebase Project.
 *
 * WICHTIG: Für lokale Entwicklung echte firebase-config.js verwenden!
 */

// Always use Emulator for CI/CD Template
// (This template is ONLY used in GitHub Actions with Firebase Emulators)
const useEmulator = true;

console.log('🔥 Firebase Config Loading...');
console.log('  Environment: CI/CD (GitHub Actions)');
console.log('  Use Emulator: YES');

// Firebase Configuration (Demo Project für Emulator)
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-test",
  storageBucket: "demo-test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase (wrapped in DOMContentLoaded to ensure SDK loaded)
let firebaseApp;
let db;
let storage;

// CRITICAL FIX RUN #16: Define window.firebaseApp IMMEDIATELY to prevent race condition
// Problem: anfrage-detail.html DOMContentLoaded may fire BEFORE firebase-config DOMContentLoaded!
// Solution: Define window.firebaseApp object structure immediately (before any DOMContentLoaded)
// The actual Firebase instances (firebaseApp, db, storage) will be set when initialized
window.firebaseApp = {
  app: null,
  db: () => db,
  storage: () => storage,

  // Helper Functions (same as real firebase-config.js)
  getAllFahrzeuge: async function() {
    const snapshot = await db.collection('fahrzeuge').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getAllKunden: async function() {
    const snapshot = await db.collection('kunden').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  deleteFahrzeug: async function(id) {
    await db.collection('fahrzeuge').doc(id).delete();
  },

  deleteKunde: async function(id) {
    await db.collection('kunden').doc(id).delete();
  },

  savePhotosToFirestore: async function(fahrzeugId, photos, type = 'vorher') {
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

  listenToFahrzeuge: function(callback) {
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
  // This function is called by partner-app/anfrage-detail.html Line 1801
  registriereKundenbesuch: async function(kundeData) {
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

    // NOTE: window.db and window.storage already exposed immediately after creation (Lines 95-97 + 106-108)
    // NOTE: window.firebaseApp object structure defined at Line 39 (BEFORE DOMContentLoaded)
    // This ensures loadAnfrage() can access firebaseApp functions right after script loads
    console.log('✅ Global db and storage variables confirmed available');
    console.log('✅ Firebase Config Template loaded successfully');
    console.log('  Project ID: ' + firebaseConfig.projectId);
    console.log('  Emulator Mode: ' + useEmulator);

  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    window.firebaseInitialized = false;
    throw error;
  }
});

// WORKFLOW TRIGGER: This comment was added to trigger GitHub Actions Run #25
// The previous commits (RUN_24_VALIDATION.md, MONITORING_RUN_25.md) did not
// trigger the workflow because they were not in the trigger paths.
// Date: 2025-10-14 22:45
