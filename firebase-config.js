// ====================================================================
// FIREBASE KONFIGURATION - Auto-Lackierzentrum Mosbach
// ====================================================================
//
// ⚠️ WICHTIG: Ersetze die Platzhalter unten mit deinen echten Firebase-Werten!
//
// Wo finde ich meine Werte?
// 1. Gehe zu https://console.firebase.google.com
// 2. Wähle dein Projekt aus
// 3. Klicke auf Zahnrad-Symbol (Projekteinstellungen)
// 4. Scrolle runter zu "Meine Apps" → "SDK-Konfiguration"
// 5. Kopiere die Werte

const firebaseConfig = {
  apiKey: "AIzaSyDulIZd6GvNb3rVGQu44QtXt-zeeva3Kg",
  authDomain: "auto-lackierzentrum-mosbach.firebaseapp.com",
  projectId: "auto-lackierzentrum-mosbach",
  storageBucket: "auto-lackierzentrum-mosbach.firebasestorage.app",
  messagingSenderId: "298750297417",
  appId: "1:298750297417:web:16a0d14d3bb5d9bf83c698",
  measurementId: "G-9VZE8QXR38"
};

// ====================================================================
// AB HIER NICHTS ÄNDERN! (Automatische Initialisierung)
// ====================================================================

let db = null;
let storage = null;

// Firebase initialisieren
function initFirebase() {
  try {
    // Prüfe ob Konfiguration noch Platzhalter enthält
    if (firebaseConfig.apiKey.includes("DEIN-")) {
      console.warn("⚠️ FIREBASE NICHT KONFIGURIERT!");
      console.warn("Bitte öffne firebase-config.js und trage deine Firebase-Werte ein.");
      console.warn("Anleitung: Siehe FIREBASE_SETUP.md");
      return false;
    }

    // Firebase App initialisieren
    const app = firebase.initializeApp(firebaseConfig);

    // Firestore initialisieren
    db = firebase.firestore();

    // Offline-Persistenz aktivieren (App funktioniert auch offline!)
    db.enablePersistence({ synchronizeTabs: true })
      .then(() => {
        console.log("✅ Firestore Offline-Modus aktiviert");
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("⚠️ Offline-Modus nur in einem Tab möglich");
        } else if (err.code === 'unimplemented') {
          console.warn("⚠️ Browser unterstützt keinen Offline-Modus");
        }
      });

    // Firebase Storage initialisieren
    storage = firebase.storage();

    console.log("✅ Firebase erfolgreich initialisiert");
    console.log("📊 Projekt:", firebaseConfig.projectId);

    return true;
  } catch (error) {
    console.error("❌ Firebase Initialisierung fehlgeschlagen:", error);
    return false;
  }
}

// ====================================================================
// HELPER-FUNKTIONEN FÜR FIRESTORE
// ====================================================================

// Fahrzeug in Firestore speichern
async function saveFahrzeugToFirestore(fahrzeugData) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    // Verwende Timestamp als ID (falls nicht vorhanden)
    const fahrzeugId = fahrzeugData.id || Date.now().toString();
    fahrzeugData.id = fahrzeugId;

    // Speichere in Firestore
    await db.collection('fahrzeuge').doc(fahrzeugId).set(fahrzeugData);

    console.log("✅ Fahrzeug gespeichert:", fahrzeugId);
    return fahrzeugId;
  } catch (error) {
    console.error("❌ Fehler beim Speichern:", error);
    throw error;
  }
}

// Alle Fahrzeuge aus Firestore laden
async function getAllFahrzeugeFromFirestore() {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const snapshot = await db.collection('fahrzeuge')
      .orderBy('id', 'desc')
      .get();

    const fahrzeuge = [];
    snapshot.forEach(doc => {
      fahrzeuge.push(doc.data());
    });

    console.log("✅ Fahrzeuge geladen:", fahrzeuge.length);
    return fahrzeuge;
  } catch (error) {
    console.error("❌ Fehler beim Laden:", error);
    return [];
  }
}

// Fahrzeug aus Firestore laden (nach Kennzeichen)
async function getFahrzeugByKennzeichen(kennzeichen) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const snapshot = await db.collection('fahrzeuge')
      .where('kennzeichen', '==', kennzeichen.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    console.error("❌ Fehler beim Suchen:", error);
    return null;
  }
}

// Fahrzeug in Firestore aktualisieren
async function updateFahrzeugInFirestore(fahrzeugId, updates) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    await db.collection('fahrzeuge').doc(fahrzeugId.toString()).update(updates);

    console.log("✅ Fahrzeug aktualisiert:", fahrzeugId);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren:", error);
    throw error;
  }
}

// Fahrzeug aus Firestore löschen
async function deleteFahrzeugFromFirestore(fahrzeugId) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    await db.collection('fahrzeuge').doc(fahrzeugId.toString()).delete();

    console.log("✅ Fahrzeug gelöscht:", fahrzeugId);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Löschen:", error);
    throw error;
  }
}

// Alle Fahrzeuge löschen (für Test-Zwecke)
async function deleteAllFahrzeugeFromFirestore() {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const snapshot = await db.collection('fahrzeuge').get();
    const batch = db.batch();

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log("✅ Alle Fahrzeuge gelöscht");
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Löschen aller Fahrzeuge:", error);
    throw error;
  }
}

// Echtzeit-Listener für Fahrzeuge (synchronisiert automatisch!)
function listenToFahrzeuge(callback) {
  if (!db) {
    console.error("Firestore nicht initialisiert");
    return null;
  }

  return db.collection('fahrzeuge')
    .orderBy('id', 'desc')
    .onSnapshot(snapshot => {
      const fahrzeuge = [];
      snapshot.forEach(doc => {
        fahrzeuge.push(doc.data());
      });

      console.log("🔄 Fahrzeuge aktualisiert (Echtzeit):", fahrzeuge.length);
      callback(fahrzeuge);
    }, error => {
      console.error("❌ Fehler beim Echtzeit-Listener:", error);
    });
}

// ====================================================================
// MIGRATION: LocalStorage → Firestore
// ====================================================================

// Bestehende LocalStorage-Daten nach Firestore migrieren
async function migrateLocalStorageToFirestore() {
  try {
    const localData = localStorage.getItem('fahrzeuge');
    if (!localData) {
      console.log("ℹ️ Keine LocalStorage-Daten zum Migrieren");
      return 0;
    }

    const fahrzeuge = JSON.parse(localData);
    if (fahrzeuge.length === 0) {
      console.log("ℹ️ LocalStorage ist leer");
      return 0;
    }

    console.log(`📦 Migriere ${fahrzeuge.length} Fahrzeuge zu Firestore...`);

    for (const fahrzeug of fahrzeuge) {
      await saveFahrzeugToFirestore(fahrzeug);
    }

    console.log("✅ Migration abgeschlossen!");
    console.log("ℹ️ LocalStorage-Daten bleiben als Backup erhalten");

    return fahrzeuge.length;
  } catch (error) {
    console.error("❌ Fehler bei Migration:", error);
    return 0;
  }
}

// ====================================================================
// EXPORT (für Verwendung in HTML-Dateien)
// ====================================================================

window.firebaseApp = {
  init: initFirebase,
  db: () => db,
  storage: () => storage,
  saveFahrzeug: saveFahrzeugToFirestore,
  getAllFahrzeuge: getAllFahrzeugeFromFirestore,
  getFahrzeugByKennzeichen: getFahrzeugByKennzeichen,
  updateFahrzeug: updateFahrzeugInFirestore,
  deleteFahrzeug: deleteFahrzeugFromFirestore,
  deleteAllFahrzeuge: deleteAllFahrzeugeFromFirestore,
  listenToFahrzeuge: listenToFahrzeuge,
  migrateFromLocalStorage: migrateLocalStorageToFirestore
};

console.log("📦 Firebase-Config geladen");
