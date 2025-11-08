# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📑 Quick Navigation

- [Essential Commands](#-essential-commands) - Build, test, deploy, Firebase emulators
- [Documentation Status](#-documentation-status) - Which docs to use (CLAUDE.md vs README.md)
- [Recent Updates](#-recent-updates) - Last 3 sessions (Nov 5-7, 2025)
  - [PDF Anmerkungen-Feature](#pdf-anmerkungen-feature-2025-11-07) - Employee error reporting in timesheet PDFs
- [Core Architecture](#-core-architecture) - Multi-tenant, Firebase patterns, Security Rules
- [File Structure](#-file-structure) - Visual tree of project organization
- [Testing Guide](#-testing-guide) - 9 test cases for Multi-Tenant system
- [Common Errors](#-common-errors--solutions) - Quick troubleshooting reference
- [Known Limitations](#-known-limitations) - Test status, Browser support
- [Session History](#-session-history) - Latest sessions (Nov 6-7) | [Full Archive](./CLAUDE_SESSIONS_ARCHIVE.md)
- [External Resources](#-external-resources) - GitHub, Firebase Console, Live App

---

## 🚀 Essential Commands

### First Time Setup
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
npm install

# CRITICAL: Verify Java 21+ for Firebase Emulators
java -version  # Must be Java 21+ or emulators will fail
export JAVA_HOME=/opt/homebrew/opt/openjdk@21  # Add to ~/.zshrc or ~/.bashrc
```

### Development Workflow
```bash
# Terminal 1: Development Server
npm run server  # localhost:8000
npm run server:background

# Terminal 2: Firebase Emulators (REQUIRED for local testing)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
firebase emulators:start --only firestore,storage --project demo-test

# Emulator Ports (see firebase.json):
# - Firestore: localhost:8080
# - Storage: localhost:9199
# - Emulator UI: localhost:4000
# - Hosting: localhost:5000
```

### Testing
```bash
npm test                    # Run all Playwright tests (headless)
npm run test:headed         # With browser UI
npm run test:ui             # Playwright UI mode
npm run test:debug          # Debug specific test
npm run test:report         # View last test report

# Run single test file
npx playwright test tests/01-vehicle-intake.spec.js

# Run single test by name
npx playwright test -g "should create vehicle intake"
```

### Firebase Deployment
```bash
# Deploy specific components
firebase deploy --only functions          # Cloud Functions
firebase deploy --only firestore:rules    # Security Rules
firebase deploy --only hosting            # Hosting config
```

### Git Deployment (Auto-Deploy)
```bash
# GitHub Pages deploys automatically in 2-3 minutes
git add . && git commit -m "feat: description" && git push

# Live URL: https://marcelgaertner1234.github.io/Lackiererei1/

# Verify deployment
curl -I https://marcelgaertner1234.github.io/Lackiererei1/
```

---

## 📚 Documentation Status

**⚠️ IMPORTANT: Use CLAUDE.md, NOT README.md**

| File | Status | Use Case |
|------|--------|----------|
| **CLAUDE.md** | ✅ **UP-TO-DATE** (v3.2.0) | **Primary technical reference** - Use this for all development work |
| README.md | ❌ **OUTDATED** (v1.0/2.0) | Legacy end-user documentation - Ignore for development |
| CLAUDE_SESSIONS_ARCHIVE.md | ✅ Current | Full session history (Oct 30 - Nov 5, 2025) |
| CODEBASE-ANALYSE-REPORT.md | ✅ Current | Comprehensive codebase analysis |
| TESTING_AGENT_PROMPT.md | ✅ Current | QA testing guide (1,966 lines) |

**Why README.md is outdated:**
- Describes localStorage version (v1.0/2.0) - App now uses Firebase (v3.2.0)
- Missing: Multi-tenant architecture, Partner Portal, 12 services, Cloud Functions
- Missing: Playwright E2E tests, Zeiterfassungs-System, Status Synchronization
- Missing: GitHub Pages deployment, Firebase Security Rules

**What to use:**
- For development: **CLAUDE.md** (this file)
- For testing: **TESTING_AGENT_PROMPT.md** or Testing Guide section below
- For architecture: **Core Architecture** section below
- For deployment: **Essential Commands** section above
- For bug fixes: **Recent Updates** section below + **CLAUDE_SESSIONS_ARCHIVE.md**

---

## ✅ Recent Updates

### **ZEITERFASSUNGS-SYSTEM (Time Tracking) - IMPLEMENTED (2025-11-07/08)** 🎉

**Status**: ✅ **PRODUCTION-READY** - Complete employee time tracking with SOLL/IST comparison

**Implementation**: 11 commits (d4fb0b2 → 0e6bdcb) + Service Worker fix (271feb6)

**Features Implemented:**

1. **Employee Time Clock** (`mitarbeiter-dienstplan.html` Tab 2)
   - ▶️ Start Work button - Creates zeiterfassung record
   - ⏸️ Pause button - Tracks break times
   - ▶️ Return from Pause - Resume work
   - ⏹️ Finish Work - Completes day with calculated hours
   - 🕐 Live Timer - Real-time work/pause tracking (updates every 60s)
   - ⏱️ Status Display - Shows current state (working/break/finished)

2. **SOLL vs IST Hours** (Planned vs Actual)
   - SOLL: Calculated from `schichten` (Dienstplan schedule)
   - IST: Calculated from `zeiterfassung` (actual clock-ins)
   - Differenz: IST - SOLL (positive = Überstunden, negative = Minusstunden)
   - Tab 3 Kachel: Shows monthly +/- hours with color coding

3. **Admin Corrections Panel** (`mitarbeiter-verwaltung.html`)
   - New Tab: "⏱️ Zeiterfassung" with all time records
   - Filter: By employee + date range (current/last month/all)
   - Edit Modal: Admin can correct Start/Pause/End times
   - Manual Edit Marker: `*` shown in IST column for edited entries
   - Table Columns: SOLL-Std, IST-Std, Differenz (all color-coded)

4. **PDF Export Enhanced**
   - New columns: SOLL-Std, IST-Std, Differenz
   - Summary box: Shows all three totals with color coding
   - Legend: Explains `*` marker for manually edited entries
   - Color coding: Green (Überstunden), Red (Minusstunden)

5. **Self-Healing System**
   - Absolute recalculation after every change
   - Loads ALL completed zeiterfassung records
   - Recalculates SOLL from schichten
   - Updates mitarbeiter document with latest values
   - No delta calculations = no accumulation errors

6. **Firestore Collections & Security**
   - Collection: `zeiterfassung_{werkstattId}` (multi-tenant)
   - Document ID: `{datum}_{mitarbeiterId}` (e.g., `2025-11-07_M123`)
   - Fields: `events[]`, `status`, `calculatedHours`, `manuallyEdited`
   - Security: Employees read/write own, admins read/write all
   - Rules: Lines 1218-1290 in `firestore.rules`

7. **Service Worker Fix** (Commit 271feb6)
   - Issue: Google cleardot.gif tracking pixel caused console errors
   - Fix 1: Error handling returns valid Response (408) instead of undefined
   - Fix 2: Skip external Google resources from caching
   - Result: Clean console, no "Failed to convert value to 'Response'" errors

**Files Changed:**
- `mitarbeiter-dienstplan.html` - Employee time tracking UI + PDF export (Lines 686-760, 2553-2984, 1559-1847)
- `mitarbeiter-verwaltung.html` - Admin panel + corrections tab (Lines 605-768, 3017-3965)
- `firestore.rules` - Security rules for zeiterfassung (Lines 1218-1290)
- `sw.js` - Service Worker error handling (Lines 197-202, 307-314)

**Commits:**
```
d4fb0b2 - Zeiterfassung Collection + Security Rules
ac370a3 - Zeiterfassungs-Buttons UI
1d70860 - "Arbeit Starten" Logik
36116cc - Live-Timer
2bb02af - Pause/Zurück/Feierabend Buttons
31d2a64 - IST-Stunden Synchronisation
33f1fad - Tab 3 Differenz-Kachel
612b461 - Admin-Panel neue Spalten
b2b9095 - Admin Zeiterfassung Tab (Display)
af5793d - Admin Edit-Modal (Complete)
0e6bdcb - PDF-Export erweitert
271feb6 - Service Worker Error Handling
```

**Known Limitation:**
- Firestore Composite Index required for PDF generation
- Index for: `mitarbeiterId` + `status` + `datum` (ascending)
- One-time setup in Firebase Console (see error message link)

---

### **STATUS SYNCHRONIZATION & DUPLICATE PREVENTION FIXED (2025-11-07)**

**Status**: 🎉 **CRITICAL BUGS RESOLVED** - Status Sync + Duplicate Vehicles Fixed

**Latest Deployment**:
- ✅ Frontend: GitHub Pages (Commit `1bdb335`)
- ✅ Status Synchronization: **100% working** for ALL 12 services
- ✅ Duplicate Prevention: **3-layer protection** in Admin vehicle creation
- ✅ Field Name Standardization: `partnerAnfrageId` now consistent across all paths
- ✅ Migration Script: `migrate-partneranfrageid.html` created for existing data

**Bugs Fixed:**
1. **Field Name Inconsistency** (CRITICAL)
   - Partner path used `anfrageId`, Admin path used `partnerAnfrageId`
   - Result: Status updates from Kanban didn't sync to Partner Portal
   - Fix: Standardized to `partnerAnfrageId` everywhere

2. **Missing Duplicate Prevention** (HIGH)
   - Admin path had no duplicate check before vehicle creation
   - Result: Double Kanban entries when Partner + Admin both created vehicle
   - Fix: Added 3-layer check (flag, partnerAnfrageId, kennzeichen)

3. **Random Query Results** (MEDIUM)
   - Query without `.orderBy()` returned random vehicle when duplicates existed
   - Result: "Random" status display (appeared like sync not working)
   - Fix: Added `.orderBy('timestamp', 'desc')` to always return newest

**Files Changed:**
- `partner-app/anfrage-detail.html` (Line 2970, 969)
- `kanban.html` (Lines 3087, 3343)
- `partner-app/admin-anfragen.html` (Lines 2244-2290)
- `migrate-partneranfrageid.html` (NEW - migration tool)

---

### **PDF ANMERKUNGEN-FEATURE (2025-11-07)**

**Status**: ✅ **IMPLEMENTIERT** (Admin-Seite mitarbeiter-verwaltung.html)

**Neue Funktionalität:**
- 3. Button **"💬 Anmerkungen"** im PDF-Modal (neben Vorschau & Signieren)
- Mitarbeiter können Fehler in ihrer Stundenabrechnung melden
- **6 Fehlertypen:** Zu wenig/viel Stunden, Falsche Schicht, Fehlende Pause, Falsches Datum, Sonstiges
- Anmerkungen erscheinen im PDF als eigene Sektion unter den Unterschriften
- **In-Memory Storage** (keine Firestore-Persistenz in dieser Version)

**Workflow:**
1. PDF-Modal öffnen → Zeitraum wählen
2. **"Anmerkungen"** klicken → Modal öffnet sich
3. Datum + Fehlertyp + Beschreibung eingeben → Hinzufügen
4. Mehrere Anmerkungen möglich (mit Löschen-Funktion)
5. "Speichern & Zurück" → Zurück zum PDF-Modal
6. "Vorschau" oder "Signieren" → PDF enthält Anmerkungen-Sektion

**Modified Files:**
- `mitarbeiter-verwaltung.html` (Lines 1139-1152: 3-Button Modal Layout)
- `mitarbeiter-verwaltung.html` (Lines 1182-1249: Annotations Modal HTML)
- `mitarbeiter-verwaltung.html` (Lines 1878: Global `currentAnnotations` array)
- `mitarbeiter-verwaltung.html` (Lines 2001-2144: JavaScript Functions)
- `mitarbeiter-verwaltung.html` (Lines 2541-2597: PDF Generation Integration)

**JavaScript Functions:**
- `openAnnotationsModal()` - Öffnet Modal mit Datumsbereich-Limits
- `addAnnotation()` - Validiert & fügt zur Liste hinzu
- `removeAnnotation(index)` - Löscht mit Bestätigung
- `renderAnnotationsList()` - Rendert sortiert nach Datum
- `saveAnnotations()` - Speichert & kehrt zurück
- `cancelAnnotations()` - Verwirft mit Bestätigung

**PDF Integration:**
- Neue Sektion **"📋 Anmerkungen und Korrekturen"** nach Unterschriften
- Jede Anmerkung in grauem Box mit Datum, Fehlertyp, Beschreibung
- Automatischer Seitenumbruch bei Bedarf
- Sortierung nach Datum (chronologisch)

**Next Session TODO:**
- ⏳ **Mitarbeiter-Ansicht:** Code kopieren für employee-facing view
- ⏳ **Firestore-Speicherung:** Admin kann gemeldete Fehler reviewen
- ⏳ **Admin-Interface:** Anmerkungen bearbeiten/auflösen in mitarbeiter-verwaltung.html
- ⏳ **E-Mail-Notification:** Admin wird bei neuer Anmerkung benachrichtigt

**Commit:** `706df2c`

---

### **BONUS SYSTEM PRODUCTION READY (2025-11-05)**

**Status**: 🎉 Bonus System **100% FUNCTIONAL** - Permission Denied Bug Fixed + Monthly Reset Automation Deployed

**Latest Deployment**:
- ✅ Frontend: GitHub Pages (Commit `2a30531`)
- ✅ Security Rules: Firebase Production (Pattern Collision Fixed - Bonus Rules at TOP)
- ✅ Bonus System: **100% Complete** (Partners can create/view bonuses, Admin can mark as paid)
- ✅ Automation: **Monthly Reset Cloud Function** (1st of month, cron scheduled)
- ✅ **12 Fixes Deployed** (FIX #44-55: 9 failed attempts → Breakthrough FIX #53)

**Session Summary**: Extended debugging session (Nov 5) resolved critical Firestore Security Rules pattern collision blocking bonus creation. Discovered that wildcard patterns must be ordered top-to-bottom (most specific first). Also implemented monthly bonus reset automation for recurring partner motivation.

**Key Discovery - Firestore Security Rules Pattern Order:**
```javascript
// ❌ WRONG - Bonus rules at Line 547 (TOO LOW!)
match /{chatCollection}/{id} { ... }          // Line 295 - matches first
match /{partnersCollection}/{id} { ... }      // Line 326 - matches second
// ... other patterns ...
match /{bonusCollection}/{bonusId} { ... }    // Line 547 - NEVER REACHED!

// ✅ CORRECT - Bonus rules at TOP (Lines 63-88)
match /bonusAuszahlungen_mosbach/{bonusId} { ... }  // Line 63 - matches FIRST
match /{bonusCollection}/{bonusId} { ... }          // Line 72 - matches SECOND
// ... other patterns BELOW ...
match /{chatCollection}/{id} { ... }                // Line 295 - only if no match above
```

**Takeaway:** Firestore evaluates rules **top-to-bottom**, **first match wins**. Most specific patterns MUST be at TOP.

---

### **ALL 12 PARTNER SERVICES INTEGRATED (2025-11-06)**

**Status**: 🎉 **100% Integration Complete** - All services fully integrated

**Latest Deployment**:
- ✅ Frontend: GitHub Pages (Commit `e4d1a6e`)
- ✅ Status Synchronization: All 12 services now sync with Kanban board
- ✅ Bi-Directional Integration: Partners can request via partner-app, Werkstatt can intake via annahme.html
- ✅ Complete Service List: lackier, reifen, mechanik, pflege, tuev, versicherung, glas, klima, dellen, folierung, steinschutz, werbebeklebung

**Session Summary**: Completed integration of 3 new services (Folierung, Steinschutz, Werbebeklebung) into werkstatt intake form and Kanban workflows. All 12 services now have custom workflows, status sync, and service-specific field validation.

---

## 🏗️ Core Architecture

### 1. Multi-Tenant Collection Pattern (CRITICAL)

**ALWAYS use the helper function for Firestore operations:**

```javascript
// ✅ CORRECT - Auto-appends werkstattId suffix
const fahrzeuge = window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'

// ❌ WRONG - Accesses global collection
const fahrzeuge = db.collection('fahrzeuge');
```

**Why:** Each workshop (Mosbach, Heidelberg) has isolated data via collection suffixes.

**Implementation:** See firebase-config.js:405-449

**Collections:**
- `fahrzeuge_mosbach`, `fahrzeuge_heidelberg` - Workshop-specific vehicles
- `kunden_mosbach`, `kunden_heidelberg` - Workshop-specific customers
- `partners_mosbach`, `partners_heidelberg` - Workshop-specific partners
- `partnerAnfragen_mosbach` - Partner service requests
- `bonusAuszahlungen_mosbach` - Partner bonus records
- `zeiterfassung_mosbach` - Employee time tracking records (SOLL/IST hours)

**Exception:** `users` and `partners` collections are GLOBAL (for pending registrations before werkstatt assignment)

---

### 2. Firebase Initialization Pattern (CRITICAL)

**ALWAYS await Firebase before Firestore operations:**

```javascript
// Pre-initialize werkstattId from localStorage
const storedPartner = JSON.parse(localStorage.getItem('partner') || 'null');
window.werkstattId = (storedPartner && storedPartner.werkstattId) || 'mosbach';

// Wait for Firebase + werkstattId with polling
let authCheckAttempts = 0;
const authCheckInterval = setInterval(async () => {
  authCheckAttempts++;
  if (window.firebaseInitialized && window.werkstattId) {
    clearInterval(authCheckInterval);

    // NOW safe to use Firestore
    const collection = window.getCollection('fahrzeuge');
    const snapshot = await collection.get();
  }

  if (authCheckAttempts >= 20) {
    clearInterval(authCheckInterval);
    console.error('Firebase initialization timeout');
  }
}, 250);
```

**Why:** Firebase SDK loads asynchronously. Race conditions cause "db not initialized" errors.

**Key Points:**
- Pre-initialize `window.werkstattId` from localStorage BEFORE polling
- Poll for both `window.firebaseInitialized` AND `window.werkstattId`
- 20 attempts × 250ms = 5 seconds timeout
- Race conditions can break entire features (e.g., photo upload)

---

### 3. Type-Safe ID Comparisons (CRITICAL)

**ALWAYS use String conversion:**

```javascript
// ✅ CORRECT - Type-safe comparison
const vehicle = allVehicles.find(v => String(v.id) === String(vehicleId));

// ❌ WRONG - Type mismatch causes false negatives
const vehicle = allVehicles.find(v => v.id === vehicleId);
```

**Why:** Firestore IDs are strings, but JavaScript may have numeric timestamps. Type mismatch = "Fahrzeug nicht gefunden" errors.

---

### 4. Authentication & Access Control (2-Layer Defense)

**Layer 1:** Firebase Auth (werkstatt vs partner roles)
**Layer 2:** Page-level checks in every HTML file

```javascript
// MUST be in <script> tag of EVERY werkstatt page
if (window.currentUserRole === 'partner') {
  window.location.href = '/partner-app/index.html';
}
```

**Roles:**
- `admin` - Super admin (full access)
- `werkstatt` - Workshop admin (owner)
- `mitarbeiter` - Employee (delegated permissions)
- `partner` - B2B partner (restricted to partner-app)
- `kunde` - Customer (vehicle tracking only)

**Security Rules:** firestore.rules validates BOTH role AND werkstattId

---

### 5. Firestore Security Rules Pattern Order (CRITICAL)

**Pattern order is CRITICAL** - Firestore evaluates rules top-to-bottom, **first match wins**.

```javascript
// ✅ CORRECT - Most specific patterns at TOP
match /bonusAuszahlungen_mosbach/{bonusId} { ... }  // Line 63 - Specific
match /{bonusCollection}/{bonusId} { ... }          // Line 72 - Pattern
match /{chatCollection}/{id} { ... }                // Line 295 - Wildcard

// ❌ WRONG - Specific patterns at BOTTOM
match /{chatCollection}/{id} { ... }                // Matches everything first!
match /bonusAuszahlungen_mosbach/{bonusId} { ... }  // Never reached
```

**Takeaway from Bug #5 (4 hours debugging!):**
- Order patterns from **specific → general** (hardcoded → pattern → wildcard)
- Test pattern order: Temporarily add `allow read, write: if true` to top-level
- Use Firebase Rules Playground to verify which rule matches your request

---

### 6. Status Sync Pattern (NEW 2025-11-07)

**Field name consistency is CRITICAL** for multi-path data flows:

```javascript
// ✅ CORRECT - Standardized field name across ALL creation paths
// Partner-side vehicle creation (anfrage-detail.html:2970)
const fahrzeugData = {
    partnerAnfrageId: anfrage.id,  // ✅ Standardized field
    // ...
};

// Admin-side vehicle creation (admin-anfragen.html)
const fahrzeugData = {
    partnerAnfrageId: anfrageId,  // ✅ Same field name
    // ...
};

// Kanban sync priority (kanban.html:3087, 3343)
const partnerAnfrageId = fahrzeugData.partnerAnfrageId ||   // Check standardized FIRST
                         fahrzeugData.anfrageId ||           // Then fallback
                         fahrzeugData.fahrzeugAnfrageId;     // Then old field

// Query ordering for consistency (anfrage-detail.html:969)
const snapshot = await getCollection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId)
    .orderBy('timestamp', 'desc')  // ✅ Always return NEWEST
    .limit(1)
    .get();
```

**Why:** Partner path used `anfrageId`, Admin path used `partnerAnfrageId` → Status sync failed.

**Solution:**
1. Standardize field name across all creation paths
2. Check standardized field FIRST in sync logic, then fallbacks
3. Add `.orderBy('timestamp', 'desc')` to prevent random results
4. Create migration script for existing data

---

### 7. Duplicate Prevention Pattern (NEW 2025-11-07)

**3-Layer Protection:**

```javascript
// Layer 1: Check anfrage.fahrzeugAngelegt flag
if (anfrage.fahrzeugAngelegt === true) {
    alert('⚠️ Fahrzeug wurde bereits angelegt!');
    return;
}

// Layer 2: Query Firestore by partnerAnfrageId
const existingByAnfrageId = await window.getCollection('fahrzeuge')
    .where('partnerAnfrageId', '==', anfrageId)
    .limit(1)
    .get();

if (!existingByAnfrageId.empty) {
    alert('⚠️ Fahrzeug mit dieser Anfrage-ID existiert bereits!');
    return;
}

// Layer 3: Query Firestore by kennzeichen (if exists)
if (fahrzeugData.kennzeichen) {
    const existingByKennzeichen = await window.getCollection('fahrzeuge')
        .where('kennzeichen', '==', fahrzeugData.kennzeichen.toUpperCase())
        .limit(1)
        .get();

    if (!existingByKennzeichen.empty) {
        alert('⚠️ Fahrzeug mit diesem Kennzeichen existiert bereits!');
        return;
    }
}

// All checks passed - create vehicle
await window.getCollection('fahrzeuge').add(fahrzeugData);
```

**Why:** Race condition allowed simultaneous Partner + Admin vehicle creation → Double Kanban entries.

---

## 📁 File Structure

```
/Fahrzeugannahme_App/
├── index.html                    # Landing page (login/navigation)
├── annahme.html                  # Vehicle intake form (12 service types)
├── liste.html                    # Vehicle list view
├── kanban.html                   # Kanban board (10 custom workflows)
├── kalender.html                 # Calendar view
├── material.html                 # Material ordering
├── kunden.html                   # Customer management
├── admin-dashboard.html          # Admin dashboard
├── pending-registrations.html    # Partner approval workflow
├── admin-bonus-auszahlungen.html # Bonus payment dashboard
├── mitarbeiter-verwaltung.html   # Employee management + Zeiterfassung admin panel
├── mitarbeiter-dienstplan.html   # Employee schedule + Time clock (Start/Pause/Finish)
├── dienstplan.html               # Admin: Schedule management
├── firebase-config.js            # Firebase init + Multi-tenant helper (CRITICAL)
├── firestore.rules               # Security rules (CRITICAL - pattern order!)
├── firestore.indexes.json        # Query indexes
├── storage.rules                 # Storage access control
├── firebase.json                 # Firebase config + Emulator ports
├── package.json                  # NPM dependencies
├── playwright.config.js          # Playwright E2E test config
├── js/
│   ├── auth-manager.js          # 2-stage auth (werkstatt + mitarbeiter)
│   ├── ai-agent-engine.js       # OpenAI GPT-4 integration
│   ├── ai-chat-widget.js        # AI chat UI component
│   ├── settings-manager.js      # User preferences
│   ├── ai-agent-tools.js        # AI function calling
│   ├── app-events.js            # Event bus
│   └── mitarbeiter-notifications.js # Employee alerts
├── partner-app/                  # B2B Partner Portal (12 services)
│   ├── index.html               # Partner dashboard
│   ├── service-auswahl.html     # Service selection grid
│   ├── meine-anfragen.html      # Partner's request list (6800 lines)
│   ├── anfrage-detail.html      # Request detail view + Status tracking
│   ├── kva-erstellen.html       # Quote (KVA) creation (2648 lines)
│   ├── admin-anfragen.html      # Admin: All partner requests
│   ├── auto-login.html          # QR-Code auto-login page
│   ├── lackier-anfrage.html     # Paint service form
│   ├── reifen-anfrage.html      # Tire service form
│   ├── mechanik-anfrage.html    # Mechanic service form
│   ├── pflege-anfrage.html      # Detailing service form
│   ├── tuev-anfrage.html        # TÜV inspection form
│   ├── versicherung-anfrage.html # Insurance form
│   ├── glas-anfrage.html        # Glass repair form
│   ├── klima-anfrage.html       # A/C service form
│   ├── dellen-anfrage.html      # Dent removal form
│   ├── folierung-anfrage.html   # Wrapping service form
│   ├── steinschutz-anfrage.html # Paint protection form
│   └── werbebeklebung-anfrage.html # Advertising wrap form
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                 # All Cloud Functions (3200+ lines)
│   │   ├── ensurePartnerAccount        # Create partner Firebase Auth
│   │   ├── createPartnerAutoLoginToken # Generate QR token
│   │   ├── validatePartnerAutoLoginToken # Validate + create custom token
│   │   ├── monthlyBonusReset           # Scheduled: 1st of month
│   │   └── testMonthlyBonusReset       # HTTP: Manual test
│   └── package.json
├── tests/                        # Playwright E2E tests
│   ├── 00-smoke-test.spec.js
│   ├── 01-vehicle-intake.spec.js
│   ├── 02-partner-flow.spec.js
│   ├── 03-kanban-drag-drop.spec.js
│   ├── 04-edge-cases.spec.js
│   ├── 05-transaction-failure.spec.js
│   ├── 06-cascade-delete-race.spec.js
│   ├── 07-service-consistency-v32.spec.js
│   ├── 08-admin-einstellungen.spec.js
│   ├── 09-ki-chat-widget.spec.js
│   ├── 10-mobile-comprehensive.spec.js
│   ├── 99-firebase-config-check.spec.js
│   ├── partner-app-kva-logic.spec.js
│   ├── partner-app-multi-tenant.spec.js
│   └── helpers/                  # Test utilities
├── migrate-*.html               # Data migration scripts (6 files)
│   ├── migrate-partneranfrageid.html (NEW 2025-11-07)
│   ├── migrate-fotos-to-firestore.html
│   ├── migrate-kennzeichen-uppercase.html
│   ├── migrate-mitarbeiter.html
│   ├── migrate-price-consistency.html
│   └── migrate-status-consistency.html
├── libs/                        # Local libraries
│   └── qrious.min.js           # QR-Code generation (17KB)
├── css/                         # Global stylesheets
├── n8n-workflows/               # Automation workflows (n8n)
└── CLAUDE.md                    # This file
```

**Key Files to Know:**
- **firebase-config.js** - CRITICAL: Multi-tenant helper, Firebase initialization
- **firestore.rules** - CRITICAL: Security Rules (pattern order matters!)
- **annahme.html** - Vehicle intake with 12 service types + dynamic fields
- **kanban.html** - Kanban board with 10 custom workflows + drag & drop
- **partner-app/meine-anfragen.html** - Partner dashboard (6800 lines, realtime sync)
- **partner-app/kva-erstellen.html** - Quote creation (2648 lines, dynamic variants)

---

## 🧪 Testing Guide

### Test Environment
- **Live App**: https://marcelgaertner1234.github.io/Lackiererei1/
- **Firestore**: Production (auto-lackierzentrum-mosbach)
- **Firebase Emulators**: localhost:8080 (Firestore), localhost:9199 (Storage)

### 9 Test Cases (Multi-Tenant Partner Registration)

| Test | Description | Priority | Duration |
|------|-------------|----------|----------|
| **TEST 0** | Mosbach Address Setup (Firebase Console) | 🔧 SETUP | 5 min |
| **TEST 1** | Partner Registration (registrierung.html) | ⭐ START | 5 min |
| **TEST 2** | PLZ-Region Validation Warning | ⚠️ | 3 min |
| **TEST 3** | Admin Dashboard Badge Display + Access | 🔴 | 5 min |
| **TEST 4** | Pending Panel (+ Address Display) | 📋 | 10 min |
| **TEST 5** | Assignment (+ PLZ Matching) | 🔥 CRITICAL | 12 min |
| **TEST 6** | Partner Login After Approval | 🔥 CRITICAL | 8 min |
| **TEST 7** | Reject Function (Spam Removal) | 🗑️ | 5 min |
| **TEST 8** | Multi-Tenant Isolation Verification | 🔥 CRITICAL | 10 min |

**Total:** ~65 minutes

**Testing Results (2025-11-03):** ✅ **All 9 Tests PASSED**

**For detailed test instructions**, see [TESTING_AGENT_PROMPT.md](./TESTING_AGENT_PROMPT.md) (1,966 lines, comprehensive QA guide).

---

## ⚠️ Common Errors & Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| `firebase.storage is not a function` | Storage SDK not loaded | Add `firebase-storage-compat.js` to HTML |
| `Fahrzeug nicht gefunden` | ID type mismatch | Use `String(v.id) === String(vehicleId)` |
| `Firebase initialization timeout` | SDK load order wrong | Check `<script>` tags in `<head>`, pre-init werkstattId |
| `werkstattId timeout` | Not pre-initialized | Pre-init from localStorage before polling |
| Permission denied (Bonus System) | Security Rules pattern collision | Move bonus rules to TOP (before wildcards) |
| GitHub Pages shows old version | Browser cache | Hard-refresh (Cmd+Shift+R) + Wait 2-3min |
| Partner can access werkstatt pages | Missing page-level access control | Add `if (role === 'partner') { redirect }` to ALL werkstatt pages |
| Status sync not working | Field name inconsistency | Verify `partnerAnfrageId` used in all creation paths |
| Duplicate Kanban entries | Missing duplicate prevention | Add 3-layer check (flag, partnerAnfrageId, kennzeichen) |
| Random status display | Query without ordering | Add `.orderBy('timestamp', 'desc')` to query |

---

## 🚧 Known Limitations

### Testing
- ⚠️ Automated tests need update (live app works perfectly, tests require maintenance)
- ✅ Live app works perfectly - tests need updates to match new features
- Manual testing required for all Partner-App services

### Browser Support
- ✅ Chrome/Edge: Full support
- ✅ Safari/iOS: Full support
- ⚠️ Firefox: Camera upload may require manual selection

### Offline Mode
- ❌ No offline data persistence (intentional - real-time data priority)
- ❌ No service worker caching for HTML (Firebase Auth requires online)

---

## 📚 Session History

**Latest Sessions (2025-11-06 to 2025-11-08):**
- ✅ Zeiterfassungs-System (11 commits: d4fb0b2 → 0e6bdcb + Service Worker fix 271feb6)
- ✅ Status Sync & Duplicate Prevention (Commit: 1bdb335)
- ✅ PDF Anmerkungen-Feature (Commit: 706df2c)
- ✅ Partner Services Integration - 12 services (5 commits: cd68ae4 → 33c3a73)
- ✅ Bonus System Production Ready (Commit: 2a30531)

**Details:** See [Recent Updates](#-recent-updates) section above for comprehensive documentation.

**Full Archive:** [CLAUDE_SESSIONS_ARCHIVE.md](./CLAUDE_SESSIONS_ARCHIVE.md) (Oct 30 - Nov 5, 2025)

---

## 🌐 External Resources

- **GitHub Repository:** https://github.com/MarcelGaertner1234/Lackiererei1
- **Live App:** https://marcelgaertner1234.github.io/Lackiererei1/
- **GitHub Actions:** https://github.com/MarcelGaertner1234/Lackiererei1/actions
- **Firebase Console:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach
  - **Firestore:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore
  - **Authentication:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/authentication
  - **Storage:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/storage
  - **Cloud Functions:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions

---

_Last Updated: 2025-11-08 (Zeiterfassungs-System + CLAUDE.md Optimization) by Claude Code (Sonnet 4.5)_
_Version: v2025.11.08.1 | File Size: ~678 lines (optimized & comprehensive)_
_Recent Sessions: Nov 6-8 (Zeiterfassungs-System, Status Sync, PDF Annotations, Service Worker Fix) | Full Archive: CLAUDE_SESSIONS_ARCHIVE.md_
_Note: README.md is outdated (v1.0/2.0) - Always use CLAUDE.md for development guidance_
