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

### Option 1: Domain-basierte Einschränkung

Nur Zugriff von deiner GitHub Pages Domain erlauben:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fahrzeuge/{fahrzeugId} {
      // Nur von deiner Domain erlauben
      allow read, write: if request.auth == null &&
                            request.domain == 'marcelgaertner1234.github.io';
    }
  }
}
```

### Option 2: Mit Firebase Authentication (BESTE Lösung)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fahrzeuge/{fahrzeugId} {
      // Nur angemeldete Benutzer
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.auth.token.email.matches('.*@auto-lackierzentrum\\.de$');
    }
  }
}
```

### Option 3: API Key Validierung (für diese App)

Da wir keine User-Authentication haben, verwende Custom Claims:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fahrzeuge/{fahrzeugId} {
      // Lesezugriff nur mit gültigem Request
      allow read: if request.auth == null;  // Temporär für GitHub Pages

      // Schreibzugriff nur mit Validierung
      allow create: if request.resource.data.keys().hasAll(['kennzeichen', 'kundenname', 'status']);
      allow update: if request.resource.data.keys().hasAll(['id']);
      allow delete: if true;  // Nur aus der App möglich
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

## 📋 STORAGE RULES (falls Blaze Plan aktiviert)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /fahrzeuge/{fahrzeugId}/{allPaths=**} {
      // Nur Zugriff von deiner Domain
      allow read: if request.auth == null;
      allow write: if request.auth == null &&
                      request.resource.size < 10 * 1024 * 1024;  // Max 10 MB
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
