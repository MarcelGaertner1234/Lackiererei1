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

// CRITICAL FIX: Define initFirebase() IMMEDIATELY to prevent race condition
// Problem: anfrage-detail.html DOMContentLoaded may fire BEFORE firebase-config DOMContentLoaded!
// Solution: Define initFirebase() globally before any DOMContentLoaded listeners run
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

    // Mark as initialized
    window.firebaseInitialized = true;
    console.log('✅ Firebase fully initialized');

    // Dispatch custom event for tests
    window.dispatchEvent(new Event('firebaseReady'));

    // Export für Tests
    window.firebaseApp = {
      app: firebaseApp,
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
      }
    };

    // NOTE: window.db and window.storage already exposed immediately after creation (Lines 95-97 + 106-108)
    // This ensures loadAnfrage() can access db right after initFirebase() resolves
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
