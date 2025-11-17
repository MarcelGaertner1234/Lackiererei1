# 🧪 ENTWURF-SYSTEM: End-to-End Test Plan

**Version:** 1.0
**Date:** 2025-11-17
**Status:** Ready for Manual Testing
**Implementation:** Phases 1-6 Complete (6/11)

---

## 📋 Overview

This document provides a comprehensive test plan for the **2-Stufen Fahrzeugannahme (Entwurf-System)** - a draft-based vehicle intake workflow.

**Workflow Summary:**
1. **Meister** creates draft quickly (minimal data)
2. **Büro** completes draft and sends offer email
3. **Customer** receives email, scans QR code, accepts/rejects offer
4. **Admins** receive real-time notifications

---

## ✅ Prerequisites

Before testing, ensure:

1. ✅ **Cloud Functions deployed** to Firebase (Phase 1)
   - `sendEntwurfEmail`
   - `sendEntwurfBestaetigtNotification`
   - `sendEntwurfAbgelehntNotification`
   - `ensurePartnerAccount`
   - `createPartnerAutoLoginToken`

2. ✅ **Firestore Rules updated** (Phase 2)
   - `partnerAnfragen_{werkstattId}` allows new fields

3. ✅ **Files deployed** to GitHub Pages:
   - `annahme.html` (Phase 3)
   - `index.html` (Phase 4)
   - `entwuerfe-bearbeiten.html` (Phase 5)
   - `partner-app/meine-anfragen.html` (Phase 6)

4. ✅ **Test accounts created:**
   - Werkstatt Admin/Meister (for annahme.html)
   - Werkstatt Büro (for entwuerfe-bearbeiten.html)
   - Test customer email (for Partner Portal)

5. ✅ **SendGrid Email configured:**
   - API Key stored in Google Cloud Secret Manager
   - Sender email verified

---

## 🧪 Test Cases

### **TEST 1: Draft Creation (Meister)**

**Page:** `annahme.html`
**User:** Werkstatt Meister
**Estimated Time:** 2 minutes

#### Steps:
1. Login as Meister
2. Navigate to "Fahrzeug-Annahme" (annahme.html)
3. Fill MINIMUM required fields:
   - Kennzeichen: `TEST-DRAFT-001`
   - Kundenname: `Max Testmann`
   - Kunden-Email: `your-test-email@example.com`
4. Click **"Als Entwurf speichern"** button (yellow)
5. Observe toast notification
6. Wait for redirect to liste.html

#### Expected Results:
✅ Toast: "Entwurf gespeichert! Sie können ihn später vervollständigen."
✅ Redirect to `liste.html` after 1.5 seconds
✅ Firestore document created in `partnerAnfragen_mosbach`:
   - `id`: timestamp-based
   - `kennzeichen`: "TEST-DRAFT-001"
   - `kundenname`: "Max Testmann"
   - `kundenEmail`: "your-test-email@example.com" (lowercase)
   - `isEntwurf`: true
   - `entwurfStatus`: "offen"
   - `status`: "warte_kva"
   - `werkstattId`: "mosbach"
   - `createdAt`: ISO timestamp
   - `createdBy`: Meister name

#### Edge Cases to Test:
- ❌ **Missing Kennzeichen:** Toast error "Mindestens Kennzeichen, Kunde und Email erforderlich!"
- ❌ **Invalid Email:** Toast error "Ungültiges Email-Format!"
- ❌ **Firebase offline:** Toast error "Firebase nicht initialisiert"

---

### **TEST 2: Badge Update on Dashboard**

**Page:** `index.html`
**User:** Werkstatt Büro
**Estimated Time:** 1 minute

#### Steps:
1. Login as Büro
2. Navigate to Dashboard (index.html)
3. Locate "Entwürfe" quick-link in "Fahrzeug-Management" card
4. Verify badge count

#### Expected Results:
✅ Badge visible with count = 1 (from TEST 1)
✅ Badge background: `#ffc107` (warning yellow)
✅ Badge text: "1"
✅ Badge position: Top-right corner of "Entwürfe" link

#### Edge Cases:
- **No drafts:** Badge hidden (`display: none`)
- **Multiple drafts:** Badge shows correct count (e.g., "5")

---

### **TEST 3: Draft Selection and Completion**

**Page:** `entwuerfe-bearbeiten.html`
**User:** Werkstatt Büro
**Estimated Time:** 5 minutes

#### Steps:
1. Navigate to "Entwürfe Bearbeiten" (entwuerfe-bearbeiten.html)
2. Verify dropdown contains draft from TEST 1
3. Select draft: "TEST-DRAFT-001 - Max Testmann"
4. Verify form pre-fills with draft data
5. Complete REQUIRED fields:
   - Marke: "VW"
   - Modell: "Golf"
   - Notizen: "Lackierung Stoßstange vorne"
   - Vereinbarter Preis: "450"
   - Voraussichtliches Fertigstellungsdatum: `2025-12-01`
6. Click **"Entwurf aktualisieren"** (optional - intermediate save)
7. Observe button change: "💾 Gespeichert!" → "Entwurf aktualisieren"

#### Expected Results (Intermediate Save):
✅ Toast: "Entwurf aktualisiert"
✅ Firestore updated with new fields
✅ Button changes: "💾 Gespeichert!" (green checkmark) → back to original text after 2s

#### Edge Cases:
- **No drafts:** Empty state shown ("Keine offenen Entwürfe")
- **Dropdown disabled:** Cannot select if no drafts available

---

### **TEST 4: Offer Creation and Email Sending**

**Page:** `entwuerfe-bearbeiten.html`
**User:** Werkstatt Büro
**Estimated Time:** 10 minutes

#### Steps (continuation of TEST 3):
1. After completing all required fields, click **"Angebot erstellen & versenden"**
2. Observe button change: "⏳ Wird versendet..." → "✅ Versendet!"
3. Observe success message
4. Wait for redirect to liste.html (2 seconds)
5. Check customer's email inbox for offer email
6. Verify email content

#### Expected Results:

**Button States:**
- Initial: "Angebot erstellen & versenden"
- Loading: "⏳ Wird versendet..."
- Success: "✅ Versendet!"

**Success Toast:**
✅ "Angebot erfolgreich versendet!"

**Redirect:**
✅ Redirects to `liste.html` after 2 seconds

**Firestore Updates:**
✅ `partnerAnfragen_mosbach/{docId}` updated:
   - `entwurfStatus`: "angebot_erstellt"
   - `status`: "kva_gesendet"
   - `angebotDetails`: { preis, serviceBeschreibung, fertigstellungsdatum, erstelltAm, erstelltVon }
   - `angebotErstelltAm`: ISO timestamp
   - `updatedAt`: ISO timestamp

**Email Received:**
✅ Subject: "🚗 Ihr Kosten-Voranschlag für TEST-DRAFT-001"
✅ From: Your configured SendGrid sender
✅ To: `your-test-email@example.com`
✅ Content:
   - Customer name: "Max Testmann"
   - Vehicle: "TEST-DRAFT-001"
   - QR Code image embedded
   - "Angebot ansehen" button with auto-login URL
   - Professional HTML formatting

**QR Code:**
✅ QR code encodes: `https://marcelgaertner1234.github.io/Lackiererei1/partner-app/auto-login.html?token={32-char-token}`
✅ Token stored in `partnerAutoLoginTokens` collection:
   - `partnerId`: partner ID
   - `werkstattId`: "mosbach"
   - `expiresAt`: 30 days from now
   - `usedCount`: 0
   - `maxUses`: 10

#### Edge Cases:
- ❌ **Missing required fields:** Toast error "Bitte füllen Sie das Feld 'XXX' aus!"
- ❌ **Invalid email:** Toast error "Ungültige Email-Adresse!"
- ❌ **Cloud Function fails:** Toast error with message
- ❌ **Network error:** Button reverts to "Angebot erstellen & versenden"

---

### **TEST 5: Customer Auto-Login via QR Code**

**Page:** `partner-app/auto-login.html`
**User:** Customer (Partner)
**Estimated Time:** 3 minutes

#### Steps:
1. From email, click "Angebot ansehen" button OR scan QR code
2. Observe auto-login page loading states
3. Wait for redirect to Partner Portal

#### Expected Results:

**Loading State:**
✅ Shows: "🔐 Authentifizierung läuft... Einen Moment bitte, wir melden Sie automatisch an."
✅ Spinner animation visible

**Success State:**
✅ Shows: "✅ Anmeldung erfolgreich! Sie werden weitergeleitet..."

**Redirect:**
✅ Redirects to `partner-app/meine-anfragen.html` after 1.5 seconds

**Console Logs:**
```
✅ Firebase initialisiert
📡 Calling validatePartnerAutoLoginToken...
✅ Token validiert: Token is valid
   → Partner ID: {partnerId}
   → Werkstatt ID: mosbach
🔑 Signing in with custom token...
✅ Erfolgreich angemeldet als: {uid}
💾 Partner-Daten in localStorage gespeichert
✅ [AUTO-LOGIN] window.werkstattId gesetzt: mosbach
✅ Kein Passwort-Reset erforderlich - fahre fort mit Redirect
🚗 Redirect zu Fahrzeug: {fahrzeugId}
```

**LocalStorage:**
✅ `partner` object stored:
   - `id`: partner ID
   - `partnerId`: partner ID
   - `werkstattId`: "mosbach"
   - `email`: customer email

#### Edge Cases:
- ❌ **Invalid token:** Error: "Ungültiger QR-Code oder fehlender Token"
- ❌ **Expired token (30 days):** Error: "QR-Code ist abgelaufen (30 Tage)"
- ❌ **Token used 10+ times:** Error: "QR-Code wurde zu oft verwendet"
- ❌ **Network error:** Error: "Ein unbekannter Fehler ist aufgetreten"

---

### **TEST 6: Customer Views and Accepts Offer**

**Page:** `partner-app/meine-anfragen.html`
**User:** Customer (Partner)
**Estimated Time:** 5 minutes

#### Steps:
1. After auto-login, verify draft offer is visible
2. Locate offer card with:
   - Kennzeichen: "TEST-DRAFT-001"
   - Status badge: "Angebot erstellt" (yellow)
   - Service: Depends on serviceTyp from draft
   - Price: "450,00 €"
3. Click **"✅ Annehmen"** button
4. Confirm in popup dialog
5. Observe button state changes
6. Verify success toast
7. Wait for page reload

#### Expected Results:

**Offer Card Display:**
✅ Card visible in "Anfragen" section
✅ Status badge: "Angebot erstellt" (background: `#ffc107`)
✅ Price displayed: "450,00 €"
✅ Two buttons visible:
   - "✅ Annehmen" (green)
   - "❌ Ablehnen" (red)

**Confirmation Dialog:**
✅ Shows:
```
Möchten Sie dieses Angebot annehmen?

Auftragsnummer: TEST-DRAFT-001
Service: {serviceLabel}
Anliefertermin: {date}
Preis: 450.00 €
```

**Button States:**
- Initial: "✅ Annehmen"
- Disabled + Loading: "⏳ Wird beauftragt..."
- Success: "✅ Annehmen" (re-enabled after reload)

**Success Toast:**
✅ "Angebot erfolgreich angenommen! Fahrzeug-ID: {id} Status: Terminiert Das Fahrzeug wurde in den Produktionsprozess übernommen."

**Firestore Updates:**
✅ `partnerAnfragen_mosbach/{docId}` updated:
   - `status`: "beauftragt"
   - `statusText`: "Beauftragt"
   - `entwurfStatus`: "bestaetigt" (NEW)
   - `beauftragtAm`: ISO timestamp
   - `beauftragtVon`: customer email
   - `fahrzeugAngelegt`: true
   - `fahrzeugAngelegtAm`: ISO timestamp
   - `fahrzeugId`: vehicle ID
   - `fahrzeugKennzeichen`: "TEST-DRAFT-001"

✅ `fahrzeuge_mosbach/{id}` created:
   - Full vehicle document with all data from draft
   - `prozessStatus`: Status matching serviceTyp
   - `kennzeichen`: "TEST-DRAFT-001"
   - `serviceTyp`: from draft

✅ `kunden_mosbach/{id}` created/updated:
   - Customer registration
   - Visit count incremented if returning customer

**Cloud Function Call:**
✅ `sendEntwurfBestaetigtNotification` triggered:
   - Sends notifications to all active admins/meisters
   - Collection: `mitarbeiterNotifications_mosbach`
   - Title: "✅ Kunde hat Angebot bestätigt!"
   - Message: "Max Testmann (TEST-DRAFT-001) hat das Angebot akzeptiert."
   - Priority: "high"

**Page Reload:**
✅ Page reloads (`loadAnfragen()` called)
✅ Offer card now shows status: "Beauftragt" (green badge)
✅ Buttons removed (order already accepted)

#### Edge Cases:
- ❌ **No anliefertermin:** Toast: "Kein Anliefertermin vorhanden"
- ❌ **Anliefertermin in past:** Toast: "Der Anliefertermin liegt in der Vergangenheit"
- ❌ **Double-click protection:** Second click ignored (button disabled)
- ❌ **Status changed by another user:** Transaction fails with error message

---

### **TEST 7: Customer Rejects Offer**

**Page:** `partner-app/meine-anfragen.html`
**User:** Customer (Partner)
**Estimated Time:** 3 minutes

#### Steps:
1. Repeat TEST 1-5 to create a NEW draft (use `TEST-DRAFT-002`)
2. In Partner Portal, locate offer
3. Click **"❌ Ablehnen"** button
4. Enter rejection reason: "Preis zu hoch"
5. Confirm in dialog
6. Verify success toast
7. Wait for page reload

#### Expected Results:

**Prompt Dialog:**
✅ Shows: "Grund für Ablehnung (optional):" with text input

**Confirmation Dialog:**
✅ Shows:
```
Möchten Sie dieses Angebot wirklich ablehnen?

Auftragsnummer: TEST-DRAFT-002
Service: {serviceLabel}

Grund: Preis zu hoch

Die Werkstatt wird über die Ablehnung informiert.
```

**Firestore Updates:**
✅ `partnerAnfragen_mosbach/{docId}` updated:
   - `status`: "storniert" (not "neu" for drafts!)
   - `statusText`: "Storniert"
   - `entwurfStatus`: "abgelehnt" (NEW)
   - `kvaAbgelehnt`: true
   - `ablehnungsGrund`: "Preis zu hoch"
   - `abgelehntAm`: ISO timestamp
   - `abgelehntVon`: customer email

**Cloud Function Call:**
✅ `sendEntwurfAbgelehntNotification` triggered:
   - Collection: `mitarbeiterNotifications_mosbach`
   - Title: "⚠️ Kunde hat Angebot abgelehnt"
   - Message: "Max Testmann (TEST-DRAFT-002) hat das Angebot abgelehnt. Grund: Preis zu hoch"
   - Priority: "high"

**Success Toast:**
✅ "Angebot abgelehnt. Die Werkstatt wird benachrichtigt und kann ein neues Angebot erstellen."

**Page Reload:**
✅ Offer card hidden (status = "storniert" filtered out)

#### Edge Cases:
- **No reason entered:** Uses "Keine Angabe" as default
- **Cancel at prompt:** No action taken
- **Cancel at confirmation:** No action taken

---

### **TEST 8: Admin Receives Real-Time Notifications**

**Page:** Any werkstatt page (e.g., `index.html`, `liste.html`)
**User:** Werkstatt Admin/Meister
**Estimated Time:** 2 minutes

#### Steps (run DURING TEST 6 or TEST 7):
1. Login as Admin/Meister
2. Open any werkstatt page in SEPARATE browser window
3. Keep page open while customer accepts/rejects offer
4. Observe notification toast appearing

#### Expected Results (Acceptance):

**Toast Notification:**
✅ Appears in top-right corner
✅ Icon: "🚨" (if priority=urgent) or "⚠️" (if priority=high)
✅ Title: "✅ Kunde hat Angebot bestätigt!"
✅ Message: "Max Testmann (TEST-DRAFT-001) hat das Angebot akzeptiert."
✅ Timestamp: "Gerade eben" or "vor X Minuten"
✅ Close button (×) visible

**Speech Output (if priority=high/urgent):**
✅ AI Agent speaks notification text (if enabled)

**Auto-Hide:**
✅ Toast disappears after 10 seconds (20s for urgent)

**Firestore Document:**
✅ `mitarbeiterNotifications_mosbach/{id}` created:
   - `mitarbeiterId`: admin ID
   - `title`: "✅ Kunde hat Angebot bestätigt!"
   - `message`: "Max Testmann (TEST-DRAFT-001) hat das Angebot akzeptiert."
   - `type`: "success"
   - `status`: "unread"
   - `priority`: "high"
   - `createdAt`: Firestore timestamp

#### Expected Results (Rejection):

**Toast Notification:**
✅ Icon: "⚠️"
✅ Title: "⚠️ Kunde hat Angebot abgelehnt"
✅ Message: "Max Testmann (TEST-DRAFT-002) hat das Angebot abgelehnt. Grund: Preis zu hoch"

**Firestore Document:**
✅ `mitarbeiterNotifications_mosbach/{id}` created with `type: "warning"`

#### Edge Cases:
- **Multiple admins:** Each admin gets separate notification
- **Admin offline:** Notification stored, shown when they login
- **Notification clicked:** Marked as read, removed from unread list
- **No AI Agent:** No speech output (silent failure)

---

### **TEST 9: Badge Count Decreases**

**Page:** `index.html`
**User:** Werkstatt Büro
**Estimated Time:** 1 minute

#### Steps:
1. After TEST 6 (customer accepts offer), refresh Dashboard
2. Verify "Entwürfe" badge count

#### Expected Results:
✅ Badge count decreases by 1
✅ If count = 0, badge hidden (`display: none`)

---

### **TEST 10: Email Validation Edge Cases**

**Pages:** `annahme.html`, `entwuerfe-bearbeiten.html`
**User:** Werkstatt Meister/Büro
**Estimated Time:** 3 minutes

#### Test Invalid Emails:

| Email Input | Expected Result |
|-------------|-----------------|
| `test@example` | ❌ "Ungültiges Email-Format!" |
| `test.example.com` | ❌ "Ungültiges Email-Format!" |
| `@example.com` | ❌ "Ungültiges Email-Format!" |
| `test@` | ❌ "Ungültiges Email-Format!" |
| ` test@example.com ` | ✅ Trimmed + lowercase → `test@example.com` |
| `TeSt@ExAmPlE.CoM` | ✅ Lowercase → `test@example.com` |

---

### **TEST 11: Multi-Tenant Isolation**

**Scenario:** Verify drafts from `werkstattId=mosbach` don't appear in `werkstattId=heilbronn`
**Prerequisites:** Create test werkstatt "heilbronn"
**Estimated Time:** 10 minutes

#### Steps:
1. Create draft for `werkstattId=mosbach` (TEST-DRAFT-003)
2. Switch to different werkstatt (heilbronn)
3. Login as Büro for heilbronn
4. Navigate to entwuerfe-bearbeiten.html
5. Verify dropdown is EMPTY

#### Expected Results:
✅ Dropdown shows: "-- Bitte wählen --" (no options)
✅ Empty state: "Keine offenen Entwürfe"
✅ Query filters by `werkstattId` correctly

---

### **TEST 12: Cloud Function Error Handling**

**Scenario:** Test behavior when Cloud Functions fail
**Method:** Temporarily break Cloud Function or test with invalid data
**Estimated Time:** 5 minutes

#### Test Cases:

**A. SendGrid API Key Missing:**
- Expected: Toast error "Fehler beim Versenden"
- Button reverts to original text
- User can retry

**B. Invalid Email Address (backend validation):**
- Expected: Cloud Function returns error
- Toast shows error message
- Firestore NOT updated

**C. Partner Account Creation Fails:**
- Expected: Workflow stops
- Toast shows error
- No email sent

---

## 📊 Test Results Template

Copy this template to track your test results:

```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Production / Staging / Local

### Test Results:

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TEST 1 | Draft Creation (Meister) | ⏸️ Pending | |
| TEST 2 | Badge Update on Dashboard | ⏸️ Pending | |
| TEST 3 | Draft Selection and Completion | ⏸️ Pending | |
| TEST 4 | Offer Creation and Email Sending | ⏸️ Pending | |
| TEST 5 | Customer Auto-Login via QR Code | ⏸️ Pending | |
| TEST 6 | Customer Accepts Offer | ⏸️ Pending | |
| TEST 7 | Customer Rejects Offer | ⏸️ Pending | |
| TEST 8 | Admin Receives Notifications | ⏸️ Pending | |
| TEST 9 | Badge Count Decreases | ⏸️ Pending | |
| TEST 10 | Email Validation Edge Cases | ⏸️ Pending | |
| TEST 11 | Multi-Tenant Isolation | ⏸️ Pending | |
| TEST 12 | Cloud Function Error Handling | ⏸️ Pending | |

**Status Legend:**
- ✅ Passed
- ❌ Failed
- ⏸️ Pending
- ⚠️ Partial (with notes)

### Bugs Found:

| Bug ID | Description | Severity | Status |
|--------|-------------|----------|--------|
| BUG-001 | [Description] | High/Medium/Low | Open/Fixed |

### Overall Assessment:

- **Tests Passed:** X/12
- **Tests Failed:** X/12
- **Critical Bugs:** X
- **Ready for Production:** Yes/No

```

---

## 🔍 Code Quality Checks (Static Analysis)

Before manual testing, verify these code patterns:

### ✅ Multi-Tenant Pattern (Pattern 26):
```javascript
// GOOD ✅
const werkstattId = window.werkstattId || 'mosbach';
const collectionName = `partnerAnfragen_${werkstattId}`;

// BAD ❌
const collectionName = 'partnerAnfragen_mosbach'; // Hardcoded!
```

**Files to check:**
- ✅ annahme.html (Line 3256)
- ✅ entwuerfe-bearbeiten.html (Line 503, 697)
- ✅ partner-app/meine-anfragen.html (Line 5969, 6335)

### ✅ Email Normalization (Pattern 7):
```javascript
// GOOD ✅
kundenEmail: kundenEmail.toLowerCase()

// BAD ❌
kundenEmail: kundenEmail // Case-sensitive!
```

**Files to check:**
- ✅ annahme.html (Line 3236)
- ✅ entwuerfe-bearbeiten.html (Verified in Read calls)

### ✅ Type-Safe ID Comparison (Pattern 3):
```javascript
// GOOD ✅
const anfrage = alleAnfragen.find(a => String(a.id) === String(anfrageId));

// BAD ❌
const anfrage = alleAnfragen.find(a => a.id === anfrageId); // Type mismatch!
```

**Files to check:**
- ✅ partner-app/meine-anfragen.html (Line 5894, 6305)

### ✅ Secret Management (Pattern 27):
```javascript
// GOOD ✅
.runWith({ secrets: [sendgridApiKey] })

// BAD ❌
const API_KEY = "SG.xyz123..."; // Hardcoded secret!
```

**Files to check:**
- ✅ functions/index.js (All Cloud Functions use Secret Manager)

---

## 🚀 Deployment Checklist

Before deploying to production:

### 1. Cloud Functions:
- [ ] Deploy all 5 Cloud Functions to Firebase
- [ ] Verify SendGrid API Key in Secret Manager
- [ ] Test Cloud Functions with `firebase functions:shell`

### 2. Firestore Rules:
- [ ] Deploy updated rules: `firebase deploy --only firestore:rules`
- [ ] Verify rules allow new fields (isEntwurf, entwurfStatus)

### 3. Frontend Files:
- [ ] Push to GitHub: `git push origin main`
- [ ] Wait 2-3 minutes for GitHub Pages deployment
- [ ] Hard-refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- [ ] Verify cache buster versions updated

### 4. Test Data Cleanup:
- [ ] Delete test drafts from Firestore
- [ ] Delete test notifications
- [ ] Delete test partner accounts (if needed)

### 5. Monitoring:
- [ ] Check Firebase Console → Functions → Logs for errors
- [ ] Check Firebase Console → Firestore → Usage for spikes
- [ ] Verify email delivery in SendGrid Dashboard

---

## 🐛 Known Issues & Limitations

### Identified During Development:

**FIXED:**
1. ✅ **HOTFIX (c02c13e):** QR Code URL pointed to wrong file
   - Was: `partner-login.html` (doesn't exist)
   - Fixed: `partner-app/auto-login.html`

**Potential Issues:**

1. **Email Deliverability:**
   - Some email providers may mark automated emails as spam
   - Mitigation: Add SPF/DKIM records in SendGrid
   - Test with multiple email providers (Gmail, Outlook, etc.)

2. **QR Code Size in Email:**
   - Large QR codes may affect email load time
   - Current implementation: Inline data URL (small)

3. **Token Expiry:**
   - Tokens expire after 30 days
   - Customer must request new QR code if expired
   - Consider adding "Token expired" handling in Partner Portal

4. **Notification Overload:**
   - If many customers accept/reject simultaneously, admins may get many toasts
   - Consider batching notifications or adding "Mark all as read"

5. **Browser Compatibility:**
   - QR code scanning requires camera permission
   - iOS Safari may block camera in certain contexts
   - Fallback: Manual URL link in email

---

## 📚 References

**Documentation:**
- `NEXT_AGENT_MANUAL_TESTING_PROMPT.md` - Testing methodology, error patterns
- `CLAUDE.md` - Architecture, multi-tenant patterns, security
- `FEATURES_CHANGELOG.md` - Feature implementation history

**Implementation Files:**
- Phase 1: `functions/index.js` (Lines 3722-4008)
- Phase 2: `firestore.rules` (Lines 1277-1281)
- Phase 3: `annahme.html` (Lines 1764-1767, 3194-3293)
- Phase 4: `index.html` (Lines 1305-1309, 2002-2034)
- Phase 5: `entwuerfe-bearbeiten.html` (819 lines)
- Phase 6: `partner-app/meine-anfragen.html` (Lines 5969-5972, 6262-6276, 6333-6366)

**Git Commits:**
- Phase 1: `31b0e68`
- Phase 2: `40e6b57`
- Phase 3: `ef9a1c4`
- Phase 4: `9d0bab4`
- Phase 5: `191edd9` + Hotfix `c02c13e`
- Phase 6: `3ce7067`

---

**Last Updated:** 2025-11-17
**Next Review:** After Phase 8 (Manual Testing)

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**
Co-Authored-By: Claude <noreply@anthropic.com>
