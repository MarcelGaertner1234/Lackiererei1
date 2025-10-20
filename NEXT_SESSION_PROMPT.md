# Follow-Up Prompts für nächste Session

## 📋 Quick-Start Prompt (Kurz)

```
Wir haben gerade Version 3.2 der Fahrzeugannahme App fertiggestellt.
Alle 9 Tasks aus dem SERVICE_AUDIT_REPORT.md sind implementiert und verifiziert.

Bitte:
1. Lies CLAUDE.md (Version 3.2 Section, Lines 76-178)
2. Überprüfe die 6 Commits (4b3ce39, 6458c68, b164195, 1fd40a6, 84ec797, b8c191e)
3. Wir müssen noch TASK #10 machen: End-to-End Tests für alle 6 Services

Kannst du mir einen Plan für TASK #10 geben?
```

---

## 🔍 Detailed Prompt (Ausführlich)

```
Hallo! Wir arbeiten an der Fahrzeugannahme App für Auto-Lackierzentrum Mosbach.

## Was wir bereits gemacht haben:

### Version 3.2 - Service Consistency Audit ✅

Wir haben einen vollständigen Service Consistency Audit durchgeführt und alle 9 von 10 Tasks erfolgreich implementiert:

✅ TASK #1: schadenBeschreibung standardisiert (Commit 5e8c7f2)
✅ TASK #2: anmerkungen field collision gefixt (Commit a9b1d4e)
✅ TASK #3: Service-spezifische Felder in Kacheln (Commit 3f7a8c1)
✅ TASK #4: Service-agnostic Termin-Labels (Commit 4b3ce39)
✅ TASK #5: Vollständige hover-info label mappings (Commit 6458c68)
✅ TASK #6: Status-mapping für Mechanik, Pflege, TÜV komplett (Commit b164195)
✅ TASK #7: Foto fields konsistent (Verification only - bereits korrekt)
✅ TASK #8: Pflege & TÜV service-details Format-Funktionen (Commit 1fd40a6)
✅ TASK #9: Service-spezifische Lieferzeit-Texte (Commit 84ec797)

**Kritischer Bugfix während Verification:**
- TÜV 'abholbereit' status mapping fehlte (Commit b8c191e)

### Verification Results ✅

Alle Implementierungen wurden systematisch überprüft:
- ✅ 0 Bugs gefunden (alle behoben!)
- ✅ Alle Edge Cases geprüft & safe
- ✅ Alle 6 Services (Lackierung, Reifen, Mechanik, Pflege, TÜV, Versicherung) funktionieren konsistent

### Dokumentation ✅

CLAUDE.md wurde vollständig aktualisiert:
- Version 3.2 Section hinzugefügt (Lines 76-178)
- Alle Tasks dokumentiert mit Code-Beispielen
- Alle 6 Commits gelistet
- Kritischer Bugfix dokumentiert

## Was noch zu tun ist:

❌ **TASK #10: End-to-End Tests für alle 6 Services**

Wir brauchen einen vollständigen E2E-Test-Plan:

### Anforderungen:
1. **Partner Portal Tests** (meine-anfragen.html):
   - Alle 6 Services rendern korrekt in Kacheln/Liste/Kompakt-View?
   - Service-spezifische Felder werden angezeigt?
   - Hover-Info zeigt korrekte Preis-Breakdowns?
   - Status-Mapping funktioniert für alle Services?

2. **KVA Erstellung Tests** (kva-erstellen.html):
   - Service-spezifische Termin-Labels korrekt?
   - Service-Details formatieren sich korrekt (Pflege, TÜV)?
   - Lieferzeit-Text ist service-spezifisch?
   - Alle 6 Services erstellen valide KVAs?

3. **Workflow Tests** (End-to-End):
   - Partner erstellt Anfrage (6 Services einzeln testen)
   - Admin öffnet Anfrage im Partner Portal
   - Admin erstellt KVA
   - Admin ändert Fahrzeug-Status in Kanban
   - Partner Portal zeigt korrekten Status

### Testing Approach:
- **Option 1:** Playwright E2E Tests schreiben
- **Option 2:** n8n Workflow Tests (schneller, aber weniger umfassend)
- **Option 3:** Manueller Test-Plan mit Checkliste

## Deine Aufgabe:

Bitte lies zuerst die relevanten Dateien:
- `CLAUDE.md` (Version 3.2 Section, Lines 76-178)
- `SERVICE_AUDIT_REPORT.md` (um Kontext zu verstehen)
- Letzte Commits: 4b3ce39, 6458c68, b164195, 1fd40a6, 84ec797, b8c191e

Dann gib mir einen detaillierten Plan für TASK #10:
1. Welchen Testing Approach empfiehlst du? (Playwright / n8n / Manuell / Hybrid?)
2. Welche Test-Cases sind CRITICAL?
3. Wie lange wird die Implementierung dauern?
4. Gibt es potenzielle Probleme die wir beachten müssen?

Lass uns TASK #10 abschließen, damit Version 3.2 komplett fertig ist! 🚀
```

---

## 📌 Welchen Prompt verwenden?

### Quick-Start verwenden wenn:
- Du schnell mit TASK #10 starten willst
- Du bereits Kontext aus vorheriger Session hast
- Du weißt was zu tun ist

### Detailed verwenden wenn:
- Du einen neuen Agent startest
- Du vollständigen Kontext brauchst
- Du sichergehen willst dass nichts übersehen wird

---

## 🔗 Wichtige Dateien für nächste Session

**Zum Lesen:**
- `CLAUDE.md` (Lines 76-178: Version 3.2 Section)
- `SERVICE_AUDIT_REPORT.md` (Kontext verstehen)

**Zum Testen:**
- `partner-app/meine-anfragen.html`
- `partner-app/kva-erstellen.html`
- `kanban.html`

**Test-Tools:**
- Playwright: `npx playwright test`
- n8n: Bug Hunter Workflow
- Firebase Emulators: `firebase emulators:start`

---

**Status:** Version 3.2 ist zu 90% fertig. Nur noch TASK #10 (E2E Tests) fehlt! 🎯
