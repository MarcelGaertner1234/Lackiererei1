# Kalkulation.html - Price Calculation & Variant Structure Analysis

## Executive Summary

The kalkulation.html system supports **3 variants per service**: **original** (Premium/OEM Parts), **zubehoer** (Budget/Aftermarket), and **partner** (Budget Alternative). All calculation is performed in `berechneGesamtsumme()` function, which calculates 4 cost categories and adds VAT (MwSt) on top.

---

## 1. VARIANT STRUCTURE

### 3 Available Variants Per Service
```javascript
let variantTableData = {
    original:  { ersatzteile: [], arbeitslohn: [], lackierung: [], ersatzfahrzeug: null, _services: {} },
    zubehoer:  { ersatzteile: [], arbeitslohn: [], lackierung: [], ersatzfahrzeug: null, _services: {} },
    partner:   { ersatzteile: [], arbeitslohn: [], lackierung: [], ersatzfahrzeug: null, _services: {} }
};

const variantStyles = {
    original: { bg: '#e3f2fd', border: '#0d47a1', label: '💎 Premium', icon: '💎', textColor: '#0d47a1' },
    zubehoer: { bg: '#fff3e0', border: '#e65100', label: '💰 Budget', icon: '💰', textColor: '#e65100' },
    partner:  { bg: '#e8f5e9', border: '#2e7d32', label: '🤝 Partner', icon: '🤝', textColor: '#2e7d32' }
};
```

### Variant Activation
- Only specified variants are rendered based on service config
- Example: Lackierung renders ['original', 'zubehoer'] → 2 variants available
- Example: Reifen renders ['original', 'zubehoer'] → 2 variants available
- Example: Mechanik renders ['original'] → only 1 variant (Premium only)

---

## 2. COST COMPONENTS PER VARIANT

Each variant contains **4 cost categories**:

### Category 1: Ersatzteile (Parts) - €€
```javascript
ersatzteile: [
  {
    etn: "123-456-789",          // Part number (optional)
    benennung: "Bremsbelage",    // Description
    anzahl: 1,                   // Quantity
    einzelpreis: 45.00,          // Unit price (€)
    gesamtpreis: 45.00           // Total (anzahl × einzelpreis)
  },
  { ... }
]
```

**Field Mapping (from FIELD_TO_TABLE_MAPPING):**
- `reifensatz`, `teilekosten`, `ersatzteile`, `material` → Ersatzteile category
- `kuehlmittel`, `kaeltemittel`, `dichtung`, `scheibe`, `folie`, `steinschutzfolie`

### Category 2: Arbeitslohn (Labor) - €€
```javascript
arbeitslohn: [
  {
    position: "Demontage",       // Task description
    art: "Demontage",            // Type (Demontage, Montage, Reparatur, Diagnose, etc.)
    stunden: 2.5,                // Hours worked
    stundensatz: 50.00,          // Hourly rate (€/h)
    gesamtpreis: 125.00          // Total (stunden × stundensatz)
  },
  { ... }
]
```

**Field Mapping:**
- `montage`, `demontage`, `reinigung`, `einlagerung`, `wuchten` → Arbeitslohn category
- `tuev`, `au`, `diagnose`, `klimaservice`, `desinfektion`, `verklebung`, `grundierung`

### Category 3: Lackierung (Painting) - €€
```javascript
lackierung: [
  {
    position: "Motorhaube lackieren",  // Task
    bereich: "Gesamt",                 // Area (Gesamt, Teilbereich, Punktuell)
    stunden: 3.0,                      // Hours
    stundensatz: 60.00,                // Hourly rate (€/h)
    gesamtpreis: 180.00                // Total
  },
  { ... }
]
```

**Field Mapping:**
- `lackkosten`, `lackierung`, `lack`, `spotrepair`, `ausbesserung` → Lackierung category

### Category 4: Ersatzfahrzeug (Rental Car) - €€
```javascript
ersatzfahrzeug: {
  fahrzeugId: "xyz789",          // Rental vehicle ID (audit trail)
  kennzeichen: "AB-CD-123",      // License plate
  marke: "Toyota",               // Brand (for PDF display)
  modell: "Corolla",             // Model (for PDF display)
  tagesmiete: 45.00,             // Daily rate (€/day)
  tage: 5,                       // Estimated days
  gesamt: 225.00                 // Total (tagesmiete × tage)
}
```

**Special Notes:**
- Ersatzfahrzeug is a **single object** (not array) - only one rental vehicle per variant
- Costs are calculated from dropdown selection + estimated days
- **INCLUDED in total** for Single-Service (Line 6633: `variantData.gesamt = gesamt + efKosten`)
- **INCLUDED in total** for Multi-Service (Line 6366: `.gesamt += ersatzfahrzeugKosten.gesamt`)

---

## 3. PRICE CALCULATION FLOW

### Phase 1: Cost Collection (berechneGesamtsumme)

```javascript
// ✅ Step 1: Sum labor costs (Arbeitspositionen)
const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => {
    const preis = parseFloat(p.preis) || 0;
    const menge = parseFloat(p.menge) || 1;
    return sum + (preis * menge);
}, 0);

// ✅ Step 2: Sum material costs (Material)
const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => {
    const preis = parseFloat(m.preis) || parseFloat(m.verkaufspreis) || 0;
    const menge = parseFloat(m.menge) || 1;
    return sum + (preis * menge);
}, 0);

// ✅ Step 3: Sum parts costs (Ersatzteile - NEW!)
const summeErsatzteile = (kalkWizardData.ersatzteile || []).reduce((sum, e) => {
    const preis = parseFloat(e.preis) || 0;
    const menge = parseFloat(e.menge) || 1;
    return sum + (preis * menge);
}, 0);

// ✅ Step 4: Sum rental vehicle costs (Ersatzfahrzeug - NEW!)
let summeErsatzfahrzeug = 0;
const ersatzfahrzeugData = kalkWizardData.ersatzfahrzeug || 
                           kalkWizardData.fahrzeug?.kalkulationData?.ersatzfahrzeug;
if (ersatzfahrzeugData && ersatzfahrzeugData.gesamt > 0) {
    summeErsatzfahrzeug = parseFloat(ersatzfahrzeugData.gesamt) || 0;
}
```

### Phase 2: VAT Calculation

```javascript
// 🔑 KEY: Net total includes ALL 4 components
const summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug;

// VAT Rate (default 19%)
const mwstSatz = kalkulationSaetze?.mwstSatz || 19;  // Configurable!

// VAT Amount (added on top of net total)
const mwst = summeNetto * (mwstSatz / 100);

// Final gross total (net + VAT)
const summeBrutto = summeNetto + mwst;
```

**🔴 CRITICAL:** MwSt is **ADDED ON TOP** of the net total, not included in component prices!

### Phase 3: UI Update
```javascript
// Display each component separately
elSummeArbeit.textContent = summeArbeit.toFixed(2).replace('.', ',') + ' €';
elSummeMaterial.textContent = summeMaterial.toFixed(2).replace('.', ',') + ' €';
elSummeErsatzteile.textContent = summeErsatzteile.toFixed(2).replace('.', ',') + ' €';
elSummeErsatzfahrzeug.textContent = summeErsatzfahrzeug.toFixed(2).replace('.', ',') + ' €';

// Display totals
elSummeNetto.textContent = summeNetto.toFixed(2).replace('.', ',') + ' €';
elMwstSatz.textContent = mwstSatz;  // '19'
elSummeMwst.textContent = mwst.toFixed(2).replace('.', ',') + ' €';
elSummeBrutto.textContent = summeBrutto.toFixed(2).replace('.', ',') + ' €';
```

---

## 4. SINGLE-SERVICE VARIANT EXAMPLE

For service like "Lackierung" with 2 variants (original, zubehoer):

### Data Model Saved to Firestore
```javascript
kvaData = {
    serviceTyp: 'lackier',
    isMultiService: false,
    
    // ✅ Key structure: One entry per variant
    varianten: {
        original: {
            // All input fields flattened into variant object
            lackierung: 850.00,       // Painting costs
            teilekosten: 120.00,      // Parts costs
            demontage: 45.00,         // Labor: Disassembly
            montage: 60.00,           // Labor: Assembly
            ersatzfahrzeug: 225.00,   // Optional rental car costs
            gesamt: 1300.00           // Total for this variant (WITH Ersatzfahrzeug!)
        },
        zubehoer: {
            lackierung: 650.00,       // Cheaper aftermarket option
            teilekosten: 60.00,       // Cheaper parts
            demontage: 45.00,
            montage: 60.00,
            ersatzfahrzeug: 225.00,
            gesamt: 1040.00           // Total (WITH Ersatzfahrzeug!)
        }
    },
    
    // ✅ Detailed breakdown for PDF generation
    kalkulationData: {
        ersatzteile: [
            { etn: "123-456", benennung: "Bremsbelage", gesamtpreis: 120.00 }
        ],
        arbeitslohn: [
            { position: "Demontage", stunden: 1.5, stundensatz: 30, gesamtpreis: 45.00 },
            { position: "Montage", stunden: 2.0, stundensatz: 30, gesamtpreis: 60.00 }
        ],
        lackierung: [
            { position: "Motorhaube lackieren", stunden: 3, stundensatz: 50, gesamtpreis: 150.00 }
        ],
        ersatzfahrzeug: {
            kennzeichen: "AB-CD-123",
            tagesmiete: 45.00,
            tage: 5,
            gesamt: 225.00
        }
    },
    
    // Partner selects which variant they accept
    gewaehlteVariante: null,  // 'original' or 'zubehoer' (selected later)
    
    // Optional parts from PDF import
    pdfImport: {
        editedData: {
            ersatzteile: [...]  // Additional parts entered manually
        }
    }
}
```

---

## 5. MULTI-SERVICE VARIANT EXAMPLE

For request with 2 services (Lackier + Reifen) with different variants:

### Data Model Saved to Firestore
```javascript
kvaData = {
    isMultiService: true,
    serviceLabels: ['lackier', 'reifen'],
    
    // ✅ One object per variant
    varianten: {
        original: {
            // Flatten ALL service fields into one variant object
            // lackier_lackierung: 850.00, lackier_teilekosten: 120.00
            // reifen_reifensatz: 400.00, reifen_montage: 80.00
            // ersatzfahrzeug: 225.00 (shared, not per-service!)
            gesamt: 2000.00  // Total across ALL services + Ersatzfahrzeug
        },
        zubehoer: {
            // Budget variant (same services, lower prices)
            gesamt: 1500.00
        }
    },
    
    // ✅ Service-specific breakdown
    breakdown: {
        original: {
            lackier: {
                fields: ['lackier_lackierung', 'lackier_teilekosten'],
                gesamt: 970.00
            },
            reifen: {
                fields: ['reifen_reifensatz', 'reifen_montage'],
                gesamt: 480.00
            }
            // Note: Ersatzfahrzeug NOT in breakdown (shared, in varianten.gesamt)
        },
        zubehoer: {
            lackier: {
                fields: ['lackier_lackierung', 'lackier_teilekosten'],
                gesamt: 710.00
            },
            reifen: {
                fields: ['reifen_reifensatz', 'reifen_montage'],
                gesamt: 440.00
            }
        }
    },
    
    // ✅ Detailed kalkulation per variant (for PDF generation)
    varianten: {
        original: {
            kalkulationData: {
                ersatzteile: [
                    { benennung: "Bremsbelage", gesamtpreis: 120.00 },
                    { benennung: "Reifen 4er Set", gesamtpreis: 400.00 }
                ],
                arbeitslohn: [
                    { position: "Demontage + Montage", gesamtpreis: 125.00 },
                    { position: "Reifenmontage", gesamtpreis: 80.00 }
                ],
                lackierung: [
                    { position: "Motorhaube lackieren", gesamtpreis: 150.00 }
                ],
                ersatzfahrzeug: {
                    kennzeichen: "AB-CD-123",
                    tagesmiete: 45.00,
                    tage: 5,
                    gesamt: 225.00
                }
            }
        }
    }
}
```

---

## 6. VAT (MwSt) HANDLING

### VAT Configuration
```javascript
kalkulationSaetze = {
    mwstSatz: 19  // Default: 19% (can be customized)
};
```

### VAT Calculation
```javascript
// ❌ VAT is NOT included in component prices
// ✅ VAT is calculated as: Net Total × (MwSt% / 100)

const summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug;
const mwst = summeNetto * (mwstSatz / 100);  // ADD ON TOP
const summeBrutto = summeNetto + mwst;       // Net + VAT
```

### Example Calculation
```
Arbeit (Labor):          €500.00
Material (Ersatzteile):  €300.00
Lackierung:              €200.00
Ersatzfahrzeug:          €225.00
─────────────────────────────────
Net Total:              €1,225.00

VAT (19%):              €232.75  (1225 × 0.19)
─────────────────────────────────
Gross Total:            €1,457.75
```

**🔴 CRITICAL:** MwSt is **ALWAYS** added separately on top of net costs!

---

## 7. ERSATZFAHRZEUG (RENTAL CAR) HANDLING

### Data Source & Calculation
```javascript
ersatzfahrzeugData = {
    fahrzeugId: "xyz789",        // ID of rental car from dropdown
    kennzeichen: "AB-CD-123",    // License plate
    marke: "Toyota",             // Brand (for PDF)
    modell: "Corolla",           // Model (for PDF)
    tagesmiete: 45.00,           // Daily rental rate (€/day)
    tage: 5,                     // Estimated rental days (user input)
    gesamt: 225.00               // Total = tagesmiete × tage
};
```

### How It's Included in Totals

**Single-Service (Line 6633):**
```javascript
const efKosten = kvaData.ersatzfahrzeugKosten?.gesamt || 0;
variantData.gesamt = gesamt + efKosten;  // ✅ Included in variant.gesamt
```

**Multi-Service (Line 6366):**
```javascript
kvaData.varianten[variantType].gesamt += (kvaData.ersatzfahrzeugKosten?.gesamt || 0);
// ✅ Included in variant.gesamt
```

### Important Notes
1. **NOT per-service:** Ersatzfahrzeug is shared across all services in multi-service requests
2. **Per-variant:** Each variant has its own ersatzfahrzeugData (same cost for original, zubehoer, partner)
3. **Optional:** If no rental car selected, `ersatzfahrzeugData = null` and costs = 0
4. **Included in VAT base:** Ersatzfahrzeug costs ARE included in MwSt calculation

---

## 8. FIRESTORE DOCUMENT STRUCTURE

### Top-Level KVA Document
```javascript
{
    id: "anf_123456",
    kva: {
        // Metadata
        serviceTyp: 'lackier',
        isMultiService: false,
        erstelltAm: "2025-11-30T10:30:00.000Z",
        erstelltVon: 'Admin',
        kalkulationId: "kal_789",
        gewaehlteVariante: null,  // Partner selects later
        
        // Variant Prices
        varianten: {
            original: { ... },
            zubehoer: { ... }
        },
        
        // Detailed Breakdown (for PDF generation)
        kalkulationData: {
            ersatzteile: [...],
            arbeitslohn: [...],
            lackierung: [...],
            ersatzfahrzeug: { ... }
        },
        
        // Parts from PDF import
        pdfImport: {
            editedData: {
                ersatzteile: [...]
            }
        },
        
        // Scheduling info
        termine: {
            start: "2025-12-15",
            ende: "2025-12-20",
            abholzeit: "08:00"
        },
        
        // Delivery options
        lieferzeit: "5-7 Arbeitstage",
        lieferoption: 'abholen',
        abholserviceGewuenscht: true,
        ersatzfahrzeugGewuenscht: true,
        
        // Vehicle identification
        vin: "WBAAL4KC5CCW12345",
        kennzeichen: "AB-CD-123"
    }
}
```

---

## 9. SUMMARY TABLE

| Component | Field Name | Included in Net? | Included in Variant? | Included in VAT? |
|-----------|-----------|----------|----------|-----------|
| **Ersatzteile** (Parts) | `summeErsatzteile` | ✅ YES | ✅ YES | ✅ YES |
| **Arbeitslohn** (Labor) | `summeArbeit` | ✅ YES | ✅ YES | ✅ YES |
| **Lackierung** (Paint) | `summeMaterial` | ✅ YES | ✅ YES | ✅ YES |
| **Ersatzfahrzeug** (Rental) | `summeErsatzfahrzeug` | ✅ YES | ✅ YES | ✅ YES |
| **MwSt** (VAT) | `mwst` | ❌ NO | ✅ YES | N/A |
| **Gross Total** | `summeBrutto` | N/A | ✅ YES | ✅ Calculated |

---

## 10. KEY FORMULAS

```javascript
// Core Calculation (berechneGesamtsumme function)
summeArbeit = SUM(positionen[*].preis * positionen[*].menge)
summeMaterial = SUM(materialien[*].preis * materialien[*].menge)
summeErsatzteile = SUM(ersatzteile[*].preis * ersatzteile[*].menge)
summeErsatzfahrzeug = ersatzfahrzeugData.tagesmiete * ersatzfahrzeugData.tage

summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug
mwst = summeNetto * (mwstSatz / 100)
summeBrutto = summeNetto + mwst

// Per Variant (kva-erstellen.html line 6362)
variantData.gesamt = SUM(variantData[*]) + ersatzfahrzeugKosten.gesamt

// Where SUM(variantData[*]) includes all variant input fields (lackierung, teilekosten, etc.)
```

---

## 11. CHANGES FROM NOV 2025 RELEASES

- **2025-11-28:** Added variant PDF generation + kalkulationData structure
- **2025-11-29:** Fixed ersatzteile transfer to pdfImport.editedData
- **2025-11-30:** Fixed ersatzfahrzeug inclusion in Multi-Service varianten.gesamt (Line 6366)
- **2025-11-30:** Fixed ersatzfahrzeug inclusion in Single-Service varianten.gesamt (Line 6633)
- **2025-12-01:** Ensured ersatzfahrzeug costs included for all variants (original, zubehoer, partner)

---

## 12. DEBUGGING CHECKLIST

✅ **When variant prices don't match expected:**
1. Check if all 4 cost components are included: Arbeit, Material, Ersatzteile, Ersatzfahrzeug
2. Check if Ersatzfahrzeug is selected (null = €0)
3. Check VAT rate in UI (should show 19% by default)
4. Verify `variantData.gesamt` calculation includes EF costs

✅ **When VAT seems wrong:**
1. Confirm VAT is calculated AFTER summing all costs
2. VAT should be: `summeNetto * 0.19` (not including VAT in component prices)
3. Final gross = net + VAT

✅ **When Multi-Service variants missing costs:**
1. Check `breakdown[variantType][serviceTyp]` exists
2. Verify kalkulationData has separate ersatzteile/arbeitslohn/lackierung arrays
3. Ensure `varianten[variantType].gesamt` includes Ersatzfahrzeug cost

