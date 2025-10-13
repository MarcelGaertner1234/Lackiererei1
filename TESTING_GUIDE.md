# Testing Guide - Critical Pipeline E2E Tests

**Version:** 1.0
**Datum:** 13. Oktober 2025
**Für:** Fahrzeugannahme App Critical Pipeline Tests

---

## Übersicht

Dieses Dokument beschreibt alle Möglichkeiten, die Critical Pipeline E2E Tests auszuführen:

1. **CI/CD (GitHub Actions)** - Automatisch bei Push/PR ✅ EMPFOHLEN
2. **Lokal mit Firebase Emulators** - Für schnelle Iteration (benötigt Java 21+)
3. **Lokal gegen echtes Firebase** - Für vollständige Integration Tests

---

## Option 1: CI/CD mit GitHub Actions (EMPFOHLEN)

### Automatische Ausführung

Die Tests werden automatisch ausgeführt bei:
- ✅ Push zu `main` Branch
- ✅ Pull Request zu `main`
- ✅ Änderungen in `partner-app/`, `firebase-config.js`, oder `tests/`

### Manueller Trigger

```bash
# Via GitHub UI:
# 1. Gehe zu: https://github.com/MarcelGaertner1234/Lackiererei1/actions
# 2. Wähle "Critical Pipeline E2E Tests"
# 3. Klicke "Run workflow" → "Run workflow"

# Via GitHub CLI (gh):
gh workflow run critical-tests.yml
```

### Test-Ergebnisse ansehen

```bash
# Via GitHub UI:
# 1. Gehe zu: Actions Tab
# 2. Klicke auf den neuesten Workflow Run
# 3. Download Artifacts:
#    - playwright-report-chromium (HTML Report)
#    - test-results-chromium (Screenshots/Videos)

# Via GitHub CLI:
gh run list --workflow=critical-tests.yml
gh run view <run-id>
gh run download <run-id>
```

### Vorteile GitHub Actions

✅ **Keine lokale Setup erforderlich** - Java 21, Firebase Emulators, Playwright alles vorinstalliert
✅ **Konsistente Umgebung** - Identisch für alle Entwickler
✅ **Automatische Artifacts** - Screenshots, Videos, HTML Reports
✅ **Issue Creation bei Fehler** - Automatische Benachrichtigung
✅ **Matrix Testing** - Mehrere Browser parallel (optional)

---

## Option 2: Lokal mit Firebase Emulators

### Voraussetzungen

1. **Java 21 oder höher** (WICHTIG!)
   ```bash
   # Prüfe Java Version
   java --version
   # Sollte ausgeben: openjdk 21.x.x oder höher

   # Falls nicht installiert:
   # macOS (via Homebrew):
   brew install openjdk@21
   brew link --force openjdk@21

   # Ubuntu/Debian:
   sudo apt install openjdk-21-jdk

   # Windows:
   # Download von: https://adoptium.net/
   ```

2. **Firebase Tools**
   ```bash
   npm install -g firebase-tools
   firebase --version
   # Sollte ausgeben: 13.x.x oder höher
   ```

3. **Node.js & NPM**
   ```bash
   node --version  # v18.x oder höher
   npm --version   # v9.x oder höher
   ```

### Setup & Ausführung

```bash
# 1. Navigiere zum Projekt
cd "/path/to/Fahrzeugannahme_App"

# 2. Installiere Dependencies
npm install

# 3. Installiere Playwright Browsers
npx playwright install

# 4. Starte Firebase Emulators in separatem Terminal
firebase emulators:start --only firestore,storage --project demo-test

# Terminal Output sollte zeigen:
# ┌─────────────┬────────────────┐
# │ Emulator    │ Port           │
# ├─────────────┼────────────────┤
# │ Firestore   │ 8080           │
# │ Storage     │ 9199           │
# └─────────────┴────────────────┘

# 5. In neuem Terminal: Führe Tests aus
npx playwright test tests/05-transaction-failure.spec.js --project=chromium

# 6. Mit UI (headed mode)
npx playwright test tests/05-transaction-failure.spec.js --headed

# 7. Beide Test-Suites
npx playwright test tests/05-transaction-failure.spec.js tests/06-cascade-delete-race.spec.js

# 8. Stoppe Emulators (Ctrl+C im Emulator-Terminal)
```

### Vorteile Emulators

✅ **Schnell** - Keine Netzwerk-Latenz zu Firebase
✅ **Sicher** - Keine echten Daten betroffen
✅ **Repeatability** - Identische Ausgangsbedingung bei jedem Test-Run
✅ **Offline** - Funktioniert ohne Internet

### Nachteile Emulators

❌ **Java 21 erforderlich** - Nicht auf allen Systemen vorhanden
❌ **Setup-Aufwand** - Emulators müssen vor Tests gestartet werden
❌ **Nicht 100% identisch** - Kleine Unterschiede zu Prod Firebase

---

## Option 3: Lokal gegen echtes Firebase (LIVE)

### ⚠️ WARNUNG

- Tests laufen gegen ECHTES Firebase Projekt
- Erstellen/Löschen ECHTE Daten in Firestore
- NUR für Entwicklung/Staging verwenden, NIEMALS Production!

### Voraussetzungen

1. **Firebase Projekt mit Test-Environment**
   ```bash
   # Prüfe aktives Projekt
   firebase use

   # Wechsle zu Test-Projekt
   firebase use test
   # ODER
   firebase use staging

   # NIEMALS:
   # firebase use production  ❌ GEFÄHRLICH!
   ```

2. **Firestore & Storage Rules deployed**
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

3. **Firebase Credentials konfiguriert**
   - `firebase-config.js` muss korrekte API Keys enthalten
   - Service Account Key (falls benötigt) in `.env` oder Secret

### Ausführung

```bash
# 1. Sicherstellen dass Test-Projekt aktiv ist
firebase use
# Output sollte sein: "test" oder "staging"

# 2. Tests ausführen
npx playwright test tests/05-transaction-failure.spec.js --project=chromium

# 3. Mit Cleanup nach jedem Test
# (Tests haben beforeEach/afterEach cleanup logic)
npx playwright test tests/06-cascade-delete-race.spec.js

# 4. Debug Mode (wenn Tests fehlschlagen)
npx playwright test tests/05-transaction-failure.spec.js --debug

# 5. Trace aufnehmen (für detaillierte Analyse)
npx playwright test tests/06-cascade-delete-race.spec.js --trace on
npx playwright show-trace trace.zip
```

### Vorteile echtes Firebase

✅ **100% realistisch** - Identisch zu Production-Verhalten
✅ **Kein Java erforderlich** - Nur Node.js & Browser
✅ **Volle Firebase Features** - Functions, Extensions, etc.

### Nachteile echtes Firebase

❌ **Netzwerk-Latenz** - Langsamer als Emulators
❌ **Kosten** - Firestore Read/Write Quota
❌ **Daten-Risiko** - Versehentliche Prod-Daten Änderungen

---

## Debug-Modus & Troubleshooting

### Playwright Inspector

```bash
# Öffnet interaktiven Debugger
npx playwright test tests/05-transaction-failure.spec.js --debug

# Im Inspector:
# - Step through test line-by-line
# - Inspect DOM elements
# - View console logs
# - Edit selectors on-the-fly
```

### Trace Viewer

```bash
# Erstelle Trace
npx playwright test tests/06-cascade-delete-race.spec.js --trace on

# Öffne Trace Viewer
npx playwright show-trace test-results/*/trace.zip

# Zeigt:
# - Screenshots vor jedem Action
# - Network Requests
# - Console Logs
# - Source Code
```

### Headed Mode (sichtbarer Browser)

```bash
# Tests in sichtbarem Browser ausführen
npx playwright test tests/05-transaction-failure.spec.js --headed

# Slow-Mo (langsame Ausführung für Debugging)
npx playwright test --headed --slow-mo=1000

# Nur ein spezifischer Test
npx playwright test --headed --grep="5.1"
```

### Console Logs ansehen

```bash
# Alle Console Logs ausgeben
PWDEBUG=console npx playwright test tests/05-transaction-failure.spec.js

# Playwright UI Mode (mit Live Console)
npx playwright test --ui
```

---

## Test-Selektoren

### Einzelnen Test ausführen

```bash
# Via Test-Nummer
npx playwright test --grep="5.1"
npx playwright test --grep="6.3"

# Via Test-Titel
npx playwright test --grep="Optimistic Locking"
npx playwright test --grep="AFTER-DELETE CHECK"

# Test-Datei + Selektor
npx playwright test tests/05-transaction-failure.spec.js --grep="5.2"
```

### Mehrere Tests kombinieren

```bash
# Alle "CRITICAL" Tests
npx playwright test --grep="CRITICAL"

# Alle Tests AUSSER Smoke Tests
npx playwright test --grep-invert="Smoke Tests"

# Nur Transaction-bezogene Tests
npx playwright test --grep="Transaction"
```

### Browser-Auswahl

```bash
# Nur Chromium (schnellster)
npx playwright test --project=chromium

# Nur Firefox
npx playwright test --project=firefox

# Nur WebKit (Safari)
npx playwright test --project=webkit

# Alle Browser (parallel)
npx playwright test

# Mobile Chrome
npx playwright test --project=mobile-chrome
```

---

## Test-Reports ansehen

### HTML Report (interaktiv)

```bash
# Nach Test-Run automatisch generiert in playwright-report/

# Öffne Report im Browser
npx playwright show-report

# Zeigt:
# - Pass/Fail Status aller Tests
# - Execution Time
# - Screenshots bei Failures
# - Videos (wenn configured)
# - Traces (wenn --trace on)
```

### JSON Report (für CI/CD)

```bash
# JSON Report automatisch in test-results/results.json

# Parse mit jq
cat test-results/results.json | jq '.suites[].specs[].tests[] | {title: .title, status: .status}'
```

### Terminal Reporter

```bash
# Default: Liste alle Tests mit Status
npx playwright test

# Verbose (mehr Details)
npx playwright test --reporter=list

# Dot Reporter (nur Status-Dots)
npx playwright test --reporter=dot
```

---

## Häufige Probleme & Lösungen

### Problem 1: Firebase initialization timeout

**Symptom:**
```
Firebase initialized: false
Error: expect(received).toBe(expected)
Expected: true
Received: false
```

**Lösung:**
```bash
# Option A: Emulators verwenden
firebase emulators:start --only firestore,storage --project demo-test

# Option B: Firebase Credentials prüfen
# Öffne: firebase-config.js
# Verify: apiKey, projectId, appId sind korrekt

# Option C: Firestore Rules prüfen
firebase deploy --only firestore:rules
```

---

### Problem 2: Java Version zu alt

**Symptom:**
```
⚠ firestore: Unsupported java version
Fatal error occurred: Firestore Emulator has exited with code: 1
```

**Lösung:**
```bash
# macOS:
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home

# Ubuntu:
sudo apt update
sudo apt install openjdk-21-jdk
sudo update-alternatives --config java  # Wähle Java 21

# Verify:
java --version  # Sollte 21.x.x zeigen
```

---

### Problem 3: Port bereits belegt

**Symptom:**
```
Error: Port 8080 is already in use
```

**Lösung:**
```bash
# Finde Prozess auf Port 8080
lsof -i :8080

# Stoppe Prozess
kill -9 <PID>

# Oder: Andere Ports konfigurieren in firebase.json
# Ändere "port": 8080 zu "port": 8081
```

---

### Problem 4: Playwright Browser nicht installiert

**Symptom:**
```
Error: browserType.launch: Executable doesn't exist at ...
```

**Lösung:**
```bash
# Installiere alle Browser
npx playwright install

# Nur Chromium
npx playwright install chromium

# Mit System-Dependencies (Linux)
npx playwright install --with-deps
```

---

### Problem 5: Tests timeout bei Realtime Operations

**Symptom:**
```
Test timeout of 180000ms exceeded
```

**Lösung:**
```bash
# Option A: Erhöhe Timeout in playwright.config.js
# timeout: 300 * 1000  # 5 Minuten

# Option B: Erhöhe nur für einzelnen Test
test.setTimeout(300000);  # 5 Minuten

# Option C: Optimize Waits
# Statt: await page.waitForTimeout(10000)
# Besser: await expect(element).toBeVisible({ timeout: 10000 })
```

---

## Performance-Optimierung

### Parallele Ausführung

```bash
# Standard: Alle Tests parallel (je nach CPU cores)
npx playwright test

# Nur 2 parallel workers
npx playwright test --workers=2

# Komplett sequenziell (für Debugging)
npx playwright test --workers=1

# Maximum parallelism
npx playwright test --workers=100%
```

### Test-Sharding (für CI)

```bash
# Split tests across multiple machines

# Machine 1 (von 3):
npx playwright test --shard=1/3

# Machine 2:
npx playwright test --shard=2/3

# Machine 3:
npx playwright test --shard=3/3
```

### Schnellere Test-Runs

```bash
# Nur fehlgeschlagene Tests wiederholen
npx playwright test --last-failed

# Skip erfolgreiche Tests (Cache)
npx playwright test --only-changed

# Ohne Videos (schneller)
npx playwright test --config=playwright.config.js -- video=off
```

---

## Best Practices

### DO ✅

1. **Immer beforeEach/afterEach cleanup** verwenden
2. **Emulators für Entwicklung** verwenden
3. **CI/CD für Pull Requests** aktivieren
4. **Test-Titel beschreibend** schreiben
5. **Console Monitoring** setup für Fehler-Tracking
6. **Unique Test-Daten** (z.B. `HD-E2E-${Date.now()}`)

### DON'T ❌

1. **NIEMALS gegen Production Firebase** testen
2. **Keine hardcoded Delays** (`waitForTimeout` vermeiden)
3. **Keine Test-Daten in Git** committen
4. **Tests nicht ignorieren** wenn sie fehlschlagen
5. **Keine parallelen Tests** die gleiche Daten verwenden

---

## Cheat Sheet

```bash
# QUICK COMMANDS

# Smoke Tests (fast, ~10s)
npx playwright test tests/00-smoke-test.spec.js --project=chromium

# Critical Tests (full, ~90s)
npx playwright test tests/05-transaction-failure.spec.js tests/06-cascade-delete-race.spec.js

# Single Test mit Debug
npx playwright test --grep="5.1" --debug

# Alle Tests mit HTML Report
npx playwright test && npx playwright show-report

# CI Mode (headless, fast)
npx playwright test --project=chromium --workers=4

# Full Trace für Bug-Report
npx playwright test tests/06-cascade-delete-race.spec.js --trace on --headed
```

---

## Weiterführende Ressourcen

- **Playwright Docs:** https://playwright.dev/docs/intro
- **Firebase Emulators:** https://firebase.google.com/docs/emulator-suite
- **GitHub Actions:** https://docs.github.com/en/actions
- **Test Report:** `CRITICAL_TESTS_REPORT.md` in diesem Repo

---

**Erstellt am:** 13. Oktober 2025
**Autor:** Claude Code
**Letzte Aktualisierung:** 13. Oktober 2025
