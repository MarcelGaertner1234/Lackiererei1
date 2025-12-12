# Testing Requirements

> NICHTS pushen ohne 100% Tests!

---

## Test Commands

```bash
# Alle Tests (PFLICHT vor Push)
npm run test:all          # 56 Tests (~90s) - MUSS 100%!

# Einzelne Kategorien
npm run test:integration  # 36 Firestore Tests
npm run test:smoke        # 13 UI Tests

# Debug-Modi
npm run test:headed       # Mit Browser UI
npm run test:debug        # Debug Mode

# Einzelne Datei
npx playwright test tests/integration/vehicle-integration.spec.js --workers=1

# Einzelner Test by Name
npx playwright test -g "should create vehicle" --workers=1
```

---

## Test-Suite Übersicht

| Kategorie | Anzahl | Beschreibung |
|-----------|--------|--------------|
| Integration | 43 | Direkte Firestore-Operationen |
| Smoke | 13 | UI-Accessibility |

---

## Browser Kompatibilität

| Browser | Pass Rate | Status |
|---------|-----------|--------|
| Chromium | 100% | Primary |
| Mobile Chrome | 100% | OK |
| iPad | 100% | OK |
| Firefox | 69% | Bekannte Issues |
| Mobile Safari | 74% | Bekannte Issues |

**Wichtig:** Immer Chromium für Tests verwenden!

---

## Test-Dateien

```
tests/
├── integration/
│   ├── vehicle-integration.spec.js
│   ├── multi-tenant.spec.js
│   ├── partner-workflow.spec.js
│   ├── werkstatt-workflow.spec.js
│   └── data-pipeline.spec.js
└── smoke/
    └── ui-smoke.spec.js
```

---

## Pre-Push Checklist

```bash
# 1. Tests laufen
npm run test:all  # MUSS 100% sein

# 2. Änderungen prüfen
git diff

# 3. Keine Secrets?
git diff --cached | grep -E "(password|secret|key|token)" && echo "WARNUNG: Mögliche Secrets!"

# 4. Commit
git add . && git commit -m "type: description" && git push
```

---

## Wenn Tests fehlschlagen

1. **Nicht pushen!**
2. Fehler analysieren
3. Fix implementieren
4. Tests erneut laufen
5. Erst bei 100% pushen

---

## Test-Umgebung

```bash
# Emulator starten (in separatem Terminal)
firebase emulators:start --only firestore,storage --project demo-test

# Emulator UI
http://localhost:4000

# Dev Server
npm run server  # localhost:8000
```

---

_Commit Types: feat, fix, docs, test, refactor_
