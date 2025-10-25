# 🛡️ n8n Safety Checklist - Phase 1

**Projekt:** Fahrzeugannahme-App Testing
**Workflow:** phase1-safe-readonly-test.json
**Sicherheitsstufe:** ✅ MAXIMUM SAFE (Read-Only)

---

## ✅ VOR DEM ERSTEN TEST

### Workflow-Konfiguration prüfen

- [ ] **Trigger:** Manuell (NICHT Webhook/Cron)
  - ✅ Bedeutet: DU entscheidest wann Test läuft
  - ❌ KEIN automatischer Trigger alle X Minuten

- [ ] **HTTP Requests:** Nur GET (NICHT POST/PUT/DELETE)
  - ✅ Bedeutet: Nur Lesen, kein Schreiben
  - ❌ KEINE Datenänderungen möglich

- [ ] **Firebase Nodes:** KEINE vorhanden
  - ✅ Bedeutet: Kein direkter Firebase-Zugriff
  - ❌ KEINE Firestore/Storage Operations

- [ ] **Email Empfänger:** gaertner-marcel@web.de
  - ✅ Bedeutet: Nur du bekommst Notifications
  - ❌ KEINE Kunden-Emails

---

## ✅ WÄHREND DES TESTS

### Was du sehen solltest (n8n UI)

**Normale Ausführung:**
```
[Manual Trigger] ✅ Executed
     ↓
[Test 1: Homepage] ✅ Status 200
     ↓
[Test 2: Annahme] ✅ Status 200
     ↓
[Test 3: Liste] ✅ Status 200
     ↓
[IF Check] ✅ True
     ↓
[Email Success] ✅ Sent
```

**Bei Fehler:**
```
[Manual Trigger] ✅ Executed
     ↓
[Test 1: Homepage] ❌ Status 404/500/Timeout
     ↓
[IF Check] ❌ False
     ↓
[Email Failure] ✅ Sent
```

### Was du NICHT sehen solltest

❌ **Rote Error Messages** über "Permission Denied"
❌ **Firebase Console** zeigt neue Einträge
❌ **Firestore Operations** in n8n Logs
❌ **DELETE/UPDATE Operations** irgendwo

---

## ✅ NACH DEM TEST

### Firebase Console Check (WICHTIG!)

1. **Öffne:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore
2. **Prüfe Collections:**
   - `fahrzeuge` → Anzahl Dokumente UNVERÄNDERT ✅
   - `kunden` → Anzahl Dokumente UNVERÄNDERT ✅
3. **Prüfe letzte Änderung:**
   - Timestamp sollte NICHT "gerade eben" sein
   - Sollte älter sein als Test-Zeitpunkt

### Email Check

- [ ] Email erhalten? (gaertner-marcel@web.de)
- [ ] Betreff korrekt? (Success ✅ oder Failure ❌)
- [ ] Alle 3 Tests aufgelistet?
- [ ] Sicherheitshinweis am Ende? ("Read-Only")

### n8n Execution History

1. **Öffne:** n8n → Executions Tab (links)
2. **Prüfe letzter Run:**
   - Status: Success ✅
   - Duration: < 30 Sekunden
   - Nodes: 7 executed

---

## 🚨 ALARM-SIGNALE (Sofort stoppen!)

### STOP wenn du siehst:

❌ **Firebase Console:**
  - Neue Dokumente in `fahrzeuge` oder `kunden`
  - Gelöschte Dokumente
  - Geänderte Timestamps "gerade eben"

❌ **n8n Workflow:**
  - Nodes mit Namen "Delete", "Update", "Write"
  - Firebase Credentials konfiguriert
  - POST/PUT/DELETE HTTP Methods

❌ **Email:**
  - Fehler "Permission Denied" (bedeutet: versuchte zu schreiben!)
  - Fehler "Firebase initialization failed"
  - Fehlende "Read-Only" Sicherheitshinweis

### SOFORT-MAẞNAHMEN:

1. **Stop Workflow:** n8n → "Deactivate" Toggle
2. **Screenshot:** Mach Screenshot vom Error
3. **Nicht weiter testen!** Warte auf Analyse
4. **Kontakt:** Sende Screenshot via Claude Code Session

---

## ✅ ERFOLGS-KRITERIEN (Bereit für Phase 2)

Du bist bereit für Phase 2 wenn:

- [ ] Test läuft 3x erfolgreich durch (alle grün ✅)
- [ ] Emails kommen korrekt an (3x erhalten)
- [ ] Firebase Console zeigt KEINE Änderungen (3x geprüft)
- [ ] Ausführungszeit konstant < 30 Sekunden
- [ ] Du verstehst was jeder Node macht

**Zeit bis Phase 2:** Mindestens 1-2 Tage Testing

---

## 📋 TEST-LOG (Ausfüllen!)

### Test Run #1
- **Datum:** ___________
- **Uhrzeit:** ___________
- **Ergebnis:** ☐ Success ☐ Failure
- **Email erhalten:** ☐ Ja ☐ Nein
- **Firebase unverändert:** ☐ Ja ☐ Nein
- **Notizen:** ______________________________

### Test Run #2
- **Datum:** ___________
- **Uhrzeit:** ___________
- **Ergebnis:** ☐ Success ☐ Failure
- **Email erhalten:** ☐ Ja ☐ Nein
- **Firebase unverändert:** ☐ Ja ☐ Nein
- **Notizen:** ______________________________

### Test Run #3
- **Datum:** ___________
- **Uhrzeit:** ___________
- **Ergebnis:** ☐ Success ☐ Failure
- **Email erhalten:** ☐ Ja ☐ Nein
- **Firebase unverändert:** ☐ Ja ☐ Nein
- **Notizen:** ______________________________

---

## 🎯 PHASE 2 VORBEREITUNG (Nur bei 3x Success!)

Wenn alle 3 Test Runs erfolgreich waren:

### Nächste Features (Phase 2):
1. ✅ Firebase Connection Test (READ-ONLY)
2. ✅ Firestore Document Count (READ-ONLY)
3. ✅ Prüfe ob firebase-config.js geladen

### WAS NICHT in Phase 2:
❌ Keine Write Operations
❌ Keine Delete Operations
❌ Keine Production-Daten ändern

---

## 📞 EMERGENCY CONTACT

**Bei Problemen oder Unsicherheit:**
- **STOP** den Workflow sofort
- **SCREENSHOT** vom Error/Problem
- **KONTAKT** via Claude Code Session
- **WARTE** auf Analyse (nicht selbst fixen!)

**Motto:** Lieber 1x zu viel fragen als 1x zu wenig! 🛡️

---

**Erstellt am:** 19. Oktober 2025
**Version:** 1.0 (Phase 1 Safety)
**Autor:** Claude Code
**Review:** Marcel Gärtner
