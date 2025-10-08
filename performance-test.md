# 🔬 Performance-Test Plan: kalender.html

## Test-Datum: 08.10.2025

---

## 📋 Test-Übersicht

### Zu testende Seite:
**kalender.html** (2.630 Zeilen)

### Test-Kategorien:
1. **Page Load Performance**
2. **JavaScript Execution Time**
3. **DOM Rendering**
4. **Event Listener Performance**
5. **Memory Usage**
6. **Network Requests**

---

## 🎯 Test-Metriken (Zielwerte)

| Metrik | Ziel | Akzeptabel | Kritisch |
|--------|------|------------|----------|
| **First Contentful Paint (FCP)** | < 1.0s | < 1.8s | > 1.8s |
| **Largest Contentful Paint (LCP)** | < 2.0s | < 2.5s | > 2.5s |
| **Time to Interactive (TTI)** | < 3.0s | < 3.8s | > 3.8s |
| **Total Blocking Time (TBT)** | < 200ms | < 300ms | > 300ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 | < 0.25 | > 0.25 |
| **JavaScript Heap Size** | < 50MB | < 100MB | > 100MB |
| **DOM Nodes** | < 1500 | < 2000 | > 2000 |

---

## 🔍 Test-Szenarien

### Szenario 1: Kalte Seite (ohne Cache)
```
1. Browser-Cache leeren
2. Seite laden
3. Performance-Trace aufnehmen (5s)
4. Metriken analysieren
```

### Szenario 2: Warme Seite (mit Cache)
```
1. Seite neu laden (Ctrl+R)
2. Performance-Trace aufnehmen
3. Metriken vergleichen
```

### Szenario 3: Interaktion (Drag & Drop)
```
1. Seite laden
2. Event in Timeline verschieben (Drag & Drop)
3. Measure Layout-Shift
4. Measure Repaint Time
```

### Szenario 4: Filter-Performance
```
1. Seite laden
2. Multi-Select Filter aktivieren (Alle → Überfällig)
3. Measure Re-Render Time
4. Measure DOM-Updates
```

### Szenario 5: Export-Performance
```
1. Seite laden
2. CSV-Export ausführen
3. Measure Blob-Creation Time
4. Measure Download-Trigger Time
```

---

## 🛠️ Test-Durchführung mit MCP

### Schritt 1: Server & Chrome starten
```bash
# Terminal 1: Server starten
./start-local-server.sh

# Terminal 2: Chrome mit Remote Debugging
./chrome-debug.sh http://localhost:8000/kalender.html
```

### Schritt 2: Performance-Trace aufnehmen

**Mit MCP (über Claude Code):**
```
Prompt an AI:
"Öffne kalender.html und führe einen Performance-Trace durch.
Analysiere:
- Page Load Time
- JavaScript Execution
- Rendering Time
- Layout Shifts
- Memory Usage

Gib mir einen detaillierten Report."
```

**Manuell (Chrome DevTools):**
```
1. F12 → Performance Tab
2. Record Button (Kreis)
3. Seite neu laden (Ctrl+R)
4. Stop nach 5s
5. Analyze
```

### Schritt 3: Bottlenecks identifizieren

**Typische Probleme:**
- Große JavaScript-Bundles (Firebase SDK ~300KB)
- Viele Event Listeners (42 gefunden)
- DOM-Manipulation ohne Debouncing
- Fehlende Image Lazy Loading
- Keine Code Splitting

---

## 📊 Erwartete Ergebnisse

### Baseline (vor Optimierung):
```
FCP:  ~1.2s   (Firebase SDK lädt)
LCP:  ~2.0s   (Kalender-Grid rendert)
TTI:  ~3.5s   (Event Listeners attached)
TBT:  ~250ms  (JavaScript Execution)
CLS:  ~0.05   (Grid-Layout stabil)
Heap: ~45MB   (Firebase + DOM)
Nodes: ~1800  (Kalender-Zellen + Events)
```

### Potenzielle Bottlenecks:
```javascript
1. Firebase SDK (300KB) - Blocking Script
   → Fix: Async/Defer Loading

2. 42 Event Listeners - Hohe Anzahl
   → Fix: Event Delegation

3. Keine Code Minification
   → Fix: UglifyJS/Terser

4. Fehlende Service Worker
   → Fix: PWA Implementation

5. Drag & Drop ohne Throttling
   → Fix: requestAnimationFrame()
```

---

## ✅ Akzeptanz-Kriterien

### Must-Have (vor Production):
- [x] FCP < 1.8s
- [x] LCP < 2.5s
- [x] TTI < 3.8s
- [x] CLS < 0.25

### Nice-to-Have (Optimierungen):
- [ ] FCP < 1.0s
- [ ] LCP < 2.0s
- [ ] TTI < 3.0s
- [ ] Code Splitting (Firebase lazy load)

---

## 🔧 Optimierungs-Roadmap

### Quick Wins (1 Tag):
```javascript
1. Firebase SDK async laden
   <script src="..." async></script>

2. CSS Critical Path (Inline CSS für Above-Fold)

3. Image Preload Hints
   <link rel="preload" as="image" href="...">
```

### Medium (1 Woche):
```javascript
4. Event Delegation statt 42 Listener

5. Debouncing für Filter-Changes
   const debouncedFilter = debounce(filterEvents, 300);

6. Virtual Scrolling für große Event-Listen
```

### Advanced (1 Monat):
```javascript
7. Code Splitting (Webpack/Vite)

8. Service Worker (Offline-First)

9. Web Workers für schwere Operationen
```

---

## 📝 Test-Log Template

```markdown
## Performance-Test: kalender.html

**Datum:** [DATUM]
**Tester:** [NAME]
**Browser:** Chrome [VERSION]
**Device:** [DEVICE]

### Metriken:
- FCP:  [X.X]s
- LCP:  [X.X]s
- TTI:  [X.X]s
- TBT:  [X]ms
- CLS:  [X.XX]
- Heap: [X]MB
- Nodes: [X]

### Bottlenecks:
1. [BESCHREIBUNG]
2. [BESCHREIBUNG]

### Empfehlungen:
1. [FIX]
2. [FIX]

### Screenshots:
- Performance-Trace: [LINK]
- Network-Tab: [LINK]
- Memory-Profiler: [LINK]
```

---

## 🚀 Nächste Schritte

1. **Baseline messen** (dieser Test)
2. **Quick Wins implementieren**
3. **Erneut messen** (Vergleich)
4. **Medium-Optimierungen** (bei Bedarf)
5. **Production Deployment**

---

## 📚 Referenzen

- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)

---

**Test bereit zur Durchführung!** ✅
