# Test Coverage Report & Empfehlungen

**Erstellt:** 2025-11-12 (nach /init Analyse)
**Ersteller:** Claude Code (Sonnet 4.5)
**Kontext:** Analyse der Testing-Infrastruktur im Rahmen von NEXT_AGENT_MANUAL_TESTING_PROMPT.md

---

## 📊 Executive Summary

**Current Test Status:**
- ✅ **23 Automated Tests** (10 Integration + 13 Smoke)
- ✅ **100% Success Rate** on primary browsers (Chromium, Mobile Chrome, Tablet iPad)
- ✅ **15x Performance Improvement** vs old UI E2E tests (<2s per test)
- ⚠️ **~40% Feature Coverage** (15+ Features ohne Tests)

**Key Finding:** Die Hybrid Testing Approach funktioniert perfekt für Core Features, aber die neuesten Features (Nov 2025) haben KEINE Tests.

---

## 🧪 Aktuelle Test-Infrastruktur

### Test-Typen & Organisation

**1. Integration Tests** (`tests/integration/`)
- **Datei:** `vehicle-integration.spec.js` (10 Tests)
- **Ansatz:** Bypass UI, teste Business Logic direkt via Firestore
- **Performance:** <1s pro Test
- **Coverage:** Vehicle Creation, Customer Registration, Status Updates, Multi-Tenant

**2. Smoke Tests** (`tests/smoke/`)
- **Datei:** `ui-smoke.spec.js` (13 Tests)
- **Ansatz:** UI Accessibility Checks (sichtbar, editierbar, klickbar)
- **Performance:** <2s pro Test
- **Coverage:** annahme.html, liste.html, kanban.html, kunden.html, index.html, Dark Mode

**3. Archivierte Tests** (`tests/archive/`)
- **Datei:** `01-vehicle-intake.spec.js` + README.md
- **Status:** ❌ Nicht funktionierend (17 Fehlversuche)
- **Grund:** UI Race Conditions mit Firebase async code

**4. Legacy Tests** (`tests/*.spec.js` - 11 Dateien)
- **Status:** ⚠️ Teilweise funktionierend, aber nicht Teil des "Hybrid Approach"
- **Problem:** Werden mit `npm test` ausgeführt, nicht mit `npm run test:all`

### Test Helpers

| Helper | Zweck | Lines of Code |
|--------|-------|---------------|
| `firebase-helper.js` | Firestore CRUD operations | ~450 |
| `form-helper.js` | UI form interactions | ~550 |
| `service-helper.js` | Service-specific data | ~650 |

### Test Scripts (package.json)

```json
"test": "playwright test",                    // ⚠️ Führt ALLE Tests aus (inkl. Legacy)
"test:integration": "playwright test tests/integration/",
"test:smoke": "playwright test tests/smoke/",
"test:all": "playwright test tests/integration/ tests/smoke/",  // ✅ RECOMMENDED
```

**⚠️ PROBLEM:** `npm test` vs `npm run test:all` Inkonsistenz!
- User's Anweisung sagt "23 Tests" → Das ist `test:all`
- `npm test` führt ALLE Tests aus (auch Legacy) → Mehr als 23 Tests!

---

## 🔴 Test Coverage Gaps (Prioritisiert)

### CRITICAL Priority (Sofort testen!)

#### 1. Rechnungs-System (Nov 11, 2025)
**Feature:**
- Auto-Rechnung bei Status → "Fertig"
- Counter-basierte Nummern-Generierung (RE-YYYY-MM-NNNN)
- Nested Transaction Fix (kanban.html)

**Warum CRITICAL:**
- Finanztransaktionen! Bugs hier = Datenverlust
- Counter-basierte Generierung muss atomar sein
- Nested Transaction Bug war schwer zu finden (2h Debugging)

**Empfohlene Tests:**
1. **Integration Test:** Auto-Rechnung Creation
   - Status → "Fertig" setzen
   - Verify Rechnung document created
   - Verify Counter incremented
   - Verify rechnung field in Fahrzeug

2. **Integration Test:** Counter Atomicity
   - Parallel: 10 Fahrzeuge gleichzeitig → "Fertig"
   - Verify: 10 Rechnungen mit unique Nummern
   - Verify: Counter = Start + 10

3. **Integration Test:** Nested Transaction Fix
   - Verify: No nested transactions in kanban.html
   - Verify: Data prepared BEFORE transaction

**Geschätzter Aufwand:** 4-6 Stunden

---

#### 2. Zeiterfassungs-System (Nov 7-8, 2025)
**Feature:**
- Employee Time Clock (Start/Pause/Finish)
- SOLL vs IST Hours Berechnung
- Admin Corrections Panel
- Self-Healing Calculations

**Warum CRITICAL:**
- Lohnabrechnung! Bugs hier = rechtliche Probleme
- Komplexe Berechnungslogik (SOLL vs IST vs Differenz)
- Self-Healing muss korrekt sein

**Empfohlene Tests:**
1. **Integration Test:** Time Tracking Workflow
   - Start work → Pause → Resume → Finish
   - Verify: calculatedHours korrekt
   - Verify: events[] array vollständig

2. **Integration Test:** SOLL vs IST Berechnung
   - Create Schicht (8h SOLL)
   - Track Zeit (7.5h IST)
   - Verify: Differenz = -0.5h (rot)

3. **Integration Test:** Self-Healing
   - Manually edit zeiterfassung document
   - Trigger recalculation
   - Verify: All hours recalculated correctly

4. **Integration Test:** Admin Corrections
   - Admin edits Start/End time
   - Verify: manuallyEdited flag set
   - Verify: PDF shows "*" marker

**Geschätzter Aufwand:** 6-8 Stunden

---

### HIGH Priority

#### 3. Material Photo-Upload System (Nov 12, 2025)
**Feature:**
- Firebase Storage Upload mit Path-Matching
- Photo List Refresh
- Request-Photo Association

**Warum HIGH:**
- Storage Rules ≠ Firestore Rules (häufiger Fehler!)
- Path-Matching muss exakt sein (403 sonst)
- CollectionReference vs String Type Error (häufig!)

**Empfohlene Tests:**
1. **Integration Test:** Photo Upload & Storage
   - Upload photo file
   - Verify: Storage path korrekt (material_photos/{requestId}/{timestamp}.jpg)
   - Verify: Firestore document updated (photoUrls array)

2. **Integration Test:** Path Matching
   - Upload mit falschen Path
   - Verify: Error message korrekt
   - Verify: Security Rules greifen

3. **Smoke Test:** Upload UI
   - Verify: Upload button visible
   - Verify: File input accessible

**Geschätzter Aufwand:** 3-4 Stunden

---

#### 4. Steuerberater-Dashboard (Nov 11, 2025)
**Feature:**
- 4 Dashboard-Seiten mit Chart.js
- Read-Only Security Rules
- CSV-Export

**Warum HIGH:**
- Read-Only Rules müssen funktionieren (Security!)
- Chart.js Integration kann fehlschlagen
- CSV-Export muss vollständige Daten enthalten

**Empfohlene Tests:**
1. **Integration Test:** Read-Only Access
   - Login als Steuerberater
   - Verify: Read access zu 4 Collections
   - Verify: Write access denied

2. **Smoke Test:** Dashboard Pages Load
   - steuerberater-bilanz.html
   - steuerberater-statistiken.html
   - steuerberater-kosten.html
   - steuerberater-export.html
   - Verify: All pages load, no 404

3. **Smoke Test:** Chart.js Initialization
   - Verify: Chart.js script loaded
   - Verify: Charts render (canvas elements exist)

**Geschätzter Aufwand:** 3-4 Stunden

---

#### 5. Ersatzteil-Bestellen Modal (Nov 12, 2025)
**Feature:**
- 11 Felder (Einzelpreis editable, Lieferant, Ankunft, Notizen)
- Filter-System (ETN, Benennung, Sortierung)

**Warum HIGH:**
- 11 Felder = viele potenzielle Fehler
- Filter-System muss korrekt arbeiten

**Empfohlene Tests:**
1. **Smoke Test:** Modal Visibility
   - Verify: Modal opens on "Bestellen" click
   - Verify: All 11 fields visible
   - Verify: Einzelpreis editable (not read-only)

2. **Smoke Test:** Filter-System
   - Type in ETN search field
   - Verify: Results filter live
   - Select sort option
   - Verify: Results re-order

**Geschätzter Aufwand:** 2-3 Stunden

---

### MEDIUM Priority

#### 6. PDF-Upload Auto-Fill (Nov 11, 2025)
**Feature:**
- PDF Text Extraction
- Auto-Fill Logic

**Empfohlene Tests:**
1. **Integration Test:** PDF Text Extraction
   - Upload PDF with known text
   - Verify: Text extracted correctly
   - Verify: Form fields auto-filled

**Geschätzter Aufwand:** 2-3 Stunden

---

#### 7. Preis-Berechtigung System (Nov 11, 2025)
**Feature:**
- Mitarbeiter-Level Permission (canSeePrice)
- Price Field Visibility Toggle

**Empfohlene Tests:**
1. **Integration Test:** Permission Check
   - Create Mitarbeiter mit canSeePrice=false
   - Verify: Price fields hidden in UI
   - Create Mitarbeiter mit canSeePrice=true
   - Verify: Price fields visible

**Geschätzter Aufwand:** 2 Stunden

---

#### 8. Bonus-System (Nov 5, 2025)
**Feature:**
- Monthly Reset Automation
- Bonus Calculation Logic

**Empfohlene Tests:**
1. **Integration Test:** Monthly Reset
   - Trigger reset function
   - Verify: Bonuses reset to 0
   - Verify: Auszahlungen logged

**Geschätzter Aufwand:** 2-3 Stunden

---

### LOW Priority

#### 9. Wissensdatenbank (Oct 2025)
**Feature:**
- Guidelines, Announcements, Shift Handovers
- Category Management

**Empfohlene Tests:**
1. **Smoke Test:** Wissensdatenbank Pages
   - Verify: Pages load
   - Verify: CRUD buttons visible

**Geschätzter Aufwand:** 2 Stunden

---

#### 10. Logo Branding System (Nov 10, 2025)
**Feature:**
- Dynamic Logo Loading auf 34 Seiten
- Settings Manager Auto-Init

**Empfohlene Tests:**
1. **Smoke Test:** Logo Visibility
   - Load 5 random pages
   - Verify: Logo container exists
   - Verify: Logo loads (or placeholder shows)

**Geschätzter Aufwand:** 1-2 Stunden

---

## 📋 Gesamte Test Coverage Roadmap

### Phase 1: CRITICAL Features (2-3 Wochen)
- [ ] Rechnungs-System Tests (4-6h)
- [ ] Zeiterfassungs-System Tests (6-8h)

**Total:** ~12-14 Stunden
**Priority:** Sofort beginnen (Finanzen + Lohnabrechnung!)

### Phase 2: HIGH Priority Features (1-2 Wochen)
- [ ] Material Photo-Upload Tests (3-4h)
- [ ] Steuerberater-Dashboard Tests (3-4h)
- [ ] Ersatzteil-Bestellen Modal Tests (2-3h)

**Total:** ~8-11 Stunden
**Priority:** Nach Phase 1

### Phase 3: MEDIUM Priority Features (1 Woche)
- [ ] PDF-Upload Auto-Fill Tests (2-3h)
- [ ] Preis-Berechtigung Tests (2h)
- [ ] Bonus-System Tests (2-3h)

**Total:** ~6-8 Stunden
**Priority:** Nice to have

### Phase 4: LOW Priority Features (Optional)
- [ ] Wissensdatenbank Tests (2h)
- [ ] Logo Branding Tests (1-2h)

**Total:** ~3-4 Stunden
**Priority:** Nur wenn Zeit übrig

---

## 🎯 Erwartete Test Coverage nach Roadmap

**Aktuell:** ~40% (23 Tests für ~15 Core Features)

**Nach Phase 1:** ~60% (+ 8 Tests für CRITICAL Features)
**Nach Phase 2:** ~75% (+ 10 Tests für HIGH Priority Features)
**Nach Phase 3:** ~85% (+ 8 Tests für MEDIUM Priority Features)
**Nach Phase 4:** ~90% (+ 5 Tests für LOW Priority Features)

**Total neue Tests:** ~31 Tests
**Neue Testsuite:** 54 Tests (23 current + 31 new)
**Geschätzter Gesamt-Aufwand:** 29-37 Stunden

---

## 🛠️ Test Implementation Guidelines

### Für Integration Tests:

**Template:**
```javascript
// tests/integration/{feature}-integration.spec.js
const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  // ... weitere helpers
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: {Feature Name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test data
  });

  test('INT-{N}.1: {Test Description}', async ({ page }) => {
    // Arrange: Setup test data
    // Act: Perform operation (bypass UI, use Firestore directly)
    // Assert: Verify results
  });
});
```

### Für Smoke Tests:

**Template:**
```javascript
// tests/smoke/{feature}-smoke.spec.js
const { test, expect } = require('@playwright/test');
const { waitForFirebaseReady } = require('../helpers/firebase-helper');

test.describe('SMOKE: {Feature Name} UI', () => {
  test('SMOKE-{N}.1: {Page} loads and elements visible', async ({ page }) => {
    await page.goto('/{page}.html');
    await waitForFirebaseReady(page);

    // Assert: Elements visible
    await expect(page.locator('#element')).toBeVisible();
  });
});
```

### Neue Helper Functions (Empfohlen):

**`tests/helpers/rechnung-helper.js`:**
```javascript
async function createRechnungDirectly(page, data) {
  // Direct Firestore write for Rechnung
}

async function verifyCounterIncremented(page, previousValue) {
  // Verify counter incremented by 1
}
```

**`tests/helpers/zeiterfassung-helper.js`:**
```javascript
async function startTimeTracking(page, mitarbeiterId) {
  // Direct Firestore write for zeiterfassung start
}

async function calculateExpectedHours(startTime, endTime, pauseDuration) {
  // Helper for SOLL/IST calculation verification
}
```

---

## 📚 Referenzen

**Siehe auch:**
- `NEXT_AGENT_MANUAL_TESTING_PROMPT.md` - QA Testing Guide (1,400 lines)
- `CLAUDE.md` (Lines 3536-3628) - Testing Guide & Test Coverage Status
- `tests/archive/README.md` - Warum alte UI E2E Tests archiviert wurden
- `tests/integration/vehicle-integration.spec.js` - Integration Test Template
- `tests/smoke/ui-smoke.spec.js` - Smoke Test Template

**Nützliche Patterns:**
- CLAUDE.md (Lines 520-1205) - 18 Error Patterns
- CLAUDE.md (Lines 1089-1232) - 12 Best Practices

---

## 🎉 Zusammenfassung

**Status Quo:**
- ✅ Hybrid Testing Approach funktioniert perfekt
- ✅ 100% Success Rate auf primären Browsern
- ⚠️ Nur ~40% Feature Coverage

**Empfehlung:**
1. **Sofort:** Phase 1 starten (Rechnungs-System + Zeiterfassungs-System Tests)
2. **Dann:** Phase 2 (Material Photo-Upload + Steuerberater + Ersatzteil)
3. **Optional:** Phase 3 + 4 (Nice to have)

**Erwartetes Ergebnis:**
- ~90% Test Coverage nach vollständiger Roadmap
- ~54 Tests total (23 current + 31 new)
- Robuste Testing-Infrastruktur für zukünftige Features

**Nächste Schritte:**
1. User diesen Report vorstellen
2. Feedback einholen (Priorisierung OK?)
3. Phase 1 Tests implementieren (12-14h)
4. Test Coverage in CLAUDE.md aktualisieren

---

_Erstellt: 2025-11-12 by Claude Code (Sonnet 4.5)_
_Version: 1.0_
_Basierend auf: NEXT_AGENT_MANUAL_TESTING_PROMPT.md + Codebase-Analyse_
