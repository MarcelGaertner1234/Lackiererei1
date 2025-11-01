# 📚 Codebase Index - Master Reference

**Purpose:** Vollständige Übersicht aller Files und deren Zweck in der Fahrzeugannahme App

**Zuletzt aktualisiert:** 2025-10-31 (Test Session)

---

## 📑 Inhaltsverzeichnis

- [HTML Pages (Main App)](#html-pages-main-app)
- [HTML Pages (Partner-App)](#html-pages-partner-app)
- [JavaScript Modules](#javascript-modules)
- [CSS Files](#css-files)
- [Configuration Files](#configuration-files)
- [Reference Documentation](#reference-documentation)
- [Testing Files](#testing-files)

---

## HTML Pages (Main App)

### index.html
- **Purpose:** Dashboard / Landing Page
- **Location:** Root
- **Features:** Service overview, quick navigation
- **Key Functions:** Dashboard cards, navigation menu
- **Multi-Tenant:** ✅ Yes
- **Reference:** [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md)

---

### annahme.html
- **Purpose:** Vehicle Intake Form
- **Location:** Root
- **Lines of Code:** ~2,478
- **Features:**
  - Vehicle data entry (Kennzeichen, Kunde, Service-Typ)
  - Service-specific fields (Reifen, Glas, Klima, Dellen)
  - Photo upload (max 10 images)
  - PDF generation (Intake Protocol)
- **Key Functions:**
  - `toggleServiceFelder()` (Line 1167)
  - `getServiceDetails()` (Line 1915)
  - `saveVehicle()` (Line ~1480)
  - `uploadPhotos()` (Line ~1600)
- **Multi-Tenant:** ✅ Yes (`window.getCollection('fahrzeuge')`)
- **Reference:** [REFERENCE_VEHICLE_INTAKE.md](REFERENCE_VEHICLE_INTAKE.md), [REFERENCE_SERVICE_FIELDS.md](REFERENCE_SERVICE_FIELDS.md)

---

### liste.html
- **Purpose:** Vehicle List View
- **Location:** Root
- **Lines of Code:** ~2,653
- **Features:**
  - Table view of all vehicles
  - Search & filter
  - Detail modal view
  - Service-Details rendering
  - Realtime updates
- **Key Functions:**
  - `loadFahrzeuge()` (Line ~1900)
  - `renderServiceDetails()` (Line 2166)
  - `showVehicleDetails()` (Line ~2080)
  - `setupRealtimeListener()` (Line ~2500)
- **Multi-Tenant:** ✅ Yes
- **Reference:** [REFERENCE_VEHICLE_LIST.md](REFERENCE_VEHICLE_LIST.md)

---

### kanban.html
- **Purpose:** Kanban Board (Process Visualization)
- **Location:** Root
- **Lines of Code:** ~3,317
- **Features:**
  - 10 service-specific workflows
  - Drag & Drop zwischen steps
  - Realtime updates (Firestore snapshot)
  - Color-coded status
- **Key Functions:**
  - `processDefinitions` object (Line 1683)
  - `setupDragAndDrop()` (Line 2500)
  - `updateVehicleStep()` (Line ~2600)
  - `renderKanbanBoard()` (Line ~2100)
- **Multi-Tenant:** ✅ Yes
- **Reference:** [REFERENCE_KANBAN_SYSTEM.md](REFERENCE_KANBAN_SYSTEM.md)

---

### abnahme.html
- **Purpose:** Vehicle Completion / Handover
- **Location:** Root
- **Features:**
  - Final inspection
  - Customer handover
  - Completion protocol PDF
- **Multi-Tenant:** ✅ Yes

---

### kunden.html
- **Purpose:** Customer Management
- **Location:** Root
- **Features:** Customer database, contact info, history
- **Multi-Tenant:** ✅ Yes

---

### kalender.html
- **Purpose:** Appointment Calendar
- **Location:** Root
- **Features:** Appointment scheduling, timeline view
- **Multi-Tenant:** ✅ Yes

---

### material.html
- **Purpose:** Material Ordering
- **Location:** Root
- **Features:** Parts ordering, supplier management
- **Multi-Tenant:** ✅ Yes

---

### nutzer-verwaltung.html
- **Purpose:** User Management (Admin)
- **Location:** Root
- **Features:** Create/edit users, role management
- **Multi-Tenant:** ✅ Yes

---

### mitarbeiter-verwaltung.html
- **Purpose:** Employee Management (Admin)
- **Location:** Root
- **Features:** Employee database, permissions
- **Multi-Tenant:** ✅ Yes

---

## HTML Pages (Partner-App)

### partner-app/index.html
- **Purpose:** Partner Dashboard
- **Location:** `partner-app/`
- **Features:** Service request buttons, quick navigation
- **Multi-Tenant:** ✅ Yes

---

### partner-app/reifen-anfrage.html
- **Purpose:** Tire Service Request Form
- **Location:** `partner-app/`
- **Features:** Tire-specific fields, photo upload
- **Multi-Tenant:** ✅ Yes
- **Reference:** [REFERENCE_PARTNER_APP.md](REFERENCE_PARTNER_APP.md)

---

### partner-app/mechanik-anfrage.html
- **Purpose:** Mechanical Service Request Form
- **Features:** Mechanical-specific fields
- **Multi-Tenant:** ✅ Yes

---

### partner-app/pflege-anfrage.html
- **Purpose:** Vehicle Care Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/tuev-anfrage.html
- **Purpose:** TÜV/AU Inspection Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/versicherung-anfrage.html
- **Purpose:** Insurance Claim Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/glas-anfrage.html
- **Purpose:** Glass Repair Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/klima-anfrage.html
- **Purpose:** A/C Service Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/dellen-anfrage.html
- **Purpose:** Dent Repair Request Form
- **Multi-Tenant:** ✅ Yes

---

### partner-app/meine-anfragen.html
- **Purpose:** Partner Request List (My Requests)
- **Features:** List of all partner requests, status tracking
- **Multi-Tenant:** ✅ Yes

---

### partner-app/kva-erstellen.html
- **Purpose:** Create KVA (Kosten-Voranschlag / Quote)
- **Features:** Quote generation for partner requests
- **Multi-Tenant:** ✅ Yes
- **Bug Fixes:** 10 bugs fixed (RUN #68, 2025-10-30)

---

### partner-app/admin-anfragen.html
- **Purpose:** Admin View of All Partner Requests
- **Features:** Werkstatt admin can see all partner requests
- **Multi-Tenant:** ✅ Yes

---

## JavaScript Modules

### firebase-config.js
- **Purpose:** Firebase Initialization & Multi-Tenant Helpers
- **Lines:** ~1,195
- **Key Functions:**
  - `window.getCollection()` (Line 440)
  - `window.getCollectionName()` (Line 405)
  - `window.getWerkstattId()` (Line 458)
  - DOMContentLoaded initialization (Line 1086)
- **Multi-Tenant:** ✅ Core implementation
- **Reference:** [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md), [REFERENCE_MULTI_TENANT.md](REFERENCE_MULTI_TENANT.md)

---

### js/auth-manager.js
- **Purpose:** Authentication & User Management
- **Lines:** ~478
- **Features:**
  - 2-stage auth (Werkstatt → Mitarbeiter)
  - `onAuthStateChanged` listener (Line 414)
  - Set `window.werkstattId` from user data
  - Dispatch `authReady` event
- **Multi-Tenant:** ✅ Sets werkstattId
- **Reference:** [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md)

---

### listener-registry.js
- **Purpose:** Memory Leak Prevention (DOM + Firestore Listeners)
- **Key Functions:**
  - `window.listenerRegistry.registerDOM()`
  - `window.listenerRegistry.registerFirestore()`
  - `cleanup()` on page unload
- **Bug Fix (RUN #71):** Moved to `<head>` section to fix race condition
- **Reference:** All pages use this for event listeners

---

### error-handler.js
- **Purpose:** Global Error Handling
- **Features:** Catch uncaught errors, log to console, display user-friendly messages

---

### storage-monitor.js
- **Purpose:** Monitor Firebase Storage Usage
- **Features:** Track upload quotas, storage limits

---

### image-optimizer.js
- **Purpose:** Image Compression before Upload
- **Features:** Resize images to max 1200px, compress to 85% quality
- **Used by:** annahme.html, partner-app forms

---

### global-chat-notifications.js
- **Purpose:** Chat Notification System
- **Features:** Realtime chat notifications, badge counters

---

### js/settings-manager.js
- **Purpose:** User Settings Management
- **Features:** Theme, language, notification preferences

---

### js/ai-agent-tools.js, js/ai-agent-engine.js
- **Purpose:** AI Agent System
- **Features:** OpenAI GPT-4 integration, AI-powered chat

---

### js/ai-chat-widget.js
- **Purpose:** AI Chat Widget UI
- **Features:** Voice input (Whisper), TTS output, chat history

---

## CSS Files

### design-system.css
- **Purpose:** Design System Tokens (colors, typography, spacing)
- **Features:** CSS variables, dark mode support

---

### components.css
- **Purpose:** Reusable UI Components
- **Features:** Buttons, cards, forms, modals

---

### animations.css
- **Purpose:** Animation Library
- **Features:** Fade-in, slide-up, shimmer effects

---

### mobile-first.css
- **Purpose:** Mobile Responsive Styles
- **Features:** Breakpoints, mobile navigation

---

### css/ai-chat-widget.css
- **Purpose:** AI Chat Widget Styles
- **Features:** Chat bubble, message animations

---

### global-chat-notifications.css
- **Purpose:** Chat Notification Styles
- **Features:** Badge counters, notification popups

---

## Configuration Files

### firebase.json
- **Purpose:** Firebase Project Configuration
- **Features:**
  - Hosting rules
  - Emulator ports (Firestore: 8080, Storage: 9199, Functions: 5001)
  - Deployment settings

---

### firestore.rules
- **Purpose:** Firestore Security Rules
- **Lines:** 469
- **Features:**
  - Role-based access control (Admin, Werkstatt, Mitarbeiter, Partner, Kunde)
  - Multi-tenant wildcard patterns (Line 255-315)
  - Custom Claims support (Line 14-58)
- **Reference:** [REFERENCE_MULTI_TENANT.md](REFERENCE_MULTI_TENANT.md)

---

### storage.rules
- **Purpose:** Firebase Storage Security Rules
- **Features:** File upload permissions, size limits

---

### package.json
- **Purpose:** npm Project Configuration
- **Scripts:**
  - `npm run server` → localhost:8000
  - `npm test` → Playwright tests
  - `npm run test:headed` → Tests with browser UI

---

### .github/workflows/deploy.yml
- **Purpose:** GitHub Actions CI/CD Pipeline
- **Features:** Auto-deploy to GitHub Pages on push to main

---

## Reference Documentation

### REFERENCE_FIREBASE_INIT.md
- **Size:** 6.5 KB
- **Content:** Firebase initialization patterns, early werkstattId setup, auth flow
- **Created:** 2025-10-31

---

### REFERENCE_SERVICE_FIELDS.md
- **Size:** 6.8 KB
- **Content:** Service-specific fields implementation (Reifen, Glas, Klima, Dellen)
- **Created:** 2025-10-31

---

### REFERENCE_MULTI_TENANT.md
- **Size:** 10.2 KB
- **Content:** Multi-tenant architecture, collection naming, security rules
- **Created:** 2025-10-31

---

### REFERENCE_KANBAN_SYSTEM.md
- **Size:** 7.9 KB
- **Content:** Kanban board, processDefinitions, drag & drop
- **Created:** 2025-10-31

---

### REFERENCE_VEHICLE_INTAKE.md
- **Status:** ✅ To be created
- **Content:** Complete annahme.html workflow

---

### REFERENCE_VEHICLE_LIST.md
- **Status:** ✅ To be created
- **Content:** liste.html rendering, detail modal, search/filter

---

### REFERENCE_PARTNER_APP.md
- **Status:** ✅ To be created
- **Content:** Partner-App architecture, KVA creation, admin view

---

### CODEBASE_INDEX.md
- **This file**
- **Size:** 5.5 KB
- **Content:** Master index of all files

---

## Testing Files

### tests/helpers/firebase-helper.js
- **Purpose:** Test Utilities
- **Features:**
  - `loginAsTestAdmin()` (Added in RUN #70)
  - Firestore helpers
  - Emulator connection

---

### tests/01-vehicle-intake.spec.js
- **Purpose:** Vehicle Intake E2E Tests
- **Tests:** Form filling, service fields, photo upload, save

---

### tests/02-partner-flow.spec.js
- **Purpose:** Partner Flow E2E Tests
- **Tests:** Partner login, request creation, KVA generation

---

### tests/03-kanban-drag-drop.spec.js
- **Purpose:** Kanban Drag & Drop Tests
- **Tests:** Drag vehicle between steps, realtime updates

---

### tests/04-edge-cases.spec.js
- **Purpose:** Edge Case Tests
- **Tests:** Empty forms, invalid data, error handling

---

### tests/05-transaction-failure.spec.js
- **Purpose:** Transaction Failure Tests
- **Tests:** Firestore transaction failures, retry logic

---

### tests/06-cascade-delete-race.spec.js
- **Purpose:** Cascade Delete Race Condition Tests
- **Tests:** Delete vehicle with fotos subcollection

---

### tests/fix-aftereach-auth.py
- **Purpose:** Python Script for Test Updates
- **Features:** Auto-add `beforeAll()` + `afterEach()` hooks
- **Created:** RUN #70 (2025-10-31)

---

## File Statistics

| Category | File Count |
|----------|-----------|
| HTML (Main App) | 9 |
| HTML (Partner-App) | 11 |
| JavaScript Modules | 12+ |
| CSS Files | 6 |
| Configuration | 5 |
| Reference Docs | 8 |
| Test Files | 7 |
| **TOTAL** | **58+ files** |

**Lines of Code (Estimated):**
- HTML: ~15,000 lines
- JavaScript: ~8,000 lines
- CSS: ~3,000 lines
- **Total:** ~26,000 lines

---

## Related References

- [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md)
- [REFERENCE_SERVICE_FIELDS.md](REFERENCE_SERVICE_FIELDS.md)
- [REFERENCE_MULTI_TENANT.md](REFERENCE_MULTI_TENANT.md)
- [REFERENCE_KANBAN_SYSTEM.md](REFERENCE_KANBAN_SYSTEM.md)
- [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)
- [TEST_SESSION_LOG_20251031.md](TEST_SESSION_LOG_20251031.md)

---

_Created: 2025-10-31 during Manual Test Session_
_Last Updated: 2025-10-31_
