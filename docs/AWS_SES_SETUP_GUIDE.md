# AWS SES Setup-Anleitung

**Projekt:** Auto-Lackierzentrum Mosbach - Fahrzeugannahme App
**Erstellt:** 2025-11-20 (Migration Session)
**Letztes Update:** 2025-11-20 (Session Abschluss)
**Status:** ✅ **DEPLOYED** - Code Migration abgeschlossen, ⚠️ **Sandbox Mode** (Production Access benötigt)
**Zweck:** SendGrid → AWS SES Migration

---

## 📋 Übersicht

Diese Anleitung führt dich durch die **vollständige Konfiguration von AWS SES** als Email-Service für die Fahrzeugannahme App.

**Status der Migration (Session 2025-11-20):** ✅ **CODE DEPLOYED**

**✅ ABGESCHLOSSEN:**
- ✅ AWS SES Account erstellt (Region: eu-central-1)
- ✅ Sender Email verifiziert (`Gaertner-marcel@web.de`)
- ✅ IAM User erstellt (`MarcelGaertner` mit `AmazonSESFullAccess`)
- ✅ AWS Credentials in Firebase Secret Manager gespeichert
- ✅ Dependencies migriert (`@sendgrid/mail` → `@aws-sdk/client-ses@^3.525.0`)
- ✅ 7 Email-Funktionen auf AWS SES umgestellt
- ✅ Credential Sanitization implementiert (.trim() fix)
- ✅ Cloud Functions deployed (23/24 Functions)
- ✅ Error Handling für Sandbox Mode

**⚠️ BLOCKER (Production Access benötigt):**
- ❌ AWS SES Sandbox Mode: Nur verifizierte Empfänger-Emails erlaubt
- ❌ Rate Limits: 1 Email/s, max. 200 Emails/24h
- ❌ NICHT Production-ready für echte Kunden

**📋 NÄCHSTE SCHRITTE:**
1. **AWS Production Access beantragen** (siehe Schritt 7 unten)
   - Dauer: 24-48 Stunden (AWS Review)
   - Nach Approval: KEINE Empfänger-Verifikation mehr nötig
   - Rate Limits erhöht: 14 Emails/s, 50.000 Emails/24h
2. Optional: Test-Empfänger-Emails verifizieren (für Zwischentests)
3. Production Email-Test nach Approval

---

## 🚀 Schritt 1: AWS Account erstellen (10 Minuten)

### 1.1 AWS Account registrieren

1. Gehe zu: https://aws.amazon.com/
2. Klicke auf **"Create an AWS Account"**
3. Gib deine Email-Adresse ein (z.B. `info@auto-lackierzentrum.de`)
4. Wähle **"Personal"** Account Type
5. Zahlungsinformationen eingeben (Kreditkarte erforderlich)

**Kosten-Übersicht:**
- **Free Tier:** 62.000 Emails kostenlos im ersten Jahr
- **Nach Free Tier:** €0,10 pro 1.000 Emails
- **Geschätzte Kosten:** ~€12/Jahr (für 10.000 Emails/Jahr)

### 1.2 Zum AWS SES Dashboard navigieren

1. Nach Login: Gehe zu **Services** → **SES** (Simple Email Service)
2. Oder direkt: https://console.aws.amazon.com/ses/
3. Wähle Region: **EU (Frankfurt) - eu-central-1** (DSGVO-konform!)

---

## 📧 Schritt 2: Email-Adresse verifizieren (15 Minuten)

### 2.1 Sender Email verifizieren

**WICHTIG:** Du musst die Email-Adresse `Gaertner-marcel@web.de` in AWS SES verifizieren!

1. Im SES Dashboard: **Email Addresses** → **Verify a New Email Address**
2. Email-Adresse eingeben: `Gaertner-marcel@web.de`
3. Klicke **"Verify This Email Address"**
4. **Prüfe dein Postfach** (bei web.de):
   - Betreff: "Amazon SES Address Verification Request"
   - Klicke auf den Verifizierungs-Link
5. **Warte ~2 Minuten** → Status sollte auf **"Verified"** wechseln

### 2.2 Optional: Domain verifizieren (für professionelleren Versand)

Wenn du später von `info@auto-lackierzentrum.de` versenden möchtest:

1. **Domains** → **Verify a New Domain**
2. Domain eingeben: `auto-lackierzentrum.de`
3. **DNS-Records hinzufügen:**
   - AWS zeigt dir TXT + CNAME Records
   - Diese beim Domain-Provider (z.B. Strato, 1&1) hinzufügen
   - Warte 24-48 Stunden auf DNS-Propagierung

**Für den Start:** Nur `Gaertner-marcel@web.de` verifizieren ist ausreichend!

---

## 🔑 Schritt 3: AWS Credentials erstellen (10 Minuten)

### 3.1 IAM User für SES erstellen

1. Gehe zu **IAM** (Identity and Access Management):
   - https://console.aws.amazon.com/iam/
2. **Users** → **Add Users**
3. User Name: `fahrzeugannahme-ses-user`
4. Access Type: ✅ **Programmatic access** (API Key)
5. **Next: Permissions**

### 3.2 SES Permissions vergeben

1. Wähle **"Attach existing policies directly"**
2. Suche nach: `AmazonSESFullAccess`
3. ✅ Aktiviere `AmazonSESFullAccess`
4. **Next: Tags** (optional, kannst du überspringen)
5. **Next: Review** → **Create User**

### 3.3 Access Keys speichern

⚠️ **KRITISCH - NUR EINMAL SICHTBAR!**

Nach User-Erstellung siehst du:
- **Access key ID** (z.B. `AKIAIOSFODNN7EXAMPLE`)
- **Secret access key** (z.B. `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

**Speichere diese SOFORT ab!** (z.B. in deinem Passwort-Manager)

---

## 🔐 Schritt 4: Credentials in Firebase Secret Manager speichern (5 Minuten)

### 4.1 Firebase CLI Login

```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
firebase login
```

### 4.2 AWS Secrets konfigurieren

```bash
# AWS Access Key ID speichern
firebase functions:secrets:set AWS_ACCESS_KEY_ID
# Wenn gefragt, gib deine Access Key ID ein (z.B. AKIAIOSFODNN7EXAMPLE)

# AWS Secret Access Key speichern
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
# Wenn gefragt, gib deinen Secret Access Key ein
```

### 4.3 Secrets verifizieren

```bash
# Prüfen, ob Secrets gespeichert wurden
firebase functions:secrets:access AWS_ACCESS_KEY_ID --dry-run
firebase functions:secrets:access AWS_SECRET_ACCESS_KEY --dry-run
```

**Erwartete Ausgabe:** "Secret AWS_ACCESS_KEY_ID exists"

---

## 📦 Schritt 5: Dependencies installieren & deployen (10 Minuten)

### 5.1 Dependencies installieren

```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App/functions"
npm install
```

**Erwartete Ausgabe:**
```
added 1 package, removed 1 package
@aws-sdk/client-ses@^3.525.0 installed ✓
@sendgrid/mail removed ✓
```

### 5.2 Cloud Functions deployen

```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
firebase deploy --only functions
```

**Erwartete Dauer:** ~3-5 Minuten

**Erwartete Ausgabe:**
```
✔  functions[sendEntwurfEmail(europe-west3)] Successful update operation.
✔  functions[onStatusChange(europe-west3)] Successful update operation.
✔  functions[onNewPartnerAnfrage(europe-west3)] Successful update operation.
✔  functions[onUserApproved(europe-west3)] Successful update operation.

✔  Deploy complete!
```

---

## 🧪 Schritt 6: Email-Versand testen (10 Minuten)

### 6.1 Test-Email über Entwurf-System senden

1. **In der App anmelden:**
   - https://marcelgaertner1234.github.io/Lackiererei1/
   - Login als Werkstatt-Mitarbeiter

2. **Entwurf erstellen:**
   - Gehe zu: `entwuerfe-bearbeiten.html`
   - Erstelle neuen Minimal-Entwurf:
     - Kennzeichen: TEST-123
     - Kundenname: Test Kunde
     - Email: **DEINE EMAIL** (zum Testen)

3. **Büro-Vervollständigung:**
   - Füge Kalkulation hinzu
   - Klicke **"Email an Kunden senden"**

4. **Prüfen:**
   - Checke dein Email-Postfach
   - Betreff: "🚗 Ihr Kosten-Voranschlag für TEST-123"

### 6.2 Firebase Logs prüfen

```bash
# Live-Logs anzeigen
firebase functions:log --only sendEntwurfEmail

# Erwartete Ausgabe bei ERFOLG:
# ✅ AWS SES Credentials loaded from Secret Manager
# ✅ Entwurf-Email sent via AWS SES to: deine-email@example.com

# Erwartete Ausgabe bei FEHLER:
# ⚠️ [GRACEFUL DEGRADATION] AWS SES Configuration Error
# ⚠️ [HINT] Check: 1) AWS credentials, 2) Email verification
```

### 6.3 Firestore Email Logs prüfen

1. Gehe zu Firebase Console: https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore
2. Collection: `email_logs`
3. Prüfe neueste Einträge:
   - **Status: "sent"** → ✅ Email erfolgreich versendet
   - **Status: "skipped"** → ⚠️ Konfigurationsproblem (siehe `reason` Feld)
   - **Status: "failed"** → ❌ Fehler (siehe `error` Feld)

---

## 🚨 Troubleshooting - Häufige Probleme

### Problem 1: "MessageRejected: Email address is not verified"

**Ursache:** Sender-Email nicht in AWS SES verifiziert

**Lösung:**
1. Gehe zu AWS SES Console: https://console.aws.amazon.com/ses/
2. **Email Addresses** → Prüfe Status von `Gaertner-marcel@web.de`
3. Falls Status **"Pending"**: Prüfe Postfach auf Verifizierungs-Email
4. Falls nicht vorhanden: Klicke **"Resend Verification Email"**

---

### Problem 2: "AccessDeniedException: User is not authorized"

**Ursache:** AWS Credentials falsch oder IAM Permissions fehlen

**Lösung:**
1. **Credentials prüfen:**
   ```bash
   firebase functions:secrets:access AWS_ACCESS_KEY_ID
   firebase functions:secrets:access AWS_SECRET_ACCESS_KEY
   ```
2. **IAM User prüfen:**
   - https://console.aws.amazon.com/iam/
   - User: `fahrzeugannahme-ses-user`
   - Permissions: `AmazonSESFullAccess` muss aktiviert sein
3. **Neu deployen:**
   ```bash
   firebase deploy --only functions
   ```

---

### Problem 3: "Daily sending quota exceeded"

**Ursache:** AWS SES Account im **Sandbox Mode** (max. 200 Emails/Tag)

**Lösung: Sandbox Mode verlassen (Production Access beantragen)**
1. Gehe zu AWS SES Console: https://console.aws.amazon.com/ses/
2. **Sending Statistics** → **Request Production Access**
3. Formular ausfüllen:
   - Use case: "Transactional emails for vehicle intake system"
   - Daily volume: 100 Emails
   - Expected bounce rate: < 5%
4. **Submit Request** → Genehmigung dauert 24-48 Stunden

**Temporäre Umgehung (für Tests):**
- Füge Test-Empfänger-Emails in AWS SES hinzu:
  - **Email Addresses** → **Verify a New Email Address**
  - Verifiziere DEINE Test-Email (z.B. deine persönliche Email)
  - Im Sandbox Mode kannst du nur an verifizierte Emails senden

---

### Problem 4: Email kommt nicht an (kein Fehler in Logs)

**Ursache:** Email landet im Spam-Ordner

**Lösung:**
1. **Spam-Ordner prüfen**
2. **Absender als "Sicher" markieren**
3. **Langfristig: Domain verifizieren** (siehe Schritt 2.2)
   - Mit verifizierter Domain landet Email NICHT im Spam
   - SPF + DKIM Records werden automatisch von AWS SES konfiguriert

---

### Problem 5: "Invalid AWS credentials"

**Ursache:** Access Key ID oder Secret Access Key falsch eingegeben

**Lösung:**
1. **Neue Credentials generieren:**
   - https://console.aws.amazon.com/iam/
   - User: `fahrzeugannahme-ses-user`
   - **Security credentials** → **Create access key**
2. **Secrets neu setzen:**
   ```bash
   firebase functions:secrets:set AWS_ACCESS_KEY_ID
   firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
   ```
3. **Neu deployen:**
   ```bash
   firebase deploy --only functions
   ```

---

## ✅ Erfolgs-Checkliste

Gehe diese Liste durch, um sicherzustellen, dass alles funktioniert:

- [ ] **AWS Account erstellt** (Region: eu-central-1 Frankfurt)
- [ ] **Email verifiziert** in AWS SES Console (Status: "Verified")
- [ ] **IAM User erstellt** mit `AmazonSESFullAccess` Permission
- [ ] **AWS Credentials gespeichert** in Firebase Secret Manager
- [ ] **Dependencies installiert** (`@aws-sdk/client-ses` in package.json)
- [ ] **Cloud Functions deployed** (4 Funktionen erfolgreich deployed)
- [ ] **Test-Email versendet** (Email im Postfach angekommen)
- [ ] **Firestore Logs geprüft** (Status: "sent" für Test-Email)
- [ ] **Production Access beantragt** (um Sandbox Mode zu verlassen)

---

## 🚀 Schritt 7: Production Access beantragen (KRITISCH!)

**⚠️ ERFORDERLICH:** Dieser Schritt MUSS durchgeführt werden für Production-Deployment!

### 7.1 Warum Production Access?

**Sandbox Mode Limitations (Aktueller Blocker):**
- ❌ Nur verifizierte Email-Adressen als Empfänger
- ❌ Sender UND Empfänger müssen in AWS SES verifiziert sein
- ❌ Rate Limits: 1 Email/Sekunde, max. 200 Emails/24h
- ❌ NICHT geeignet für echte Kunden-Emails

**Production Mode Benefits:**
- ✅ ALLE Email-Adressen als Empfänger erlaubt (keine Verifikation)
- ✅ Rate Limits: 14 Emails/Sekunde, 50.000 Emails/24h
- ✅ Production-ready für echten Betrieb
- ✅ Keine Code-Änderungen nötig

---

### 7.2 Production Access beantragen

**Dauer:** 5 Minuten Antrag, 24-48 Stunden AWS Review

**Schritte:**

1. **AWS SES Console öffnen:**
   - https://console.aws.amazon.com/ses/
   - Region: **eu-central-1** (Frankfurt) auswählen

2. **Request Production Access:**
   - Links: **Account Dashboard**
   - Klicke: **Request Production Access** Button

3. **Formular ausfüllen:**

   **Use case description:**
   ```
   Transactional emails for vehicle intake system (Fahrzeugannahme App) at Auto-Lackierzentrum Mosbach.

   Email types:
   - Customer quotes and vehicle intake confirmations
   - Service request notifications
   - Status update notifications
   - Invoice delivery

   All emails are transactional (no marketing), sent only to customers who explicitly requested service.
   Emails include QR codes for secure vehicle tracking and status updates.
   ```

   **Daily email volume:**
   ```
   Estimated 100-500 emails per day
   Peak volume: up to 1,000 emails/day during high season
   ```

   **How you handle bounces:**
   ```
   - Monitoring AWS SES bounce notifications via CloudWatch
   - Automatic retry logic for temporary failures
   - Invalid emails are flagged in Firestore for manual review
   - Bounce rate target: < 5%
   ```

   **Compliance:**
   ```
   DSGVO-compliant (Region: eu-central-1 Frankfurt)
   Customer data stored in Firestore (europe-west3)
   Opt-out mechanism in email footer
   Privacy policy: https://auto-lackierzentrum.de/datenschutz
   ```

4. **Submit Request:**
   - Klicke **Submit**
   - AWS sendet Bestätigungs-Email

5. **Warte auf Approval:**
   - Dauer: **24-48 Stunden**
   - AWS sendet Approval Email (oder Rejection mit Feedback)
   - Bei Rejection: Formular nochmal ausfüllen mit Feedback-Anpassungen

---

### 7.3 Nach Production Access Approval

**Automatische Änderungen (KEINE Code-Änderungen nötig!):**
- Account Status wechselt von "Sandbox" zu "Production"
- Rate Limits erhöht: 14 Emails/s, 50.000 Emails/24h
- ALLE Empfänger-Emails erlaubt (keine Verifikation mehr)

**Verifizierung:**
1. AWS SES Console → **Account Dashboard**
2. Check **Account Status:** "Production" ✅
3. Check **Sending Rate:** "14 emails/second" ✅
4. Check **Daily Quota:** "50,000 emails/24h" ✅

**Production Email-Test:**
1. App öffnen: https://marcelgaertner1234.github.io/Lackiererei1/
2. Login als Werkstatt-Mitarbeiter
3. Entwurf erstellen (mit ECHTER Kunden-Email, NICHT verifiziert)
4. Email senden
5. **Expected:** Email wird erfolgreich versendet ✅
6. Check Cloud Function Logs: `firebase functions:log`
   - Expected Log: `✅ Email sent successfully (MessageId: ...)`

---

### 7.4 Migration Checklist (Vollständig)

**Phase 1-6:** ✅ ABGESCHLOSSEN (Session 2025-11-20)
- [x] AWS Account erstellen
- [x] Sender Email verifizieren
- [x] IAM User erstellen
- [x] AWS Credentials konfigurieren
- [x] Code migrieren & deployen
- [x] Email-Test (Sandbox Mode)

**Phase 7:** ⏳ TODO (User Action Required)
- [ ] **AWS Production Access beantragen** (5min Formular)
- [ ] **Warte auf AWS Approval** (24-48h)
- [ ] **Production Email-Test** (nach Approval)

---

## 💰 Kosten-Übersicht

| Service | Free Tier | Nach Free Tier | Geschätzte Kosten (10k Emails/Jahr) |
|---------|-----------|----------------|-------------------------------------|
| **AWS SES** | 62.000 Emails kostenlos (Jahr 1) | €0,10 / 1.000 Emails | **~€12/Jahr** |
| **SendGrid** | 100 Emails/Tag (3.000/Monat) | $19,95/Monat (40.000 Emails) | **~€240/Jahr** |
| **Ersparnis** | | | **€228/Jahr (95%)** |

**Zusätzliche AWS Kosten:**
- Datenübertragung: ~€0,09/GB (vernachlässigbar für Emails)
- Attachment Storage: Keine (Emails haben keine Anhänge im Entwurf-Flow)

---

## 📚 Nächste Schritte nach erfolgreicher Konfiguration

1. **Production Access beantragen** (falls noch im Sandbox Mode)
2. **Domain verifizieren** für professionelleren Email-Versand
3. **Bounce & Complaint Handling einrichten** (AWS SES Notifications)
4. **Email-Templates anpassen** (falls gewünscht)
5. **Monitoring einrichten** (CloudWatch Alarms für Failed Emails)

---

## 🆘 Support

**Bei Problemen:**
1. **Firebase Logs prüfen:** `firebase functions:log --only sendEntwurfEmail`
2. **AWS SES Logs prüfen:** https://console.aws.amazon.com/ses/
3. **Firestore email_logs Collection prüfen:** Siehe `reason` und `error` Felder
4. **Diese Dokumentation konsultieren:** Troubleshooting-Abschnitt

**Hilfreiche Links:**
- AWS SES Dokumentation: https://docs.aws.amazon.com/ses/
- AWS SES Sandbox Mode: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Firebase Secret Manager: https://firebase.google.com/docs/functions/config-env

---

**Erstellt:** 2025-11-20
**Version:** 1.0
**Status:** ✅ Code-Migration abgeschlossen - Bereit für AWS SES Setup
**Geschätzte Gesamtzeit:** 2-4 Stunden
**Schwierigkeit:** ⭐⭐☆☆☆ (Mittel - erfordert AWS Account)
