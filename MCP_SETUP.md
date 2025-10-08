# 🚀 Chrome DevTools MCP Server - Setup & Verwendung

**Fahrzeugannahme-App - AI-Powered Debugging**

---

## 📋 Inhaltsverzeichnis

1. [Was ist MCP?](#was-ist-mcp)
2. [Installation](#installation)
3. [Verwendung](#verwendung)
4. [Performance-Testing](#performance-testing)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)
7. [Beispiele](#beispiele)

---

## 🎯 Was ist MCP?

**MCP (Model Context Protocol)** ist ein experimentelles Tool von Google, das **KI-Assistenten** (wie Claude Code) direkten Zugriff auf **Chrome DevTools** gibt.

### Was bedeutet das?
```
Vorher:
Du → Claude schreibt Code → Du testest manuell in Chrome → Du reportest Bugs → Claude fixt

Nachher:
Du → Claude schreibt Code → Claude testet SELBST in Chrome → Claude fixt automatisch ✅
```

### Vorteile:
- ✅ **Automatisiertes Debugging** - AI findet Bugs selbst
- ✅ **Performance-Analyse** - AI misst & optimiert
- ✅ **Echtzeit-Feedback** - AI sieht sofort was kaputt ist
- ✅ **Zeit-Ersparnis** - 4-6h/Woche weniger manuelles Testing

---

## 🛠️ Installation

### Voraussetzungen

**Software:**
```bash
✅ Google Chrome (installiert)
✅ Node.js v18+ (für npx)
✅ Python 3 (für lokalen Server)
✅ Git (für Updates)
```

**Prüfen:**
```bash
# Chrome-Version prüfen
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

# Node.js prüfen
node --version  # sollte v18.0.0 oder höher sein

# Python prüfen
python3 --version  # sollte 3.8+ sein
```

### Setup-Schritte

#### Schritt 1: MCP-Config (bereits erstellt ✅)

Die Datei `mcp-config.json` ist bereits im Projekt-Verzeichnis:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest"
      ]
    }
  }
}
```

**Hinweis:** Da das globale `~/.config/claude-code/` Verzeichnis root gehört, verwenden wir die lokale Config im Projekt-Ordner.

#### Schritt 2: Chrome-Debug-Script (bereits erstellt ✅)

Das Script `chrome-debug.sh` ist ausführbar und bereit:

```bash
# Verwendung:
./chrome-debug.sh                          # Öffnet kalender.html
./chrome-debug.sh http://localhost:8000/   # Öffnet andere URL
```

**Was macht das Script?**
- Startet Chrome mit Remote Debugging (Port 9222)
- Erstellt isoliertes User-Profile (stört normalen Chrome nicht)
- Prüft ob lokaler Server läuft
- Killt alte Debug-Instanzen automatisch
- Zeigt DevTools Protocol URL an

#### Schritt 3: Lokaler Server (bereits erstellt ✅)

Das Script `start-local-server.sh` startet einen Python HTTP Server:

```bash
# Verwendung:
./start-local-server.sh        # Port 8000 (Standard)
./start-local-server.sh 3000   # Eigener Port
```

---

## 🎮 Verwendung

### Quick Start (3 Schritte)

#### 1. Server starten
```bash
# Terminal 1
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
./start-local-server.sh
```

**Output:**
```
=====================================================================
  Lokaler HTTP Server - Fahrzeugannahme-App
=====================================================================

✅ Server startet...

📂 Verzeichnis: [PFAD]
🌐 Port:        8000

URLs:
  Landing:    http://localhost:8000/
  Kalender:   http://localhost:8000/kalender.html
  ...
```

#### 2. Chrome mit Remote Debugging starten
```bash
# Terminal 2
./chrome-debug.sh
```

**Output:**
```
=====================================================================
  Chrome DevTools Remote Debugging - Fahrzeugannahme-App
=====================================================================

✅ Chrome gefunden
✅ Lokaler Server läuft auf Port 8000
🚀 Starte Chrome mit Remote Debugging...

DevTools Protocol läuft auf: http://localhost:9222
Inspect-UI:                  http://localhost:9222/json

WICHTIG: Schließe NICHT dieses Terminal-Fenster!
```

Chrome öffnet sich automatisch mit `kalender.html`.

#### 3. MCP in Claude Code nutzen

**Option A: Direkt in Claude Code prompts**
```
Prompt:
"Öffne http://localhost:8000/kalender.html in Chrome DevTools.
Führe einen Performance-Trace durch und analysiere Bottlenecks."

Claude antwortet mit:
- Performance-Metriken
- Bottleneck-Analyse
- Optimierungsvorschläge
- Automatische Fixes (optional)
```

**Option B: Performance-Test-Plan ausführen**
```
Prompt:
"Führe den Performance-Test aus performance-test.md durch.
Gib mir einen vollständigen Report."

Claude arbeitet den Test-Plan ab:
1. Baseline-Messung
2. Interaktions-Tests
3. Memory-Profiling
4. Report-Erstellung
```

---

## 🔬 Performance-Testing

### Test-Workflow

#### 1. Baseline messen (kalte Seite)
```
Prompt an Claude:
"Performance-Trace für kalender.html:
1. Browser-Cache leeren
2. Seite neu laden
3. 5s Performance-Trace aufnehmen
4. Metriken analysieren:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)
5. Bottlenecks identifizieren"
```

**Erwartete Antwort:**
```
Performance Report - kalender.html
==================================

Metriken:
- FCP:  1.2s  ✅ (Ziel: <1.8s)
- LCP:  2.0s  ✅ (Ziel: <2.5s)
- TTI:  3.5s  ⚠️  (Ziel: <3.0s)
- TBT:  250ms ⚠️  (Ziel: <200ms)
- CLS:  0.05  ✅ (Ziel: <0.1)

Bottlenecks:
1. Firebase SDK (300KB) - Blocking Script
   → Fix: Async/Defer Loading

2. 42 Event Listeners - Hohe Anzahl
   → Fix: Event Delegation

3. Keine Code Minification
   → Fix: UglifyJS/Terser

Soll ich die Fixes implementieren? (y/n)
```

#### 2. Interaktion testen (Drag & Drop)
```
Prompt:
"Simuliere Drag & Drop im Kalender:
1. Event aus Timeline greifen
2. Um 2 Stunden verschieben
3. Layout-Shift messen
4. Repaint-Time messen"
```

#### 3. Filter-Performance testen
```
Prompt:
"Teste Filter-Performance:
1. Multi-Select Filter aktivieren (Alle → Überfällig)
2. Measure Re-Render Time
3. Measure DOM-Updates
4. Check for Memory Leaks"
```

### Automatisierte Test-Suite

Claude kann auch komplette Test-Suiten ausführen:

```
Prompt:
"Führe folgende Tests durch:
1. Baseline Performance (kalt + warm)
2. Alle Interaktionen (Drag & Drop, Filter, Export)
3. Memory-Profiling (10 Minuten Session)
4. Network-Analyse (Firebase Requests)
5. Accessibility-Audit (WCAG 2.1)
6. SEO-Check (Lighthouse)

Erstelle einen vollständigen Report als Markdown."
```

Claude erstellt dann automatisch einen Report wie:
```markdown
# Performance Report - Fahrzeugannahme-App
Datum: 08.10.2025

## Executive Summary
- Performance-Score: 85/100 ✅
- Accessibility: 92/100 ✅
- Best Practices: 78/100 ⚠️
- SEO: 45/100 ❌

## Top 3 Probleme:
1. Firebase SDK blocking (300KB)
2. Keine Meta-Tags (SEO)
3. Fehlende ARIA-Labels

## Quick Wins:
1. Firebase async laden (+15 Performance-Score)
2. Meta-Tags hinzufügen (+40 SEO-Score)
3. ARIA-Labels ergänzen (+5 Accessibility)

Soll ich die Quick Wins implementieren?
```

---

## 🐛 Troubleshooting

### Problem 1: "Port 9222 already in use"

**Fehler:**
```
⚠️  Chrome läuft bereits mit Debug-Port 9222 (PID: 12345)
```

**Fix:**
Das Script killt automatisch alte Instanzen. Falls nicht:
```bash
# Manuell killen:
lsof -ti:9222 | xargs kill -9

# Script erneut starten:
./chrome-debug.sh
```

### Problem 2: "Lokaler Server läuft nicht"

**Fehler:**
```
⚠️  Lokaler Server läuft nicht!
```

**Fix:**
```bash
# Terminal 1: Server starten
./start-local-server.sh

# Warten bis "Server läuft!" erscheint
# DANN Terminal 2: Chrome starten
./chrome-debug.sh
```

### Problem 3: "MCP Server not found"

**Fehler:**
```
Error: chrome-devtools-mcp not found
```

**Fix:**
```bash
# NPX Cache leeren:
npm cache clean --force

# Erneut versuchen (npx lädt automatisch runter):
npx -y chrome-devtools-mcp@latest --version
```

### Problem 4: "Permission denied: ~/.config"

**Bereits gelöst!** ✅
Wir verwenden lokale `mcp-config.json` im Projekt-Ordner statt globalem `~/.config/claude-code/`.

### Problem 5: Chrome öffnet sich nicht

**Check:**
```bash
# Chrome-Pfad korrekt?
ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Wenn nicht gefunden:
# chrome-debug.sh bearbeiten, Zeile 30:
CHROME_PATH="/dein/pfad/zu/chrome"
```

### Problem 6: "DevTools Protocol timeout"

**Fix:**
```bash
# Chrome komplett beenden:
pkill -9 "Google Chrome"

# Temp-Profil löschen:
rm -rf /tmp/chrome-debug-profile

# Neu starten:
./chrome-debug.sh
```

---

## 💡 Best Practices

### 1. Zwei-Terminal-Setup

**Empfohlenes Setup:**
```
Terminal 1 (dauerhaft):     Server läuft (./start-local-server.sh)
Terminal 2 (dauerhaft):     Chrome läuft (./chrome-debug.sh)
Terminal 3 (aktiv):         Claude Code / Kommandos
```

**Vorteil:** Server + Chrome laufen permanent, nur Claude-Prompts in Terminal 3.

### 2. Performance-Tests regelmäßig

**Empfohlene Frequenz:**
```
Täglich:      Quick-Check (FCP, LCP, TTI)
Wöchentlich:  Full-Suite (Performance + Accessibility + SEO)
Vor Release:  Kompletter Audit (inkl. Security)
```

**Automatisierung:**
```bash
# Cronjob erstellen (täglich 9 Uhr):
0 9 * * * cd /pfad/zum/projekt && ./performance-daily-check.sh
```

### 3. Metriken tracken

**Excel/CSV-Log führen:**
```csv
Datum,FCP,LCP,TTI,TBT,CLS,Score
2025-10-08,1.2,2.0,3.5,250,0.05,85
2025-10-09,1.0,1.8,3.2,180,0.03,92
...
```

**Chart erstellen:**
- Trendlinie zeigt Verbesserung
- Regressions-Erkennung (Score sinkt!)

### 4. Git-Integration

**Vor jedem Commit:**
```bash
# Performance-Test
./performance-quick-check.sh

# Wenn Score < 80:
echo "⚠️  Performance-Score zu niedrig! Optimieren vor Commit."
exit 1
```

**Git Hook erstellen:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
./performance-quick-check.sh || exit 1
```

### 5. Team-Kommunikation

**Performance-Report teilen:**
```bash
# Report generieren
./generate-performance-report.sh > report.md

# Per Email senden
mail -s "Performance Report $(date)" team@firma.de < report.md

# In Slack posten
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Performance Report: 85/100 ✅"}' \
  $SLACK_WEBHOOK
```

---

## 📚 Beispiele

### Beispiel 1: Bug automatisch finden & fixen

**Prompt:**
```
"In kalender.html funktioniert Drag & Drop nicht auf Safari.
Debugge das Problem und fixe es."
```

**Claude's Workflow:**
1. Öffnet kalender.html in Chrome DevTools
2. Prüft Console auf Errors
3. Findet: `event.dataTransfer.effectAllowed not supported in Safari`
4. Schlägt Fix vor:
```javascript
// VORHER (nur Chrome):
event.dataTransfer.effectAllowed = 'move';

// NACHHER (Cross-Browser):
if (event.dataTransfer) {
  event.dataTransfer.effectAllowed = 'move';
}
```
5. Implementiert Fix
6. Testet erneut → ✅ funktioniert

### Beispiel 2: Performance optimieren

**Prompt:**
```
"kalender.html lädt zu langsam.
Analysiere und optimiere die Performance."
```

**Claude's Workflow:**
1. Performance-Trace aufnehmen
2. Findet: Firebase SDK (300KB) blockiert Rendering
3. Schlägt vor:
```html
<!-- VORHER: Blocking -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>

<!-- NACHHER: Async -->
<script async src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
```
4. Implementiert + testet
5. **Ergebnis:** FCP 1.2s → 0.8s (-33%!) ✅

### Beispiel 3: Memory Leak finden

**Prompt:**
```
"Nach 10 Minuten Kalender-Nutzung wird Browser langsam.
Finde Memory Leaks."
```

**Claude's Workflow:**
1. Memory-Profiler starten
2. 10 Minuten User-Interaktion simulieren
3. Heap-Snapshots vergleichen
4. Findet: Event Listeners werden nicht entfernt
5. Schlägt Fix vor:
```javascript
// VORHER: Memory Leak
function addEventListeners() {
  document.querySelectorAll('.event').forEach(el => {
    el.addEventListener('click', handleClick);
  });
}

// NACHHER: Cleanup
function addEventListeners() {
  // Alte Listener entfernen
  removeEventListeners();

  document.querySelectorAll('.event').forEach(el => {
    el.addEventListener('click', handleClick);
  });
}

function removeEventListeners() {
  document.querySelectorAll('.event').forEach(el => {
    el.removeEventListener('click', handleClick);
  });
}
```
6. **Ergebnis:** Memory stabil statt +5MB/min ✅

### Beispiel 4: Mobile-Testing automatisieren

**Prompt:**
```
"Teste kalender.html auf allen gängigen Devices:
- iPhone 15 Pro
- iPad Air
- Samsung Galaxy S24
- Desktop (1920x1080)

Prüfe:
- Layout-Probleme
- Touch-Events
- Performance
- Accessibility

Erstelle Bug-Report falls Probleme gefunden."
```

**Claude's Workflow:**
1. Device-Emulation für jedes Device
2. Screenshots erstellen
3. Touch-Events simulieren
4. Performance messen
5. Accessibility-Audit
6. Erstellt Report:
```markdown
# Mobile-Testing Report

## ✅ Funktioniert:
- iPhone 15 Pro: Perfekt
- Desktop: Perfekt

## ⚠️ Probleme:
- iPad Air: Drag & Drop zu sensitiv (Threshold: 5px → 15px)
- Galaxy S24: Buttons zu klein (44px → 48px Touch-Target)

## Fixes:
1. Drag-Threshold erhöhen
2. Button-Padding vergrößern

Soll ich fixen?
```

### Beispiel 5: SEO-Audit

**Prompt:**
```
"Führe vollständigen SEO-Audit für index.html durch.
Implementiere alle Quick Wins."
```

**Claude's Workflow:**
1. Lighthouse SEO-Audit
2. Findet 12 Probleme
3. Implementiert Quick Wins:
```html
<!-- Meta-Tags hinzufügen -->
<meta name="description" content="...">
<meta name="keywords" content="...">

<!-- Sitemap erstellen -->
<!-- robots.txt erstellen -->

<!-- Schema.org JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  ...
}
</script>
```
4. **Ergebnis:** SEO-Score 45 → 92 (+47!) ✅

---

## 🎓 Weiterführende Ressourcen

### Offizielle Dokumentation
- [Chrome DevTools MCP Server](https://developer.chrome.com/blog/chrome-devtools-mcp)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

### Performance-Guides
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Performance Best Practices](https://web.dev/fast/)

### Video-Tutorials
- [Chrome DevTools Performance](https://www.youtube.com/watch?v=0fONene3OIA)
- [Web Performance Optimization](https://www.youtube.com/watch?v=0pDavhIwfLM)

---

## 📞 Support

### Bei Problemen:

1. **Zuerst:** [Troubleshooting](#troubleshooting)-Sektion checken
2. **Dann:** Claude Code fragen:
   ```
   "Ich habe Problem X mit MCP-Setup.
   Troubleshooting-Schritte durchlaufen, hilft nicht.
   Was kann ich tun?"
   ```
3. **Falls nicht lösbar:** GitHub Issue erstellen

### Feedback & Verbesserungen:

Hast du Ideen für neue Features oder Use Cases?
→ Dokumentation erweitern!

---

## ✅ Checkliste: Setup abgeschlossen

- [x] MCP-Config erstellt (`mcp-config.json`)
- [x] Chrome-Debug-Script erstellt (`chrome-debug.sh`)
- [x] Server-Script erstellt (`start-local-server.sh`)
- [x] Performance-Test-Plan erstellt (`performance-test.md`)
- [x] Dokumentation erstellt (`MCP_SETUP.md`)

### Nächste Schritte:

1. **Ersten Test durchführen:**
   ```bash
   # Terminal 1
   ./start-local-server.sh

   # Terminal 2
   ./chrome-debug.sh

   # Terminal 3 (Claude Code)
   Prompt: "Performance-Test für kalender.html durchführen"
   ```

2. **Ergebnisse dokumentieren:**
   - Performance-Metriken notieren
   - Bottlenecks identifizieren
   - Quick Wins implementieren

3. **Regelmäßig testen:**
   - Täglich: Quick-Check
   - Wöchentlich: Full-Audit
   - Vor Release: Kompletter Test

---

**Setup abgeschlossen! 🎉**
Viel Erfolg mit AI-Powered Debugging!

---

**Erstellt:** 08.10.2025
**Autor:** Claude Code
**Version:** 1.0
**Projekt:** Fahrzeugannahme-App - Auto-Lackierzentrum Mosbach
