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
    } else {
      // Use real Firebase (Production/Staging)
      db = firebaseApp.firestore();
      storage = firebaseApp.storage();
      console.log('✅ Firestore connected (Production)');
      console.log('✅ Storage connected (Production)');
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

    // Global initFirebase() function for compatibility with anfrage.html and other pages
    window.initFirebase = async function() {
      // Already initialized above, just return resolved promise
      console.log('✅ initFirebase() called (already initialized)');
      return Promise.resolve();
    };

    // CRITICAL: Expose db and storage as GLOBAL variables (not just functions!)
    // anfrage.html expects global `db` variable (Lines 348, 574, 649)
    window.db = db;
    window.storage = storage;

    console.log('✅ Global db and storage variables exposed');
    console.log('✅ Firebase Config Template loaded successfully');
    console.log('  Project ID: ' + firebaseConfig.projectId);
    console.log('  Emulator Mode: ' + useEmulator);

  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    window.firebaseInitialized = false;
    throw error;
  }
});
