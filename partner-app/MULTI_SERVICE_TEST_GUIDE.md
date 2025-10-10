# Multi-Service Test Guide (OPTION 1 - Vereinfachte Struktur)

**Erstellt**: 2025-10-10
**Version**: 1.0 (Nach Rollback und Vereinfachung)
**Status**: Bereit für Live-Test

---

## 🎯 Test-Ziel

Überprüfung der **vereinfachten Multi-Service Struktur**, bei der **EINE einzige Firebase-Anfrage** erstellt wird statt 2 separate Dokumente.

### Was wurde geändert (OPTION 1):
- ✅ `multi-service-anfrage.html`: Erstellt nur noch **1 Dokument** mit `isMultiService: true`
- ✅ `kva-erstellen.html`: Liest `servicesData` aus **1 Dokument** statt mehrere zu verlinken
- ✅ `admin-anfragen.html`: Zeigt **"🔗 Multi-Service (X)"** Badge für kombinierte Anfragen

---

## 📋 Test-Szenario 1: Multi-Service Anfrage erstellen

### Vorbereitung:
1. **URL öffnen**: https://marcelgaertner1234.github.io/Lackiererei1/partner-app/
2. **Partner einloggen**: Als Partner-User anmelden
3. **Service-Auswahl öffnen**: Auf "Multi-Service Anfrage" klicken

### Test-Schritte:

#### Schritt 1: Service-Auswahl
- [ ] **2 Services auswählen**: z.B. ✅ Lackierung + ✅ Reifen
- [ ] **"Weiter zur Anfrage" klicken**
- **Erwartetes Verhalten**: Beide Service-Formulare werden angezeigt

#### Schritt 2: Formulare ausfüllen
- [ ] **Gemeinsame Felder** (oben):
  - Kennzeichen: `TEST-MS-123`
  - Auftragsnummer: `MS-001-2025`
  - Fahrzeugtyp: `VW Golf`
- [ ] **Lackierung-Service Felder**:
  - Farbnummer: `LA7W`
  - Schadenbeschreibung: `Kratzer Tür links`
  - Mindestens 1 Foto hochladen
- [ ] **Reifen-Service Felder**:
  - Reifendimension: `205/55 R16`
  - Reifenmarke: `Continental`
  - Anzahl Reifen: `4`
- [ ] **"Anfrage absenden" klicken**

#### Schritt 3: Bestätigung prüfen
- **Erwartetes Verhalten**:
  - ✅ Toast-Nachricht: "Multi-Service Anfrage erfolgreich erstellt!"
  - ✅ Weiterleitung zu `meine-anfragen.html`
  - ✅ **EINE** neue Anfrage sichtbar (nicht 2 separate!)

---

## 🔍 Test-Szenario 2: Firebase-Datenstruktur validieren

### Browser Console (F12) öffnen und prüfen:

```javascript
// Firebase Anfrage abrufen (ersetze 'REQ_ID' mit tatsächlicher ID)
firebase.firestore().collection('partnerAnfragen')
  .where('kennzeichen', '==', 'TEST-MS-123')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log('📄 Anfrage ID:', doc.id);
      console.log('📦 Dokument-Daten:', doc.data());
    });
  });
```

### Erwartete Struktur:

```javascript
{
  // Gemeinsame Felder
  kennzeichen: "TEST-MS-123",
  auftragsnummer: "MS-001-2025",
  fahrzeugtyp: "VW Golf",

  // Multi-Service Flags
  serviceTyp: "multi_service",
  isMultiService: true,
  services: ["lackier", "reifen"],  // ← Array mit 2 Services

  // Service-spezifische Daten (nested)
  servicesData: {
    lackier: {
      serviceData: {
        farbnummer: "LA7W",
        schadenbeschreibung: "Kratzer Tür links",
        // ... andere Lackier-Felder
      },
      fotos: ["data:image/jpeg;base64,..."]  // Base64 Bilder
    },
    reifen: {
      serviceData: {
        reifendimension: "205/55 R16",
        reifenmarke: "Continental",
        anzahlReifen: "4",
        // ... andere Reifen-Felder
      },
      fotos: ["data:image/jpeg;base64,..."]
    }
  },

  // Status-Felder
  status: "neu_eingegangen",
  statusText: "Neue Anfrage",
  createdAt: 1728550000000,
  lastUpdated: 1728550000000,

  // Partner-Info
  partnerEmail: "partner@beispiel.de",
  partnerName: "Beispiel Autohaus"
}
```

### ❌ Was NICHT mehr vorhanden sein sollte:
- ❌ **KEIN** `multiServiceGroup` Feld (alte Struktur)
- ❌ **KEINE** separaten Dokumente mit gleicher `multiServiceGroup` ID
- ❌ **KEINE** 2 separate Anfragen in der Liste

### ✅ Validierung:
- [ ] Nur **1 Dokument** in Firebase erstellt
- [ ] `isMultiService: true` vorhanden
- [ ] `services: ["lackier", "reifen"]` korrekt
- [ ] `servicesData.lackier` enthält alle Lackier-Daten
- [ ] `servicesData.reifen` enthält alle Reifen-Daten
- [ ] Fotos als Base64 in beiden Services gespeichert

---

## 🎨 Test-Szenario 3: Admin-Ansicht (Badge prüfen)

### Test-Schritte:
1. **URL öffnen**: https://marcelgaertner1234.github.io/Lackiererei1/partner-app/admin-anfragen.html
2. **Als Admin anmelden**
3. **Multi-Service Anfrage suchen**: `TEST-MS-123`

### Erwartetes Verhalten:
- [ ] **Badge angezeigt**: `🔗 Multi-Service (2)` mit **lila Gradient**
  - Background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
  - Anzahl Services korrekt: `(2)` für Lackierung + Reifen
- [ ] **NICHT** 2 separate Anfrage-Karten (alte Struktur)
- [ ] **Status**: "Neu eingegangen" (orange)

---

## 📝 Test-Szenario 4: KVA erstellen (Kostenvoranschlag)

### Vorbereitung:
1. **Admin-Ansicht**: Auf Multi-Service Anfrage `TEST-MS-123` klicken
2. **"KVA erstellen" Button**: Klicken

### Test-Schritte:

#### Schritt 1: KVA-Seite Validierung
- [ ] **URL prüfen**: `kva-erstellen.html?anfrage_id=REQ_xxx`
  - ✅ Nur **EINE** `anfrage_id` im URL (nicht mehrere)
- [ ] **Hinweis-Box sichtbar**:
  ```
  📋 Bitte erstellen Sie Preise für ALLE Services

  Gebuchte Services: Lackierung, Reifen

  💡 Tipp: Füllen Sie für jeden Service die Preisfelder aus...
  ```
- [ ] **Zwei Service-Sektionen sichtbar**:
  - 🎨 Lackierung (mit Farbnummer LA7W, Schadenbeschreibung)
  - 🚗 Reifen (mit Dimension 205/55 R16, Marke Continental)

#### Schritt 2: Preise eintragen
- [ ] **Lackierung - Variante 1**:
  - Name: `Smart Repair`
  - Material: `150`
  - Arbeitszeit: `200`
  - Empfohlen: ✅
- [ ] **Lackierung - Variante 2**:
  - Name: `Komplett-Lackierung`
  - Material: `500`
  - Arbeitszeit: `800`
- [ ] **Reifen - Variante 1**:
  - Name: `4x Continental Premium`
  - Material: `600`
  - Arbeitszeit: `80`
  - Empfohlen: ✅

#### Schritt 3: Termine festlegen
- [ ] **Start-Datum**: `25.10.2025`
- [ ] **End-Datum**: `27.10.2025`
- [ ] **Abholzeit**: `16:00`

#### Schritt 4: KVA absenden
- [ ] **"KVA erstellen und versenden" klicken**
- **Erwartetes Verhalten**:
  - ✅ Toast: "KVA erfolgreich erstellt!"
  - ✅ Status-Änderung: `neu_eingegangen` → `kva_gesendet`
  - ✅ Weiterleitung zu `admin-anfragen.html`

---

## 🔬 Test-Szenario 5: KVA-Datenstruktur validieren

### Browser Console (F12):

```javascript
// KVA-Daten prüfen
firebase.firestore().collection('partnerAnfragen')
  .where('kennzeichen', '==', 'TEST-MS-123')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📊 KVA-Daten:', data.kva);
      console.log('✅ Status:', data.status);
    });
  });
```

### Erwartete KVA-Struktur:

```javascript
{
  kva: {
    isMultiService: true,
    services: [
      {
        serviceTyp: "lackier",
        varianten: {
          variante_1: {
            name: "Smart Repair",
            material: 150,
            arbeitszeit: 200,
            netto: 350,
            mwst: 66.5,
            brutto: 416.5,
            empfohlen: true
          },
          variante_2: {
            name: "Komplett-Lackierung",
            material: 500,
            arbeitszeit: 800,
            netto: 1300,
            mwst: 247,
            brutto: 1547,
            empfohlen: false
          }
        }
      },
      {
        serviceTyp: "reifen",
        varianten: {
          variante_1: {
            name: "4x Continental Premium",
            material: 600,
            arbeitszeit: 80,
            netto: 680,
            mwst: 129.2,
            brutto: 809.2,
            empfohlen: true
          }
        }
      }
    ],
    termine: {
      start: "25.10.2025",
      ende: "27.10.2025",
      abholzeit: "16:00"
    },
    ersteller: "admin@werkstatt.de",
    erstelltAm: 1728550000000
  },
  status: "kva_gesendet",
  statusText: "Angebot erstellt",
  lastUpdated: 1728550000000
}
```

### ✅ Validierung:
- [ ] `kva.isMultiService: true` vorhanden
- [ ] `kva.services` ist **Array** mit 2 Objekten
- [ ] Lackier-Service hat 2 Varianten (Smart Repair empfohlen)
- [ ] Reifen-Service hat 1 Variante (Continental empfohlen)
- [ ] Berechnungen korrekt (MwSt 19%, Brutto = Netto * 1.19)
- [ ] Status geändert zu `kva_gesendet`

---

## 🎯 Test-Szenario 6: Partner-Ansicht (KVA empfangen)

### Test-Schritte:
1. **Partner-Login**: Als Partner anmelden
2. **Meine Anfragen öffnen**: https://marcelgaertner1234.github.io/Lackiererei1/partner-app/meine-anfragen.html
3. **Anfrage suchen**: `TEST-MS-123`

### Erwartetes Verhalten:
- [ ] **Anfrage in Spalte "📄 KVA gesendet"**
- [ ] **Badge**: `🔗 Multi-Service (2)`
- [ ] **Auf Anfrage klicken** → Weiterleitung zu `anfrage-detail.html`

### Detail-Ansicht prüfen:
- [ ] **Status-Anzeige**: "📄 KVA gesendet"
- [ ] **KVA-Bereich sichtbar** mit:
  - 🎨 **Lackierung**: 2 Varianten (Smart Repair empfohlen)
  - 🚗 **Reifen**: 1 Variante (Continental empfohlen)
- [ ] **Gesamt-Preise berechnet** (Summe aller empfohlenen Varianten)
- [ ] **"Auftrag erteilen" Button** vorhanden

---

## 🚨 Fehlerhafte Szenarien (Was NICHT passieren sollte)

### ❌ Fehler 1: Doppelte Anfragen
**Symptom**: 2 separate Anfrage-Karten in `meine-anfragen.html`

**Diagnose**:
```javascript
// Prüfen ob alte Struktur noch verwendet wird
firebase.firestore().collection('partnerAnfragen')
  .where('kennzeichen', '==', 'TEST-MS-123')
  .get()
  .then(snapshot => {
    console.log('📊 Anzahl Dokumente:', snapshot.size);
    // Erwartung: 1 Dokument
    // Fehler: 2 oder mehr Dokumente
  });
```

**Lösung**: `multi-service-anfrage.html` prüfen, ob wirklich nur 1 `db.collection('partnerAnfragen').add()` ausgeführt wird

### ❌ Fehler 2: Fehlende Service-Daten
**Symptom**: In `kva-erstellen.html` werden nicht alle Services angezeigt

**Diagnose**:
- Console öffnen (F12)
- Nach Fehler suchen: `servicesData is undefined`

**Lösung**:
- Prüfen ob `anfrage.servicesData.lackier` existiert
- Prüfen ob `anfrage.services` Array nicht leer ist

### ❌ Fehler 3: KVA Speicher-Fehler
**Symptom**: KVA wird nicht gespeichert, Status bleibt "neu_eingegangen"

**Diagnose**:
- Console öffnen bei KVA-Erstellung
- Nach Firebase-Fehler suchen

**Lösung**:
- Prüfen ob `anfrageId` korrekt aus URL gelesen wird
- Prüfen ob `db.collection('partnerAnfragen').doc(anfrageId).update()` aufgerufen wird (nicht `.add()`)

---

## 📊 Test-Checkliste (Zusammenfassung)

### Phase 1: Anfrage erstellen
- [ ] Multi-Service Formular öffnet beide Services
- [ ] Formulare können ausgefüllt werden
- [ ] Fotos können hochgeladen werden (Base64)
- [ ] **NUR 1 Dokument** wird in Firebase erstellt
- [ ] Dokument hat `isMultiService: true`
- [ ] `servicesData` enthält beide Services

### Phase 2: Admin-Ansicht
- [ ] Badge zeigt `🔗 Multi-Service (2)`
- [ ] Gradient-Background korrekt (lila)
- [ ] Keine doppelten Anfragen sichtbar

### Phase 3: KVA erstellen
- [ ] Hinweis-Box zeigt "Bitte erstellen Sie Preise für ALLE Services"
- [ ] Beide Service-Sektionen werden gerendert
- [ ] Preis-Felder funktionieren für beide Services
- [ ] KVA wird korrekt in **EINEM** Dokument gespeichert
- [ ] Status ändert zu `kva_gesendet`

### Phase 4: Partner-Ansicht
- [ ] KVA wird korrekt angezeigt
- [ ] Beide Services sichtbar mit Varianten
- [ ] Empfohlene Varianten markiert
- [ ] Gesamt-Preise korrekt berechnet

---

## 🎉 Erfolgs-Kriterien

**Test erfolgreich wenn**:
1. ✅ Nur **1 Firebase-Dokument** pro Multi-Service Anfrage
2. ✅ `isMultiService: true` und `servicesData` korrekt strukturiert
3. ✅ KVA-Erstellung funktioniert für alle Services
4. ✅ Keine doppelten Anfragen in Admin/Partner-Ansicht
5. ✅ Badge zeigt `🔗 Multi-Service (X)` mit korrekter Anzahl

---

## 🛠️ Debugging-Hilfe

### Firebase Console direkt öffnen:
1. **URL**: https://console.firebase.google.com/
2. **Projekt auswählen**: `Lackiererei1`
3. **Firestore Database öffnen**
4. **Collection**: `partnerAnfragen`
5. **Dokument suchen**: Filter nach `kennzeichen == TEST-MS-123`

### Browser DevTools:
```javascript
// Alle Multi-Service Anfragen finden
firebase.firestore().collection('partnerAnfragen')
  .where('isMultiService', '==', true)
  .get()
  .then(snapshot => {
    console.log(`🔍 ${snapshot.size} Multi-Service Anfragen gefunden`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📄 ${doc.id}:`, {
        kennzeichen: data.kennzeichen,
        services: data.services,
        hasKva: !!data.kva,
        status: data.status
      });
    });
  });
```

---

## 📝 Notizen für Git Commit

Nach erfolgreichem Test:

```bash
git add partner-app/multi-service-anfrage.html
git add partner-app/kva-erstellen.html
git add partner-app/admin-anfragen.html
git add partner-app/MULTI_SERVICE_TEST_GUIDE.md

git commit -m "Fix: Vereinfachte Multi-Service Struktur (OPTION 1)

- multi-service-anfrage.html: Erstellt EINE Anfrage statt 2 separate
  - Neue Struktur: isMultiService + services[] + servicesData{}
  - Fotos als Base64 in jedem Service gespeichert

- kva-erstellen.html: Multi-Service Rendering vereinfacht
  - Liest servicesData aus EINEM Dokument
  - Erstellt virtuelle Service-Anfragen für Rendering
  - Speichert KVA in EINEM Update (nicht batch)

- admin-anfragen.html: Multi-Service Badge angepasst
  - getServiceBadge() akzeptiert jetzt anfrage-Objekt
  - Zeigt '🔗 Multi-Service (X)' mit lila Gradient

- MULTI_SERVICE_TEST_GUIDE.md: Umfassende Test-Dokumentation
  - 6 Test-Szenarien mit erwarteten Ergebnissen
  - Firebase-Datenstruktur Validierung
  - Debugging-Hilfe für häufige Fehler

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

**Test-Guide erstellt am**: 2025-10-10
**Bereit für**: Live-Test auf https://marcelgaertner1234.github.io/Lackiererei1/partner-app/
