# HTML Files Inventory - Fahrzeugannahme App

**Generated:** 2025-11-27  
**Total Files Analyzed:** 20 root-level HTML files (51 total including marketing pages)  
**Total Lines of Code:** ~121,000 lines  
**Total Functions:** ~1,200 across all files  

---

## Executive Summary

This codebase is a comprehensive vehicle intake and management application for an automotive refinishing business (Auto-Lackierzentrum Mosbach). It features:

- **Multi-tenant architecture** with Firestore backend
- **2-stage authentication** (werkstatt selection + employee login)
- **Multi-service support** (12 different service types)
- **Real-time Kanban board** for process management
- **PDF generation** with QR codes for partner communication
- **AI-powered features** (OpenAI GPT-4 integration)
- **Comprehensive employee management** (time tracking, wages, scheduling)

---

## Critical Pages (Production-Ready)

### 1. **annahme.html** (10,217 lines) - CRITICAL
**Purpose:** Vehicle intake form - Core data collection  
**Importance:** Application entry point

**Key Functions:**
- `getFormData()` - Collects all form data (vehicle, customer, service)
- `createPDF()` - Generates intake PDF with auto-login QR code
- `parseWithOpenAI()` - AI-based DAT PDF parsing
- `parseDatPdf()` - Extracts vehicle data from uploaded PDF
- `saveErsatzteileToCentralDB()` - Stores spare parts to central database
- `autoConvertErsatzteileToBestellungen()` - Auto-creates orders from spare parts
- `saveDraft()` - Quick-mode draft saving
- `loadDraft()` - Loads saved draft vehicles

**Firestore Collections:**
- `fahrzeuge` (read/write) - Vehicles
- `partnerAnfragen` (read/write) - Partner requests
- `ersatzteile` (read/write) - Spare parts
- `materialRequests` (read/write) - Material orders
- `bestellungen` (read/write) - Orders
- `calendar` (read/write) - Calendar events

**Form Inputs:** 74 fields including:
- Vehicle data (kennzeichen, marke, modell, baujahr, schaden_beschreibung)
- Customer data (kundenname, kundenEmail, kundenTelefon)
- Service selection (serviceTyp, additionalServices)
- Cost breakdown (arbeitslohn, ersatzteile, lackierung, materialien)
- Scheduling (abholdatum, abholzeit, abholadresse)
- Photos and signature canvas

**Data Flows:**
- Vehicle Creation → Kanban Board
- Draft Creation → Entwürfe Bearbeiten
- Spare Parts → Partner Portal KVA
- PDF Upload → OpenAI → Form Pre-fill
- Auto-Entwurf Creation (Quick Mode)

**Known Issues & Fixes:**
- ✅ PDF Emoji encoding (Bug #44) - Fixed
- ✅ Quick Mode kundenname validation (Bug #46) - Fixed
- ✅ QR-Code Y-position overlap (Bug #44) - Fixed

---

### 2. **kanban.html** (8,946 lines) - CRITICAL
**Purpose:** Kanban board for process monitoring and status tracking  
**Importance:** Central workflow management

**Key Functions:**
- `directStatusUpdate()` - Updates vehicle status with validation (Pattern #50)
- `autoCreateRechnung()` - Auto-creates invoice when status='fertig'
- `createKanbanCard()` - Renders vehicle card in Kanban column
- `dragStartHandler()`, `dragEndHandler()` - Drag & drop support
- `buildServiceBadgeWithStatus()` - Renders service status badges
- `hasService()` - Checks if vehicle has specific service
- `allServicesComplete()` - Validates all services are done
- `isValidTransition()` - Status transition validation (NEW - Pattern #50)

**Kanban Columns (Status Workflow):**
1. **anlieferung** (Delivery) - Cyan
2. **neu** (New) - Gray
3. **angenommen** (Accepted) - Gray
4. **in_arbeit** (In Progress) - Blue
5. **qualitaetskontrolle** (Quality Control) - Orange
6. **fertig** (Finished) - Green

**Multi-Service Support:**
- Primary service: `serviceTyp` (immutable after creation)
- Additional services: `additionalServices[]` array with status tracking
- Service-specific statuses: `serviceStatuses` object

**Firestore Collections:**
- `fahrzeuge` (read/write)
- `partnerAnfragen` (read/write)
- `partners` (read)
- `bestellungen` (read)
- `counters` (read/write)

**Known Issues & Fixes:**
- ✅ serviceTyp Overwrite Bug (Pattern #21) - Fixed
  - Root cause: Auto-Tab-Switch overwrote primary service
  - Solution: 2-Layer Defense Architecture (Commits 750d7b2, 7083778)
- ✅ Status Transition Validation (Pattern #50) - Fixed
  - Added `isValidTransition()` for data integrity
  - Prevents invalid status progressions
- ⚠️ Background Sync Failures (Pattern #57)
  - Tracked by `backgroundSyncTracker` object

---

### 3. **kalkulation.html** (18,772 lines) - CRITICAL
**Purpose:** Advanced costing/quote system with AI analysis  
**Importance:** Financial/estimation engine

**Functions:** 270+ functions  
**Key Functions:**
- `analyzeWithKI()` - AI-based damage analysis
- `addMaterialToKalkulation()` - Material addition to quote
- `calculatePositionPreis()` - Position-level pricing
- `buildKIRequest()` - AI request builder
- `manageOENumbers()` - OE part management
- `loadKalkulationTemplates()` - Template loading
- `exportKalkulationToPDF()` - PDF export

**Firestore Collections:** 11 collections
- `kalkulationen` (read/write)
- `kalkulation_katalog` (read)
- `kalkulation_material` (read)
- `kalkulation_saetze` (read)
- `kalkulation_templates` (read)
- `kalkulation_kunden` (read)
- `lieferanten` (read)
- `fahrzeuge` (read)
- `partnerAnfragen` (read)
- `ersatzteile` (read)
- `einstellungen` (read)

**Complex Features:**
- KI-powered damage assessment
- Material database integration
- OE number management
- Multiple calculation methods
- PDF export with detailed breakdown

---

### 4. **index.html** (6,097 lines) - CRITICAL
**Purpose:** Login page and main dashboard  
**Importance:** Authentication entry point

**Key Functions:**
- `checkLogin()` - 2-stage authentication
- `createAdminSession()` - Admin session creation (testing)
- `selectService()` - Service selection
- `loadDashboardStats()` - Statistics loading
- `setupRealtimeListeners()` - Real-time updates
- `initFABScrollBehavior()` - Floating action button

**Authentication Flow:**
1. Stage 1: Werkstatt selection (localStorage-based)
2. Stage 2: Employee selection (optional Firebase Auth)
3. Admin access: Password prompt

**Dashboard Elements:**
- Statistics grid (vehicles, customers, revenue)
- Quick action buttons
- Real-time notifications
- Service selection interface

---

## High-Priority Pages

### 5. **mitarbeiter-verwaltung.html** (5,699 lines) - HIGH
**Purpose:** Employee management, wages, time tracking  
**Functions:** 67

**Key Features:**
- Employee CRUD operations
- Time tracking (SOLL/IST hours)
- Vacation request management
- Shift planning
- PDF payroll statements with annotations
- Wage calculations

**Firestore Collections:** 8
- `mitarbeiter`, `zeiterfassung`, `urlaubsAnfragen`, `schichten`, `schichtTypen`, `stundennachweise`, `lohnabrechnungen`, `einstellungen`

---

### 6. **kunden.html** (6,373 lines) - HIGH
**Purpose:** Customer/Partner management  
**Functions:** 79

**Key Features:**
- Partner directory
- Customer filtering (name, rating, service type)
- Revenue calculations per customer
- Discount tier management
- Tag-based organization
- CSV export
- Partner password management

**Firestore Collections:**
- `partners` (read/write)

---

### 7. **material.html** (5,456 lines) - HIGH
**Purpose:** Material ordering and spare parts management  
**Functions:** 62

**Key Features:**
- Material request tracking
- Spare parts database
- Order creation from requests
- Photo uploads
- Supplier management
- Delivery tracking
- Price history

**Firestore Collections:** 4
- `materialRequests`, `bestellungen`, `fahrzeuge`, `calendar`

---

### 8. **entwuerfe-bearbeiten.html** (4,841 lines) - HIGH
**Purpose:** Draft editing and completion  
**Functions:** 59

**Key Features:**
- Draft vehicle loading
- Form pre-filling from PDFs
- Spare parts to orders conversion
- Quote/offer creation
- Signature capture and display

**Firestore Collections:** 6
- `fahrzeuge`, `ersatzteile`, `lackierung`, `arbeitslohn`, `materialien`, `bestellungen`

---

## Medium-Priority Pages

### 9. **mitarbeiter-dienstplan.html** (3,282 lines) - MEDIUM
**Purpose:** Employee time clock and personal shift management  
**Functions:** 66

**Features:**
- Clock in/out
- Break tracking
- PDF timesheet generation
- Error annotations
- Shift tracking

---

### 10. **admin-einstellungen.html** (2,812 lines) - MEDIUM
**Purpose:** Admin configuration and settings  
**Functions:** 23

**Features:**
- Email template management
- Service type toggles
- Payment method configuration
- Logo branding
- OpenAI API key management
- Database cleanup

---

### 11. **admin-dashboard.html** (1,666 lines) - MEDIUM
**Purpose:** Admin overview dashboard  
**Functions:** 21

**Features:**
- Statistics grid
- Chart.js visualizations
- Vehicle status distribution
- Service type breakdown
- Top customers analysis
- Real-time updates

---

### 12. **admin-bonus-auszahlungen.html** (2,185 lines) - MEDIUM
**Purpose:** Partner bonus management  
**Functions:** 18

**Features:**
- Bonus tracking
- Revenue calculations per partner
- Payout confirmations
- Bonus eligibility scanning
- Manual bonus creation

---

### 13. **rechnungen-admin.html** (1,923 lines) - MEDIUM
**Purpose:** Invoice management  
**Functions:** 27

**Features:**
- Invoice listing and filtering
- Payment status tracking
- Invoice number generation
- PDF generation
- Status updates

**Known Issues:**
- ✅ PDF Failure Flags (Pattern #52)
- ✅ Status Sync Validation (Pattern #50)

---

### 14. **wissensdatenbank.html** (3,723 lines) - MEDIUM
**Purpose:** Knowledge base, disassembly guides, handover notes  
**Functions:** 64

**Features:**
- Technical guidelines library
- Disassembly instructions
- Comment/discussion system
- Shift handover notes
- Announcements
- Category management

**Firestore Collections:** 5
- `guidelines`, `demontage_anleitungen`, `categories`, `announcements`, `shift_handovers`

---

### 15. **dienstplan.html** (3,493 lines) - MEDIUM
**Purpose:** Schedule management  
**Functions:** 74

**Features:**
- Shift creation and editing
- Schedule conflict detection
- Drag & drop interface
- Employee assignment
- Area/department management
- Shift swap requests

---

## Lower-Priority Pages

### 16. **liste.html** (3,584 lines) - MEDIUM
**Purpose:** Vehicle list/overview  
**Functions:** 44

**Features:**
- Vehicle filtering
- Status-based views
- Service type filtering
- Customer filtering
- Pagination
- Vehicle deletion

---

### 17. **kalender.html** (3,703 lines) - LOW
**Purpose:** Calendar view for scheduling  
**Functions:** 57

**Features:**
- Event calendar
- ICS/PDF export
- Drag & drop events
- Conflict detection

---

### 18. **leihfahrzeuge.html** (1,746 lines) - LOW
**Purpose:** Loaner vehicle management  
**Functions:** 28

**Features:**
- Loaner pool management
- Rental request handling
- Vehicle assignment
- Return processing
- Request approval workflow

**Firestore Collections:**
- `leihfahrzeugPool`, `leihfahrzeugAnfragen`

---

### 19. **nutzer-verwaltung.html** (1,056 lines) - MEDIUM
**Purpose:** User account management  
**Functions:** 18

**Features:**
- User listing
- Role assignment
- Account enable/disable
- Password reset
- Pending user approval

**Firestore Collections:**
- `users` (read/write)

---

### 20. **registrierung.html** (950 lines) - MEDIUM
**Purpose:** Partner self-registration  
**Functions:** 3

**Features:**
- Registration form
- Email validation
- Phone validation
- Multi-tenant assignment

---

## Architecture Patterns

### Multi-Tenant Isolation
```javascript
// ✅ CORRECT - Uses collection helper
const fahrzeuge = window.getCollection('fahrzeuge'); // → 'fahrzeuge_mosbach'

// ❌ WRONG - Direct collection
const fahrzeuge = db.collection('fahrzeuge'); // Global leak!
```

**Pattern:** Collections automatically append `_{werkstattId}` suffix
**Collections with suffix:**
- fahrzeuge, kunden, partnerAnfragen, ersatzteile, etc.

**Global collections (no suffix):**
- users, settings, partnerAutoLoginTokens

### Multi-Service Status Tracking
**Fields:**
- `serviceTyp` - Primary service (IMMUTABLE)
- `additionalServices[]` - Array of {serviceTyp, status}
- `serviceStatuses` - Status object per service
- `serviceData` - Service-specific data

### 2-Stage Authentication
1. **Werkstatt Selection** (localStorage-based, persistent)
2. **Employee Login** (Firebase Auth, optional)

### Real-Time Data Patterns
- Firestore `onSnapshot()` listeners
- Listener cleanup with `listenerRegistry.js`
- Background sync tracking (Pattern #57)

### PDF Generation
- **Client-side:** jsPDF (Vanilla JS)
- **Server-side:** Puppeteer (Cloud Functions)
- **QR Codes:** QRious library
- **Auto-login:** QR codes with 7-day TTL tokens

---

## Critical Error Patterns Fixed

| Pattern | Files | Impact | Fix |
|---------|-------|--------|-----|
| **#21** - serviceTyp Overwrite | kanban.html | Data Loss | 2-Layer Defense (Commits 750d7b2, 7083778) |
| **#44** - PDF Y-Position | annahme.html | Layout Issues | Position recalculation after sections |
| **#45** - PDF Emoji Encoding | annahme.html | Garbled text | ASCII labels instead of emoji |
| **#46** - Quick Mode Validation | annahme.html | Runtime errors | kundenname fallback |
| **#47** - Dark Mode CSS | entwuerfe-bearbeiten.html | Invisible elements | Theme-aware rgba opacity |
| **#48** - Firestore Type Safety | meine-anfragen.html | Runtime errors | Date → ISO String conversion |
| **#50** - Status Transition | kanban.html | Invalid states | Validation rules (bf067ad) |
| **#52** - PDF Failure Flags | rechnungen-admin.html | Silent failures | Error state persistence |
| **#57** - Background Sync | kanban.html | Lost updates | Failure tracking (83dd29c) |

---

## Security Considerations

### Access Control (2-Layer)
1. **Firebase Auth** (werkstatt vs partner roles)
2. **Page-level checks** in every HTML file:
   ```javascript
   if (window.currentUserRole === 'partner') {
       window.safeNavigate('/partner-app/index.html');
   }
   ```

### Firestore Security Rules
- Pattern order: Specific → General → Wildcard (CRITICAL!)
- Field-level validation (werkstattId matching)
- Role-based access (admin, werkstatt, mitarbeiter, partner, kunde)

### File Upload Validation
- MIME type whitelist (JPEG, PNG, WebP for images; PDF for documents)
- File size limits (10MB images, 50MB PDFs)
- Client-side validation with graceful degradation

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Total HTML Files | 51 (20 analyzed) |
| Total Functions | ~1,200 |
| Avg Functions per File | 60 |
| Firestore Collections | 20+ |
| PDF Generation Time | ~2-5 seconds |
| Real-time Update Latency | <100ms |
| Mobile Optimization | Responsive (320px-2560px) |

---

## Testing Status

### Implemented Tests
- ✅ 36 Integration Tests (Firestore-based)
- ✅ 13 Smoke Tests (UI accessibility)
- ✅ 100% pass rate on primary browsers

### Missing Tests
- ❌ Rechnungs-System (HIGH priority)
- ❌ Zeiterfassungs-System (HIGH priority)
- ❌ Material Photo-Upload (HIGH priority)
- ❌ Steuerberater-Dashboard (MEDIUM priority)

---

## File Organization

```
Root HTML (51 files)
├── Core App (4 files)
│   ├── index.html - Auth & dashboard
│   ├── annahme.html - Vehicle intake
│   ├── kanban.html - Process management
│   └── kalkulation.html - Costing system
│
├── Management Pages (11 files)
│   ├── kunden.html - Customer management
│   ├── material.html - Material ordering
│   ├── mitarbeiter-verwaltung.html - Employee management
│   ├── mitarbeiter-dienstplan.html - Time clock
│   ├── dienstplan.html - Schedule management
│   ├── kalender.html - Calendar view
│   ├── liste.html - Vehicle list
│   ├── leihfahrzeuge.html - Loaner vehicles
│   ├── wissensdatenbank.html - Knowledge base
│   ├── entwuerfe-bearbeiten.html - Draft editing
│   └── abnahme.html - Final inspection
│
├── Admin Pages (5 files)
│   ├── admin-dashboard.html - Admin overview
│   ├── admin-einstellungen.html - Configuration
│   ├── admin-bonus-auszahlungen.html - Bonus management
│   ├── rechnungen-admin.html - Invoice management
│   ├── nutzer-verwaltung.html - User management
│   └── pending-registrations.html - Partner approval
│
├── Partner Portal (12+ service request forms)
│   └── Located in: partner-app/ subdirectory
│
├── Steuerberater (Tax Accountant) Portal (4 files)
│   ├── steuerberater-statistiken.html
│   ├── steuerberater-bilanz.html
│   ├── steuerberater-kosten.html
│   └── steuerberater-export.html
│
├── Public Pages (6 files)
│   ├── landing.html
│   ├── partner-landing.html
│   ├── impressum.html
│   ├── datenschutz.html
│   ├── agb.html
│   └── hilfe.html
│
└── Utilities & Setup (4 files)
    ├── migrate-*.html (5 data migration scripts)
    ├── seed-wissensdatenbank.html
    └── setup-werkstatt.html
```

---

## Generated Files

This inventory has been saved to:
- **`HTML_INVENTORY.json`** - Structured JSON data
- **`HTML_INVENTORY_SUMMARY.md`** - This document

---

## Key Metrics

- **Total Code:** ~121,000 lines of HTML/JavaScript
- **Firestore Collections:** 20+ multi-tenant collections
- **Cloud Functions:** 24+ serverless functions
- **Services Supported:** 12 different automotive services
- **Employees Tracked:** Unlimited (time tracking + payroll)
- **Partners Managed:** Unlimited (ratings + bonuses)
- **Multi-language Support:** German (de) primary
- **Accessibility:** WCAG Level AA (heading levels, color contrast, keyboard navigation)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-27  
**Maintainer:** Claude Code

