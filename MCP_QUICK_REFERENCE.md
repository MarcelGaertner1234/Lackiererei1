# ⚡ MCP Quick Reference

**Chrome DevTools MCP - Schnellübersicht**

---

## 🚀 Quick Start (3 Befehle)

```bash
# 1. Server starten (Terminal 1)
./start-local-server.sh

# 2. Chrome starten (Terminal 2)
./chrome-debug.sh

# 3. In Claude Code prompts (Terminal 3)
"Öffne kalender.html und analysiere Performance"
```

---

## 📝 Häufige Prompts

### Performance-Testing
```
"Performance-Trace für kalender.html:
- Metriken: FCP, LCP, TTI, TBT, CLS
- Bottlenecks identifizieren
- Quick Wins vorschlagen"
```

### Bug-Fixing
```
"Debugge kalender.html:
- Console-Errors finden
- JavaScript-Exceptions tracen
- Fix implementieren"
```

### Mobile-Testing
```
"Teste auf iPhone 15 Pro:
- Layout prüfen
- Touch-Events testen
- Screenshots erstellen"
```

### Memory-Profiling
```
"Memory-Leak Check (10min):
- Heap-Snapshots vergleichen
- Event-Listener prüfen
- Cleanup-Code vorschlagen"
```

### SEO-Audit
```
"Lighthouse SEO-Audit:
- Meta-Tags prüfen
- Structured Data validieren
- Quick Wins implementieren"
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 9222 belegt | `lsof -ti:9222 \| xargs kill -9` |
| Server läuft nicht | `./start-local-server.sh` (Terminal 1) |
| Chrome öffnet nicht | Chrome-Pfad in `chrome-debug.sh` prüfen |
| MCP nicht gefunden | `npm cache clean --force` |

---

## 📊 Performance-Zielwerte

| Metrik | Gut | OK | Schlecht |
|--------|-----|-------|----------|
| FCP | <1.0s | <1.8s | >1.8s |
| LCP | <2.0s | <2.5s | >2.5s |
| TTI | <3.0s | <3.8s | >3.8s |
| TBT | <200ms | <300ms | >300ms |
| CLS | <0.1 | <0.25 | >0.25 |

---

## 🔧 Nützliche Befehle

```bash
# Server-Status prüfen
lsof -i :8000

# Chrome-Debug-Status prüfen
lsof -i :9222

# Alle Chrome-Instanzen killen
pkill -9 "Google Chrome"

# Temp-Profile löschen
rm -rf /tmp/chrome-debug-profile

# Performance-Report generieren
./generate-performance-report.sh > report-$(date +%Y%m%d).md
```

---

## 📂 Wichtige Dateien

```
├── mcp-config.json              # MCP-Konfiguration
├── chrome-debug.sh              # Chrome mit Remote Debugging
├── start-local-server.sh        # Lokaler HTTP-Server
├── performance-test.md          # Test-Plan
├── MCP_SETUP.md                 # Vollständige Doku
└── MCP_QUICK_REFERENCE.md       # Diese Datei
```

---

## 🎯 Workflow-Beispiel

**Szenario:** kalender.html lädt langsam

```bash
# 1. Setup (einmalig)
Terminal 1: ./start-local-server.sh
Terminal 2: ./chrome-debug.sh

# 2. Claude fragen (Terminal 3 oder Claude UI)
"Performance-Trace für kalender.html.
Warum lädt sie so langsam?"

# 3. Claude antwortet
"Firebase SDK (300KB) blockiert.
Soll ich async laden implementieren?"

# 4. Bestätigen
"Ja, implementiere."

# 5. Claude fixt & testet
"✅ Fix implementiert.
FCP: 1.2s → 0.8s (-33%)
Soll ich committen?"

# 6. Commit
"Ja, commit mit Message:
'perf: Firebase SDK async laden'"

# ✅ Fertig!
```

**Zeit gespart:** ~30 Minuten (von 45min auf 15min)

---

## 💡 Pro-Tipps

1. **Zwei-Terminal-Setup:**
   - Terminal 1: Server (läuft permanent)
   - Terminal 2: Chrome (läuft permanent)
   - Terminal 3: Claude-Prompts

2. **Performance regelmäßig tracken:**
   - Täglich: Quick-Check (5min)
   - Wöchentlich: Full-Audit (30min)

3. **Git-Hook für Auto-Testing:**
   ```bash
   # .git/hooks/pre-commit
   ./performance-quick-check.sh || exit 1
   ```

4. **Metriken loggen:**
   ```bash
   # Excel/CSV mit Datum, Metriken, Score
   # Trendlinie zeigt Verbesserung
   ```

5. **Claude fragen statt googeln:**
   ```
   Statt: Google "how to fix CLS in calendar"
   Besser: "Kalender.html hat CLS 0.3. Fixe es."
   → Claude findet + fixt automatisch!
   ```

---

## 🎓 Lernressourcen (5min Read)

- [MCP Blog-Post](https://developer.chrome.com/blog/chrome-devtools-mcp) (original)
- [Web Vitals](https://web.dev/vitals/) (Performance-Metriken)
- [Performance-Budgets](https://web.dev/performance-budgets-101/) (Zielwerte)

---

**Letzte Aktualisierung:** 08.10.2025
**Version:** 1.0
