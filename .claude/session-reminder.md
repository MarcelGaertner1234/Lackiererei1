# Session Start Reminder

> Automatisch geladen bei jedem Session-Start
> Letzte Aktualisierung: 2025-12-11

---

## BEVOR DU IRGENDETWAS MACHST

### 1. Tests laufen lassen
```bash
npm run test:all  # MUSS 100% sein (56 Tests)
```

### 2. Dokumentation lesen
- `CLAUDE.md` - Architektur & Patterns
- `NEXT_AGENT_MANUAL_TESTING_PROMPT.md` - 52+ Error Patterns
- `.claude/rules/` - Modulare Wissensbasis

---

## DIE 5 KRITISCHSTEN PATTERNS

### Pattern 1: Multi-Tenant Collections
```javascript
// IMMER
const fahrzeuge = window.getCollection('fahrzeuge');  // → fahrzeuge_mosbach

// NIEMALS
const fahrzeuge = db.collection('fahrzeuge');  // → DATEN-LEAK!
```

### Pattern 2: Firebase Init Await
```javascript
await window.firebaseInitialized;
const werkstattId = window.werkstattId;
```

### Pattern 3: serviceTyp ist READ-ONLY
```javascript
// serviceTyp NIEMALS nach Erstellung überschreiben!
// Führt zu DATA LOSS im Kanban!
```

### Pattern 4: Type-Safe ID Comparisons
```javascript
const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
```

### Pattern 5: Listener Registry
```javascript
window.listenerRegistry?.cleanup();
const unsubscribe = db.collection(...).onSnapshot(...);
window.listenerRegistry?.add(unsubscribe);
```

---

## AKTUELLE BEKANNTE ISSUES

| Issue | Status | Workaround |
|-------|--------|------------|
| Firefox Tests | 69% | Chromium für Tests verwenden |
| Mobile Safari | 74% | iOS-spezifische Fixes pending |
| Radio Button Crash | Bekannt | `?.value \|\| 'default'` Pattern |

---

## NACH JEDEM FIX

Learning dokumentieren:
```bash
# Füge neues Learning hinzu
echo '{"date":"'$(date -Iseconds)'","type":"fix","file":"DATEI","pattern":"WAS_GELERNT","context":"KONTEXT"}' >> .claude/learnings.jsonl
```

---

## QUICK REFERENCE

| Befehl | Beschreibung |
|--------|--------------|
| `npm run test:all` | Alle 56 Tests (MUSS 100%) |
| `npm run test:headed` | Tests mit Browser UI |
| `npm run server` | Dev Server localhost:8000 |
| `firebase emulators:start` | Firestore Emulator |

---

_Dieses System lernt mit dir. Dokumentiere deine Learnings!_
