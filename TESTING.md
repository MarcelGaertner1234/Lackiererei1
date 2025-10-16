# 🧪 Automatisierte E2E Tests - Fahrzeugannahme App

**Version:** 1.0.0
**Framework:** Playwright
**Letzte Aktualisierung:** 12. Oktober 2025

---

## 📋 **Inhaltsverzeichnis**

1. [Installation](#installation)
2. [Test-Ausführung](#test-ausführung)
3. [Test-Suites](#test-suites)
4. [Test-Reports](#test-reports)
5. [Debugging](#debugging)
6. [CI/CD Integration](#cicd-integration)

---

## 🚀 **Installation**

### **Voraussetzungen:**
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python 3 (für lokalen Server)
- Firebase Projekt konfiguriert (firebase-config.js)

### **Setup:**

```bash
# 1. Navigiere zum App-Verzeichnis
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

# 2. Installiere Dependencies
npm install

# 3. Installiere Playwright Browser
npx playwright install

# 4. (Optional) Installiere nur Chromium für schnellere Tests
npx playwright install chromium
```

---

## ▶️ **Test-Ausführung**

### **Alle Tests ausführen (Headless):**
```bash
npm test
```

### **Tests im Browser sehen (Headed Mode):**
```bash
npm run test:headed
```

### **Interactive Test UI (empfohlen für Debugging):**
```bash
npm run test:ui
```

### **Debug-Modus (Schritt-für-Schritt):**
```bash
npm run test:debug
```

### **Einzelne Test-Suite ausführen:**
```bash
npx playwright test tests/01-vehicle-intake.spec.js
```

### **Einzelner Test:**
```bash
npx playwright test tests/01-vehicle-intake.spec.js -g "Basis-Annahme"
```

### **Nur bestimmten Browser:**
```bash
# Nur Chromium
npx playwright test --project=chromium

# Nur Firefox
npx playwright test --project=firefox

# Nur WebKit (Safari)
npx playwright test --project=webkit
```

### **Mobile Tests:**
```bash
# iPhone 13
npx playwright test --project=mobile-safari

# Pixel 5
npx playwright test --project=mobile-chrome

# iPad Pro
npx playwright test --project=tablet-ipad
```

---

## 📦 **Test-Suites**

### **1. Vehicle Intake Tests** (`01-vehicle-intake.spec.js`)
Testet den kompletten manuellen Annahme-Flow:

- ✅ Basis-Annahme mit Foto und Unterschrift
- ✅ PDF-Generierung
- ✅ Realtime Updates in liste.html
- ✅ Realtime Updates in kanban.html
- ✅ Realtime Updates in kunden.html
- ✅ Stammkunde-Erkennung (2. Besuch)

**Ausführung:**
```bash
npx playwright test tests/01-vehicle-intake.spec.js
```

**Tests:** 6 Tests | **Dauer:** ~2-3 Minuten

---

### **2. Partner Flow Tests** (`02-partner-flow.spec.js`)
Testet den B2B Partner-Flow:

- ✅ Partner erstellt Anfrage
- ✅ Werkstatt erstellt KVA
- ✅ Partner nimmt KVA an → Fahrzeug wird erstellt
- ✅ Realtime Updates nach Partner-Annahme

**Ausführung:**
```bash
npx playwright test tests/02-partner-flow.spec.js
```

**Tests:** 4 Tests | **Dauer:** ~2-3 Minuten
**⚠️ KRITISCH:** Test 2.3 prüft vollständige Pipeline!

---

### **3. Kanban Drag & Drop Tests** (`03-kanban-drag-drop.spec.js`)
Testet Kanban Board Funktionalität:

- ✅ Drag & Drop zwischen Spalten
- ✅ Foto-Upload bei Arbeitsschritten
- ✅ "Ohne Foto fortfahren" Option
- ✅ Multi-Browser Realtime Sync

**Ausführung:**
```bash
npx playwright test tests/03-kanban-drag-drop.spec.js
```

**Tests:** 4 Tests | **Dauer:** ~2 Minuten

---

### **4. Edge Cases Tests** (`04-edge-cases.spec.js`)
Testet Fehlerbehandlung und Grenzfälle:

- ✅ Duplikat-Kennzeichen Erkennung
- ✅ Fehlende Pflichtfelder
- ✅ Firebase Offline Mode (LocalStorage Fallback)
- ✅ Ungültige Eingaben
- ✅ Leerzeichen-Trimming
- ✅ Sonderfälle (Baujahr "Älter", Preis-Formate)

**Ausführung:**
```bash
npx playwright test tests/04-edge-cases.spec.js
```

**Tests:** 7 Tests | **Dauer:** ~2-3 Minuten

---

## 📊 **Test-Reports**

### **HTML Report anzeigen:**
```bash
npm run test:report
```

Öffnet automatisch Browser mit detailliertem Report:
- ✅ Test-Ergebnisse (Pass/Fail)
- 📸 Screenshots bei Fehlern
- 🎥 Video-Aufnahmen
- 📝 Console Logs
- 🌐 Network Requests

### **Report-Speicherort:**
```
test-results/
├── html/              # HTML Report
├── results.json       # JSON Daten
├── screenshots/       # Fehler-Screenshots
└── videos/           # Fehler-Videos
```

---

## 🐛 **Debugging**

### **1. Debug-Modus mit Playwright Inspector:**
```bash
npm run test:debug
```

**Features:**
- Schritt-für-Schritt Ausführung
- Breakpoints setzen
- DOM-Inspektion
- Console Logs live sehen

### **2. Screenshots bei jedem Schritt:**
```javascript
// In Test-Datei hinzufügen:
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

### **3. Trace Viewer (detaillierte Analyse):**
```bash
# Trace aufnehmen
npx playwright test --trace on

# Trace anzeigen
npx playwright show-trace trace.zip
```

### **4. Console Logs aktivieren:**
```javascript
// In Test-Datei:
page.on('console', msg => console.log('BROWSER:', msg.text()));
```

### **5. Test Code Generator (Codegen):**
```bash
npm run test:codegen
```

Öffnet Browser und generiert automatisch Test-Code während du klickst!

---

## 🔍 **Häufige Probleme & Lösungen**

### **Problem: "Connection refused on localhost:8000"**
**Lösung:**
```bash
# Starte Server manuell
npm run server

# In anderem Terminal:
npm test
```

### **Problem: "Firebase not initialized"**
**Lösung:**
- Prüfe `firebase-config.js` enthält echte Credentials
- Firestore und Storage aktiviert in Firebase Console

### **Problem: Tests sind langsam**
**Lösung:**
```bash
# Nur Chromium verwenden (schneller als alle Browser)
npx playwright test --project=chromium

# Parallele Ausführung deaktivieren (für Debugging)
npx playwright test --workers=1
```

### **Problem: "Element not found"**
**Lösung:**
- Erhöhe Timeout:
```javascript
await page.waitForSelector('#element', { timeout: 30000 });
```
- Prüfe ob Element durch JavaScript dynamisch geladen wird

---

## 🔄 **CI/CD Integration**

### **GitHub Actions:**

Erstelle `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

---

## 📈 **Test-Coverage**

**Aktuelle Coverage:**

| Flow | Tests | Status |
|------|-------|--------|
| Manuelle Annahme | 6 | ✅ 100% |
| Partner-Flow | 4 | ✅ 100% |
| Kanban Drag & Drop | 4 | ✅ 100% |
| Edge Cases | 7 | ✅ 100% |
| **GESAMT** | **21** | **✅ 100%** |

---

## 🎯 **Best Practices**

1. **Vor jedem Commit:** Run `npm test`
2. **Neue Features:** Schreibe Tests ZUERST (TDD)
3. **Debug:** Verwende `test:ui` statt `test:debug`
4. **Screenshots:** Nur bei Fehlern (automatisch)
5. **Cleanup:** Tests räumen immer auf (afterEach)

---

## 📚 **Weitere Ressourcen**

- **Playwright Docs:** https://playwright.dev
- **E2E Test Plan:** `E2E_TESTS.md`
- **Firebase Setup:** `FIREBASE_SETUP.md`
- **App Dokumentation:** `README.md`

---

## ❓ **Fragen?**

Bei Problemen mit Tests:
1. Prüfe `E2E_TESTS.md` für manuelle Test-Anleitungen
2. Run `npm run test:ui` für visuelles Debugging
3. Check `test-results/html/` für detaillierte Reports

---

**Happy Testing! 🚀**
