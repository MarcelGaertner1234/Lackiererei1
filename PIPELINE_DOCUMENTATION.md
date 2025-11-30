# FAHRZEUGANNAHME APP - KOMPLETTE PIPELINE-DOKUMENTATION

**Erstellt:** 2025-11-30
**Status:** VOLLSTÄNDIGE ANALYSE - 7 Haupt-Pipelines dokumentiert
**Codebase:** ~208,000 Zeilen, 102 HTML-Dateien

---

## INHALTSVERZEICHNIS

1. [Pipeline 1: Partner-Anfrage → Fahrzeug → Kanban](#pipeline-1-partner-anfrage--fahrzeug--kanban)
2. [Pipeline 2: Entwurf-System (Quick Mode)](#pipeline-2-entwurf-system-quick-mode)
3. [Pipeline 3: KVA-Erstellung → Angebot → Rechnung](#pipeline-3-kva-erstellung--angebot--rechnung)
4. [Pipeline 4: Multi-Service Booking System](#pipeline-4-multi-service-booking-system)
5. [Pipeline 5: Zeiterfassung & Mitarbeiter-System](#pipeline-5-zeiterfassung--mitarbeiter-system)
6. [Pipeline 6: Partner-Bonus & Auszahlungen](#pipeline-6-partner-bonus--auszahlungen)
7. [Pipeline 7: Auth & Multi-Tenant Architektur](#pipeline-7-auth--multi-tenant-architektur)
8. [Datenfluss-Übersicht](#datenfluss-übersicht)
9. [Kritische Integrationspunkte](#kritische-integrationspunkte)

---

## PIPELINE 1: Partner-Anfrage → Fahrzeug → Kanban

### Übersicht
Partner erstellen Service-Anfragen über das Partner-Portal. Diese werden von der Werkstatt angenommen und als Fahrzeuge ins Kanban-Board übertragen.

### Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: PARTNER ERSTELLT ANFRAGE            │
├─────────────────────────────────────────────────────────────────┤
│ Datei: partner-app/{service}-anfrage.html                       │
│ (lackier, reifen, mechanik, pflege, tuev, versicherung,         │
│  glas, klima, dellen, folierung, steinschutz, werbebeklebung)   │
│                                                                  │
│ Partner füllt Formular aus:                                     │
│ ├─ kundenname, kennzeichen, marke, modell                       │
│ ├─ serviceTyp (automatisch aus Formular-URL)                    │
│ ├─ serviceData (service-spezifische Felder)                     │
│ └─ photos[] (Upload zu Firebase Storage)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: FIRESTORE SPEICHERUNG               │
├─────────────────────────────────────────────────────────────────┤
│ Collection: partnerAnfragen_{werkstattId}                       │
│                                                                  │
│ Dokument-Struktur:                                               │
│ {                                                                │
│   id: 'anfrage_12345',                                          │
│   partnerId: 'partner_xyz',                                      │
│   kundenname: 'Max Müller',                                      │
│   kennzeichen: 'MOS-AB-123',                                    │
│   marke: 'BMW', modell: '320d',                                 │
│   serviceTyp: 'lackier',        // ⚠️ IMMUTABLE!               │
│   serviceData: { lackierUmfang: 'vollverklebung', ... },        │
│   status: 'neu',                                                 │
│   photoUrls: ['https://...'],                                   │
│   createdAt: Timestamp,                                          │
│   werkstattId: 'mosbach'                                        │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: ADMIN PRÜFT ANFRAGE                 │
├─────────────────────────────────────────────────────────────────┤
│ Datei: admin-anfragen.html                                      │
│                                                                  │
│ Admin sieht Liste aller neuen Anfragen                          │
│ ├─ Filter: Status (neu, in_bearbeitung, kva_erstellt)          │
│ ├─ Filter: Service-Typ (12 Services)                            │
│ └─ Filter: Partner                                              │
│                                                                  │
│ Admin klickt auf Anfrage → Detail-Ansicht                       │
│ ├─ Prüft Kundendaten                                            │
│ ├─ Prüft Fotos                                                  │
│ └─ Entscheidet: Annehmen oder Ablehnen                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 4: FAHRZEUG ERSTELLEN                  │
├─────────────────────────────────────────────────────────────────┤
│ Datei: anfrage-detail.html (Line 2970+)                         │
│                                                                  │
│ createFahrzeugFromAnfrage():                                     │
│ 1. 3-Layer Duplicate Prevention:                                │
│    ├─ Check: anfrage.fahrzeugAngelegt === true?                │
│    ├─ Query: fahrzeuge WHERE partnerAnfrageId == anfrageId     │
│    └─ Query: fahrzeuge WHERE kennzeichen == anfrage.kennzeichen│
│                                                                  │
│ 2. Erstelle Fahrzeug-Dokument:                                  │
│    Collection: fahrzeuge_{werkstattId}                          │
│    {                                                             │
│      id: 'auto_generated',                                      │
│      partnerAnfrageId: anfrage.id,   // ⚠️ CRITICAL LINK       │
│      serviceTyp: anfrage.serviceTyp, // ⚠️ IMMUTABLE!          │
│      additionalServices: [],                                    │
│      serviceStatuses: { 'lackier': { status: 'neu' } },        │
│      status: 'angenommen',                                      │
│      ...anfrage fields                                          │
│    }                                                             │
│                                                                  │
│ 3. Update Anfrage:                                              │
│    partnerAnfragen.update({ fahrzeugAngelegt: true })          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 5: KANBAN-BOARD                        │
├─────────────────────────────────────────────────────────────────┤
│ Datei: kanban.html                                              │
│                                                                  │
│ 10 Status-Spalten (processDefinitions):                         │
│ ├─ neu → angenommen → begutachtung → kva_erstellt              │
│ ├─ kva_akzeptiert → in_arbeit → qualitaetskontrolle           │
│ └─ fertig → abgeholt → archiviert                              │
│                                                                  │
│ Drag & Drop Status-Update:                                      │
│ directStatusUpdate(fahrzeugId, newStatus)                       │
│ ├─ UPDATE fahrzeug.status                                       │
│ ├─ UPDATE fahrzeug.serviceStatuses[serviceTyp].status          │
│ ├─ SYNC to partnerAnfragen (bidirektional)                     │
│ └─ Auto-Create Rechnung bei status === 'fertig'                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 6: STATUS-SYNC                         │
├─────────────────────────────────────────────────────────────────┤
│ Bidirektionale Synchronisation:                                 │
│                                                                  │
│ fahrzeuge → partnerAnfragen:                                    │
│ ├─ syncStatusToPartnerAnfrage(fahrzeugId, newStatus)           │
│ └─ Partner sieht Status-Update in meine-anfragen.html          │
│                                                                  │
│ partnerAnfragen → fahrzeuge:                                    │
│ ├─ Wenn Partner KVA akzeptiert                                 │
│ └─ syncPartnerResponseToFahrzeug()                             │
└─────────────────────────────────────────────────────────────────┘
```

### Kritische Dateien
| Datei | Zeilen | Funktion |
|-------|--------|----------|
| partner-app/*-anfrage.html | ~12,000 | 12 Service-Formulare |
| admin-anfragen.html | ~4,200 | Admin-Anfragen-Liste |
| anfrage-detail.html | ~4,800 | Anfrage-Detailansicht |
| kanban.html | ~8,870 | Kanban-Board |
| meine-anfragen.html | ~8,927 | Partner-Dashboard |

---

## PIPELINE 2: Entwurf-System (Quick Mode)

### Übersicht
Schnelle Fahrzeugaufnahme mit nur 3 Pflichtfeldern. Das Büro vervollständigt später die Daten. Kunden erhalten Email mit QR-Code zur Bestätigung.

### Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 1: QUICK MODE AKTIVIEREN                     │
├─────────────────────────────────────────────────────────────────┤
│ Datei: annahme.html (Line 2453)                                 │
│                                                                  │
│ Toggle: "⚡ Quick Mode" (aktiviert schnelle Erfassung)          │
│                                                                  │
│ Minimum 3 Felder:                                               │
│ ├─ kundenname (Name des Kunden)                                │
│ ├─ kennzeichen (Fahrzeug-Kennzeichen)                          │
│ └─ kundenEmail (für QR-Code Email)                             │
│                                                                  │
│ Optional: serviceTyp, notizen                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 2: ENTWURF SPEICHERN                         │
├─────────────────────────────────────────────────────────────────┤
│ Collection: entwuerfe_{werkstattId}                             │
│                                                                  │
│ {                                                                │
│   id: 'entwurf_xyz',                                            │
│   kundenname: 'Max Müller',                                      │
│   kennzeichen: 'MOS-AB-123',                                    │
│   kundenEmail: 'max@example.com',                               │
│   status: 'entwurf',      // entwurf → vervollständigt → ...   │
│   isQuickMode: true,                                            │
│   createdAt: Timestamp,                                          │
│   createdBy: 'emp_123',   // Audit Trail                       │
│   werkstattId: 'mosbach'                                        │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 3: BÜRO VERVOLLSTÄNDIGT                      │
├─────────────────────────────────────────────────────────────────┤
│ Datei: entwuerfe-bearbeiten.html                                │
│                                                                  │
│ Büro öffnet Entwurf und ergänzt:                                │
│ ├─ marke, modell, fahrgestellnummer                            │
│ ├─ serviceBeschreibung (detaillierte Beschreibung)             │
│ ├─ fertigstellungsdatum (geplantes Datum)                      │
│ ├─ serviceDetails (service-spezifische Felder)                 │
│ └─ signature (digitale Unterschrift via Canvas)                │
│                                                                  │
│ Status: 'entwurf' → 'vervollständigt'                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 4: EMAIL MIT QR-CODE                         │
├─────────────────────────────────────────────────────────────────┤
│ Cloud Function: sendEntwurfEmail (functions/index.js)           │
│                                                                  │
│ 1. Generiere Auto-Login Token:                                  │
│    createPartnerAutoLoginToken(kundenEmail, entwurfId)          │
│    → Token gültig für 7 Tage                                   │
│                                                                  │
│ 2. Erstelle QR-Code:                                            │
│    URL: /partner-app/auto-login.html?token={token}             │
│                                                                  │
│ 3. Sende Email via AWS SES:                                     │
│    ├─ An: kundenEmail                                          │
│    ├─ Subject: "Ihr Auftrag bei {werkstattName}"              │
│    ├─ Body: HTML mit QR-Code + Auto-Login Link                │
│    └─ Anhang: Entwurf-PDF (optional)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 5: KUNDE AKZEPTIERT/ABLEHNT                  │
├─────────────────────────────────────────────────────────────────┤
│ Datei: partner-app/auto-login.html                              │
│                                                                  │
│ Kunde scannt QR-Code oder klickt Link:                          │
│ 1. validatePartnerAutoLoginToken(token)                         │
│ 2. Automatischer Login via Custom Firebase Token               │
│ 3. Redirect zu: meine-anfragen.html                            │
│                                                                  │
│ Kunde sieht Entwurf und kann:                                   │
│ ├─ ✅ AKZEPTIEREN → status: 'akzeptiert'                       │
│ │   → Notification an Admin                                    │
│ │   → Fahrzeug wird erstellt (createFahrzeugFromEntwurf)       │
│ │                                                               │
│ └─ ❌ ABLEHNEN → status: 'abgelehnt'                           │
│     → Notification an Admin                                    │
│     → Entwurf wird archiviert                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 6: ADMIN NOTIFICATION                        │
├─────────────────────────────────────────────────────────────────┤
│ Cloud Functions:                                                 │
│ ├─ sendEntwurfBestaetigtNotification (bei Akzeptierung)        │
│ └─ sendEntwurfAbgelehntNotification (bei Ablehnung)            │
│                                                                  │
│ Admin erhält Email:                                              │
│ ├─ Subject: "Auftrag akzeptiert: {kennzeichen}"                │
│ └─ Body: Link zum Fahrzeug im Kanban                           │
└─────────────────────────────────────────────────────────────────┘
```

### Kritische Dateien
| Datei | Zeilen | Funktion |
|-------|--------|----------|
| annahme.html | ~10,204 | Quick Mode Toggle + Formular |
| entwuerfe-bearbeiten.html | ~2,055 | Entwurf vervollständigen |
| partner-app/auto-login.html | ~500 | QR-Code Auto-Login |
| functions/index.js | ~4,200 | 3 Cloud Functions für Entwurf |

---

## PIPELINE 3: KVA-Erstellung → Angebot → Rechnung

### Übersicht
Kostenvoranschlag (KVA) mit Original/Aftermarket-Varianten. Kunde wählt Variante, bei Status "fertig" wird automatisch Rechnung erstellt.

### Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1: KVA ERSTELLEN                             │
├─────────────────────────────────────────────────────────────────┤
│ Datei: partner-app/kva-erstellen.html                           │
│                                                                  │
│ Admin/Werkstatt öffnet KVA-Erstellung für Fahrzeug:             │
│                                                                  │
│ 1. Lade Service-Template:                                       │
│    SERVICE_TEMPLATES[serviceTyp] (Lines 688-745)               │
│    ├─ lackier: Arbeitszeit, Material, Grundierung, Klarlack    │
│    ├─ reifen: Reifenkosten, Montage, Auswuchten, Ventile       │
│    ├─ mechanik: Arbeitszeit, Ersatzteile, Diagnose             │
│    └─ ... (12 service-spezifische Templates)                   │
│                                                                  │
│ 2. Eingabe Kostenpositionen:                                    │
│    FOR EACH position IN template:                               │
│    ├─ Bezeichnung (aus Template)                               │
│    ├─ Menge (Anzahl)                                           │
│    ├─ Einzelpreis Original (€)                                 │
│    ├─ Einzelpreis Aftermarket (€)                              │
│    └─ Berechnung: Gesamtpreis = Menge × Einzelpreis           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: VARIANTEN GENERIEREN                      │
├─────────────────────────────────────────────────────────────────┤
│ generateVariants() Funktion:                                    │
│                                                                  │
│ Variante "Original":                                            │
│ {                                                                │
│   name: 'Original',                                             │
│   positionen: [                                                 │
│     { bezeichnung: 'Lackierung', menge: 1, preis: 450.00 },   │
│     { bezeichnung: 'Material', menge: 2, preis: 120.00 },     │
│     ...                                                        │
│   ],                                                            │
│   nettoBetrag: 570.00,                                         │
│   mwst: 108.30,        // 19%                                  │
│   bruttoBetrag: 678.30                                         │
│ }                                                               │
│                                                                  │
│ Variante "Aftermarket":                                         │
│ {                                                                │
│   name: 'Aftermarket',                                          │
│   positionen: [...],   // Günstigere Alternativen              │
│   nettoBetrag: 420.00,                                         │
│   mwst: 79.80,                                                  │
│   bruttoBetrag: 499.80                                         │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 3: KVA SPEICHERN                             │
├─────────────────────────────────────────────────────────────────┤
│ Update fahrzeuge_{werkstattId}/{fahrzeugId}:                    │
│                                                                  │
│ {                                                                │
│   kva: {                                                        │
│     varianten: {                                                │
│       original: { ... },                                       │
│       aftermarket: { ... }                                     │
│     },                                                          │
│     gewaehlteVariante: null,  // Noch nicht gewählt           │
│     termine: {                                                  │
│       start: '2025-12-01',                                     │
│       ende: '2025-12-05'                                       │
│     },                                                          │
│     createdAt: Timestamp,                                       │
│     createdBy: 'emp_123'                                       │
│   },                                                            │
│   status: 'kva_erstellt'                                       │
│ }                                                               │
│                                                                  │
│ Sync zu partnerAnfragen:                                        │
│ → Partner sieht KVA in meine-anfragen.html                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: PARTNER WÄHLT VARIANTE                    │
├─────────────────────────────────────────────────────────────────┤
│ Datei: partner-app/meine-anfragen.html                          │
│                                                                  │
│ Partner sieht beide Varianten nebeneinander:                    │
│ ┌─────────────────┬─────────────────┐                          │
│ │   ORIGINAL      │   AFTERMARKET   │                          │
│ ├─────────────────┼─────────────────┤                          │
│ │ Lackierung 450€ │ Lackierung 350€ │                          │
│ │ Material   120€ │ Material    70€ │                          │
│ ├─────────────────┼─────────────────┤                          │
│ │ GESAMT   678,30€│ GESAMT   499,80€│                          │
│ │ [AUSWÄHLEN]     │ [AUSWÄHLEN]     │                          │
│ └─────────────────┴─────────────────┘                          │
│                                                                  │
│ waehleKVAVariante('original'):                                  │
│ ├─ UPDATE fahrzeug.kva.gewaehlteVariante = 'original'          │
│ ├─ UPDATE fahrzeug.vereinbarterPreis = 678.30                  │
│ ├─ UPDATE fahrzeug.status = 'kva_akzeptiert'                   │
│ └─ SYNC zu partnerAnfragen                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 5: ARBEIT DURCHFÜHREN                        │
├─────────────────────────────────────────────────────────────────┤
│ Kanban-Board (kanban.html):                                     │
│                                                                  │
│ Status-Flow nach KVA-Akzeptierung:                              │
│ kva_akzeptiert → in_arbeit → qualitaetskontrolle → fertig      │
│                                                                  │
│ Bei jedem Status-Wechsel:                                       │
│ ├─ directStatusUpdate() in kanban.html                         │
│ ├─ Audit-Trail mit getCurrentUserForAudit()                    │
│ └─ Sync zu partnerAnfragen                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 6: AUTO-RECHNUNG BEI "FERTIG"                │
├─────────────────────────────────────────────────────────────────┤
│ Datei: kanban.html (autoCreateRechnung, Line 6609+)             │
│                                                                  │
│ TRIGGER: status === 'fertig'                                    │
│                                                                  │
│ 1. Prüfe: Hat Fahrzeug schon Rechnung?                         │
│    IF fahrzeug.rechnung THEN skip                              │
│                                                                  │
│ 2. Generiere Rechnungsnummer:                                   │
│    generateUniqueRechnungsnummer()                              │
│    Format: RE-{YYYY}-{MM}-{NNNN}                               │
│    Beispiel: RE-2025-11-0042                                   │
│                                                                  │
│ 3. Erstelle Rechnung:                                           │
│    {                                                            │
│      rechnungsnummer: 'RE-2025-11-0042',                       │
│      fahrzeugId: fahrzeug.id,                                  │
│      kennzeichen: 'MOS-AB-123',                                │
│      kundenname: 'Max Müller',                                  │
│      gewaehlteVariante: 'original',                            │
│      nettoBetrag: 570.00,                                      │
│      mwstBetrag: 108.30,                                       │
│      bruttoBetrag: 678.30,                                     │
│      positionen: [...],   // Aus KVA übernommen                │
│      status: 'erstellt',  // erstellt → versendet → bezahlt   │
│      createdAt: Timestamp                                       │
│    }                                                            │
│                                                                  │
│ 4. Speichern:                                                   │
│    Collection: rechnungen_{werkstattId}                         │
│    UPDATE fahrzeug: { rechnung: rechnungData }                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 7: RECHNUNG VERWALTEN                        │
├─────────────────────────────────────────────────────────────────┤
│ Admin: rechnungen-admin.html                                    │
│ ├─ Liste aller Rechnungen                                      │
│ ├─ Filter: Status, Datum, Partner                              │
│ ├─ PDF-Export                                                  │
│ └─ Status ändern: erstellt → versendet → bezahlt              │
│                                                                  │
│ Partner: partner-app/rechnungen.html                            │
│ ├─ Eigene Rechnungen einsehen                                  │
│ ├─ PDF herunterladen                                           │
│ └─ EPC QR-Code für Banküberweisung                             │
└─────────────────────────────────────────────────────────────────┘
```

### Kritische Dateien
| Datei | Zeilen | Funktion |
|-------|--------|----------|
| kva-erstellen.html | ~8,150 | KVA-Erstellung mit Varianten |
| meine-anfragen.html | ~8,927 | Varianten-Auswahl |
| kanban.html | ~8,870 | Auto-Rechnung bei "fertig" |
| rechnungen-admin.html | ~2,500 | Rechnungs-Verwaltung |

---

## PIPELINE 4: Multi-Service Booking System

### Übersicht
Fahrzeuge können mehrere Services haben. Primärer Service ist IMMUTABLE, zusätzliche Services werden separat getrackt.

### Datenstruktur

```javascript
// Fahrzeug mit Multi-Service
{
  id: 'fahrzeug_123',

  // PRIMARY SERVICE (⚠️ IMMUTABLE - Pattern #21!)
  serviceTyp: 'lackier',  // NIEMALS ändern nach Erstellung!

  // ADDITIONAL SERVICES (mutable)
  additionalServices: [
    {
      serviceTyp: 'reifen',
      status: 'terminiert',
      addedAt: Timestamp,
      serviceDetails: { reifenGröße: '225/45R17' }
    },
    {
      serviceTyp: 'pflege',
      status: 'neu',
      addedAt: Timestamp,
      serviceDetails: { paket: 'premium' }
    }
  ],

  // STATUS PER SERVICE
  serviceStatuses: {
    'lackier': {
      status: 'in_arbeit',
      history: [
        { status: 'neu', timestamp: T1, user: '...' },
        { status: 'begutachtung', timestamp: T2, user: '...' },
        { status: 'in_arbeit', timestamp: T3, user: '...' }
      ]
    },
    'reifen': {
      status: 'terminiert',
      history: [...]
    },
    'pflege': {
      status: 'neu',
      history: [...]
    }
  }
}
```

### Key Functions

```javascript
// Prüft ob Fahrzeug einen Service hat (primary ODER additional)
function hasService(fahrzeug, serviceTyp) {
  if (fahrzeug.serviceTyp === serviceTyp) return true;
  return fahrzeug.additionalServices?.some(
    s => s.serviceTyp === serviceTyp
  );
}

// Holt Status für spezifischen Service
function getServiceStatus(fahrzeug, serviceTyp) {
  return fahrzeug.serviceStatuses?.[serviceTyp]?.status || 'neu';
}

// Prüft ob ALLE Services fertig sind
function allServicesComplete(fahrzeug) {
  const allServices = [
    fahrzeug.serviceTyp,
    ...(fahrzeug.additionalServices?.map(s => s.serviceTyp) || [])
  ];
  return allServices.every(svc =>
    getServiceStatus(fahrzeug, svc) === 'fertig'
  );
}
```

### 12 Service-Typen

| Service | ID | Beispiel-Felder |
|---------|----|-----------------
| Lackierung | `lackier` | lackierUmfang, farbcode, karosserie |
| Reifen | `reifen` | reifenGröße, saison, montageTyp |
| Mechanik | `mechanik` | reparaturArt, diagnose, kmStand |
| Pflege | `pflege` | paket, zusatzleistungen |
| TÜV/AU | `tuev` | ablauf, huArt |
| Versicherung | `versicherung` | versicherung, schadennummer, gutachten |
| Glas | `glas` | glasTyp, schadensort |
| Klima | `klima` | kaeltemittel, serviceArt |
| Dellen | `dellen` | position, anzahl, lackschaden |
| Folierung | `folierung` | folierungArt, bereiche |
| Steinschutz | `steinschutz` | umfang, bereiche |
| Werbebeklebung | `werbebeklebung` | komplexitaet, flaeche |

---

## PIPELINE 5: Zeiterfassung & Mitarbeiter-System

### Übersicht
Event-basierte Zeiterfassung (Start/Pause/Ende). IST-Stunden werden automatisch berechnet und mit SOLL verglichen.

### Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│              ARBEIT STARTEN (08:00 Uhr)                         │
├─────────────────────────────────────────────────────────────────┤
│ Datei: mitarbeiter-dienstplan.html                              │
│                                                                  │
│ Mitarbeiter klickt "🟢 Arbeit starten"                         │
│ → startWork() erstellt neues Zeiterfassung-Dokument            │
│                                                                  │
│ Collection: zeiterfassung_{werkstattId}                         │
│ Dokument-ID: {YYYY-MM-DD}_{mitarbeiterId}                       │
│                                                                  │
│ {                                                                │
│   mitarbeiterId: 'emp_123',                                     │
│   datum: '2025-11-30',                                          │
│   status: 'in_progress',                                        │
│   events: [                                                     │
│     { type: 'start', timestamp: '2025-11-30T08:00:00Z' }       │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PAUSE STARTEN/BEENDEN                              │
├─────────────────────────────────────────────────────────────────┤
│ startBreak(): events.push({ type: 'pause_start', ... })        │
│ endBreak(): events.push({ type: 'pause_end', ... })            │
│                                                                  │
│ events: [                                                       │
│   { type: 'start', timestamp: '08:00' },                       │
│   { type: 'pause_start', timestamp: '10:30' },                 │
│   { type: 'pause_end', timestamp: '11:00' },                   │
│   { type: 'pause_start', timestamp: '13:00' },  // 2. Pause   │
│   { type: 'pause_end', timestamp: '13:30' }                    │
│ ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              FEIERABEND (17:00 Uhr)                             │
├─────────────────────────────────────────────────────────────────┤
│ endWork():                                                       │
│ 1. events.push({ type: 'end', timestamp: '17:00' })            │
│                                                                  │
│ 2. calculateHoursFromEvents():                                  │
│    08:00-10:30 = 2.5h (Arbeit)                                 │
│    10:30-11:00 = 0.5h (Pause - nicht gezählt)                  │
│    11:00-13:00 = 2.0h (Arbeit)                                 │
│    13:00-13:30 = 0.5h (Pause - nicht gezählt)                  │
│    13:30-17:00 = 3.5h (Arbeit)                                 │
│    ─────────────────────────────                               │
│    TOTAL = 8.0h (Arbeitszeit ohne Pausen)                      │
│                                                                  │
│ 3. UPDATE zeiterfassung:                                        │
│    { calculatedHours: 8.0, status: 'completed' }               │
│                                                                  │
│ 4. updateMitarbeiterIstStunden():                               │
│    Summiere ALLE completed zeiterfassungen                      │
│    UPDATE mitarbeiter.istStundenGesamt                         │
└─────────────────────────────────────────────────────────────────┘
```

### SOLL vs IST Berechnung

```javascript
// In mitarbeiter_{werkstattId}/{mitarbeiterId}:
{
  name: 'Max Müller',
  gesamtstunden: 160,           // SOLL-Stunden pro Monat
  istStundenGesamt: 24.5,       // Berechnete IST-Stunden
  istStundenMonatlich: 24.5,    // IST diesen Monat
  differenzStunden: -135.5      // IST - SOLL (negativ = noch zu arbeiten)
}
```

---

## PIPELINE 6: Partner-Bonus & Auszahlungen

### Übersicht
Partner erhalten Bonuszahlungen basierend auf monatlichem Umsatz. 3-Stufen-System mit automatischem monatlichen Reset.

### Bonus-Stufen

```javascript
// In partners_{werkstattId}/{partnerId}.rabattKonditionen:
{
  stufe1: {
    threshold: 2000,      // Ab 2.000€ Monatsumsatz
    bonusBetrag: 50,      // 50€ Bonus
    bonusErhalten: false  // Reset monatlich
  },
  stufe2: {
    threshold: 5000,      // Ab 5.000€
    bonusBetrag: 150,     // 150€ Bonus
    bonusErhalten: false
  },
  stufe3: {
    threshold: 10000,     // Ab 10.000€
    bonusBetrag: 400,     // 400€ Bonus
    bonusErhalten: false
  }
}
```

### Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│              UMSATZ AKKUMULIEREN                                │
├─────────────────────────────────────────────────────────────────┤
│ Jede akzeptierte partnerAnfrage addiert zum Monatsumsatz:       │
│                                                                  │
│ Query: partnerAnfragen                                          │
│   WHERE partnerId == X                                          │
│   WHERE datum >= this_month_start                               │
│   WHERE status == 'kva_akzeptiert'                             │
│                                                                  │
│ Sum all: vereinbarterPreis → currentMonthRevenue               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              BONUS QUALIFIKATION PRÜFEN                         │
├─────────────────────────────────────────────────────────────────┤
│ Datei: admin-bonus-auszahlungen.html                            │
│                                                                  │
│ scanPartnersForBonuses():                                       │
│ FOR EACH partner:                                               │
│   IF currentMonthRevenue >= stufe1.threshold                   │
│      AND stufe1.bonusErhalten === false                        │
│   THEN: Stufe 1 verfügbar! ✅                                  │
│                                                                  │
│ Admin sieht: "Partner X hat Stufe 2 erreicht (5.230€ Umsatz)" │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              AUSZAHLUNG DURCHFÜHREN                             │
├─────────────────────────────────────────────────────────────────┤
│ Admin klickt "💰 Auszahlen":                                   │
│                                                                  │
│ 1. Erstelle bonusAuszahlungen-Dokument:                        │
│    Collection: bonusAuszahlungen_{werkstattId}                  │
│    {                                                            │
│      partnerId: 'partner_xyz',                                  │
│      bonusBetrag: 150,                                         │
│      stufe: 'stufe2',                                          │
│      status: 'ausgezahlt',                                     │
│      umsatzBeimErreichen: 5230,                                │
│      verrechnungsart: 'betrag' | 'prozent' | 'none'           │
│    }                                                            │
│                                                                  │
│ 2. UPDATE partner.rabattKonditionen.stufe2.bonusErhalten = true│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              MONATLICHER RESET                                  │
├─────────────────────────────────────────────────────────────────┤
│ Cloud Function: monthlyBonusReset                               │
│ Schedule: '0 0 1 * *' (1. jeden Monats, 00:00)                 │
│                                                                  │
│ FOR EACH werkstattId:                                           │
│   FOR EACH partner WITH rabattKonditionen:                     │
│     SET stufe1.bonusErhalten = false                           │
│     SET stufe2.bonusErhalten = false                           │
│     SET stufe3.bonusErhalten = false                           │
│                                                                  │
│ → Partner können nächsten Monat wieder Bonuses verdienen       │
└─────────────────────────────────────────────────────────────────┘
```

---

## PIPELINE 7: Auth & Multi-Tenant Architektur

### 2-Stufen Authentifizierung

```
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 1: WERKSTATT LOGIN                           │
├─────────────────────────────────────────────────────────────────┤
│ Datei: index.html                                               │
│                                                                  │
│ 1. User wählt Werkstatt (Dropdown):                            │
│    ├─ Mosbach (ID: mosbach)                                    │
│    ├─ Heidelberg (ID: heidelberg)                              │
│    └─ Mannheim (ID: mannheim)                                  │
│                                                                  │
│ 2. User gibt Werkstatt-Passwort ein                            │
│                                                                  │
│ 3. Backend:                                                     │
│    ├─ Query: users WHERE werkstatt == selectedId               │
│    ├─ Verify: SHA256(input) === werkstatt.passwordHash         │
│    └─ Firebase Auth: signInWithEmailAndPassword()              │
│                                                                  │
│ 4. Session erstellt:                                            │
│    sessionStorage.session_werkstatt = {                         │
│      werkstattId: 'mosbach',  // ⚠️ CRITICAL                   │
│      role: 'werkstatt'                                         │
│    }                                                            │
│    window.werkstattId = 'mosbach'                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              STAGE 2: MITARBEITER SELECTION                     │
├─────────────────────────────────────────────────────────────────┤
│ Datei: mitarbeiter-selection.html                               │
│                                                                  │
│ 1. Lade Mitarbeiter für aktuelle Werkstatt:                    │
│    window.getCollection('mitarbeiter').get()                   │
│    → Automatic suffix: mitarbeiter_mosbach                     │
│                                                                  │
│ 2. User wählt Mitarbeiter und gibt persönliches Passwort ein   │
│                                                                  │
│ 3. Backend (KEIN Firebase Auth!):                              │
│    ├─ Verify: SHA256(input) === mitarbeiter.passwordHash       │
│    └─ Erstelle activeSessions-Dokument (Audit Trail)          │
│                                                                  │
│ 4. Session erweitert:                                           │
│    sessionStorage.session_mitarbeiter = {                       │
│      id: 'emp_123',                                            │
│      name: 'Max Müller',                                        │
│      rolle: 'meister'                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Collection Pattern

```javascript
// firebase-config.js (Lines 427-482)

// Collection-Name mit werkstattId-Suffix
function getCollectionName(baseCollection) {
  // Priority 1: window.werkstattId (Partner-App)
  if (window.werkstattId) {
    return `${baseCollection}_${window.werkstattId}`;
  }

  // Priority 2: auth-manager getCurrentUser()
  const user = getCurrentUser();
  if (user?.werkstattId) {
    return `${baseCollection}_${user.werkstattId}`;
  }

  throw new Error('werkstattId required for multi-tenant access');
}

// Gibt CollectionReference zurück (NICHT String!)
function getCollection(baseCollection) {
  const collectionName = getCollectionName(baseCollection);
  return db.collection(collectionName);
}

// ✅ RICHTIG: Nutze Helper
const fahrzeuge = window.getCollection('fahrzeuge');
// → fahrzeuge_mosbach (CollectionReference)

// ❌ FALSCH: Direkter Zugriff (verletzt Multi-Tenancy!)
const fahrzeuge = db.collection('fahrzeuge');
// → fahrzeuge (globale Collection - DATA LEAK!)
```

### Global vs Tenant-Scoped Collections

| Collection | Scope | Suffix |
|------------|-------|--------|
| users | Global | - |
| partners | Global | - |
| partnerAutoLoginTokens | Global | - |
| fahrzeuge_* | Tenant | _{werkstattId} |
| kunden_* | Tenant | _{werkstattId} |
| mitarbeiter_* | Tenant | _{werkstattId} |
| partnerAnfragen_* | Tenant | _{werkstattId} |
| rechnungen_* | Tenant | _{werkstattId} |
| zeiterfassung_* | Tenant | _{werkstattId} |
| bonusAuszahlungen_* | Tenant | _{werkstattId} |
| ... (40+ weitere) | Tenant | _{werkstattId} |

### Memory-Safe Navigation (Pattern #49)

```javascript
// js/listener-registry.js

// ❌ FALSCH: Verursacht Memory Leaks (133 Instanzen vor Bug #3)
window.location.href = 'index.html';

// ✅ RICHTIG: Cleanup vor Navigation
window.safeNavigate('index.html');

function safeNavigate(url, forceCleanup = true) {
  console.log(`🚀 Safe navigation to: ${url}`);

  // Cleanup alle Firestore Listener
  if (window.listenerRegistry && forceCleanup) {
    window.listenerRegistry.unregisterAll();
  }

  // Navigation nach Cleanup
  setTimeout(() => {
    window.location.href = url;
  }, 100);
}
```

---

## DATENFLUSS-ÜBERSICHT

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KOMPLETTER DATENFLUSS                                │
└─────────────────────────────────────────────────────────────────────────────┘

PARTNER PORTAL                    WERKSTATT PORTAL                 CLOUD
─────────────────                 ─────────────────                 ─────

partner-app/                      annahme.html                      functions/
├─ *-anfrage.html ─────────────→ admin-anfragen.html ──────────→ sendEmail()
│  (Service-Formular)             (Anfragen prüfen)                (AWS SES)
│                                        │
│                                        ▼
├─ meine-anfragen.html ←───────── anfrage-detail.html
│  (Status sehen)                 (Fahrzeug erstellen)
│                                        │
│                                        ▼
│                                 kanban.html
│                                 (Workflow-Board)
│                                        │
│                                        ▼
├─ rechnungen.html ←───────────── rechnungen-admin.html
│  (Rechnungen sehen)             (Rechnungs-Verwaltung)
│
└─ auto-login.html ←───────────── entwuerfe-bearbeiten.html
   (QR-Code Login)                (Entwurf vervollständigen)
                                         │
                                         ▼
                                  mitarbeiter-dienstplan.html
                                  (Zeiterfassung)
                                         │
                                         ▼
                                  mitarbeiter-verwaltung.html
                                  (Admin: Stunden-PDF)
                                         │
                                         ▼
                                  admin-bonus-auszahlungen.html
                                  (Bonus-Verwaltung)


FIRESTORE COLLECTIONS:
──────────────────────

partnerAnfragen_{werkstattId}
         │
         ▼ (createFahrzeugFromAnfrage)
fahrzeuge_{werkstattId}
         │
         ├──────────────────────────┐
         ▼                          ▼
kunden_{werkstattId}          rechnungen_{werkstattId}
                                    │
                                    ▼
                              bonusAuszahlungen_{werkstattId}


zeiterfassung_{werkstattId}
         │
         ▼ (updateMitarbeiterIstStunden)
mitarbeiter_{werkstattId}
```

---

## KRITISCHE INTEGRATIONSPUNKTE

### 1. Status-Synchronisation
```
fahrzeuge ←→ partnerAnfragen
   │
   └─ Bidirektionaler Sync bei JEDEM Status-Wechsel
   └─ Trigger: directStatusUpdate() in kanban.html
```

### 2. Rechnungs-Automation
```
status === 'fertig'
   │
   └─ autoCreateRechnung()
   └─ Trigger: directStatusUpdate() mit Status-Check
```

### 3. Zeiterfassungs-Aggregation
```
zeiterfassung.completedAt
   │
   └─ updateMitarbeiterIstStunden()
   └─ Summiert ALLE completed Einträge
```

### 4. Bonus-Berechnung
```
partnerAnfragen.vereinbarterPreis
   │
   └─ scanPartnersForBonuses()
   └─ Summiert Monatsumsatz pro Partner
```

### 5. Multi-Tenant Isolation
```
ALLE Firestore-Operationen
   │
   └─ window.getCollection()
   └─ Automatischer _{werkstattId} Suffix
```

---

## ZUSAMMENFASSUNG

| Pipeline | Haupt-Dateien | Kritische Funktionen |
|----------|---------------|---------------------|
| 1. Partner-Anfrage | 12 *-anfrage.html, kanban.html | createFahrzeugFromAnfrage() |
| 2. Entwurf-System | annahme.html, entwuerfe-bearbeiten.html | sendEntwurfEmail() |
| 3. KVA/Rechnung | kva-erstellen.html, meine-anfragen.html | autoCreateRechnung() |
| 4. Multi-Service | kanban.html (alle Service-Handler) | hasService(), getServiceStatus() |
| 5. Zeiterfassung | mitarbeiter-dienstplan.html | calculateHoursFromEvents() |
| 6. Bonus-System | admin-bonus-auszahlungen.html | monthlyBonusReset() |
| 7. Auth/Multi-Tenant | firebase-config.js, auth-manager.js | getCollection() |

---

**Dokumentation erstellt durch vollständige Codebase-Analyse von ~208,000 Zeilen Code.**
