# Version 3.2 - Manuelle Test-Checkliste

**Version:** 3.2 (Service Consistency Audit)
**Datum:** _______________
**Tester:** _______________
**Browser:** ☐ Chrome  ☐ Safari  ☐ Firefox
**Environment:** ☐ Production (GitHub Pages)  ☐ Local (Emulator)

---

## 📊 Test-Übersicht

Dieser manuelle Test verifiziert die **UI/UX-Konsistenz** aller 6 Services über die komplette App.

**Getestete Features (TASK #1-#9):**
- ✅ TASK #1: schadenBeschreibung standardisiert
- ✅ TASK #2: anmerkungen → allgemeineNotizen (Feld-Kollision behoben)
- ✅ TASK #3: Service-spezifische Felder in Kacheln/Liste/Kompakt-View
- ✅ TASK #4: Service-agnostic Termin-Labels
- ✅ TASK #5: Vollständige hover-info label mappings
- ✅ TASK #6: Status-mapping für Mechanik, Pflege, TÜV komplett
- ✅ TASK #8: Pflege & TÜV service-details Format-Funktionen
- ✅ TASK #9: Service-spezifische Lieferzeit-Texte
- ✅ BUGFIX: TÜV 'abholbereit' status mapping fehlte

**Geschätzte Dauer:** 2-3 Stunden

---

## 1️⃣ Partner Portal - Kachel-View

**Test-URL:** `/partner-app/meine-anfragen.html` (View: Kacheln)

### Test 1.1: Service-Icons & Labels korrekt

Verifiziere dass ALLE 6 Services korrekte Icons & Labels haben:

| Service | Icon | Label | Status |
|---------|------|-------|--------|
| Lackierung | 🎨 | "Lackierung" | ☐ PASS  ☐ FAIL |
| Reifen | 🔧 | "Reifen" | ☐ PASS  ☐ FAIL |
| Mechanik | ⚙️ | "Mechanik" | ☐ PASS  ☐ FAIL |
| Pflege | ✨ | "Pflege" | ☐ PASS  ☐ FAIL |
| TÜV | 📋 | "TÜV" | ☐ PASS  ☐ FAIL |
| Versicherung | 🛡️ | "Versicherung" | ☐ PASS  ☐ FAIL |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 1.2: Service-spezifische Felder angezeigt (TASK #3)

Erstelle Test-Anfragen für ALLE 6 Services und prüfe ob service-spezifische Felder angezeigt werden:

**Lackierung:**
- ☐ Schadenbeschreibung angezeigt
- ☐ Lackierung-Details angezeigt (falls vorhanden)

**Reifen:**
- ☐ Reifengröße angezeigt
- ☐ Reifentyp angezeigt (Sommer/Winter/Ganzjahr)

**Mechanik:**
- ☐ Mechanik-Details angezeigt

**Pflege:**
- ☐ Pflege-Paket angezeigt (Innenreinigung, Lackaufbereitung, Versiegelung)

**TÜV:**
- ☐ TÜV-Art angezeigt (HU/AU/SP)
- ☐ Nächster TÜV-Termin angezeigt

**Versicherung:**
- ☐ Schadennummer angezeigt
- ☐ Versicherungs-Details angezeigt

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 1.3: Hover-Info zeigt Preis-Breakdown (TASK #5)

Hover über **vereinbarterPreis** in Anfrage-Kachel:

**Lackierung:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt
- ☐ Preise korrekt formatiert (z.B. "500,00 €")

**Reifen:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt

**Mechanik:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt

**Pflege:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt

**TÜV:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt

**Versicherung:**
- ☐ Tooltip erscheint
- ☐ KVA-Varianten mit Beschreibungen angezeigt

**Screenshot-Pfad (Tooltip):** _______________
**Notizen:** _______________

---

## 2️⃣ Partner Portal - Liste-View

**Test-URL:** `/partner-app/meine-anfragen.html` (View: Liste)

### Test 2.1: Service-Typ-Spalte zeigt korrekte Labels

Wechsle zu **Listen-Ansicht** und prüfe Service-Typ-Spalte:

| Anfrage-Kennzeichen | Service-Typ angezeigt | Korrekt? |
|---------------------|----------------------|----------|
| (Lackierung-Anfrage) | "Lackierung" 🎨 | ☐ PASS  ☐ FAIL |
| (Reifen-Anfrage) | "Reifen" 🔧 | ☐ PASS  ☐ FAIL |
| (Mechanik-Anfrage) | "Mechanik" ⚙️ | ☐ PASS  ☐ FAIL |
| (Pflege-Anfrage) | "Pflege" ✨ | ☐ PASS  ☐ FAIL |
| (TÜV-Anfrage) | "TÜV" 📋 | ☐ PASS  ☐ FAIL |
| (Versicherung-Anfrage) | "Versicherung" 🛡️ | ☐ PASS  ☐ FAIL |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 2.2: Service-Filter funktioniert

Teste **Service-Filter** Dropdown:

- ☐ Dropdown zeigt alle 7 Optionen: "Alle", "Lackierung", "Reifen", "Mechanik", "Pflege", "TÜV", "Versicherung"
- ☐ Filter "Lackierung": Nur Lackierung-Anfragen angezeigt
- ☐ Filter "Reifen": Nur Reifen-Anfragen angezeigt
- ☐ Filter "Mechanik": Nur Mechanik-Anfragen angezeigt
- ☐ Filter "Pflege": Nur Pflege-Anfragen angezeigt
- ☐ Filter "TÜV": Nur TÜV-Anfragen angezeigt
- ☐ Filter "Versicherung": Nur Versicherung-Anfragen angezeigt
- ☐ Filter "Alle": Alle Anfragen angezeigt

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

## 3️⃣ Partner Portal - Kompakt-View

**Test-URL:** `/partner-app/meine-anfragen.html` (View: Kompakt)

### Test 3.1: Service-Icons in Kompakt-View

Wechsle zu **Kompakt-Ansicht**:

- ☐ Lackierung: Icon 🎨 sichtbar
- ☐ Reifen: Icon 🔧 sichtbar
- ☐ Mechanik: Icon ⚙️ sichtbar
- ☐ Pflege: Icon ✨ sichtbar
- ☐ TÜV: Icon 📋 sichtbar
- ☐ Versicherung: Icon 🛡️ sichtbar

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

## 4️⃣ KVA Erstellung (Admin)

**Test-URL:** `/partner-app/kva-erstellen.html?anfrageId=XXX`

### Test 4.1: Termin-Labels sind service-agnostic (TASK #4)

Erstelle KVA für verschiedene Services und prüfe **Termin-Labels**:

**Lackierung:**
- ☐ Label: "Anliefertermin" oder "Termin" (NICHT "Lackiertermin")
- ☐ Label: "Fertigstellungstermin" oder "Abholtermin" (NICHT "Lack-Fertigstellung")

**Reifen:**
- ☐ Label: "Anliefertermin" (NICHT "Reifenwechsel-Termin")
- ☐ Label: "Fertigstellungstermin" (NICHT "Montage-Termin")

**Mechanik:**
- ☐ Label: "Anliefertermin" (NICHT "Reparatur-Termin")
- ☐ Label: "Fertigstellungstermin"

**Pflege:**
- ☐ Label: "Anliefertermin" (NICHT "Aufbereitungs-Termin")
- ☐ Label: "Fertigstellungstermin"

**TÜV:**
- ☐ Label: "Anliefertermin" (NICHT "Prüf-Termin")
- ☐ Label: "Fertigstellungstermin"

**Versicherung:**
- ☐ Label: "Anliefertermin" (NICHT "Gutachter-Termin")
- ☐ Label: "Fertigstellungstermin"

**CRITICAL:** Termin-Labels MÜSSEN service-agnostic sein!

**Screenshot-Pfad (Lackierung KVA):** _______________
**Screenshot-Pfad (Reifen KVA):** _______________
**Notizen:** _______________

---

### Test 4.2: Service-Details formatieren sich korrekt (TASK #8)

**Pflege-Details (Multi-Select):**

Erstelle KVA für **Pflege-Anfrage** mit mehreren ausgewählten Details:
- Innenreinigung
- Lackaufbereitung
- Versiegelung

Prüfe in KVA-Vorschau:
- ☐ Details werden als Liste angezeigt (nicht als komma-separierter String)
- ☐ Jedes Detail hat eigene Zeile oder Bullet-Point
- ☐ Formatierung ist lesbar (z.B. "• Innenreinigung • Lackaufbereitung • Versiegelung")

**Screenshot-Pfad:** _______________

**TÜV-Details (HU/AU):**

Erstelle KVA für **TÜV-Anfrage** mit HU+AU:

Prüfe in KVA-Vorschau:
- ☐ TÜV-Art wird korrekt angezeigt (z.B. "HU + AU")
- ☐ Formatierung ist lesbar (nicht "hu_au" sondern "HU + AU")

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 4.3: Lieferzeit-Texte sind service-spezifisch (TASK #9)

Erstelle KVAs für alle 6 Services und prüfe **Lieferzeit-Text**:

**Lackierung:**
- ☐ Text enthält "Lackierung" oder "Lack" (z.B. "Lackierung in 3-5 Werktagen")

**Reifen:**
- ☐ Text enthält "Reifen" oder "Montage" (z.B. "Reifenmontage in 1-2 Werktagen")

**Mechanik:**
- ☐ Text enthält "Reparatur" oder "Mechanik" (z.B. "Reparatur in 2-4 Werktagen")

**Pflege:**
- ☐ Text enthält "Aufbereitung" oder "Pflege" (z.B. "Aufbereitung in 1-2 Werktagen")

**TÜV:**
- ☐ Text enthält "Prüfung" oder "TÜV" (z.B. "Prüfung in 1 Werktag")

**Versicherung:**
- ☐ Text enthält "Begutachtung" oder "Reparatur" (z.B. "Begutachtung in 2-3 Werktagen")

**CRITICAL:** Lieferzeit-Texte MÜSSEN service-spezifisch sein!

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

## 5️⃣ Status-Mapping (Kanban → Partner Portal)

**Test-URLs:**
- Kanban (Admin): `/kanban.html`
- Partner Portal: `/partner-app/meine-anfragen.html`

### Test 5.1: Lackierung Status-Mapping

Erstelle Lackierungs-Fahrzeug und teste **ALLE Prozess-Schritte**:

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| vorbereitung | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| lackierung | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| trocknung | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| qualitaet | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 5.2: Mechanik Status-Mapping (TASK #6)

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| diagnose | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| reparatur | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| test | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| qualitaet | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 5.3: Pflege Status-Mapping (TASK #6)

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| reinigung | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| aufbereitung | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| versiegelung | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 5.4: TÜV Status-Mapping (TASK #6 + CRITICAL BUGFIX!)

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| vorbereitung | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| pruefung | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |
| **abholbereit** | **Auto anliefern** | ___________ | ☐ ✅  ☐ ❌ |

**CRITICAL:** Die letzte Zeile testet den **TÜV 'abholbereit' Bugfix (Commit b8c191e)**!

Vor dem Fix: 'abholbereit' → **Fallback zu 'Beauftragt'** ❌
Nach dem Fix: 'abholbereit' → **'Auto anliefern'** ✅

**Screenshot-Pfad (abholbereit Status):** _______________
**Notizen:** _______________

---

### Test 5.5: Reifen Status-Mapping

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| demontage | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| montage | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| wuchten | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 5.6: Versicherung Status-Mapping

| Kanban-Status (Admin) | Erwarteter Portal-Status | Tatsächlicher Portal-Status | Pass? |
|-----------------------|-------------------------|----------------------------|-------|
| angenommen | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| dokumentation | Beauftragt | ___________ | ☐ ✅  ☐ ❌ |
| kalkulation | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| freigabe | Qualitätskontrolle | ___________ | ☐ ✅  ☐ ❌ |
| reparatur | In Arbeit | ___________ | ☐ ✅  ☐ ❌ |
| bereit | Auto anliefern | ___________ | ☐ ✅  ☐ ❌ |

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

## 6️⃣ Edge Cases & Regressions

### Test 6.1: TASK #2 Regression-Check (anmerkungen → allgemeineNotizen)

Prüfe dass **KEINE Feld-Kollisionen** mehr existieren:

**Lackierung-Anfrage:**
- ☐ Feld "anmerkungen" existiert NICHT mehr (umbenannt zu "allgemeineNotizen")
- ☐ Service-spezifisches Feld "lackierung" (Details) funktioniert korrekt

**Reifen-Anfrage:**
- ☐ Feld "anmerkungen" existiert NICHT mehr
- ☐ Service-spezifisches Feld "reifen" funktioniert korrekt

**CRITICAL:** Vor dem Fix kollidierte "anmerkungen" mit service-spezifischen Feldern!

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

### Test 6.2: TASK #1 Regression-Check (schadenBeschreibung)

Prüfe dass **schadenBeschreibung** überall konsistent verwendet wird:

- ☐ Lackierung: Feld heißt "schadenBeschreibung" (nicht "schadensbeschreibung")
- ☐ Reifen: Feld heißt "schadenBeschreibung"
- ☐ Mechanik: Feld heißt "schadenBeschreibung"
- ☐ Pflege: Feld heißt "schadenBeschreibung"
- ☐ TÜV: Feld heißt "schadenBeschreibung"
- ☐ Versicherung: Feld heißt "schadenBeschreibung"

**CRITICAL:** Vor dem Fix gab es inkonsistente Schreibweisen (Camel-Case vs. Snake-Case)!

**Screenshot-Pfad:** _______________
**Notizen:** _______________

---

## 📊 Test-Zusammenfassung

### Statistik

- **Gesamte Tests:** _____ (Anzahl durchgeführter Tests)
- **PASS:** _____ ✅
- **FAIL:** _____ ❌
- **BLOCKED:** _____ ⏸️

### Kritische Bugs gefunden

| Bug-ID | Beschreibung | Severity | Service | Screenshot |
|--------|--------------|----------|---------|------------|
| BUG-01 | ___________ | ☐ CRITICAL  ☐ HIGH  ☐ MEDIUM | ___________ | ___________ |
| BUG-02 | ___________ | ☐ CRITICAL  ☐ HIGH  ☐ MEDIUM | ___________ | ___________ |
| BUG-03 | ___________ | ☐ CRITICAL  ☐ HIGH  ☐ MEDIUM | ___________ | ___________ |

### Empfehlung

☐ **Version 3.2 ist PRODUCTION-READY** ✅
☐ **Version 3.2 benötigt BUGFIXES** ⚠️
☐ **Version 3.2 benötigt MAJOR REWORK** ❌

### Tester-Signatur

**Name:** _______________
**Datum:** _______________
**Unterschrift:** _______________

---

## 📎 Anhang: Screenshot-Übersicht

Bitte alle Screenshots hier referenzieren:

1. `screenshot-001-kachel-view-alle-services.png` - Kachel-View mit allen 6 Services
2. `screenshot-002-hover-info-lackierung.png` - Hover-Info Tooltip (Lackierung)
3. `screenshot-003-liste-view-service-filter.png` - Listen-View mit Service-Filter
4. `screenshot-004-kva-termin-labels-lackierung.png` - KVA Termin-Labels (Lackierung)
5. `screenshot-005-kva-termin-labels-reifen.png` - KVA Termin-Labels (Reifen)
6. `screenshot-006-pflege-details-formatierung.png` - Pflege Multi-Select Details
7. `screenshot-007-tuev-details-formatierung.png` - TÜV HU/AU Details
8. `screenshot-008-status-mapping-mechanik.png` - Status-Mapping Mechanik
9. `screenshot-009-status-mapping-pflege.png` - Status-Mapping Pflege
10. `screenshot-010-status-mapping-tuev-abholbereit.png` - **CRITICAL: TÜV 'abholbereit' Bugfix**

---

**Ende der Checkliste**

🎯 **Ziel:** Vollständige manuelle Verifikation der Version 3.2 Service-Konsistenz über alle 6 Services!
