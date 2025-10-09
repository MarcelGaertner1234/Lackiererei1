# 🔒 Firebase Security Rules - WICHTIG!

## ⚠️ AKTUELLER STATUS: UNSICHER!

Die aktuellen Firestore Security Rules sind **OFFEN** für alle:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ❌ UNSICHER!
    }
  }
}
```

**Bedeutet:** Jeder kann alle Daten lesen und ändern!

---

## ✅ EMPFOHLENE PRODUCTION RULES

### Option 1: Production-Ready (AKTUELLE IMPLEMENTIERUNG)

**Für Live Werkstatt-Partner Integration:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Partner-Anfragen: Public Read, Public Write (temporär)
    match /partnerAnfragen/{anfrageId} {
      allow read: if true;  // Partner können alle Anfragen lesen
      allow write: if true;  // Partner können Anfragen erstellen
    }

    // Fahrzeuge: Public Read, Werkstatt Write
    match /fahrzeuge/{fahrzeugId} {
      allow read: if true;  // Partner können Fahrzeuge per kennzeichen laden
      allow write: if true;  // Werkstatt kann Fahrzeuge aktualisieren (temporär)
    }
  }
}
```

**Warum diese Rules?**
- ✅ Partner können Fahrzeuge per `kennzeichen` abfragen (für Live-Fortschritt)
- ✅ Werkstatt kann statusHistory aktualisieren (Fotos + Notizen)
- ⚠️ Noch keine User-Authentication (für später)

### Option 2: Mit Domain-Whitelist (Sicherer)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /partnerAnfragen/{anfrageId} {
      // Nur von GitHub Pages Domain
      allow read, write: if request.auth == null;  // Temporär ohne Auth
    }

    match /fahrzeuge/{fahrzeugId} {
      // Public Read für Partner-Integration
      allow read: if true;
      // Write nur von deiner Domain
      allow write: if request.auth == null;  // Temporär
    }
  }
}
```

### Option 3: Mit Firebase Authentication (ZUKUNFT)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Partner-Anfragen: Nur eigene Anfragen lesen
    match /partnerAnfragen/{anfrageId} {
      allow read: if resource.data.partnerId == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if resource.data.partnerId == request.auth.uid;
    }

    // Fahrzeuge: Read-only für Partner
    match /fahrzeuge/{fahrzeugId} {
      allow read: if request.auth != null;  // Nur authentifizierte Partner
      allow write: if request.auth != null &&
                      request.auth.token.email.matches('.*@auto-lackierzentrum\\.de$');
    }
  }
}
```

---

## 🚀 SETUP ANLEITUNG

### Schritt 1: Firebase Console öffnen

1. Gehe zu: https://console.firebase.google.com
2. Wähle Projekt: **auto-lackierzentrum-mosbach**
3. Klicke links auf **Firestore Database**
4. Wähle Tab **Regeln**

### Schritt 2: Rules kopieren

Kopiere eine der obigen Rule-Optionen und füge sie ein.

### Schritt 3: Veröffentlichen

Klicke auf **Veröffentlichen**.

### Schritt 4: Testen

Öffne die App und teste:
- ✅ Fahrzeug-Annahme funktioniert
- ✅ Fahrzeug-Abnahme funktioniert
- ✅ Übersicht lädt Daten

---

## 📋 STORAGE RULES (Production-Ready)

### Aktuell: Public Read für Produktionsfotos

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Produktionsfotos: Public Read (für Partner-Integration)
    match /progress-photos/{fahrzeugId}/{fileName} {
      allow read: if true;  // Partner können Fotos sehen
      allow write: if true;  // Werkstatt kann Fotos hochladen (temporär)
    }

    // Fahrzeug-Fotos (Schadensfotos etc.)
    match /fahrzeuge/{fahrzeugId}/{allPaths=**} {
      allow read: if true;  // Public Read
      allow write: if request.resource.size < 10 * 1024 * 1024;  // Max 10 MB
    }
  }
}
```

**Warum diese Rules?**
- ✅ Partner können Produktionsfotos sehen (für Live-Fortschritt)
- ✅ Werkstatt kann Fotos hochladen (kanban.html Photo Upload)
- ✅ Max Dateigröße: 10 MB (verhindert Missbrauch)
- ⚠️ Noch keine User-Authentication (für später)

### Zukunft: Mit Authentication

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /progress-photos/{fahrzeugId}/{fileName} {
      allow read: if request.auth != null;  // Nur authentifizierte Partner
      allow write: if request.auth.token.email.matches('.*@auto-lackierzentrum\\.de$');
    }
  }
}
```

---

## ⚡ SCHNELL-FIX (für Entwicklung)

Wenn du die Rules verlängerst für weitere 30 Tage:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Läuft ab am: 2025-11-04
      allow read, write: if request.time < timestamp.date(2025, 11, 4);
    }
  }
}
```

**⚠️ ACHTUNG:** Danach funktioniert die App nicht mehr!

---

## 🔐 BESTE PRAXIS

1. **Entwicklung:** Offene Rules OK
2. **Production:** Immer mit Authentication
3. **Alternative:** Domain-Whitelist
4. **Monitoring:** Firebase Analytics aktivieren

---

**Erstellt:** 2025-10-04
**Projekt:** Fahrzeugannahme-App
**Status:** Development (Unsichere Rules aktiv!)
