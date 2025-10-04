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
// FIREBASE STORAGE - FOTO-UPLOAD
// ====================================================================

// Base64 zu Blob konvertieren
function base64ToBlob(base64String) {
  const parts = base64String.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uint8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; i++) {
    uint8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: contentType });
}

// Einzelnes Foto zu Firebase Storage hochladen
async function uploadPhotoToStorage(base64Image, fahrzeugId, photoIndex, photoType = 'vorher') {
  try {
    if (!storage) {
      throw new Error("Firebase Storage nicht initialisiert");
    }

    // Blob erstellen
    const blob = base64ToBlob(base64Image);

    // Pfad in Storage: fahrzeuge/{id}/{type}_photo_{index}.jpg
    const fileName = `${photoType}_photo_${photoIndex}.jpg`;
    const storagePath = `fahrzeuge/${fahrzeugId}/${fileName}`;

    // Upload zu Storage
    const storageRef = storage.ref(storagePath);
    const uploadTask = await storageRef.put(blob);

    // Download-URL holen
    const downloadURL = await uploadTask.ref.getDownloadURL();

    console.log(`✅ Foto hochgeladen: ${fileName} → ${downloadURL.substring(0, 50)}...`);
    return downloadURL;
  } catch (error) {
    console.error("❌ Fehler beim Foto-Upload:", error);
    throw error;
  }
}

// Mehrere Fotos parallel hochladen
async function uploadMultiplePhotos(base64Photos, fahrzeugId, photoType = 'vorher') {
  try {
    if (!base64Photos || base64Photos.length === 0) {
      return [];
    }

    console.log(`📸 Lade ${base64Photos.length} Fotos zu Storage hoch...`);

    // Alle Fotos parallel hochladen
    const uploadPromises = base64Photos.map((photo, index) =>
      uploadPhotoToStorage(photo, fahrzeugId, index, photoType)
    );

    const photoURLs = await Promise.all(uploadPromises);

    console.log(`✅ ${photoURLs.length} Fotos erfolgreich hochgeladen`);
    return photoURLs;
  } catch (error) {
    console.error("❌ Fehler beim Hochladen mehrerer Fotos:", error);
    throw error;
  }
}

// Alle Fotos eines Fahrzeugs aus Storage löschen
async function deleteVehiclePhotos(fahrzeugId) {
  try {
    if (!storage) {
      throw new Error("Firebase Storage nicht initialisiert");
    }

    // Ordner-Referenz
    const folderRef = storage.ref(`fahrzeuge/${fahrzeugId}`);

    // Alle Dateien im Ordner listen
    const listResult = await folderRef.listAll();

    if (listResult.items.length === 0) {
      console.log("ℹ️ Keine Fotos zum Löschen vorhanden");
      return 0;
    }

    // Alle Dateien löschen
    const deletePromises = listResult.items.map(item => item.delete());
    await Promise.all(deletePromises);

    console.log(`✅ ${listResult.items.length} Fotos aus Storage gelöscht`);
    return listResult.items.length;
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Fotos:", error);
    // Nicht werfen - Fahrzeug soll trotzdem gelöscht werden
    return 0;
  }
}

// URL zu Base64 konvertieren (für PDF-Generierung)
async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("❌ Fehler beim Konvertieren URL → Base64:", error);
    throw error;
  }
}

// Mehrere URLs zu Base64 konvertieren (für PDFs)
async function urlsToBase64(urls) {
  if (!urls || urls.length === 0) return [];

  try {
    const promises = urls.map(url => urlToBase64(url));
    return await Promise.all(promises);
  } catch (error) {
    console.error("❌ Fehler beim Konvertieren mehrerer URLs:", error);
    return [];
  }
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
  // Initialisierung
  init: initFirebase,
  db: () => db,
  storage: () => storage,

  // Firestore Operationen
  saveFahrzeug: saveFahrzeugToFirestore,
  getAllFahrzeuge: getAllFahrzeugeFromFirestore,
  getFahrzeugByKennzeichen: getFahrzeugByKennzeichen,
  updateFahrzeug: updateFahrzeugInFirestore,
  deleteFahrzeug: deleteFahrzeugFromFirestore,
  deleteAllFahrzeuge: deleteAllFahrzeugeFromFirestore,
  listenToFahrzeuge: listenToFahrzeuge,

  // Storage Operationen (NEU!)
  uploadPhoto: uploadPhotoToStorage,
  uploadPhotos: uploadMultiplePhotos,
  deletePhotos: deleteVehiclePhotos,
  urlToBase64: urlToBase64,
  urlsToBase64: urlsToBase64,

  // Migration
  migrateFromLocalStorage: migrateLocalStorageToFirestore
};

console.log("📦 Firebase-Config geladen");
