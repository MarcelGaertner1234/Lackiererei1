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

// Detect if running in CI environment
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const useEmulator = process.env.FIREBASE_EMULATOR === 'true' || isCI;

console.log('🔥 Firebase Config Loading...');
console.log('  Environment: ' + (isCI ? 'CI (GitHub Actions)' : 'Local'));
console.log('  Use Emulator: ' + (useEmulator ? 'YES' : 'NO'));

// Firebase Configuration (Demo Project für Emulator)
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-test",
  storageBucket: "demo-test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
let firebaseApp;
let db;
let storage;

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

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  window.firebaseInitialized = false;
  throw error;
}

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

console.log('✅ Firebase Config Template loaded successfully');
console.log('  Project ID: ' + firebaseConfig.projectId);
console.log('  Emulator Mode: ' + useEmulator);
