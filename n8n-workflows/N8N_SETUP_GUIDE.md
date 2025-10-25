# 📘 n8n Setup Guide - Phase 1 (Safe Read-Only Tests)

**Version:** 1.0
**Datum:** 19. Oktober 2025
**Sicherheitsstufe:** ✅ READ-ONLY (100% sicher)

---

## 🎯 WAS DIESER WORKFLOW MACHT

Dieser Workflow testet deine Fahrzeugannahme-App **OHNE irgendetwas zu ändern**:

✅ Öffnet 3 Webseiten (Homepage, Annahme, Liste)
✅ Prüft ob HTTP Status = 200 (OK)
✅ Sendet dir Email mit Ergebnis
❌ **KEINE** Daten werden geschrieben
❌ **KEINE** Daten werden gelöscht
❌ **KEINE** Firebase-Operationen

**Dauer:** ~10 Sekunden
**Email:** gaertner-marcel@web.de

---

## 📦 INSTALLATION

### Schritt 1: n8n öffnen

1. Gehe zu: https://marcelgaertner.app.n8n.cloud
2. Login mit deinem Account
3. Du siehst: "👋 Welcome Marcel!" Dashboard

### Schritt 2: Workflow importieren

1. Klicke oben rechts: **"Create Workflow"** Button (Orange)
2. Klicke auf **"⋯"** (3 Punkte) oben rechts
3. Wähle: **"Import from File"**
4. Wähle Datei: `phase1-safe-readonly-test.json`
5. Klicke: **"Import"**

**Erwartung:** Du siehst jetzt 7 Nodes verbunden:
```
[Manual Trigger] → [Test 1] → [Test 2] → [Test 3] → [IF] → [Email Success/Failure]
```

### Schritt 3: Email-Credentials konfigurieren

n8n sendet Emails über deinen n8n Cloud Account - **keine Extra-Config nötig!**

✅ Email sendet von: `noreply@n8n.cloud`
✅ Email geht an: `gaertner-marcel@web.de`
✅ Funktioniert sofort (n8n Cloud Feature)

---

## ▶️ ERSTEN TEST DURCHFÜHREN

### Schritt 1: Workflow aktivieren

1. Klicke oben rechts: **"Save"** Button (Orange)
2. Workflow Name: "Fahrzeugannahme - Safe Tests"
3. Klicke: **"Activate"** Toggle Switch

### Schritt 2: Manuell ausführen

1. Klicke auf den **"Manual Trigger"** Node (ganz links)
2. Klicke: **"Execute Workflow"** Button (oben rechts)
3. Warte ~10 Sekunden

### Schritt 3: Ergebnis prüfen

**In n8n:**
- ✅ Grüne Häkchen bei allen Nodes → SUCCESS
- ❌ Rote X bei einem Node → FAILURE

**In deinem Email-Postfach:**
- Check: gaertner-marcel@web.de
- Betreff: "✅ Fahrzeugannahme Tests - ERFOLGREICH"
- Oder: "❌ Fahrzeugannahme Tests - FEHLER"

---

## 📧 BEISPIEL EMAIL (Success)

```
Von: noreply@n8n.cloud
An: gaertner-marcel@web.de
Betreff: ✅ Fahrzeugannahme Tests - ERFOLGREICH

┌─────────────────────────────────┐
│ ✅ Phase 1 Tests - ERFOLGREICH  │
└─────────────────────────────────┘

Alle Read-Only Tests sind erfolgreich durchgelaufen!

✅ Test 1: Homepage
   Status: 200
   URL: https://marcelgaertner1234.github.io/Lackiererei1/

✅ Test 2: Annahme-Seite
   Status: 200
   URL: https://marcelgaertner1234.github.io/Lackiererei1/annahme.html

✅ Test 3: Liste-Seite
   Status: 200
   URL: https://marcelgaertner1234.github.io/Lackiererei1/liste.html

───────────────────────────────────
Zeitpunkt: 2025-10-19T11:30:00.000Z
n8n Workflow: Fahrzeugannahme - Safe Read-Only Tests (Phase 1)
Sicherheit: Dieser Test hat KEINE Daten geändert (Read-Only)
```

---

## 🔍 TROUBLESHOOTING

### Problem 1: Keine Email erhalten

**Check:**
1. Spam-Ordner prüfen (noreply@n8n.cloud könnte als Spam erkannt werden)
2. Email-Adresse korrekt? (gaertner-marcel@web.de)
3. n8n Workflow wirklich ausgeführt? (grüne Häkchen sichtbar?)

**Lösung:**
- Öffne den "Email: SUCCESS ✅" Node
- Klicke "Test Step"
- Prüfe ob Email ankommt

### Problem 2: Test schlägt fehl (HTTP 404)

**Mögliche Ursachen:**
- GitHub Pages ist down
- URL falsch geschrieben
- App wurde gelöscht

**Check:**
1. Öffne manuell: https://marcelgaertner1234.github.io/Lackiererei1/
2. Funktioniert die App im Browser? ✅
3. Falls nein: GitHub Pages Status prüfen

### Problem 3: n8n zeigt "Execution timed out"

**Lösung:**
1. Öffne "Test 1: App Homepage erreichbar" Node
2. Gehe zu "Options"
3. Erhöhe Timeout: 10000 → 30000 (30 Sekunden)
4. Speichern und erneut ausführen

---

## ✅ SICHERHEITS-CHECKLISTE

Bevor du weiter gehst zu Phase 2, prüfe:

- [ ] Workflow läuft erfolgreich durch (grüne Häkchen)
- [ ] Email kommt an (gaertner-marcel@web.de)
- [ ] Alle 3 Tests zeigen Status 200
- [ ] Firebase Console zeigt KEINE neuen Einträge (weil Read-Only!)
- [ ] Du hast den Workflow 2-3x getestet

**Wenn ALLE ✅ → Bereit für Phase 2!**

---

## 🚀 NÄCHSTE SCHRITTE

### Phase 2: Firebase Connection Test (Optional)

**Was hinzugefügt wird:**
- Firebase Firestore READ Operation
- Test ob Firebase-Config geladen ist
- Zähle Anzahl Fahrzeuge in Firestore
- Immer noch READ-ONLY!

**Wann:** Erst wenn Phase 1 mindestens 3x erfolgreich war

**Datei:** `phase2-firebase-readonly-test.json` (wird noch erstellt)

---

## 📞 SUPPORT

**Bei Problemen:**
1. Screenshot vom n8n Workflow (mit Fehlermeldung)
2. Email die du erhalten hast (oder nicht erhalten)
3. Sende an: Marcel (via Claude Code Session)

**Erwartete Antwortzeit:** Sofort (während Claude Session aktiv)

---

## 🎓 n8n RESSOURCEN

- **n8n Docs:** https://docs.n8n.io/
- **HTTP Request Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- **Email Send Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailsend/
- **Community:** https://community.n8n.io/

---

**Erstellt am:** 19. Oktober 2025
**Version:** 1.0 (Phase 1 - Safe Read-Only)
**Autor:** Claude Code
**Email Support:** gaertner-marcel@web.de
