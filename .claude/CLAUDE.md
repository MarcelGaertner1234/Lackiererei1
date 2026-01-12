# Meta-Learning System - Fahrzeugannahme App

> Dieses System sorgt dafür, dass kritisches Wissen NICHT verloren geht!
> Automatisch geladen bei jedem Session-Start.
> Inspiriert von Jürgen Schmidhubers Meta-Learning Konzept.

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│  SESSION START                                              │
│  → settings.json Hook lädt session-reminder.md              │
│  → Kritische Patterns werden angezeigt                      │
│  → Weltmodell-Referenz wird angezeigt                       │
├─────────────────────────────────────────────────────────────┤
│  WÄHREND DER ARBEIT                                         │
│  → UserPromptSubmit Hooks bei Keywords                      │
│  → Datei-spezifische Warnungen (kanban, tagesplanung, etc.) │
│  → Weltmodell-Queries für Kontext                           │
│  → Predictive Bug Detection vor Änderungen                  │
├─────────────────────────────────────────────────────────────┤
│  NACH EINEM FIX                                             │
│  → Learning dokumentieren mit add-learning.sh               │
│  → Session-Tracker protokolliert Arbeit                     │
│  → Wissen akkumuliert sich über Zeit                        │
├─────────────────────────────────────────────────────────────┤
│  WELTMODELL (Vorhersager)                                   │
│  → Strukturiertes Wissen über alle Dateien                  │
│  → Bug-Hotspots und Risiko-Levels                           │
│  → Pattern-Mapping pro Datei                                │
│  → Abhängigkeits-Graph                                      │
│  → Predictive Bug Detection                                 │
│  → Code Complexity Analysis                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Weltmodell Tools

### Basis-Queries
```bash
./.claude/world-model/query.sh summary          # Codebase-Übersicht
./.claude/world-model/query.sh hotspot          # Bug-Hotspots
./.claude/world-model/query.sh file <name>      # Datei-Info
./.claude/world-model/query.sh patterns <name>  # Patterns für Datei
./.claude/world-model/query.sh risk <name>      # Risiko-Analyse
./.claude/world-model/query.sh deps <name>      # Abhängigkeiten
./.claude/world-model/query.sh collection <name> # Collection-Nutzung
```

### Erweiterte Analysen
```bash
# Kontext für aktuelle Arbeit generieren
./.claude/world-model/context-generator.sh kanban.html
./.claude/world-model/context-generator.sh kanban.html --full

# Predictive Bug Detection
python3 ./.claude/world-model/predict-bugs.py kanban.html
python3 ./.claude/world-model/predict-bugs.py --scan-all

# Code Complexity Analysis
./.claude/world-model/analyze-complexity.sh kanban.html
./.claude/world-model/analyze-complexity.sh --all

# Learning-Analyse
python3 ./.claude/world-model/analyze-learnings.py --summary
python3 ./.claude/world-model/analyze-learnings.py --patterns
python3 ./.claude/world-model/analyze-learnings.py --recommendations

# Weltmodell aktualisieren
./.claude/world-model/update.sh --quick
./.claude/world-model/update.sh --full
```

### Session Tracking
```bash
./.claude/world-model/session-tracker.sh start   # Session starten
./.claude/world-model/session-tracker.sh log "Fixed bug"  # Action loggen
./.claude/world-model/session-tracker.sh end     # Session beenden
./.claude/world-model/session-tracker.sh history # Historie anzeigen
./.claude/world-model/session-tracker.sh stats   # Statistiken
```

---

## Quick Reference

### Top 3 Bug-Hotspots
| Datei | Risk | Bugs | Hauptproblem |
|-------|------|------|--------------|
| kanban.html | CRITICAL | 15 | serviceTyp überschreiben = DATA LOSS |
| tagesplanung.html | HIGH | 8 | Array bounds nicht geprüft |
| annahme.html | HIGH | 10 | querySelector null-checks |

### Kritische Patterns (Top 5)
1. **Multi-Tenant**: `window.getCollection('fahrzeuge')` - NIEMALS `db.collection()`!
2. **Firebase Init**: `await window.firebaseInitialized` vor allen Firebase-Ops
3. **serviceTyp READ-ONLY**: Nach Erstellung NIEMALS ändern (Data Loss!)
4. **Type-Safe IDs**: `String(v.id) === String(vehicleId)`
5. **Listener Registry**: Memory Leak Prevention mit `window.listenerRegistry`

### Testing
```bash
npm run test:all  # MUSS 100% sein vor Push!
```

### Weltmodell Status (2026-01-12)
39 Bugs in 9 Sessions behoben + Test-Cleanup in Session #10.
Tests: 453/453 (100% Pass Rate). System synchronisiert auf v3.4.
Letzte Änderungen: 12 nicht-existierende Seiten-Tests bereinigt.

---

## Modulare Rules

@.claude/rules/multi-tenant-patterns.md
@.claude/rules/firebase-patterns.md
@.claude/rules/common-gotchas.md
@.claude/rules/testing-requirements.md
@.claude/rules/service-types.md

---

## Learnings dokumentieren

Nach jedem Fix oder neuen Pattern:

```bash
./.claude/add-learning.sh "Pattern" "Kontext" "category" "files" "impact"

# Beispiel:
./.claude/add-learning.sh "Null-check bei Radio Buttons" "Crash ohne ?.value" "gotcha" "annahme.html" "high"
```

Categories: `multi-tenant`, `firebase`, `testing`, `gotcha`, `pattern`, `fix`, `feature`, `meta-learning`
Impact: `critical`, `high`, `medium`, `low`

---

## Hooks Übersicht

| Hook | Trigger | Aktion |
|------|---------|--------|
| SessionStart | Session-Start | Zeigt session-reminder.md + Weltmodell-Info |
| UserPromptSubmit | "test/deploy/push" | Test-Reminder |
| UserPromptSubmit | "firebase/firestore" | Multi-Tenant Reminder |
| UserPromptSubmit | "bug/fix/error" | Bug-Fix Reminder |
| UserPromptSubmit | "kanban" | CRITICAL Hotspot Warning |
| UserPromptSubmit | "tagesplanung" | HIGH Risk Warning |
| UserPromptSubmit | "annahme" | HIGH Risk Warning |
| UserPromptSubmit | "partner-app" | Partner-Auth Reminder |
| PreToolUse | Edit/Write | Pattern-Check Reminder |

---

## Verzeichnisstruktur

```
.claude/
├── CLAUDE.md              ← Diese Datei (Hauptreferenz)
├── settings.json          ← Hooks-Konfiguration
├── session-reminder.md    ← Session-Start Anzeige
├── learnings.jsonl        ← Akkumulierte Learnings
├── add-learning.sh        ← Helper-Script
├── rules/                 ← Modulare Wissensbasis
│   ├── multi-tenant-patterns.md
│   ├── firebase-patterns.md
│   ├── common-gotchas.md
│   ├── testing-requirements.md
│   └── service-types.md
├── sessions/              ← Session-History (NEU!)
│   └── session-history.jsonl
└── world-model/           ← Codebase-Weltmodell
    ├── file-map.json          ← Alle Dateien + ihre Funktion
    ├── dependencies.json      ← Abhängigkeits-Graph
    ├── hotspots.json          ← Bug-anfällige Dateien
    ├── patterns-by-file.json  ← Welche Patterns wo
    ├── query.sh               ← Query-Interface
    ├── update.sh              ← Auto-Update (NEU!)
    ├── analyze-complexity.sh  ← Complexity Analyzer (NEU!)
    ├── analyze-learnings.py   ← Learning Analyzer (NEU!)
    ├── predict-bugs.py        ← Bug Predictor (NEU!)
    ├── session-tracker.sh     ← Session Tracker (NEU!)
    └── context-generator.sh   ← Context Generator (NEU!)
```

---

## Hauptdokumentation

Für vollständige Architektur-Details:
- `/CLAUDE.md` - Root-Dokumentation
- `/NEXT_AGENT_MANUAL_TESTING_PROMPT.md` - 52+ Error Patterns

---

_Version: 3.4 (2026-01-12)_
_Meta-Learning System + Erweitertes Weltmodell_
_39 Bugs in 9 Sessions behoben + Test-Cleanup (Session #10)_
_453 Tests, 100% Pass Rate_
_Inspiriert von Jürgen Schmidhubers Meta-Learning Konzept_
