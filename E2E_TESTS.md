# 🧪 END-TO-END TEST PLAN - Fahrzeugannahme App

**Version:** v3.2 (Oktober 2025)
**Letzte Aktualisierung:** 12. Oktober 2025 - 16:00 Uhr
**Status:** ✅ 4 BUGS BEHOBEN (Pipeline-Analyse abgeschlossen)

---

## 📋 **INHALTSVERZEICHNIS**

1. [Kritische Bugs (Behoben)](#kritische-bugs-behoben)
2. [Testumgebung Setup](#testumgebung-setup)
3. [FLOW 1: Manuelle Fahrzeug-Annahme](#flow-1-manuelle-fahrzeug-annahme)
4. [FLOW 2: Partner-Annahme (B2B)](#flow-2-partner-annahme-b2b)
5. [FLOW 3: Fahrzeug-Abnahme](#flow-3-fahrzeug-abnahme)
6. [FLOW 4: Kanban Board Updates](#flow-4-kanban-board-updates)
7. [FLOW 5: Kunden-Management](#flow-5-kunden-management)
8. [Realtime Synchronisation Tests](#realtime-synchronisation-tests)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## ✅ **KRITISCHE BUGS (BEHOBEN)**

### **BUG #1: firebase-config.js fehlte `listenToKunden()` Funktion** ⚠️ **BEHOBEN**
- **Problem:** kunden.html rief `firebaseApp.listenToKunden()` auf, aber Funktion existierte nicht
- **Symptom:** `TypeError: firebaseApp.listenToKunden is not a function` beim Laden von kunden.html
- **Impact:** CRITICAL - kunden.html crashte komplett bei Seitenaufruf
- **Root Cause:** Funktion war in firebase-config.js nicht implementiert, obwohl kunden.html sie verwendete
- **Fix:** Funktion hinzugefügt (firebase-config.js:258-284) + Export (Zeile 841)
- **Testing:** Funktion wurde nach listenToFahrzeuge() Pattern implementiert
- **Status:** ✅ Behoben (12.10.2025)

### **BUG #2: annahme.html verwendet `firebase.firestore()` direkt** ⚠️ **BEHOBEN**
- **Problem:** createCalendarEntry() rief `firebase.firestore()` direkt auf, statt firebaseApp wrapper zu verwenden
- **Location:** annahme.html:1687 (vorher)
- **Symptom:** Potentieller Crash wenn firebase global object nicht verfügbar ist
- **Impact:** MEDIUM - Kalender-Einträge könnten nicht erstellt werden
- **Root Cause:** Direkter Zugriff auf firebase global object bypassed firebaseApp initialization checks
- **Fix:** Ersetzt durch `firebaseApp.db()` (annahme.html:1687-1689)
  ```javascript
  // VORHER:
  const docRef = firebase.firestore().collection('calendar').doc(abnahmeDatum);

  // NACHHER:
  const db = firebaseApp.db();
  const docRef = db.collection('calendar').doc(abnahmeDatum);
  ```
- **Status:** ✅ Behoben (12.10.2025)

### **BUG #3: liste.html fehlte `beforeunload` Listener Cleanup** ⚠️ **BEHOBEN**
- **Problem:** Realtime Listener wurde nicht entfernt wenn Benutzer Seite verlässt
- **Symptom:** Memory Leak - Firebase Listener bleiben aktiv auch wenn Seite geschlossen
- **Impact:** LOW - Performance-Degradation bei langfristiger Nutzung, unnötiger Netzwerk-Traffic
- **Root Cause:** Kein beforeunload Event Handler im Gegensatz zu kalender.html, kanban.html, kunden.html
- **Fix:** beforeunload Listener hinzugefügt (liste.html:3722-3728)
  ```javascript
  window.addEventListener('beforeunload', () => {
      if (unsubscribeListener) {
          unsubscribeListener();
          console.log('🔌 Realtime Listener getrennt');
      }
  });
  ```
- **Status:** ✅ Behoben (12.10.2025)

### **BUG #4: kanban.html verwendet `firebase.storage()` direkt** ⚠️ **BEHOBEN**
- **Problem:** Photo Upload verwendete `firebase.storage()` direkt, statt firebaseApp wrapper
- **Location:** kanban.html:1526-1527 (vorher)
- **Symptom:** Potentieller Crash wenn firebase.storage nicht verfügbar
- **Impact:** MEDIUM - Foto-Uploads im Kanban Board könnten fehlschlagen
- **Root Cause:** Direkter Zugriff auf firebase global object
- **Fix:** Ersetzt durch `firebaseApp.storage()` mit proper null-check (kanban.html:1526-1542)
  ```javascript
  // VORHER:
  if (firebaseInitialized && firebase.storage) {
      const storageRef = firebase.storage().ref(...);
      ...
  }

  // NACHHER:
  if (firebaseInitialized && firebaseApp) {
      const storage = firebaseApp.storage();
      if (storage) {
          const storageRef = storage.ref(...);
          ...
      } else {
          // Fallback zu DataURL
      }
  }
  ```
- **Status:** ✅ Behoben (12.10.2025)

---

## 📊 **BUG-ANALYSE ZUSAMMENFASSUNG**

### **Analysemethode:**
- **Statische Code-Analyse** aller HTML-Dateien
- **Grep-Suche** nach firebase.firestore(), firebase.storage() Direktaufrufen
- **Pattern-Analyse** für Realtime Listener cleanup
- **Cross-Reference Check** zwischen firebase-config.js exports und HTML usages

### **Betroffene Dateien:**
1. ✅ firebase-config.js - listenToKunden() Funktion hinzugefügt
2. ✅ annahme.html - firebase.firestore() Direktaufruf ersetzt
3. ✅ liste.html - beforeunload cleanup hinzugefügt
4. ✅ kanban.html - firebase.storage() Direktaufruf ersetzt

### **Impact Assessment:**
- **CRITICAL Bugs:** 1 (BUG #1 - App Crash)
- **MEDIUM Bugs:** 2 (BUG #2, #4 - Funktionale Fehler)
- **LOW Bugs:** 1 (BUG #3 - Memory Leak)

### **Nächste Schritte:**
1. ✅ Alle Bugs behoben (12.10.2025)
2. ⏸️ **Manuelle Tests durchführen** (siehe Test-Flows unten)
3. ⏸️ Bugs dokumentieren die bei Tests gefunden werden
4. ⏸️ Final Regression Testing

---

## 🔧 **TESTUMGEBUNG SETUP**

### **Voraussetzungen:**
- ✅ Firebase Projekt konfiguriert (firebase-config.js mit echten Credentials)
- ✅ Firebase Firestore aktiviert
- ✅ Firebase Storage aktiviert (optional, aber empfohlen)
- ✅ Browser: Chrome/Firefox/Safari (neueste Version)
- ✅ Lokaler Server: `python3 -m http.server 8000`
- ✅ Browser DevTools Console geöffnet (für Log-Analyse)

### **Testdaten vorbereiten:**
```javascript
// Browser Console öffnen (F12) und ausführen:
localStorage.clear(); // Alle LocalStorage-Daten löschen (für sauberen Test)

// Firestore Collections löschen (über Firebase Console):
// - fahrzeuge (alle Dokumente löschen)
// - kunden (alle Dokumente löschen)
// - calendar (alle Dokumente löschen)
// - partnerAnfragen (alle Dokumente löschen)
```

---

## 📝 **FLOW 1: MANUELLE FAHRZEUG-ANNAHME**

### **Ziel:** Fahrzeug manuell annehmen und in allen Views prüfen

### **TEST 1.1: Basis-Annahme (Lackierung)**

**Schritte:**
1. Öffne `annahme.html`
2. Fülle Formular aus:
   - Kennzeichen: `MOS-TEST 123`
   - Kundenname: `Max Mustermann`
   - Geplantes Abnahmedatum: `2025-10-20` (1 Woche später)
   - Service-Typ: `🎨 Lackierung`
   - Fahrzeugabholung: `Nein`
   - Marke: `Volkswagen`
   - Modell: `Golf 8`
   - Baujahr: `2022` - `2022`
   - KM-Stand: `45000`
   - Farbname: `Tiefes Schwarz Perleffekt`
   - Farbnummer: `LC9Z`
   - Lackart: `Perleffekt` (Radio-Button)
   - Vereinbarter Preis: `1250.00`
   - Notizen: `Kratzer hinten rechts, Delle an linker Tür`
3. Lade **min. 1 Foto** hoch (Schadenfoto)
4. Zeichne **Unterschrift** auf Canvas
5. Klicke **"💾 Speichern & PDF erstellen"**

**Erwartetes Verhalten:**
- ✅ Fahrzeug wird in Firestore `fahrzeuge` Collection gespeichert
  - `prozessStatus: 'angenommen'`
  - `status: 'angenommen'`
  - `serviceTyp: 'lackier'`
- ✅ Kunde wird in Firestore `kunden` Collection erstellt
  - `name: 'Max Mustermann'`
  - `anzahlBesuche: 1`
  - `erstbesuch: [ISO-Timestamp]`
- ✅ Kalender-Eintrag wird in `calendar/2025-10-20` erstellt
  - `entries[0].type: 'abnahme'`
  - `entries[0].kennzeichen: 'MOS-TEST 123'`
- ✅ Fotos werden in Firestore `fahrzeuge/{id}/fotos/vorher` gespeichert
- ✅ PDF wird generiert und heruntergeladen (`Annahme_MOS-TEST_123_*.pdf`)
- ✅ Success-Message erscheint: "✅ Fahrzeug erfolgreich aufgenommen!"
- ✅ Weiterleitung zu `liste.html` nach 2 Sekunden

**Browser Console Logs prüfen:**
```
✅ Firebase initialisiert
📦 2 Kunden aus Firebase geladen
📦 15 Fahrzeuge aus Firebase geladen
🚀 === ANNAHME SUBMIT GESTARTET ===
1️⃣ Validierung...
✅ Validierung erfolgreich
2️⃣ Sammle Formulardaten...
3️⃣ Duplikat-Prüfung...
✅ Kein Duplikat gefunden
4️⃣ Speicherung starten...
💾 Hybrid-Speicherung: Daten → Firestore, Fotos → LocalStorage
   a) Registriere Kundenbesuch...
   ✅ Kunde registriert, ID: kunde_1728744123456
   b) Speichere Fotos in Firestore...
   ✅ Fotos in Firestore gespeichert
   c) Speichere Fahrzeugdaten in Firestore...
   ✅ Fahrzeug in Firestore gespeichert (ohne Fotos)
   c.1) Erstelle Kalender-Eintrag...
   ✅ Kalender-Eintrag erstellt
   d) Erstelle PDF...
   ✅ PDF erstellt
✅ === SPEICHERUNG ERFOLGREICH ===
5️⃣ Aufräumen...
🎉 === ANNAHME ABGESCHLOSSEN ===
```

### **TEST 1.2: Realtime Updates in allen Views prüfen**

**Nach Test 1.1 durchführen:**

**SCHRITT 1: liste.html öffnen**
- Öffne neuen Browser-Tab: `http://localhost:8000/liste.html`
- **Erwartung:** Fahrzeug `MOS-TEST 123` erscheint sofort in Tabelle (ohne Reload!)
- **Console Log:** `🔥 Realtime Update: 16 Fahrzeuge empfangen`

**SCHRITT 2: kanban.html öffnen**
- Öffne neuen Tab: `http://localhost:8000/kanban.html`
- Service-Typ wählen: `🎨 Lackierung`
- **Erwartung:** Fahrzeug erscheint in Spalte "📋 Angenommen" mit rotem Badge "🚨 MORGEN!" oder "⏰ In 7 Tagen"
- **Console Log:** `🔥 Realtime Update: 16 Fahrzeuge empfangen`

**SCHRITT 3: kunden.html öffnen**
- Öffne neuen Tab: `http://localhost:8000/kunden.html`
- **Erwartung:** Kunde "Max Mustermann" erscheint in Tabelle mit Tag "✨ Neukunde" (1 Besuch)
- **Console Log:**
  ```
  🔥 Realtime Update: 3 Kunden empfangen
  ✅ 3 Kunden gesamt (3 Firebase + 0 LocalStorage)
  ```

**SCHRITT 4: kalender.html öffnen**
- Öffne neuen Tab: `http://localhost:8000/kalender.html`
- Navigiere zu Datum: `20.10.2025`
- **Erwartung:** Termin erscheint mit:
  - Kennzeichen: `MOS-TEST 123`
  - Kunde: `Max Mustermann`
  - Typ: `abnahme`
- **Console Log:** (Kalender hat setupRealtimeListener)

---

## 🤝 **FLOW 2: PARTNER-ANNAHME (B2B)**

### **Ziel:** Vollständigen Partner-Flow durchlaufen (Anfrage → KVA → Annahme → Views)

### **TEST 2.1: Partner erstellt Lackier-Anfrage**

**Schritte:**
1. Öffne `partner-app/index.html`
2. Klicke auf **"🎨 Lackierung"** Service-Karte
3. Wird weitergeleitet zu `anfrage.html`
4. Fülle Partner-Formular aus:
   - **Kundendaten:**
     - Name: `BMW Autohaus Schmidt`
     - Email: `schmidt@bmw-dealer.de`
     - Telefon: `+49 6261 123456`
   - **Fahrzeugdaten:**
     - Kennzeichen: `HD-SC 7890`
     - Marke: `BMW`
     - Modell: `3er G20`
     - Baujahr: `2020` - `2020`
     - Kilometerstand: `78000`
     - Farbnummer: `A96`
     - Farbname: `Mineralweiß Metallic`
     - Lackart: `Metallic`
   - **Service-Details:**
     - Schaden: `Kratzer` (Checkbox)
     - Betroffene Teile: `Frontstoßstange, Kotflügel vorne rechts`
     - Schadensbeschreibung: `Parkschaden, Kratzer ca. 15cm, keine Delle`
   - **Dringlichkeit:**
     - Anliefertermin: `2025-10-18` (6 Tage später)
     - Dringlichkeit: `Normal`
   - **Lieferoption:**
     - Abholservice: `Ja`
     - Abholadresse: `BMW Autohaus Schmidt, Hauptstraße 123, 74722 Buchen`
     - Abholtermin: `2025-10-15`
     - Abholzeit: `09:00`
     - Ersatzfahrzeug: `Ja, benötigt`
   - **Anmerkungen:** `Kunde wartet auf Fahrzeug, bitte schnellstmöglich`
5. Klicke **"📤 Anfrage absenden"**

**Erwartetes Verhalten:**
- ✅ Anfrage wird in Firestore `partnerAnfragen` Collection gespeichert
  - `status: 'neu_eingegangen'`
  - `serviceTyp: 'lackier'`
  - `partnerName: 'BMW Autohaus Schmidt'`
- ✅ Success-Message: "✅ Ihre Anfrage wurde erfolgreich übermittelt!"
- ✅ Weiterleitung zu `meine-anfragen.html`

### **TEST 2.2: Werkstatt erstellt KVA**

**Schritte:**
1. Öffne `partner-app/admin-anfragen.html` (Werkstatt-View)
2. Finde Anfrage `HD-SC 7890` in Spalte "🆕 Neu eingegangen"
3. Klicke auf Karte → Detail-View öffnet sich
4. Klicke **"📄 KVA erstellen"**
5. Fülle KVA-Formular aus:
   - Arbeitsposition 1:
     - Beschreibung: `Kratzer entfernen Frontstoßstange`
     - Menge: `1`
     - Einzelpreis: `450.00`
   - Arbeitsposition 2:
     - Beschreibung: `Kotflügel ausbessern und lackieren`
     - Menge: `1`
     - Einzelpreis: `650.00`
   - Materialkosten: `180.00`
   - **Gesamtpreis:** `1280.00` (automatisch berechnet)
   - Notiz: `Lackmaterial BMW Original-Farbe inkl.`
6. Klicke **"💾 KVA speichern & senden"**

**Erwartetes Verhalten:**
- ✅ KVA wird in Firestore zu Anfrage hinzugefügt
  - `status: 'kva_gesendet'`
  - `kva.gesamtpreis: 1280`
  - `kva.positionen.length: 2`
- ✅ Anfrage wechselt zu Spalte "📄 KVA gesendet" in Kanban
- ✅ Partner erhält Notification (Chat-System, falls aktiv)

### **TEST 2.3: Partner nimmt KVA an (KRITISCHER TEST!)**

**Schritte:**
1. Öffne `partner-app/meine-anfragen.html` (Partner-View)
2. Finde Anfrage `HD-SC 7890` in Spalte "📄 KVA gesendet"
3. Klicke auf Karte → KVA Details werden angezeigt
4. Prüfe KVA:
   - Gesamtpreis: `€ 1.280,00`
   - Positionen: 2
   - Material: € 180,00
5. Klicke **"✅ KVA annehmen"**
6. **Bestätige in Confirm-Dialog**

**Erwartetes Verhalten (VOLLSTÄNDIGE PIPELINE!):**
- ✅ Anfrage-Status wird auf `'beauftragt'` gesetzt
- ✅ **Fahrzeug wird in `fahrzeuge` Collection erstellt:**
  - `kennzeichen: 'HD-SC 7890'`
  - `kundenname: 'BMW Autohaus Schmidt'`
  - `serviceTyp: 'lackier'`
  - `prozessStatus: 'terminiert'` (nicht 'angenommen'!)
  - `geplantesAbnahmeDatum: '2025-10-18'`
  - `vereinbarterPreis: 1280`
  - `fahrzeugAbholung: 'ja'`
  - `abholadresse: 'BMW Autohaus Schmidt, ...'`
- ✅ **Kunde wird registriert** via `registriereKundenbesuch('BMW Autohaus Schmidt')`
  - Neuer Eintrag in `kunden` Collection
  - `anzahlBesuche: 1`
- ✅ **Kalender-Eintrag wird erstellt** in `calendar/2025-10-18`
  - `type: 'abnahme'`
  - `kennzeichen: 'HD-SC 7890'`
  - `kunde: 'BMW Autohaus Schmidt'`

**Browser Console Logs prüfen:**
```
🔥 === PARTNER-KVA-ANNAHME FLOW ===
1️⃣ Setze Anfrage-Status auf 'beauftragt'...
✅ Status aktualisiert
2️⃣ Erstelle Fahrzeug in 'fahrzeuge' Collection...
👤 Registriere Kunden...
✅ Kunde registriert: kunde_1728744200000
🚗 Erstelle Fahrzeug...
✅ Fahrzeug erstellt: 1728744200001
📅 Erstelle Kalender-Eintrag...
✅ Kalender-Eintrag erstellt
✅ === PARTNER-ANNAHME ERFOLGREICH ===
```

### **TEST 2.4: Realtime Updates nach Partner-Annahme**

**SOFORT nach TEST 2.3 prüfen (OHNE Reload!):**

**Tab 1: liste.html (geöffnet seit TEST 1.2)**
- **Erwartung:** Fahrzeug `HD-SC 7890` erscheint **automatisch** in Tabelle
- **Console:** `🔥 Realtime Update: 17 Fahrzeuge empfangen`

**Tab 2: kanban.html (geöffnet seit TEST 1.2)**
- Service-Typ wechseln zu: `🎨 Lackierung`
- **Erwartung:** Fahrzeug `HD-SC 7890` erscheint in Spalte "📅 Terminiert" (nicht "Angenommen"!)
- **Console:** `🔥 Realtime Update: 17 Fahrzeuge empfangen`

**Tab 3: kunden.html (geöffnet seit TEST 1.2)**
- **Erwartung:** Kunde "BMW Autohaus Schmidt" erscheint **automatisch** in Tabelle
- **Console:**
  ```
  🔥 Realtime Update: 4 Kunden empfangen
  ✅ 4 Kunden gesamt (4 Firebase + 0 LocalStorage)
  ```

**Tab 4: kalender.html (geöffnet seit TEST 1.2)**
- Navigiere zu Datum: `18.10.2025`
- **Erwartung:** Termin erscheint mit `HD-SC 7890`

---

## ✅ **FLOW 3: FAHRZEUG-ABNAHME**

### **TEST 3.1: Fahrzeug abschließen (Vorher/Nachher-Vergleich)**

**Voraussetzung:** Fahrzeug `MOS-TEST 123` aus TEST 1.1 muss auf `prozessStatus: 'bereit'` gesetzt werden

**Schritte:**
1. Öffne `kanban.html`
2. Wähle Service-Typ: `🎨 Lackierung`
3. **Drag & Drop** `MOS-TEST 123` durch alle Spalten:
   - `Angenommen` → `Vorbereitung` (Foto-Upload Modal erscheint!)
   - Foto hochladen + Notiz: "Demontage abgeschlossen"
   - `Vorbereitung` → `Lackierung` (Foto-Upload!)
   - `Lackierung` → `Trocknung` (kein Foto)
   - `Trocknung` → `Qualität` (Foto-Upload!)
   - `Qualität` → `Bereit` (kein Foto)
4. **Erwartung:** Fahrzeug ist jetzt `prozessStatus: 'bereit'`
5. Öffne `abnahme.html`
6. Fahrzeug-Dropdown: Wähle `MOS-TEST 123 - Max Mustermann`
7. **Vorher-Fotos werden geladen** (aus Annahme)
8. Lade **min. 2 Nachher-Fotos** hoch
9. Zeichne **Unterschrift** (Kunde bestätigt Abnahme)
10. Klicke **"✅ Abnahme durchführen & PDF erstellen"**

**Erwartetes Verhalten:**
- ✅ Fahrzeug-Status wird auf `'abgeschlossen'` gesetzt
- ✅ `abnahmeDatum` wird gesetzt (heute)
- ✅ `nachherPhotos` werden in Firestore gespeichert
- ✅ PDF wird generiert mit **Vorher/Nachher-Vergleich**
- ✅ Fahrzeug verschwindet aus allen Views (gefiltert durch `status !== 'abgeschlossen'`)

---

## 🎯 **FLOW 4: KANBAN BOARD UPDATES**

### **TEST 4.1: Drag & Drop mit Foto-Upload**

**Siehe TEST 3.1** (vollständig abgedeckt)

### **TEST 4.2: Realtime Sync zwischen mehreren Browsern**

**Setup:**
1. Öffne Browser 1: `kanban.html` (Service: Lackierung)
2. Öffne Browser 2: `kanban.html` (Service: Lackierung) **in privatem Fenster**

**Test:**
- **Browser 1:** Ziehe Fahrzeug von "Angenommen" nach "Vorbereitung"
- **Erwartung (Browser 2):** Fahrzeug erscheint **automatisch** in "Vorbereitung" (ohne Reload!)

---

## 👥 **FLOW 5: KUNDEN-MANAGEMENT**

### **TEST 5.1: Stammkunde erkennen (2. Besuch)**

**Voraussetzung:** Kunde "Max Mustermann" existiert (aus TEST 1.1)

**Schritte:**
1. Öffne `annahme.html`
2. Öffne Kunden-Dropdown
3. **Erwartung:** `⭐ Max Mustermann (1 Besuch)` erscheint in Dropdown
4. Wähle Kunde aus Dropdown
5. Neues Fahrzeug anlegen:
   - Kennzeichen: `MOS-MM 456`
   - Kundenname: `Max Mustermann` (vorausgefüllt, read-only)
   - ... restliche Felder ausfüllen
6. Speichern

**Erwartetes Verhalten:**
- ✅ `kunden` wird NICHT neu erstellt
- ✅ `anzahlBesuche` wird auf `2` erhöht
- ✅ `letzterBesuch` wird aktualisiert
- ✅ In kunden.html: Kunde hat jetzt Tag "💚 Stammkunde" (statt "✨ Neukunde")

### **TEST 5.2: Chart.js Analytics prüfen**

**Schritte:**
1. Öffne `kunden.html`
2. Scroll zu **"📊 Analytics & Statistiken"**
3. **Erwartung:**
   - **Bar Chart "Top 10 Kunden"** zeigt Kunden nach Umsatz sortiert
   - **Doughnut Chart "Tag-Verteilung"** zeigt Tags (Stammkunde, Neukunde, etc.)
   - **4 Stat-Cards** zeigen korrekte Werte:
     - Durchschnittlicher Umsatz
     - Gesamtkunden
     - Top-Kunde
     - Aktive Tags

---

## 🔄 **REALTIME SYNCHRONISATION TESTS**

### **TEST RT-1: Multi-Tab Sync**

**Setup:** 4 Tabs geöffnet:
- Tab 1: `liste.html`
- Tab 2: `kanban.html`
- Tab 3: `kunden.html`
- Tab 4: `kalender.html`

**Test:**
1. Tab 5 öffnen: `annahme.html`
2. Neues Fahrzeug anlegen (wie TEST 1.1)
3. **Erwartung:** Fahrzeug erscheint **automatisch** in ALLEN 4 Tabs (ohne Reload!)

### **TEST RT-2: Listener Cleanup**

**Test:** Prüfe ob alte Listener korrekt entfernt werden

**Console prüfen bei Tab-Wechsel:**
```javascript
// In Browser Console ausführen:
console.log('Aktive Listener:', unsubscribeListener ? 'JA' : 'NEIN');
```

---

## ⚠️ **EDGE CASES & ERROR HANDLING**

### **EDGE 1: Duplikat-Kennzeichen**

**Test:**
1. Lege Fahrzeug mit Kennzeichen `MOS-DUPLIKAT 1` an
2. Versuche NOCHMAL Fahrzeug mit `MOS-DUPLIKAT 1` anzulegen
3. **Erwartung:**
   - Confirm-Dialog erscheint: "⚠️ ACHTUNG: Kennzeichen bereits vorhanden..."
   - User kann abbrechen oder bestätigen

### **EDGE 2: Firebase Offline (LocalStorage Fallback)**

**Test:**
1. Öffne Browser DevTools → Network Tab
2. Schalte "Offline" Modus ein
3. Lege neues Fahrzeug an
4. **Erwartung:**
   - Fahrzeug wird in **LocalStorage** gespeichert
   - Console Log: `💾 LocalStorage-Modus (Firebase nicht verfügbar)`
   - Beim Reload mit Online: Fahrzeug bleibt sichtbar

### **EDGE 3: Foto-Upload Fehler (>5MB)**

**Test:**
1. Öffne `annahme.html`
2. Versuche Foto > 5MB hochzuladen
3. **Erwartung:** Alert: `⚠️ Foto "..." ist zu groß (8.5 MB)!`

---

## 📝 **TEST-PROTOKOLL VORLAGE**

```markdown
## Test-Sitzung: [Datum]
Tester: [Name]
Version: v3.1

| Test-ID | Flow | Status | Bemerkungen |
|---------|------|--------|-------------|
| 1.1     | Manuelle Annahme (Basis) | ✅ | Alles OK |
| 1.2     | Realtime Updates (4 Views) | ✅ | liste.html, kanban.html, kunden.html, kalender.html synced |
| 2.1     | Partner-Anfrage erstellen | ✅ | Anfrage in partnerAnfragen erstellt |
| 2.2     | Werkstatt erstellt KVA | ❌ | **BUG:** KVA Gesamtpreis falsch berechnet |
| 2.3     | Partner nimmt KVA an | ⏸️ | Warte auf Fix von 2.2 |
| 2.4     | Realtime nach Partner-Annahme | ⏸️ | - |
| 3.1     | Fahrzeug-Abnahme | ✅ | Vorher/Nachher PDF generiert |
| 4.1     | Kanban Drag & Drop | ✅ | Fotos bei Arbeitsschritten hochgeladen |
| 4.2     | Multi-Browser Sync | ✅ | 2 Browser getestet, Sync funktioniert |
| 5.1     | Stammkunde (2. Besuch) | ✅ | anzahlBesuche korrekt inkrementiert |
| 5.2     | Chart.js Analytics | ✅ | Beide Charts rendern korrekt |
| RT-1    | Multi-Tab Sync (4 Tabs) | ✅ | Alle Tabs automatisch aktualisiert |
| RT-2    | Listener Cleanup | ✅ | Keine Memory Leaks |
| EDGE-1  | Duplikat-Kennzeichen | ✅ | Confirm-Dialog erscheint |
| EDGE-2  | Firebase Offline | ✅ | LocalStorage Fallback funktioniert |
| EDGE-3  | Foto >5MB | ✅ | Alert erscheint |

### Zusammenfassung:
- **Gesamt:** 17 Tests
- **Erfolgreich:** 15 (88%)
- **Fehlgeschlagen:** 1 (6%)
- **Ausstehend:** 1 (6%)

### Kritische Bugs gefunden:
1. ❌ **BUG #2:** KVA Gesamtpreis-Berechnung in kva-erstellen.html fehlerhaft (Zeile 1234)
```

---

## 🎯 **NÄCHSTE SCHRITTE**

1. ✅ **BUG #1 behoben:** listenToKunden() hinzugefügt
2. 📋 **Alle Tests durchführen** (siehe oben)
3. 🐛 **Weitere Bugs dokumentieren** im Test-Protokoll
4. 🔧 **Bugs priorisieren** und beheben
5. ✅ **Finale Regression Tests** (alle Flows nochmal)
6. 🚀 **Deployment** nach erfolgreichen Tests

---

**Ende des Test-Plans** | Version 1.0 | 12.10.2025
