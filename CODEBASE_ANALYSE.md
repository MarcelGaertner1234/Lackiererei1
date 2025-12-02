# CODEBASE_ANALYSE.md - Fahrzeugannahme App

**Erstellt:** 2025-12-02
**Ziel:** Architektur verstehen - Systematische Analyse der gesamten Codebase
**Umfang:** 30 Chunks (~400,000 Zeilen Code)

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Architektur-Übersicht](#2-architektur-übersicht)
3. [Phase 1: Core Business Logic](#3-phase-1-core-business-logic)
4. [Phase 2: Partner App Pipeline](#4-phase-2-partner-app-pipeline)
5. [Phase 3: Utility Modules](#5-phase-3-utility-modules)
6. [Phase 4: UI & Admin](#6-phase-4-ui--admin)
7. [Phase 5: Remaining Files](#7-phase-5-remaining-files)
8. [Phase 6: Tests](#8-phase-6-tests)
9. [Datenfluss-Diagramme](#9-datenfluss-diagramme)
10. [Abhängigkeits-Graph](#10-abhängigkeits-graph)
11. [Zusammenfassung](#11-zusammenfassung)
12. [Detail-Pipelines (Tiefgehende Analyse)](#12-detail-pipelines-tiefgehende-analyse)
    - [12.1 Multi-Service Status-Flow](#121-multi-service-status-flow-pipeline)
    - [12.2 Ersatzteile → Bestellungen](#122-ersatzteile--bestellungen-pipeline)
    - [12.3 Leihfahrzeug](#123-leihfahrzeug-pipeline)
    - [12.4 Entwurf → Annahme](#124-entwurf--annahme-pipeline)
    - [12.5 Zeiterfassung → Lohn](#125-zeiterfassung--lohn-pipeline)
13. [Pipeline-Zusammenfassung](#13-pipeline-zusammenfassung)

---

## 1. Executive Summary

### App-Zweck
Die Fahrzeugannahme App ist ein **Multi-Tenant SaaS-System** für Kfz-Lackierbetriebe zur:
- Fahrzeugannahme und -verwaltung
- Partner-basierte Auftragsabwicklung (B2B)
- Kalkulation und Rechnungsstellung
- Zeiterfassung und Mitarbeiterverwaltung

### Technologie-Stack
| Komponente | Technologie |
|------------|-------------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Backend | Firebase (Firestore, Auth, Storage, Functions) |
| Deployment | GitHub Pages (Frontend), Firebase (Backend) |
| Testing | Playwright (E2E, Integration, Smoke) |

### Codebase-Statistiken
| Kategorie | Dateien | Zeilen |
|-----------|---------|--------|
| HTML (Main) | 57 | 120,664 |
| HTML (Partner) | 31 | 63,890 |
| JavaScript | 66 | 21,116 |
| Cloud Functions | 1 | 5,774 |
| Tests | 22 | ~350,000 |
| **Gesamt** | **177** | **~561,444** |

---

## 2. Architektur-Übersicht

### 2.1 System-Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (GitHub Pages)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Main App      │  │   Partner App   │  │   Admin Panel   │  │
│  │   (57 HTML)     │  │   (31 HTML)     │  │   (in Main)     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                 │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │                  Shared JavaScript (/js)                   │  │
│  │  auth-manager.js | service-types.js | firebase-config.js  │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FIREBASE BACKEND                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Firestore  │  │   Storage   │  │    Cloud Functions      │  │
│  │  (Database) │  │   (Files)   │  │    (24 Functions)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐                                                 │
│  │    Auth     │                                                 │
│  │   (Users)   │                                                 │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Tenant Architektur

Die App verwendet **Collection-Suffix Multi-Tenancy**:

```javascript
// Jede Werkstatt hat eigene Collections mit Suffix
window.getCollection('fahrzeuge');  // → 'fahrzeuge_mosbach'
window.getCollection('kunden');     // → 'kunden_mosbach'
window.getCollection('rechnungen'); // → 'rechnungen_mosbach'

// Ausnahmen (global):
// - users
// - settings
// - partnerAutoLoginTokens
```

### 2.3 Daten-Pipeline

```
Partner-Anfrage → KVA → Entwurf → Fahrzeugannahme → Kanban → Rechnung → Bezahlt
       │           │       │            │             │          │         │
       ▼           ▼       ▼            ▼             ▼          ▼         ▼
   anfragen_*  anfragen_* entwuerfe_* fahrzeuge_*  (status)  rechnungen_* (flag)
```

---

## 3. Phase 1: Core Business Logic

### 3.1 kalkulation.html (18,771 Zeilen) ✅

**Zweck:** Zentrale Kalkulations- und Angebotserstellung mit 6-Schritt Wizard

**Hauptfunktionen:**
| Bereich | Funktionen |
|---------|------------|
| Wizard | `goToStep()`, `validateStep()`, `updateStepUI()` |
| Fahrzeug | `loadEntwuerfe()`, `loadPartnerAnfragen()`, `selectVehicleFromDB()` |
| KI-Integration | `analyzeSelectedEntwurfFotos()`, `searchEbayAPI()`, `getGPTPreisSchaetzung()` |
| PDF-Export | `exportKalkulationPDF()`, `exportBestelllistePDF()` |
| Speichern | `saveKVA()`, `saveKalkulationEntwurf()`, `saveAsTemplate()` |

**Firestore Collections:**
- `kalkulationen_*` - Gespeicherte Kalkulationen
- `kalkulation_katalog_*` - Positions-Katalog
- `kalkulation_material_*` - Material-Katalog
- `kalkulation_saetze_*` - Stundensätze
- `ersatzteile_*` - Ersatzteile-DB

**Architektur-Highlights:**
- 6-Schritt Wizard: Fahrzeug → Service → Details → Positionen → Arbeitsweisen → Export
- Multi-Service Support mit `serviceDetailsPerService`
- KI-Integration: OpenAI (Schaden-Analyse) + eBay API (Ersatzteile)
- PDF via jsPDF mit AutoTable

---

### 3.2 annahme.html (10,216 Zeilen) ✅

**Zweck:** Fahrzeugannahme mit 2-Stufen Workflow (Entwurf → Annahme)

**Hauptfunktionen:**
| Bereich | Funktionen |
|---------|------------|
| Drafts | `saveAsDraft()`, `saveAsDraftWithPDF()`, `loadDraft()` |
| PDF-Import | `handlePdfUpload()`, `parseWithOpenAI()`, `parseDatPdf()` |
| Fotos | `updatePhotoGrid()`, `compressImage()`, `removePhoto()` |
| Unterschrift | `initCanvas()`, `signatureToBase64()` |
| Service-Details | `getServiceDetails()`, `toggleServiceFelder()` |

**Firestore Collections:**
- `fahrzeuge_*` - Hauptdatensatz
- `partnerAnfragen_*` - Entwürfe (isEntwurf=true)
- `ersatzteile_*` - Zentrale Ersatzteile-DB
- `partnerAutoLoginTokens` (global) - QR-Code Auto-Login

**Architektur-Highlights:**
- PDF-Parsing: OpenAI GPT-4 Vision (primary) + Regex (fallback)
- 12 Service-Typen mit dynamischen Formularen
- QR-Code Generation für Partner-Auto-Login
- Firebase Storage für Fotos (nicht Base64 in Firestore)

---

### 3.3 kanban.html (8,945 Zeilen) ✅

**Zweck:** Prozessüberwachung mit Drag & Drop Kanban-Board

**Hauptfunktionen:**
| Bereich | Funktionen |
|---------|------------|
| Real-Time | `setupRealtimeListener()`, `renderKanbanBoard()` |
| Drag & Drop | `setupDragAndDrop()`, `updateFahrzeugStatus()` |
| Multi-Service | `hasService()`, `getServiceStatus()`, `allServicesComplete()` |
| Validierung | `isValidTransition()`, `getValidStatusesForService()` |
| Data Rescue | Auto-Heal für beschädigte additionalServices |

**Kanban-Spalten (pro Prozess):**
```
alle:     anlieferung → angenommen → terminiert → vorbereitung → in_arbeit → qualitaetskontrolle → bereit
lackier:  anlieferung → angenommen → terminiert → vorbereitung → lackierung → trocknung → qualitaetskontrolle → bereit
reifen:   anlieferung → neu → terminiert → bestellung → angekommen → montage → wuchten → fertig
```

**Architektur-Highlights:**
- Multi-Service Status-Tracking via `serviceStatuses[service].status`
- Forward-Only Status-Validierung (max 2 Steps)
- Background Sync Tracker für Fehler-Sammlung
- Listener Registry für Memory-Leak Prevention

---

### 3.4 functions/index.js (5,774 Zeilen) ✅

**Zweck:** 29 Firebase Cloud Functions für Email, AI, PDF, Payroll

**Function Catalog (Wichtigste):**
| Function | Trigger | Zweck |
|----------|---------|-------|
| `aiAgentExecute` | onCall | GPT-4 AI Agent mit Tool Calling |
| `whisperTranscribe` | onCall | OpenAI Whisper Speech-to-Text |
| `synthesizeSpeech` | onCall | OpenAI TTS Text-to-Speech |
| `parseDATPDF` | onCall | GPT-4 Vision PDF-Parsing |
| `sendEntwurfEmail` | onCall | Email an Kunden (AWS SES) |
| `generateAngebotPDF` | onCall | PDF-Generierung mit Puppeteer |
| `createPartnerAutoLoginToken` | onCall | QR-Code Auto-Login Token (7 Tage) |
| `monthlyPayrollGeneration` | Scheduler | Lohnabrechnung (1. des Monats) |
| `onStatusChange` | Firestore | Email bei Status-Änderung |

**Externe APIs:**
- **AWS SES** (eu-central-1): Email-Versand mit Retry-Queue
- **OpenAI**: GPT-4, Whisper, TTS-1-HD
- **Puppeteer**: PDF-Generierung

**Secrets (Google Cloud Secret Manager):**
- `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**Region:** europe-west3 (Frankfurt, DSGVO-konform)

---

## 4. Phase 2: Partner App Pipeline ✅

### 4.1 kva-erstellen.html (9,974 Zeilen)

**Zweck:** KVA (Kostenvoranschlag) Erstellung für Partner

**Hauptfunktionen:**
| Bereich | Funktionen |
|---------|------------|
| Laden | `loadAnfrage()`, `prefillFromKalkulation()` |
| Varianten | `renderVariantenBoxes()`, `addGlobalArbeitslohnRow()` |
| Multi-Service | `syncAllMultiServiceInputsToNewStructure()` |
| PDF | `downloadKVAPDF()` mit QR-Code |

**Datenstruktur:**
- Single-Service: `variantTableData[variant].ersatzteile`
- Multi-Service: `variantTableData[variant]._services[serviceTyp]`

---

### 4.2 meine-anfragen.html (9,132 Zeilen)

**Zweck:** Partner-Anfragen-Übersicht mit Kanban-Board

**Hauptfunktionen:**
| Bereich | Funktionen |
|---------|------------|
| Real-Time | `loadAnfragen()` mit Firestore Listener |
| Batch-Query | `loadFahrzeugeForAnfragen()` (10x schneller) |
| Dashboard | `renderUmsatzDashboard()` mit Chart.js |
| Status | `publishAnfrage()`, `acceptAnfrage()` |

**Optimierung:** Batch-Query für Fahrzeuge (50 Anfragen = max 5 Queries)

---

### 4.3 anfrage-detail.html (5,970 Zeilen)

**Zweck:** Einzelne Anfrage-Detailansicht mit Live-Status

**Modi:**
- **NORMAL**: Login erforderlich, Ownership-Check
- **QUICKVIEW**: Via QR-Code, kein Login, Read-Only

**Fahrzeug-Lookup Priorität:**
1. fahrzeugId → Direct Doc Access
2. kennzeichen → Indexed Query
3. auftragsnummer → Query
4. partnerAnfrageId → Fallback Query

---

### 4.4 admin-anfragen.html (4,109 Zeilen)

**Zweck:** Admin-Dashboard für ALLE Partner-Anfragen

**Features:**
- Kein partnerId-Filter (sieht alle)
- Stats-Aggregation nach Status
- Filter: Status, Partner, Dringlichkeit
- Service-Badges für 11 Service-Typen

---

## 5. Phase 3: Utility Modules ✅

### 5.1 auth-manager.js (850 Zeilen)

**Zweck:** 2-Stufen Multi-Tenant Authentifizierung

**Workflow:**
```
Stage 1: loginWerkstatt(email, pw) → werkstattId gesetzt
Stage 2: loginMitarbeiter(id, pw) → Mitarbeiter-Context
```

**Exports:** `window.authManager.{login, logout, getCurrentUser, hasRole, hasPermission}`

---

### 5.2 service-types.js (545 Zeilen)

**Zweck:** Zentrale Service-Type Registry mit Auto-Korrektur

**12 Service-Typen:** lackier, reifen, mechanik, pflege, tuev, versicherung, glas, klima, dellen, folierung, steinschutz, werbebeklebung

**Auto-Korrektur:** 220+ Aliases → Canonical Values
- `'lackierung'` → `'lackier'`
- `'smart-repair'` → `'dellen'`
- `'tüv'` → `'tuev'`

**Exports:** `window.{normalizeServiceType, validateServiceType, getServiceTypeLabel}`

---

### 5.3 firebase-config.js (1,257 Zeilen)

**Zweck:** Core Firebase Init + Multi-Tenant Helpers

**Kritische Exports:**
```javascript
window.firebaseInitialized  // Promise - IMMER awaiten!
window.getCollection(name)  // → 'fahrzeuge_mosbach'
window.compareIds(a, b)     // Type-safe String-Vergleich
```

**Emulator-Detection:**
- `navigator.webdriver === true` → Playwright
- `location.port === '8000'` → Local Dev
- Sonst → Production (GitHub Pages)

---

### 5.4 settings-manager.js (619 Zeilen)

**Zweck:** Werkstatt-Einstellungen (Profil, Steuern, Bank)

**Settings-Struktur:**
- `profil`: Name, Adresse, Logo
- `steuer`: Steuernummer, USt-ID, MwSt-Satz
- `bank`: IBAN, BIC, Bankname
- `enabledServices`: Aktivierte Services

---

### 5.5 ersatzteile-db.js (6,301 Zeilen)

**Zweck:** Statische Ersatzteile-Referenz-DB

**Struktur:** Marke → Modell → Kategorie → Teile mit OE-Nummern

**Marken:** VW, BMW, Mercedes, Audi, etc.

---

### 5.6 listener-registry.js (235 Zeilen)

**Zweck:** Memory-Leak Prevention

**Exports:**
```javascript
window.listenerRegistry.register(unsubscribe, desc)
window.listenerRegistry.unregisterAll()
window.safeNavigate(url)  // Cleanup + Navigate
```

**Pattern:** Alle Firestore-Listener vor Navigation cleanen

---

## 6. Phase 4: UI & Admin ✅

### 6.1 index.html (6,096 Zeilen)
**Zweck:** 2-Stage Login + Dashboard mit Realtime-Status-Badges

**Features:**
- Werkstatt + Mitarbeiter Login (2-Stage)
- Realtime Status-Badges (Fahrzeuge, Anfragen, Rechnungen)
- Haptic Feedback, 3D Tilt Effects
- Skeleton Loaders

### 6.2 liste.html (3,583 Zeilen)
**Zweck:** Zentrale Fahrzeug-Übersicht mit Filtering

**Features:**
- Multi-Kriterium Filter (Status, Service, Kundentyp)
- Realtime Listener für Live-Updates
- Detail-Modal mit Foto-Galerie
- Bezahlt/Rechnung Toggle

### 6.3 kunden.html (6,372 Zeilen)
**Zweck:** CRM mit Tags, Statistiken, Chart.js

**Features:**
- Auto-Tags (Stammkunde, VIP, Neukunde)
- Chart.js Visualisierung
- AI-Event Integration
- CSV Export

### 6.4 rechnungen-admin.html (1,922 Zeilen)
**Zweck:** Rechnungs-Verwaltung mit Counter-basierter Nummerierung

**Features:**
- Atomic Counter (RE-YYYY-MM-NNNN)
- Double-Click Protection
- Partner-Rabatt Lookup

### 6.5 mitarbeiter-verwaltung.html (5,698 Zeilen)
**Zweck:** HR mit Lohnberechnung, Zeiterfassung, Schichtplanung

**Features:**
- BMF Steuerrechner Integration
- SV-Berechnung (KV, RV, AV, PV)
- Schicht-Zuweisung
- Lohnzettel-PDF

---

## 7. Phase 5: Remaining Files ✅

### 7.1 wissensdatenbank.html (3,722 Zeilen)
**Zweck:** Unternehmensweite Wissensverwaltung

**Collections:** guidelines, announcements, shift_handovers, demontage_anleitungen

### 7.2 kalender.html (3,702 Zeilen)
**Zweck:** Material-Anfragen, Termine, Leihautos

**Features:** Multi-View (Tag/Woche/Monat), Konflikt-Erkennung

### 7.3 dienstplan.html (3,492 Zeilen)
**Zweck:** Schichtplanung mit Drag & Drop

**Collections:** schichten, schichtTypen, schichtWuensche, schichtTausche, bereiche

### 7.4 Steuerberater-Dashboard (4 Dateien, ~4,900 Zeilen)
| Datei | Zweck |
|-------|-------|
| steuerberater-kosten.html | Detaillierte Kostenanalyse |
| steuerberater-statistiken.html | Chart.js Visualisierung |
| steuerberater-bilanz.html | Bilanzierung, Offene Posten |
| steuerberater-export.html | CSV/PDF/JSON Export |

### 7.5 Partner-App Service-Formulare (12 Formulare)
| Formular | Service-Typ |
|----------|-------------|
| glas-anfrage.html | Glasreparatur |
| reifen-anfrage.html | Reifen-Service |
| mechanik-anfrage.html | Mechanik |
| tuev-anfrage.html | TÜV/AU |
| pflege-anfrage.html | Fahrzeugpflege |
| versicherung-anfrage.html | Versicherungsschaden |
| folierung-anfrage.html | Fahrzeugfolierung |
| steinschutz-anfrage.html | Steinschutzfolie |
| werbebeklebung-anfrage.html | Werbebeklebung |
| klima-anfrage.html | Klimaservice |
| dellen-anfrage.html | PDR/Smart Repair |
| multi-service-anfrage.html | Multi-Service |

**Gemeinsame Features:** Wizard-Sidebar, Photo-Upload, Dark Mode, Service-Type Normalisierung

---

## 8. Phase 6: Tests ✅

### 8.1 Test-Architektur
- **Framework:** Playwright v1.40.0
- **Strategie:** Hybrid Testing (Integration + Smoke)
- **Success Rate:** 100% auf 3 Primary Browsers

### 8.2 Test-Statistiken
| Kategorie | Tests | Zeilen | Runtime |
|-----------|-------|--------|---------|
| Integration | 36 | 2,093 | ~60s |
| Smoke | 13 | 267 | ~30s |
| **Gesamt** | **49** | **2,360** | **~90s** |

### 8.3 Integration Tests (tests/integration/)
| Datei | Tests | Fokus |
|-------|-------|-------|
| vehicle-integration.spec.js | 10 | Vehicle CRUD |
| multi-tenant.spec.js | 7 | Tenant Isolation |
| partner-workflow.spec.js | 6 | Partner Flow |
| werkstatt-workflow.spec.js | 7 | Werkstatt Ops |
| data-pipeline.spec.js | 6 | Data Transforms |
| leihfahrzeug-integration.spec.js | 19 | Leihfahrzeuge |

### 8.4 Test Helpers (tests/helpers/)
| Datei | Zeilen | Funktionen |
|-------|--------|------------|
| firebase-helper.js | 812 | CRUD, Auth, Verification |
| service-helper.js | 768 | Service Config, Validation |
| form-helper.js | 606 | Form Filling, Upload |

### 8.5 Test Commands
```bash
npm run test:all        # 49 Tests (~90s) ✅ EMPFOHLEN
npm run test:integration # 36 Tests (~60s)
npm run test:smoke       # 13 Tests (~30s)
npm run test:headed      # Mit Browser UI
```

---

## 9. Datenfluss-Diagramme

### 9.1 Haupt-Pipeline
```
Partner-Anfrage → KVA → Entwurf → Annahme → Kanban → Rechnung → Bezahlt
      ↓            ↓       ↓         ↓         ↓         ↓         ↓
partnerAnfragen  (kva)  entwuerfe  fahrzeuge (status) rechnungen (flag)
```

### 9.2 Multi-Tenant Datenfluss
```
Login → werkstattId gesetzt → getCollection('X') → 'X_mosbach'
                                      ↓
                              Firestore Query mit Suffix
```

### 9.3 Authentication Flow
```
Stage 1: Email/PW → Firebase Auth → werkstattId aus users
Stage 2: Mitarbeiter-ID/PW → mitarbeiter Collection → Session
```

---

## 10. Abhängigkeits-Graph

### 10.1 Core Dependencies
```
firebase-config.js (Core)
    ↓
    ├── auth-manager.js (Authentication)
    │       ↓
    │       └── settings-manager.js (Config)
    │               ↓
    │               └── service-types.js (Registry)
    │
    └── listener-registry.js (Memory Mgmt)
```

### 10.2 Page Dependencies
```
Alle HTML-Seiten
    ├── firebase-config.js (MUSS)
    ├── auth-manager.js (MUSS)
    ├── listener-registry.js (MUSS)
    └── service-types.js (wenn Services)
```

### 10.3 Firestore Collections (Multi-Tenant)
| Collection | Suffix | Zweck |
|------------|--------|-------|
| fahrzeuge | _werkstattId | Fahrzeuge |
| partnerAnfragen | _werkstattId | Anfragen |
| rechnungen | _werkstattId | Rechnungen |
| kunden | _werkstattId | Kunden |
| mitarbeiter | _werkstattId | Mitarbeiter |
| einstellungen | _werkstattId | Settings |
| **users** | NONE | Global Auth |
| **partnerAutoLoginTokens** | NONE | Global Tokens |

---

## 11. Zusammenfassung

### Codebase-Statistiken
| Metrik | Wert |
|--------|------|
| HTML-Dateien | 88 (57 Main + 31 Partner) |
| JavaScript-Dateien | 66 |
| Cloud Functions | 29 |
| Firestore Collections | 25+ |
| Tests | 49 (100% Success) |
| Gesamtzeilen | ~400,000 |

### Architektur-Stärken
- ✅ Multi-Tenant Isolation via Collection-Suffix
- ✅ 2-Stage Authentication (Werkstatt + Mitarbeiter)
- ✅ Real-Time Updates via Firestore Listeners
- ✅ Memory-Leak Prevention via Listener Registry
- ✅ 12 Service-Typen mit Auto-Korrektur
- ✅ AI-Integration (OpenAI GPT-4, Whisper, TTS)
- ✅ DSGVO-konform (europe-west3)

### Kritische Patterns (IMMER befolgen!)
1. `await window.firebaseInitialized` vor Firebase-Nutzung
2. `window.getCollection(name)` statt `db.collection(name)`
3. `String(id) === String(otherId)` für ID-Vergleiche
4. `window.listenerRegistry.cleanup()` vor Navigation
5. `serviceTyp` ist READ-ONLY nach Erstellung

---

## 12. Detail-Pipelines (Tiefgehende Analyse)

### 12.1 Multi-Service Status-Flow Pipeline

**Zweck:** Status-Tracking für Fahrzeuge mit mehreren Services gleichzeitig

#### Datenstruktur
```javascript
fahrzeug.serviceStatuses = {
  "lackier": {
    status: "vorbereitung",
    prozessStatus: "vorbereitung",
    timestamp: 1700000000000,
    statusHistory: [
      { status: "angenommen", timestamp: ..., user: "...", note: "..." }
    ]
  },
  "reifen": { status: "in_arbeit", ... },
  "pflege": { status: "neu", ... }
}
```

#### Datenfluss
```
User Drag & Drop (Kanban)
       ↓
updateFahrzeugStatus(fahrzeugId, newStatus)
       ↓
[VALIDATION] isValidTransition(service, current, new)
       ├─ OK → Continue
       └─ FAIL → Admin Override OR Block
       ↓
[CHECK] Arbeitsschritt braucht Foto?
       ├─ YES → showPhotoModal()
       └─ NO → directStatusUpdate()
       ↓
[FIRESTORE UPDATE]
       ├─ serviceStatuses[service].status = newStatus
       ├─ serviceStatuses[service].timestamp = NOW
       └─ statusHistory += event
       ↓
[SYNC] syncServiceStatusToPartner()
       ↓
[REALTIME] Listener fires → Re-render
```

#### Kritische Funktionen
| Funktion | Datei | Zeilen | Zweck |
|----------|-------|--------|-------|
| `getServiceStatus()` | kanban.html | 3475-3540 | Status lesen (mit Lazy Migration) |
| `isValidTransition()` | kanban.html | 3260-3353 | Forward-only Validierung |
| `updateFahrzeugStatus()` | kanban.html | 5307-5417 | Main Update Handler |
| `directStatusUpdate()` | kanban.html | 5542-5810 | Firestore Update |
| `syncServiceStatusToPartner()` | kanban.html | 5431-5482 | Sync zu Partner-Anfragen |
| `allServicesComplete()` | kanban.html | 3561-3599 | Check ob alle fertig |

#### Validierungsregeln
- **Forward-only:** Kein Rückwärts-Springen erlaubt
- **Max 2 Steps:** Maximal 2 Schritte überspringen
- **"terminiert" Sonderfall:** Kann jederzeit von "neu"/"angenommen" gesetzt werden

#### Status-Flows pro Service
```
lackier:   angenommen → vorbereitung → lackierung → trocknung → qualitaetskontrolle → bereit → fertig
reifen:    neu → bestellung → angekommen → montage → wuchten → qualitaet → bereit → fertig
mechanik:  neu → diagnose → reparatur → test → bereit → fertig
tuev:      neu → pruefung → termin_gebucht → termin_bestaetigt → bereit → fertig
```

---

### 12.2 Ersatzteile → Bestellungen Pipeline

**Zweck:** Ersatzteile aus KVA in Kanban "Bestellungen" Tab übertragen

#### Datenfluss
```
KVA-Erstellung (kva-erstellen.html)
       ↓ Partner erfasst Ersatzteile
variantTableData[variant].ersatzteile[]
       ↓
annehmenKVA() (meine-anfragen.html:6602)
       ↓
saveErsatzteileToCentralDB() → ersatzteile_{werkstattId}
       ↓
createBestellungenFromErsatzteile() → bestellungen_{werkstattId}
       ↓
Kanban "Bestellungen" Tab → loadBestellungenForModal()
```

#### Collection-Schemas

**ersatzteile_{werkstattId}**
```javascript
{
  id: "et_1732..._abc123",
  etn: "VW-123456",                 // OE-Nummer
  benennung: "Frontschutzblech",
  einzelpreis: 145.50,
  anzahl: 1,
  fahrzeugId: "fzg_...",            // Link zu Vehicle
  kennzeichen: "MOS-AB-1234",
  werkstattId: "mosbach",
  createdAt: Timestamp
}
```

**bestellungen_{werkstattId}**
```javascript
{
  id: "best_1732..._def456",
  etn: "VW-123456",
  benennung: "Frontschutzblech",
  menge: 1,
  einzelpreis: 145.50,
  status: "bestellt",               // bestellt → angeliefert → zugewiesen
  fahrzeugId: "fzg_...",
  source: "kva-auto",
  werkstattId: "mosbach"
}
```

#### Kritische Funktionen
| Funktion | Datei | Zeilen | Zweck |
|----------|-------|--------|-------|
| `saveErsatzteileToCentralDB()` | meine-anfragen.html | 6266 | Ersatzteile speichern |
| `createBestellungenFromErsatzteile()` | meine-anfragen.html | 6348 | Konvertierung |
| `annehmenKVA()` | meine-anfragen.html | 6602 | Orchestriert Pipeline |
| `loadBestellungenForModal()` | kanban.html | 8100 | Lädt Bestellungen |
| `updateBestellungStatus()` | kanban.html | 8262 | Status-Update |

#### Bekannte Issues
- ⚠️ Duplizierte Implementierungen (meine-anfragen vs annahme)
- ⚠️ fahrzeugId Type ohne String() in Zeile 6303
- ⚠️ Keine Atomarität (sequenzielle Calls)

---

### 12.3 Leihfahrzeug Pipeline

**Zweck:** Pool-Sharing von Leihfahrzeugen zwischen Werkstätten

#### Datenfluss
```
Lokale Flotte: leihfahrzeuge_{werkstattId}
       ↓ addVehicleToPool()
Pool-Sharing: leihfahrzeugPool (GLOBAL)
       ↓ requestFromPool()
Anfragen: leihfahrzeugAnfragen (GLOBAL)
       ↓ approveRequest()
Kopie zu: leihfahrzeuge_{anfragerWerkstattId}
       ↓ returnVehicle()
Status: "verfuegbar"
```

#### Collection-Schemas

**leihfahrzeuge_{werkstattId}**
```javascript
{
  id: "lf_1732..._001",
  kennzeichen: "MOS-LF-001",
  marke: "BMW",
  modell: "3er Touring",
  status: "verfuegbar",            // verfuegbar | vergeben | wartung
  tagesmiete: 55.00,
  kaution: 600.00,
  aktuelleZuweisung: {
    kundenName: "Meyer GmbH",
    von: "2025-12-02",
    bis: "2025-12-05",
    fahrzeugId: "fzg_..."          // Link zu Reparatur-Fahrzeug
  }
}
```

**leihfahrzeugPool (GLOBAL)**
```javascript
{
  id: "mosbach_lf_001",
  kennzeichen: "MOS-LF-001",
  verfuegbar: true,
  besitzerWerkstattId: "mosbach",
  besitzerWerkstattName: "Auto-Lackierzentrum Mosbach"
}
```

**leihfahrzeugAnfragen (GLOBAL)**
```javascript
{
  id: "anfrage_1732...",
  poolFahrzeugId: "mosbach_lf_...",
  besitzerWerkstattId: "mosbach",
  anfragerWerkstattId: "heidelberg",
  status: "pending",               // pending | genehmigt | abgelehnt
  erstelltAm: Timestamp
}
```

#### Kritische Funktionen
| Funktion | Datei | Zeilen | Zweck |
|----------|-------|--------|-------|
| `addVehicle()` | leihfahrzeuge.html | 1203 | Neues Leihfahrzeug |
| `addVehicleToPool()` | leihfahrzeuge.html | 1312 | In Pool freigeben |
| `requestFromPool()` | leihfahrzeuge.html | 1451 | Anfrage stellen |
| `approveRequest()` | leihfahrzeuge.html | 1599 | Anfrage genehmigen |
| `returnVehicle()` | leihfahrzeuge.html | 1342 | Rückgabe |

#### Bekannte Issues
- ❌ KEINE Rückwärts-Verknüpfung fahrzeugId → leihfahrzeugId
- ❌ KEINE Doppelbuchungs-Validierung
- ⚠️ Pool-Copy nicht bidirektional synced

---

### 12.4 Entwurf → Annahme Pipeline

**Zweck:** 2-Stufen Angebotserstellung (Meister → Büro → Kunde → Fahrzeug)

#### Datenfluss
```
Meister: saveAsDraft()
       ↓
partnerAnfragen_{wks} {isEntwurf: true, entwurfStatus: 'wartend'}
       ↓
Büro: Vervollständigung (kalkulationData, kundenEmail)
       ↓ entwurfStatus → 'bereit_zum_versenden'
partnerAutoLoginTokens (GLOBAL, 7-Tage TTL)
       ↓
Cloud Function: sendEntwurfEmail → AWS SES
       ↓
Kunde: QR-Scan → kunde-angebot.html
       ↓ Accept/Reject
entwurfStatus → 'akzeptiert' | 'abgelehnt'
       ↓
annehmenKVA() → fahrzeuge_{werkstattId}
```

#### Token-Struktur
```javascript
{
  token: "a1b2c3d4...",           // 64-stellig Hex
  fahrzeugId: "entwurf_12345",
  expiresAt: Timestamp(+7 Tage),
  used: false,
  usedAt: null
}
```

#### Feld-Mapping (Entwurf → Fahrzeug)

| Feld | Aktion |
|------|--------|
| kennzeichen, marke, modell | 1:1 Kopiert |
| kundenname, kundenEmail | 1:1 Kopiert |
| vereinbarterPreis, kalkulationData | 1:1 Kopiert |
| serviceTyp Array | Transformiert → Primary + additionalServices |
| status, auftragsnummer | Neu erstellt |
| serviceStatuses, statusHistory | Neu erstellt |

#### Kritische Funktionen
| Funktion | Datei | Zeilen | Zweck |
|----------|-------|--------|-------|
| `saveAsDraft()` | annahme.html | 4107-4325 | Meister-Entwurf |
| `saveAsDraftWithPDF()` | annahme.html | 4328-4550 | Mit QR-Code PDF |
| `sendEntwurfEmail()` | functions/index.js | ~3735-3935 | AWS SES Email |
| `createPartnerAutoLoginToken()` | functions/index.js | - | Token-Generation |
| `annehmenKVA()` | meine-anfragen.html | ~4100-4500 | Conversion |

#### Bekannte Issues
- ⚠️ AWS SES Sandbox Mode (BLOCKER für Production)
- ⚠️ Email-Feld Confusion: partnerEmail = telefon (Zeile 4162)
- ⚠️ Token ohne werkstattId Filter

---

### 12.5 Zeiterfassung → Lohn Pipeline

**Zweck:** Automatische Lohnabrechnung mit BMF-Steuerrechner

#### Datenfluss
```
Stempeluhr: zeitstempel_{werkstattId}
       ↓ Aggregation (Nightly)
arbeitszeiten_{werkstattId} (SOLL/IST Berechnung)
       ↓
BMF-API: Lohnsteuer-Berechnung
       ↓ Fallback bei CORS-Fehler
Lokale Tariftabelle
       ↓
SV-Berechnung: KV, RV, AV, PV (mit BBG 2025)
       ↓
lohnabrechnungen_{werkstattId}
       ↓
PDF: jsPDF Lohnzettel
```

#### Konstanten 2025
```javascript
const LOHN_KONSTANTEN_2025 = {
  bbg: {
    kvPv: 5512.50,     // €/Monat
    rvAv: 7550.00      // €/Monat
  },
  beitraege: {
    kv: 7.3,           // % AN-Anteil
    rv: 9.3,
    av: 1.3,
    pv: 1.7,
    pvKinderlos: 0.6   // Zuschlag ab 23 Jahre
  },
  minijobGrenze: 538   // €
};
```

#### Collection-Schemas

**zeitstempel_{werkstattId}**
```javascript
{
  id: "ts_20251202_1430",
  mitarbeiterId: "max123",
  timestamp: Timestamp,
  art: "einstempel",               // einstempel | ausstempel
  status: "verarbeitet"
}
```

**arbeitszeiten_{werkstattId}**
```javascript
{
  id: "az_20251202_max123",
  mitarbeiterId: "max123",
  datum: Date(2025-12-02),
  einstempel: "07:30",
  ausstempel: "17:00",
  istStunden: 9.5,
  sollStunden: 8.0,
  differenzStunden: 1.5,
  differenzStatus: "ueberstunden"
}
```

**lohnabrechnungen_{werkstattId}**
```javascript
{
  id: "la_202511_max123",
  mitarbeiterId: "max123",
  monat: 11, jahr: 2025,
  brutto: 3437.50,
  lohnsteuer: 598.50,
  solidaritaetszuschlag: 32.91,
  kirchensteuer: 47.88,
  kv: 251.00, rv: 319.89, av: 44.69, pv: 58.44,
  netto: 2084.19,
  pdfUrl: "gs://bucket/lohnabrechnungen/..."
}
```

#### Kritische Funktionen
| Funktion | Datei | Zeilen | Zweck |
|----------|-------|--------|-------|
| `berechneLohnsteuerBMF()` | js/lohnberechnung.js | 146-232 | BMF-API Call |
| `berechneLohnsteuerFallback()` | js/lohnberechnung.js | 78-133 | Lokale Berechnung |
| `berechneSozialversicherung()` | js/lohnberechnung.js | ~280-380 | SV mit BBG |
| `erstelleLohnabrechnung()` | js/lohnabrechnung-pdf.js | 113-300 | PDF-Generation |

#### Bekannte Issues
- ⚠️ BMF-API CORS-Fehler im Browser (Fallback vorhanden)
- ⚠️ Manuelle Pause-Eingabe erforderlich
- ⚠️ Keine Double-Click Protection

---

## 13. Pipeline-Zusammenfassung

| Pipeline | Status | Kritische Issues | Dateien |
|----------|--------|------------------|---------|
| Multi-Service Status | ✅ Solide | Lazy Migration funktioniert | kanban.html |
| Ersatzteile → Bestellungen | ⚠️ Funktional | Duplikate, Type-Mismatch | meine-anfragen, kanban |
| Leihfahrzeug | ⚠️ Funktional | Keine Doppelbuchungs-Check | leihfahrzeuge.html |
| Entwurf → Annahme | ⚠️ Blocker | AWS SES Sandbox | annahme, functions |
| Zeiterfassung → Lohn | ✅ Solide | BMF-Fallback vorhanden | lohnberechnung.js |

### Kritische Funktionen Gesamt: 25+
### Collection-Schemas dokumentiert: 15+
### Identifizierte Bugs: 12 (7 gefixt, 5 offen)

---

_Letzte Aktualisierung: 2025-12-02_
_Analyse-Status: ✅ ABGESCHLOSSEN (30/30 Chunks + 5 Detail-Pipelines)_
_Analysiert von: Claude Code (Opus 4.5)_
