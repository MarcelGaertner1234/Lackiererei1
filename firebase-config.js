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

    // Firebase Storage initialisieren (optional - falls Blaze Plan aktiviert)
    try {
      storage = firebase.storage();
      console.log("✅ Firebase Storage verfügbar");
    } catch (storageError) {
      console.warn("⚠️ Firebase Storage nicht verfügbar (Blaze Plan erforderlich)");
      console.warn("→ Fotos werden in LocalStorage gespeichert");
      storage = null;
    }

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

    // Verwende Timestamp als ID (falls nicht vorhanden) - IMMER zu String konvertieren!
    const fahrzeugId = (fahrzeugData.id || Date.now()).toString();
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

    // Ohne orderBy (kein Index erforderlich)
    const snapshot = await db.collection('fahrzeuge').get();

    const fahrzeuge = [];
    snapshot.forEach(doc => {
      fahrzeuge.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sortierung im JavaScript (statt Firestore orderBy)
    fahrzeuge.sort((a, b) => b.id - a.id);

    console.log("✅ Fahrzeuge geladen:", fahrzeuge.length);
    return fahrzeuge;
  } catch (error) {
    console.error("❌ Fehler beim Laden der Fahrzeuge:", error);
    console.error("   Details:", error.message);
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

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
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

    await db.collection('fahrzeuge').doc(String(fahrzeugId)).update(updates);

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

    await db.collection('fahrzeuge').doc(String(fahrzeugId)).delete();

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

  // Ohne orderBy (kein Index erforderlich)
  return db.collection('fahrzeuge')
    .onSnapshot(snapshot => {
      const fahrzeuge = [];
      snapshot.forEach(doc => {
        fahrzeuge.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sortierung im JavaScript
      fahrzeuge.sort((a, b) => b.id - a.id);

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
// FIRESTORE FOTO-FUNKTIONEN (Subcollections statt LocalStorage)
// ====================================================================

// Fotos in Firestore speichern (Subcollection)
async function savePhotosToFirestore(fahrzeugId, photos, type = 'vorher') {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    if (!photos || photos.length === 0) {
      console.log(`ℹ️ Keine ${type}-Fotos zum Speichern`);
      return true;
    }

    const photosRef = db.collection('fahrzeuge')
      .doc(String(fahrzeugId))
      .collection('fotos')
      .doc(type);

    await photosRef.set({
      photos: photos,
      count: photos.length,
      lastUpdated: Date.now()
    });

    console.log(`✅ ${photos.length} ${type}-Fotos in Firestore gespeichert`);
    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Speichern der ${type}-Fotos:`, error);
    throw error;
  }
}

// Fotos aus Firestore laden
async function loadPhotosFromFirestore(fahrzeugId, type = 'vorher') {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const photosRef = db.collection('fahrzeuge')
      .doc(String(fahrzeugId))
      .collection('fotos')
      .doc(type);

    const doc = await photosRef.get();

    if (doc.exists) {
      const data = doc.data();
      return data.photos || [];
    }

    return [];
  } catch (error) {
    console.error(`❌ Fehler beim Laden der ${type}-Fotos:`, error);
    return [];
  }
}

// Alle Fotos eines Fahrzeugs laden (vorher + nachher)
async function loadAllPhotosFromFirestore(fahrzeugId) {
  try {
    const vorher = await loadPhotosFromFirestore(fahrzeugId, 'vorher');
    const nachher = await loadPhotosFromFirestore(fahrzeugId, 'nachher');

    return {
      vorher: vorher,
      nachher: nachher
    };
  } catch (error) {
    console.error("❌ Fehler beim Laden aller Fotos:", error);
    return { vorher: [], nachher: [] };
  }
}

// Fotos eines Fahrzeugs aus Firestore löschen
async function deletePhotosFromFirestore(fahrzeugId) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const fotosRef = db.collection('fahrzeuge')
      .doc(String(fahrzeugId))
      .collection('fotos');

    // Beide Dokumente löschen
    await fotosRef.doc('vorher').delete();
    await fotosRef.doc('nachher').delete();

    console.log(`✅ Fotos von Fahrzeug ${fahrzeugId} aus Firestore gelöscht`);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Fotos:", error);
    return false;
  }
}

// ====================================================================
// LOCALSTORAGE HELPER FÜR FOTOS (DEPRECATED - nur für Migration)
// ====================================================================

// Fotos in LocalStorage speichern (DEPRECATED)
function savePhotosToLocalStorage(fahrzeugId, photos, type = 'vorher') {
  try {
    const key = `fahrzeugfotos_${fahrzeugId}`;
    let fotosData = JSON.parse(localStorage.getItem(key) || '{}');

    fotosData[type] = photos;

    localStorage.setItem(key, JSON.stringify(fotosData));
    console.log(`✅ ${photos.length} ${type}-Fotos in LocalStorage gespeichert`);

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Speichern der Fotos:", error);
    return false;
  }
}

// Fotos aus LocalStorage laden
function loadPhotosFromLocalStorage(fahrzeugId, type = 'vorher') {
  try {
    const key = `fahrzeugfotos_${fahrzeugId}`;
    const fotosData = JSON.parse(localStorage.getItem(key) || '{}');

    return fotosData[type] || [];
  } catch (error) {
    console.error("❌ Fehler beim Laden der Fotos:", error);
    return [];
  }
}

// Alle Fotos eines Fahrzeugs laden
function loadAllPhotosFromLocalStorage(fahrzeugId) {
  try {
    const key = `fahrzeugfotos_${fahrzeugId}`;
    const fotosData = JSON.parse(localStorage.getItem(key) || '{}');

    return {
      vorher: fotosData.vorher || [],
      nachher: fotosData.nachher || []
    };
  } catch (error) {
    console.error("❌ Fehler beim Laden aller Fotos:", error);
    return { vorher: [], nachher: [] };
  }
}

// Fotos eines Fahrzeugs aus LocalStorage löschen
function deletePhotosFromLocalStorage(fahrzeugId) {
  try {
    const key = `fahrzeugfotos_${fahrzeugId}`;
    localStorage.removeItem(key);
    console.log(`✅ Fotos von Fahrzeug ${fahrzeugId} aus LocalStorage gelöscht`);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Fotos:", error);
    return false;
  }
}

// Alle Fotos aus LocalStorage löschen
function deleteAllPhotosFromLocalStorage() {
  try {
    const keys = Object.keys(localStorage);
    const fotoKeys = keys.filter(key => key.startsWith('fahrzeugfotos_'));

    fotoKeys.forEach(key => localStorage.removeItem(key));

    console.log(`✅ ${fotoKeys.length} Foto-Collections aus LocalStorage gelöscht`);
    return fotoKeys.length;
  } catch (error) {
    console.error("❌ Fehler beim Löschen aller Fotos:", error);
    return 0;
  }
}

// ====================================================================
// KUNDEN-VERWALTUNG
// ====================================================================

// Kunde in Firestore speichern
async function saveKundeToFirestore(kundeData) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    // Verwende ID oder generiere neue
    const kundeId = (kundeData.id || 'kunde_' + Date.now()).toString();
    kundeData.id = kundeId;

    // Speichere in Firestore
    await db.collection('kunden').doc(kundeId).set(kundeData);

    console.log("✅ Kunde gespeichert:", kundeId);
    return kundeId;
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Kunden:", error);
    throw error;
  }
}

// Alle Kunden aus Firestore laden
async function getAllKundenFromFirestore() {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    // Ohne orderBy (kein Index erforderlich)
    const snapshot = await db.collection('kunden').get();

    const kunden = [];
    snapshot.forEach(doc => {
      kunden.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sortierung im JavaScript (alphabetisch nach Name)
    kunden.sort((a, b) => a.name.localeCompare(b.name));

    console.log("✅ Kunden geladen:", kunden.length);
    return kunden;
  } catch (error) {
    console.error("❌ Fehler beim Laden der Kunden:", error);
    console.error("   Details:", error.message);
    return [];
  }
}

// Kunde nach ID laden
async function getKundeById(kundeId) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const doc = await db.collection('kunden').doc(String(kundeId)).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error("❌ Fehler beim Laden des Kunden:", error);
    return null;
  }
}

// Kunde nach Name suchen
async function getKundeByName(name) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    const snapshot = await db.collection('kunden')
      .where('name', '==', name)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error("❌ Fehler beim Suchen des Kunden:", error);
    return null;
  }
}

// Kunde aktualisieren
async function updateKundeInFirestore(kundeId, updates) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    await db.collection('kunden').doc(String(kundeId)).update(updates);

    console.log("✅ Kunde aktualisiert:", kundeId);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Kunden:", error);
    throw error;
  }
}

// Kunde löschen
async function deleteKundeFromFirestore(kundeId) {
  try {
    if (!db) {
      throw new Error("Firestore nicht initialisiert");
    }

    await db.collection('kunden').doc(String(kundeId)).delete();

    console.log("✅ Kunde gelöscht:", kundeId);
    return true;
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Kunden:", error);
    throw error;
  }
}

// Kundenbesuch registrieren (automatisch bei neuer Annahme)
async function registriereKundenbesuch(kundenname) {
  try {
    // Suche Kunde nach Name
    let kunde = await getKundeByName(kundenname);

    if (kunde) {
      // Kunde existiert - aktualisiere Besuchszähler
      const updates = {
        anzahlBesuche: (kunde.anzahlBesuche || 0) + 1,
        letzterBesuch: new Date().toISOString()
      };

      await updateKundeInFirestore(kunde.id, updates);
      console.log(`✅ Besuch registriert für: ${kundenname} (${updates.anzahlBesuche}. Besuch)`);
      return kunde.id;
    } else {
      // Neuer Kunde - erstelle Eintrag
      const neuerKunde = {
        id: 'kunde_' + Date.now(),
        name: kundenname,
        telefon: '',
        email: '',
        notizen: '',
        erstbesuch: new Date().toISOString(),
        letzterBesuch: new Date().toISOString(),
        anzahlBesuche: 1
      };

      const kundeId = await saveKundeToFirestore(neuerKunde);
      console.log(`✅ Neuer Kunde erstellt: ${kundenname}`);
      return kundeId;
    }
  } catch (error) {
    console.error("❌ Fehler beim Registrieren des Besuchs:", error);
    return null;
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

  // Firestore Operationen (Fahrzeuge)
  saveFahrzeug: saveFahrzeugToFirestore,
  getAllFahrzeuge: getAllFahrzeugeFromFirestore,
  getFahrzeugByKennzeichen: getFahrzeugByKennzeichen,
  updateFahrzeug: updateFahrzeugInFirestore,
  deleteFahrzeug: deleteFahrzeugFromFirestore,
  deleteAllFahrzeuge: deleteAllFahrzeugeFromFirestore,
  listenToFahrzeuge: listenToFahrzeuge,

  // Firestore Operationen (Kunden)
  saveKunde: saveKundeToFirestore,
  getAllKunden: getAllKundenFromFirestore,
  getKundeById: getKundeById,
  getKundeByName: getKundeByName,
  updateKunde: updateKundeInFirestore,
  deleteKunde: deleteKundeFromFirestore,
  registriereKundenbesuch: registriereKundenbesuch,

  // Storage Operationen (falls Blaze Plan aktiviert)
  uploadPhoto: uploadPhotoToStorage,
  uploadPhotos: uploadMultiplePhotos,
  deletePhotos: deleteVehiclePhotos,
  urlToBase64: urlToBase64,
  urlsToBase64: urlsToBase64,

  // Firestore Foto-Operationen (NEU - primär)
  savePhotosToFirestore: savePhotosToFirestore,
  loadPhotosFromFirestore: loadPhotosFromFirestore,
  loadAllPhotosFromFirestore: loadAllPhotosFromFirestore,
  deletePhotosFromFirestore: deletePhotosFromFirestore,

  // LocalStorage Foto-Operationen (DEPRECATED - nur für Migration)
  savePhotosLocal: savePhotosToLocalStorage,
  loadPhotosLocal: loadPhotosFromLocalStorage,
  loadAllPhotosLocal: loadAllPhotosFromLocalStorage,
  deletePhotosLocal: deletePhotosFromLocalStorage,
  deleteAllPhotosLocal: deleteAllPhotosFromLocalStorage,

  // Migration
  migrateFromLocalStorage: migrateLocalStorageToFirestore
};

console.log("📦 Firebase-Config geladen");
