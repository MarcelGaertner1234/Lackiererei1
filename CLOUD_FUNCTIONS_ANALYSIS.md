# CLOUD FUNCTIONS ANALYSIS REPORT
**Fahrzeugannahme_App - Firebase Cloud Functions (functions/index.js)**

**Analysis Date:** 2025-12-02  
**Total Lines:** 5,774  
**File Size:** ~220 KB  
**Runtime:** Node.js 20 (europe-west3, Frankfurt - DSGVO-konform)

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Function Categories & Triggers](#function-categories--triggers)
4. [Detailed Function Specifications](#detailed-function-specifications)
5. [Email Retry System (Bug #3 Fix)](#email-retry-system-bug-3-fix)
6. [Security & Error Handling](#security--error-handling)
7. [Dependencies & Secrets Management](#dependencies--secrets-management)
8. [Collection References & Data Flow](#collection-references--data-flow)
9. [Monitoring & Logging](#monitoring--logging)
10. [Issues & Recommendations](#issues--recommendations)

---

## EXECUTIVE SUMMARY

### Overview
The Cloud Functions module (5,774 lines) contains **16 primary exported functions** across 5 categories:

| Category | Count | Status | Primary Purpose |
|----------|-------|--------|-----------------|
| **Email Functions (AWS SES)** | 6 | ✅ Active | Transactional emails (Status updates, Partner requests, Approvals) |
| **Authentication Functions** | 3 | ✅ Active | Partner auto-login, token management |
| **PDF/Data Processing** | 2 | ✅ Active | DAT-PDF parsing via GPT-4 Vision, PDF generation |
| **Scheduled Jobs** | 3 | ✅ Active | Monthly resets, stale cleanup, email retries |
| **Helper/Utility** | 2+ | ✅ Active | Rate limiting, audit logging |

### Key Metrics
- **Deployed Region:** europe-west3 (Frankfurt)
- **Memory Allocation:** 256MB - 1GB (configurable per function)
- **Timeout:** 60s - 540s (depends on operation)
- **Secrets Managed:** 3 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, OPENAI_API_KEY)
- **Collections Used:** 15+ (email_logs, emailRetryQueue, systemLogs, users, etc.)
- **Rate Limiting:** Per-user daily limits for PDF Vision ($0.01-0.03 per request)

### Recent Fixes
- **Bug #3 (Nov 21, 2025):** Email Retry Queue System prevents duplicate sends
- **Bug #8 (Nov 30, 2025):** Dynamic werkstatt discovery (getActiveWerkstaetten) for multi-tenant support
- **Bug #3 (Nov 28, 2025):** subject variable initialization fix in sendEntwurfEmail

---

## ARCHITECTURE OVERVIEW

### Function Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD FUNCTIONS TRIGGERS                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. FIRESTORE TRIGGERS (Realtime Event-Driven)             │
│     ├─ onStatusChange: fahrzeuge_* collection updates       │
│     ├─ onNewPartnerAnfrage: partnerAnfragen_* creation      │
│     └─ onUserApproved: users collection updates             │
│                                                              │
│  2. HTTP CALLABLE FUNCTIONS (UI-Initiated)                 │
│     ├─ createPartnerAutoLoginToken: Generate QR tokens      │
│     ├─ validatePartnerAutoLoginToken: Validate tokens       │
│     ├─ sendEntwurfEmail: Customer email with QR            │
│     ├─ parseDATPDF: GPT-4 Vision PDF analysis              │
│     └─ ... more                                             │
│                                                              │
│  3. SCHEDULED FUNCTIONS (Cloud Scheduler)                  │
│     ├─ monthlyBonusReset: 1st of month, 00:00            │
│     ├─ cleanupStaleSessions: Every 15 minutes              │
│     └─ processEmailRetryQueue: Every 5 minutes             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     MULTI-TENANT DATA FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER EVENT (Firestore)                                      │
│         ↓                                                         │
│  Extract werkstattId from collectionId (e.g., fahrzeuge_mosbach)│
│         ↓                                                         │
│  Determine notification type (status, anfrage, approval)         │
│         ↓                                                         │
│  Load Werkstatt Settings (einstellungen_{werkstattId})          │
│         ↓                                                         │
│  Template Resolution (Custom → Fallback → Default)              │
│         ↓                                                         │
│  Email Composition with Variable Substitution                    │
│         ↓                                                         │
│  AWS SES Send OR Queue for Retry                                │
│         ↓                                                         │
│  Log to email_logs & systemLogs for Audit Trail                 │
│         ↓                                                         │
│  MONITORING: CloudFunctions Logs + Firestore Collections        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## FUNCTION CATEGORIES & TRIGGERS

### 1. EMAIL FUNCTIONS (AWS SES) - 6 Functions

#### A. Firestore Trigger Functions (Automatic)

**Function 1: onStatusChange**
- **Trigger:** fahrzeuge_* collection document update
- **Condition:** status field changed
- **Action:** Send status update email to customer
- **Output Collections:** email_logs, emailRetryQueue

**Function 2: onNewPartnerAnfrage**
- **Trigger:** partnerAnfragen_* collection document create
- **Condition:** New partner service request
- **Action:** Notify all admins in werkstatt
- **Output Collections:** email_logs, emailRetryQueue

**Function 3: onUserApproved**
- **Trigger:** users collection document update
- **Condition:** status field changed to 'active'
- **Action:** Send approval notification to partner
- **Output Collections:** email_logs, emailRetryQueue

#### B. HTTP Callable Functions (Manual/UI-Triggered)

**Function 4: sendEntwurfEmail**
- **Trigger:** HTTP callable from entwuerfe-bearbeiten.html
- **Input:** kundenEmail, kundenname, kennzeichen, qrCodeUrl, fahrzeugId, price variants
- **Action:** Send quotation email with QR-code auto-login link
- **Features:** Dynamic pricing display, graceful degradation
- **Output:** email_logs, emailRetryQueue

**Function 5: sendEntwurfBestaetigtNotification**
- **Trigger:** HTTP callable from meine-anfragen.html
- **Input:** anfrageId, fahrzeugId, kundenEmail
- **Action:** Notify customer that quotation was accepted
- **Output:** email_logs, emailRetryQueue

**Function 6: sendEntwurfAbgelehntNotification**
- **Trigger:** HTTP callable from meine-anfragen.html
- **Input:** anfrageId, fahrzeugId, kundenEmail
- **Action:** Notify customer that quotation was rejected
- **Output:** email_logs, emailRetryQueue

### 2. AUTHENTICATION FUNCTIONS - 3 Functions

**Function 7: createPartnerAutoLoginToken**
- **Trigger:** HTTP callable from annahme.html (PDF generation)
- **Purpose:** Generate secure QR-code token for partner auto-login
- **Security:** Role-based access (werkstatt, admin, superadmin only)
- **Returns:** { token, loginUrl, expiresAt }
- **Storage:** partnerAutoLoginTokens collection
- **Validity:** 30 days, max 10 uses (configurable)

**Function 8: validatePartnerAutoLoginToken**
- **Trigger:** HTTP callable from partner-app/auto-login.html
- **Purpose:** Validate token and create Firebase custom token
- **Checks:** 
  - Token existence
  - Expiration time
  - Usage limit
  - Partner account existence
- **Returns:** { valid, partnerId, email, werkstattId, customToken, fahrzeugId }

**Function 9: ensurePartnerAccount**
- **Purpose:** Create Firebase Auth account for partner
- **Used by:** Partner registration workflow
- **Features:** Duplicate prevention, role assignment
- *(Details in section 4.2)*

### 3. PDF & DATA PROCESSING - 2 Functions

**Function 10: generateAngebotPDF**
- **Trigger:** HTTP callable from kva-erstellen.html
- **Purpose:** Generate server-side PDF with Puppeteer (multi-page support)
- **Technology:** Puppeteer-core + @sparticuz/chromium
- **Features:** Logo branding, QR-codes, multi-service support
- **Returns:** Base64-encoded PDF

**Function 11: parseDATPDF**
- **Trigger:** HTTP callable from annahme.html
- **Purpose:** Extract vehicle & parts data from DAT invoice using GPT-4 Vision
- **Technology:** OpenAI Vision API (multi-page image analysis)
- **Features:** Rate limiting (daily limit per user), auto-fill form data
- **Returns:** { fahrzeugdaten, ersatzteile, arbeitslohn, lackierung }
- **Cost:** ~€0.01-0.03 per PDF
- **Rate Limit:** Configured per werkstatt

### 4. SCHEDULED FUNCTIONS - 3 Functions

**Function 12: monthlyBonusReset**
- **Schedule:** 0 0 1 * * (1st of month, 00:00 Berlin time)
- **Purpose:** Reset bonusErhalten flags for all partners
- **Scope:** All active werkstätten (multi-tenant)
- **Operation:** Batch update with max 500 ops per batch
- **Logging:** systemLogs collection

**Function 13: cleanupStaleSessions**
- **Schedule:** Every 15 minutes
- **Purpose:** Delete inactive sessions older than 2 hours
- **Scope:** activeSessions_* collections (all werkstätten)
- **Operation:** Batch delete for performance
- **Logging:** systemLogs collection

**Function 14: processEmailRetryQueue**
- **Schedule:** Every 5 minutes
- **Purpose:** Retry failed emails with exponential backoff
- **Max Attempts:** 3 per email
- **Backoff:** 5min, 10min, 20min delays (2^n * 5min formula)
- **Features:** Rate limiting (100ms between sends), permanent failure tracking
- **Logging:** email_logs + systemLogs
- **Status Transitions:** pending_retry → sent OR failed_permanent

### 5. HELPER & UTILITY FUNCTIONS - 2+

**Function 15: getActiveWerkstaetten()**
- **Purpose:** Dynamically discover all active werkstatt IDs
- **Query:** users collection where role='werkstatt' AND status='active'
- **Used by:** monthlyBonusReset, cleanupStaleSessions (multi-tenant support)
- **Returns:** Array of werkstattIds

**Function 16: getAWSSESClient()**
- **Purpose:** Initialize AWS SES client with credentials from Secret Manager
- **Features:** Credential validation, sanitization (trim whitespace, check for control chars)
- **Error Handling:** Clear error messages if credentials missing
- **Region:** eu-central-1 (Frankfurt, DSGVO-konform)

---

## DETAILED FUNCTION SPECIFICATIONS

### EMAIL FUNCTIONS - Line-by-Line Analysis

#### onStatusChange (Lines 155-351)
```javascript
TRIGGER: .firestore.document("{collectionId}/{vehicleId}").onUpdate()
COLLECTION FILTER: Starts with "fahrzeuge_"

EXECUTION FLOW:
1. Extract werkstattId from collectionId (fahrzeuge_mosbach → mosbach)
2. Check if status actually changed (before.status === after.status → skip)
3. Get customer email from fahrzeugData
4. Load werkstatt settings + custom email templates
5. Fallback to hardcoded template if not found
6. Replace variables: kennzeichen, kundenName, oldStatus, newStatus, serviceTyp
7. XSS Prevention: Escape all template variables
8. Send via AWS SES OR queue for retry
9. Log to email_logs collection

ERROR HANDLING:
- Missing email → Skip (log warning)
- Settings not found → Use fallback
- AWS SES error → Add to emailRetryQueue (Bug #3 Fix)

VARIABLES SUBSTITUTED:
- {{kennzeichen}}: Vehicle license plate
- {{kundenName}}: Customer name
- {{oldStatus}} / {{newStatus}}: Status labels (translated)
- {{serviceTyp}}: Service type label (🎨 Lackierung, 🚗 Reifen, etc.)
- {{marke}}: Vehicle brand
- {{werkstattName}}: Workshop name from settings
- {{quickViewLink}}: Deep link to vehicle details

OUTPUT COLLECTIONS:
- email_logs (if sent successfully)
- emailRetryQueue (if AWS SES error)
```

#### onNewPartnerAnfrage (Lines 357-496)
```javascript
TRIGGER: .firestore.document("{collectionId}/{anfrageId}").onCreate()
COLLECTION FILTER: Starts with "partnerAnfragen_"

EXECUTION FLOW:
1. Extract werkstattId from collection name
2. Query users collection for admins in this werkstatt
3. Load email template (new-anfrage.html)
4. Replace variables with anfrage data
5. Send to ALL admin emails in single email (BCC-style)
6. Log to email_logs

ADMIN QUERY:
- role IN ["admin", "superadmin"]
- status = "active"
- werkstattId matches current

ERROR HANDLING:
- No admins found → Skip with warning
- AWS SES error → Queue for retry

VARIABLES SUBSTITUTED:
- {{partnerName}}: Partner company name
- {{serviceTyp}}: Service type
- {{kennzeichen}}: Vehicle license plate
- {{marke}}: Vehicle brand
- {{createdAt}}: Request creation timestamp
- {{anfrageLink}}: Deep link to anfrage detail

OUTPUT COLLECTIONS:
- email_logs
- emailRetryQueue (on error)
```

#### onUserApproved (Lines 501-xxx)
```javascript
TRIGGER: .firestore.document("users/{userId}").onUpdate()
CONDITION: status field changed to 'active'

EXECUTION FLOW:
1. Get partner email from user document
2. Load approval email template
3. Customize with partner name + werkstatt details
4. Send via AWS SES
5. Log to email_logs

ERROR HANDLING:
- Standard AWS SES retry queue

VARIABLES SUBSTITUTED:
- {{partnerName}}: Partner company name
- {{approvalDate}}: When approved (server timestamp)
- {{linkToPortal}}: Login link to partner portal
```

#### sendEntwurfEmail (Lines 4294-4586)
```javascript
TRIGGER: HTTP callable from UI
INPUT VALIDATION:
- kundenEmail (required, format validated)
- kundenname (required)
- kennzeichen (required)
- qrCodeUrl (required)
- fahrzeugId (optional)
- hasVarianten (boolean)
- summeBruttoOriginal (price)
- summeBruttoAftermarket (price)
- vereinbarterPreis (price)

EXECUTION FLOW:
1. Security: Check authentication
2. Validate email format (regex)
3. Initialize AWS SES
4. Format prices using Intl.NumberFormat('de-DE', 'currency')
5. Calculate savings if aftermarket option available
6. Build dynamic price section (HTML table with styling)
7. Compose full email HTML with header, content, button, footer
8. Send via AWS SES
9. Log to email_logs

EMAIL TEMPLATE FEATURES:
- Responsive HTML (inline CSS)
- Price comparison table (Original vs Aftermarket)
- Savings calculation & display
- QR-code button with dynamic URL
- Contact information footer
- Auto-generated timestamp

ERROR HANDLING:
- MessageRejected / AccessDenied / InvalidParameter → Graceful degradation
  (Log as "skipped" not "failed", continue workflow)
- Network/timeout errors → Queue for retry (exponential backoff)

OUTPUT COLLECTIONS:
- email_logs (status: "sent", "skipped", or queued_for_retry)
- emailRetryQueue (on transient errors)

PRICING DISPLAY LOGIC:
if (hasVarianten && originalPrice > 0 && aftermarketPrice > 0):
  Show comparison table with savings %
else if (einzelPrice > 0):
  Show single price in highlight box
else:
  No price section (buyer determines cost)
```

---

## EMAIL RETRY SYSTEM (BUG #3 FIX)

### Overview
**Goal:** Prevent duplicate emails from automatic Cloud Function retries

**Problem:** When AWS SES fails, throwing errors causes automatic function retries (exponential backoff by Firebase), leading to duplicate emails.

**Solution:** Controlled retry queue with max 3 attempts per email, processed every 5 minutes.

### Implementation

#### Collection: emailRetryQueue
```javascript
{
  _id: auto-generated,
  
  // Email data (reconstructable)
  emailData: {
    source: "Gaertner-marcel@web.de",
    toAddresses: ["customer@example.com"],
    subject: "🚗 Status-Update: AB-CD-123",
    htmlBody: "<html>...</html>"
  },
  
  // Metadata
  trigger: "status_change" | "new_anfrage" | "entwurf_email" | "approval",
  vehicleId: "docId" (optional),
  collectionId: "fahrzeuge_mosbach" (optional),
  anfrageId: "docId" (optional),
  fahrzeugId: "docId" (optional),
  werkstatt: "mosbach" (optional),
  
  // Retry tracking
  status: "pending_retry" | "sent" | "failed_permanent",
  retryCount: 0,
  nextRetryAt: Timestamp,
  createdAt: Timestamp,
  lastRetryAt: Timestamp (set after each retry attempt),
  lastError: "MessageRejected: Email address not verified",
  lastErrorCode: "MessageRejected",
  
  // Max 3 attempts configured
}
```

#### Retry Logic (processEmailRetryQueue function)
```
SCHEDULE: Every 5 minutes
PROCESSING:
1. Query: status="pending_retry" AND retryCount < 3, LIMIT 20
2. For each email:
   a. Reconstruct SendEmailCommand from emailData
   b. Attempt AWS SES send
   c. If SUCCESS:
      - Update status → "sent"
      - Log to email_logs (retryCount++)
      - Move to next email
   d. If FAIL:
      - newRetryCount = retryCount + 1
      - If newRetryCount >= 3:
        * Update status → "failed_permanent"
        * Log to email_logs as "failed_permanent"
      - Else:
        * Calculate nextRetryAt using exponential backoff
        * nextRetryAt = now + (2^retryCount * 5 minutes)
        * Attempt 1: 5 min delay
        * Attempt 2: 10 min delay
        * Attempt 3: 20 min delay
        * Update document with new nextRetryAt
3. Rate limit: 100ms between emails (avoid SES throttling)
4. Log summary to systemLogs

RATE LIMITING: Max 20 emails per 5-minute cycle
This prevents timeout and spreads load evenly
```

#### Email Flow with Retry

```
┌─────────────────────────────────────┐
│  EVENT: Status Changed              │
│  (fahrzeuge_mosbach document)        │
└──────────────┬──────────────────────┘
               ↓
       ┌──────────────────┐
       │ onStatusChange   │
       │ Cloud Function   │
       └────────┬─────────┘
                ↓
        ┌──────────────────┐
        │ AWS SES Attempt  │
        └────────┬─────────┘
                 ↓
         ┌───────────────┐
         │ Success?      │
         └───┬───────┬───┘
             │       │
           YES      NO
             │       │
             ↓       ↓
        Log to    Add to
        email_logs emailRetryQueue
             │       (retryCount=0)
             │       │
             │       └─→ [5 min delay]
             │           ↓
             │       processEmailRetryQueue
             │           (5-min schedule)
             │           │
             │           ├─→ Success?
             │           │   YES → email_logs (sent)
             │           │   NO  → retryCount++
             │           │         nextRetryAt = +10min
             │           │         └─→ [10 min delay]
             │           │             ↓
             │           │         processEmailRetryQueue
             │           │         (next cycle)
             │           │         ├─→ Success?
             │           │         │   YES → email_logs (sent)
             │           │         │   NO  → retryCount++
             │           │         │         nextRetryAt = +20min
             │           │         │         └─→ [20 min delay]
             │           │         │             ↓
             │           │         │         processEmailRetryQueue
             │           │         │         (final attempt)
             │           │         │         ├─→ Success?
             │           │         │         │   YES → email_logs (sent)
             │           │         │         │   NO  → PERMANENT FAIL
             │           │         │         │         email_logs (failed_permanent)
             │           │         │         │         status="failed_permanent"
             └───────────────────────────────────→ DONE
```

---

## SECURITY & ERROR HANDLING

### Authentication & Authorization

#### Role-Based Access Control (firestore.rules)

**Helper Functions:**
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function getUserRole() {
  return (request.auth.token.role != null)
    ? request.auth.token.role
    : (exists(...) ? get(...).data.role : null);
}

function isAdmin() {
  return isAuthenticated() && 
    (getUserRole() in ["admin", "werkstatt", "superadmin"]);
}

function isMitarbeiter() {
  return isAuthenticated() && 
    request.auth.token.selectedMitarbeiterId != null;
}

function isPartner() {
  return isAuthenticated() && getUserRole() == "partner";
}
```

#### Cloud Function Authorization

**createPartnerAutoLoginToken (Line 3286-3300):**
```javascript
// Only werkstatt/admin/superadmin can create tokens
if (!context.auth) {
  throw HttpsError("unauthenticated", "...");
}

const userRole = context.auth.token.role;
if (!["werkstatt", "admin", "owner", "superadmin"].includes(userRole)) {
  throw HttpsError("permission-denied", "...");
}
```

**parseDATPDF (Line 4032-4036):**
```javascript
// Only authenticated users
if (!context.auth) {
  throw HttpsError('unauthenticated', '...');
}
```

### XSS Prevention

**HTML Escaping (Lines 111-122):**
```javascript
function escapeHtml(text) {
  if (text == null) return '';
  if (typeof text !== 'string') {
    text = String(text);
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

**Usage in Templates (Line 250-252, 408-410):**
```javascript
// CORRECT - Always escape template variables
template = template.replace(
  new RegExp(`{{${key}}}`, "g"), 
  escapeHtml(variables[key])  // ← XSS Protection
);
```

### AWS SES Credential Validation (Lines 35-63)

```javascript
function getAWSSESClient() {
  let accessKeyId = awsAccessKeyId.value().trim();
  let secretAccessKey = awsSecretAccessKey.value().trim();
  
  // Validation: Check for invalid characters
  const invalidChars = /[\r\n\t]/g;
  if (invalidChars.test(accessKeyId) || invalidChars.test(secretAccessKey)) {
    throw new Error("Invalid AWS credentials format");
  }
  
  return new SESClient({
    region: "eu-central-1",  // DSGVO-konform
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    }
  });
}
```

### OpenAI API Key Sanitization (Lines 66-97)

```javascript
function getOpenAIApiKey() {
  let apiKey = openaiApiKey.value();
  
  // URL-decode if encoded (fixes node-fetch header validation)
  if (apiKey.includes('%')) {
    apiKey = decodeURIComponent(apiKey);
  }
  
  apiKey = apiKey.trim();
  
  // Validate format
  if (!apiKey.startsWith("sk-")) {
    console.warn("WARNING: OPENAI_API_KEY doesn't start with 'sk-'");
  }
  
  // Check for invalid HTTP header characters
  const invalidChars = /[\r\n\t]/g;
  if (invalidChars.test(apiKey)) {
    throw new Error("Invalid OPENAI_API_KEY format");
  }
  
  return apiKey;
}
```

### Email Validation (Lines 4323-4328)

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(kundenEmail)) {
  throw HttpsError("invalid-argument", "Ungültiges Email-Format");
}
```

### Graceful Degradation (Lines 4490-4532)

**sendEntwurfEmail error handling:**
```javascript
const errorCode = error.name || error.code || '';

// AWS SES Configuration errors → Log as "skipped", continue workflow
if (errorCode.includes('MessageRejected') ||
    errorCode.includes('AccessDenied') ||
    errorMessage.includes('not verified')) {
  
  // Log as "skipped" (workflow continues)
  await db.collection("email_logs").add({
    status: "skipped",
    reason: `AWS SES Configuration Error: ${errorCode}`
  });
  
  // Return success = workflow not blocked
  return {
    success: true,
    demoMode: true,
    message: "Email übersprungen (AWS SES nicht konfiguriert)"
  };
}

// Other errors → Queue for retry
console.log("Adding email to retry queue...");
```

---

## DEPENDENCIES & SECRETS MANAGEMENT

### package.json Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-ses": "^3.525.0",        // AWS Email Service
    "@sparticuz/chromium": "^119.0.0",        // Chromium for Puppeteer
    "firebase-admin": "^12.0.0",              // Firebase Admin SDK
    "firebase-functions": "^4.5.0",           // Cloud Functions SDK
    "openai": "^4.75.0",                      // GPT-4 Vision API
    "puppeteer-core": "^21.11.0"              // Server-side PDF generation
  }
}
```

### Secret Manager Integration

**Definition (Lines 29-32):**
```javascript
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const awsAccessKeyId = defineSecret('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = defineSecret('AWS_SECRET_ACCESS_KEY');
```

**Setup Commands:**
```bash
# Set secrets
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set AWS_ACCESS_KEY_ID
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY

# Verify setup
firebase functions:secrets:access OPENAI_API_KEY --dry-run
firebase functions:secrets:access AWS_ACCESS_KEY_ID --dry-run
firebase functions:secrets:access AWS_SECRET_ACCESS_KEY --dry-run
```

**Runtime Binding:**
```javascript
// Functions that use secrets must declare them:
exports.myFunction = functions
  .region("europe-west3")
  .runWith({
    secrets: [awsAccessKeyId, awsSecretAccessKey]  // Bind secrets
  })
  .https.onCall(async (data, context) => {
    const sesClient = getAWSSESClient();  // Access loaded secrets
  });
```

---

## COLLECTION REFERENCES & DATA FLOW

### Collections Used

| Collection | Type | Purpose | Lifecycle |
|------------|------|---------|-----------|
| **fahrzeuge_{werkstattId}** | Multi-tenant | Vehicle master data | Vehicle creation → completion |
| **partnerAnfragen_{werkstattId}** | Multi-tenant | Partner service requests | Creation → acceptance/rejection |
| **email_logs** | Global | All email send history | Permanent audit log |
| **emailRetryQueue** | Global | Failed emails awaiting retry | 3 attempts then permanent fail |
| **systemLogs** | Global | System events (scheduled jobs) | Monitoring & audit trail |
| **users** | Global | User accounts & roles | Registration → active |
| **partners_{werkstattId}** | Multi-tenant | Partner company profiles | Pending → approved |
| **einstellungen_{werkstattId}** | Multi-tenant | Werkstatt settings, logos, email templates | Admin configuration |
| **partnerAutoLoginTokens** | Global | QR-code auto-login tokens | Creation → expiration (30 days) |
| **activeSessions_{werkstattId}** | Multi-tenant | Active user sessions | Login → logout/timeout |
| **emailRetryQueue** | Global | Pending email retries | Queued → sent/permanent_fail |

### Multi-Tenant Collection Pattern

**Format:** `collectionName_werkstattId`

**Examples:**
- `fahrzeuge_mosbach`
- `fahrzeuge_heidelberg`
- `partnerAnfragen_mosbach`
- `partners_mosbach`

**Extraction in Cloud Functions (Lines 173, 373):**
```javascript
const werkstatt = collectionId.replace("fahrzeuge_", "");
// "fahrzeuge_mosbach" → "mosbach"
```

---

## MONITORING & LOGGING

### Log Collections

#### email_logs (Permanent Audit Trail)

```javascript
{
  _id: auto-generated,
  
  // Email info
  to: "customer@example.com",
  subject: "🚗 Status-Update: AB-CD-123",
  
  // Event info
  trigger: "status_change" | "new_anfrage" | "entwurf_email" | "approval",
  vehicleId: "docId",
  collectionId: "fahrzeuge_mosbach",
  anfrageId: "docId",
  werkstatt: "mosbach",
  
  // Send result
  status: "sent" | "failed_permanent" | "queued_for_retry" | "skipped",
  sentAt: Timestamp,
  retryCount: 0,
  
  // Error tracking (if failed)
  error: "MessageRejected: Email not verified",
  errorCode: "MessageRejected",
  
  // Retry queue reference (if queued)
  queueId: "emailRetryQueue_docId"
}
```

#### systemLogs (Scheduled Job Monitoring)

```javascript
{
  _id: auto-generated,
  
  type: "stale_session_cleanup" | "email_retry_queue_processed" | "bonus_reset" | "error",
  timestamp: Timestamp,
  
  // For stale session cleanup
  deletedCount: 42,
  werkstaetten: ["mosbach", "heidelberg"],
  thresholdHours: 2,
  
  // For email retry processing
  summary: {
    success: true,
    processed: 20,
    sent: 18,
    failed: 2,
    permanentFail: 0
  },
  
  // For errors
  error: "AWS SES timeout",
  stack: "Error stack trace..."
}
```

### Firestore Security Rules for Logging

```javascript
// Admin only access (for debugging)
match /email_logs/{logId} {
  allow read: if isAdmin();
  allow write: if false;  // Cloud Functions only
}

match /systemLogs/{logId} {
  allow read: if isAdmin();
  allow write: if false;  // Cloud Functions only
}
```

### Cloud Functions Logs

**Access via Firebase Console:**
```
https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions/logs
```

**Via CLI:**
```bash
firebase functions:log
firebase functions:log --only onStatusChange
firebase functions:log --limit 50
```

**Log Output Format:**
```
🔑 createPartnerAutoLoginToken called
✅ Auth check passed - Role: werkstatt
🔑 Auto-login token created: abc12345... (expires: 2025-01-02T...)
📧 Vehicle status change in: fahrzeuge_mosbach (Werkstatt: mosbach, Fahrzeug: xyz)
📧 Status changed: begutachtung → in_arbeit
✅ Email sent to: customer@example.com
📬 Found 5 emails to retry
⏰ Retry scheduled (attempt 2/3) - next retry in 10 minutes
❌ PERMANENT FAILURE (3 attempts exhausted)
```

---

## ISSUES & RECOMMENDATIONS

### Current Issues

#### 1. **Rate Limiting Gap for Email Functions**
**Severity:** ⚠️ MEDIUM

**Issue:** Email functions (onStatusChange, onNewPartnerAnfrage) have no rate limiting. A single status change could trigger 100+ emails if Firestore document is updated repeatedly.

**Impact:** Email quota exhaustion, cost spike

**Recommendation:**
```javascript
// Add to onStatusChange:
const docId = context.params.vehicleId;
const key = `email_send_${docId}`;
const lastEmailTime = await db.collection('rateLimit').doc(key).get();

if (lastEmailTime.exists) {
  const lastSent = lastEmailTime.data().lastSent.toMillis();
  if (Date.now() - lastSent < 60000) {  // < 1 min
    console.log('⏭️ Rate limit: Email skipped (sent in last minute)');
    return null;
  }
}

// ... send email ...

await db.collection('rateLimit').doc(key).set({
  lastSent: admin.firestore.FieldValue.serverTimestamp()
});
```

#### 2. **Missing Firestore Index for emailRetryQueue**
**Severity:** 🔴 CRITICAL

**Issue:** processEmailRetryQueue queries:
```javascript
.where('status', '==', 'pending_retry')
.where('retryCount', '<', 3)
```

This requires a composite index!

**Requirement:** Create index in firestore.indexes.json:
```json
{
  "collectionGroup": "emailRetryQueue",
  "queryScope": "Collection",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "retryCount", "order": "ASCENDING" }
  ]
}
```

#### 3. **No Daily Digest / Email Batching**
**Severity:** 🟡 LOW

**Issue:** High-volume partner requests could result in 100+ notification emails to admins in a single day.

**Recommendation:** Add daily digest function that batches emails (runs 18:00 daily)

#### 4. **Hardcoded SENDER_EMAIL**
**Severity:** 🟡 MEDIUM

**Issue:** Line 100 has hardcoded sender:
```javascript
const SENDER_EMAIL = "Gaertner-marcel@web.de";  // ← Hardcoded
```

This should be dynamic per werkstatt.

**Recommendation:**
```javascript
// Load from einstellungen_{werkstattId}
const settings = await db.collection(`einstellungen_${werkstatt}`).doc('config').get();
const SENDER_EMAIL = settings.data().profil?.email || "Gaertner-marcel@web.de";
```

#### 5. **Missing OpenAI Rate Limiting in parseDATPDF**
**Severity:** 🟡 MEDIUM

**Issue:** parseDATPDF has rate limiting (lines 4057-4077) but it's only per-user daily limit. No per-minute throttling for cost control.

**Recommendation:** Add per-request cost tracking
```javascript
// Track cumulative monthly costs per werkstatt
const costTracking = await db.collection('openaiCostTracking')
  .doc(werkstatt).get();

const currentCost = costTracking.data().monthlyCost || 0;
const estimatedRequestCost = 0.02;  // ~€0.02 per Vision call

if (currentCost + estimatedRequestCost > 50) {  // €50/month limit
  throw HttpsError('resource-exhausted', 
    'OpenAI budget für diesen Monat aufgebraucht');
}
```

#### 6. **No Timezone Handling in Scheduled Functions**
**Severity:** ⚠️ MEDIUM

**Issue:** Scheduled functions use 'Europe/Berlin' timezone, but users might be in different zones. Bonus reset runs at midnight Berlin time, which might be unexpected.

**Recommendation:** Clarify in documentation + allow per-werkstatt configuration

#### 7. **Email Template Files Not Versioned**
**Severity:** 🟡 LOW

**Issue:** Email templates stored as local files (email-templates/*.html) cannot be versioned or updated without redeploying functions.

**Recommendation:** Store templates in Firestore
```javascript
// Load from DB instead
const templateDoc = await db.collection('emailTemplates')
  .doc(`${trigger}_${language}`).get();
const template = templateDoc.data().html;
```

---

### Recommendations (Priority Order)

| Priority | Recommendation | Impact | Effort |
|----------|---------------|--------|--------|
| 🔴 CRITICAL | Create composite index for emailRetryQueue | Function will fail without it | 15min |
| 🔴 CRITICAL | Test email functions with AWS SES errors | Verify retry logic works | 1h |
| 🟠 HIGH | Add per-status rate limiting | Prevent email spam | 2h |
| 🟠 HIGH | Dynamic SENDER_EMAIL from settings | Multi-tenant compliance | 1h |
| 🟡 MEDIUM | Add daily email digest option | Better UX for admins | 4h |
| 🟡 MEDIUM | OpenAI cost tracking per werkstatt | Budget control | 2h |
| 🟢 LOW | Move templates to Firestore | Better maintainability | 3h |
| 🟢 LOW | Add function performance metrics | Monitoring | 2h |

---

### Testing Recommendations

#### Unit Tests (Local)
```bash
# Test rate limiter
npm test tests/unit/rate-limiter.test.js

# Test email retry logic
npm test tests/unit/email-retry-logic.test.js

# Test parseDATPDF extraction
npm test tests/unit/parse-pdf.test.js
```

#### Integration Tests (Emulator)
```bash
# Start emulator
firebase emulators:start --only functions

# Test sendEntwurfEmail
curl -X POST http://localhost:5001/auto-lackierzentrum-mosbach/europe-west3/sendEntwurfEmail \
  -H "Content-Type: application/json" \
  -d '{
    "kundenEmail": "test@example.com",
    "kundenname": "Test Customer",
    "kennzeichen": "AB-CD-123",
    "qrCodeUrl": "https://..."
  }'

# Test createPartnerAutoLoginToken
curl -X POST http://localhost:5001/auto-lackierzentrum-mosbach/europe-west3/createPartnerAutoLoginToken \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "partnerId": "partner123",
    "werkstattId": "mosbach"
  }'
```

#### Production Tests
```bash
# Monitor logs
firebase functions:log --follow

# Test with real AWS SES (staging environment)
# 1. Send test email via sendEntwurfEmail
# 2. Verify email_logs shows "sent"
# 3. Check email delivery to real address
# 4. Test retry by simulating error

# Test scheduled jobs
firebase deploy --only functions
# Wait for next execution + monitor logs
firebase functions:log
```

---

## APPENDIX A: Function Statistics

```
Total Exported Functions: 16
Total Lines of Code: 5,774

BREAKDOWN BY CATEGORY:
- Email Functions (6): 1,200 lines (21%)
- Auth Functions (3): 300 lines (5%)
- PDF/Data Functions (2): 400 lines (7%)
- Scheduled Jobs (3): 500 lines (9%)
- Helpers & Utilities: 100 lines (2%)
- Configuration & Imports: 50 lines (1%)
- Code Duplication / Comments: 3,224 lines (55%)

PERFORMANCE STATS:
- Smallest Function: getAWSSESClient (30 lines)
- Largest Function: parseDATPDF (300+ lines with Vision prompt)
- Median Function Size: 150 lines
- Comment/Code Ratio: 15%

DEPENDENCIES:
- npm packages: 6 (AWS SDK, Firebase, OpenAI, Puppeteer, Chromium)
- Firestore Collections Read: 8 collections
- Firestore Collections Write: 4 collections
- External APIs: 2 (AWS SES, OpenAI Vision)
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-02  
**Author:** Cloud Functions Analysis Agent  
**Status:** Complete & Ready for Review
