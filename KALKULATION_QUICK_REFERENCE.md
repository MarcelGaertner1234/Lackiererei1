# Kalkulation Price Structure - QUICK REFERENCE

## Key Finding: 3 Variants Per Service

```
ORIGINAL (Premium/OEM)  vs  ZUBEHOER (Budget/Aftermarket)  vs  PARTNER (Alternative)
├─ OEM parts                ├─ Aftermarket parts            ├─ Partner parts  
├─ Full paint coverage      ├─ Partial paint coverage       ├─ Budget option
└─ Higher cost              └─ Lower cost                   └─ Lowest cost
```

---

## Variant Price Structure (Single-Service Example)

```
VARIANT = OBJECT {
    lackierung: €850            ← Painting costs
    teilekosten: €120           ← Parts costs
    demontage: €45              ← Labor: disassembly
    montage: €60                ← Labor: assembly
    ersatzfahrzeug: €225        ← Optional rental car
    ─────────────────
    gesamt: €1,300              ← TOTAL (all fields summed)
}
```

**All fields are flattened into variant object** - NOT nested by category!

---

## The 4 Cost Components

### 1. Ersatzteile (Parts) 
- Teile, Material, Einzelpreis, Kältemittel, Scheibe, Folie, Steinschutzfolie
- Calculated: `price × quantity`

### 2. Arbeitslohn (Labor)
- Montage, Demontage, Reinigung, Diagnose, TÜV, Klimaservice
- Calculated: `hours × hourly_rate`

### 3. Lackierung (Painting)
- Lackkosten, Spotrepair, Ausbesserung
- Calculated: `hours × hourly_rate`

### 4. Ersatzfahrzeug (Rental Car) - OPTIONAL
- Tagesmiete × Tage = Gesamt
- **Included in variant total!** (NOT separate)
- Same rental cost for all variants (original, zubehoer, partner)

---

## VAT (MwSt) Calculation

```
Net Total    = All 4 components summed
              = Arbeit + Material + Ersatzteile + Ersatzfahrzeug

VAT (19%)    = Net Total × 0.19  ← ADDED ON TOP!

Gross Total  = Net Total + VAT (19%)
```

**CRITICAL:** VAT is NOT included in component prices - it's added on top!

---

## Firestore Structure

```javascript
anfrage.kva = {
    varianten: {
        original: {
            lackierung: 850,
            teilekosten: 120,
            demontage: 45,
            montage: 60,
            ersatzfahrzeug: 225,
            gesamt: 1300  // Sum of all fields above
        },
        zubehoer: {
            lackierung: 650,
            teilekosten: 60,
            demontage: 45,
            montage: 60,
            ersatzfahrzeug: 225,
            gesamt: 1040
        }
    },
    kalkulationData: {
        ersatzteile: [
            { etn: "123", benennung: "Bremsbelage", gesamtpreis: 120 }
        ],
        arbeitslohn: [
            { position: "Demontage", stunden: 1.5, stundensatz: 30, gesamtpreis: 45 }
        ],
        lackierung: [
            { position: "Motorhaube lackieren", stunden: 3, stundensatz: 50, gesamtpreis: 150 }
        ],
        ersatzfahrzeug: {
            kennzeichen: "AB-CD-123",
            tagesmiete: 45,
            tage: 5,
            gesamt: 225
        }
    },
    gewaehlteVariante: null  // Partner selects later
}
```

---

## Formula Summary

```javascript
// Cost components
summeArbeit        = SUM(labor items)
summeMaterial      = SUM(parts items)
summeErsatzteile   = SUM(replacement parts)
summeErsatzfahrzeug = tagesmiete × tage

// Totals
summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug
mwst       = summeNetto × 0.19
summeBrutto = summeNetto + mwst

// Per Variant
variantData.gesamt = SUM(all variant fields)  // ← Includes Ersatzfahrzeug!
```

---

## Multi-Service Difference

**Single-Service:**
```javascript
varianten: {
    original: { lackierung: 850, teilekosten: 120, ... gesamt: 1300 },
    zubehoer: { lackierung: 650, teilekosten: 60, ... gesamt: 1040 }
}
```

**Multi-Service:**
```javascript
varianten: {
    original: {
        lackier_lackierung: 850,
        lackier_teilekosten: 120,
        reifen_reifensatz: 400,
        reifen_montage: 80,
        ersatzfahrzeug: 225,  // Shared (not per-service)
        gesamt: 2000  // Total across ALL services
    }
},
breakdown: {
    original: {
        lackier: { fields: [...], gesamt: 970 },
        reifen: { fields: [...], gesamt: 480 }
        // Note: ersatzfahrzeug NOT in breakdown
    }
}
```

---

## File Locations

- **Variant Calculation:** `kalkulation.html:13939` (berechneGesamtsumme)
- **Variant Structure:** `kva-erstellen.html:2032` (variantTableData)
- **Single-Service Save:** `kva-erstellen.html:6524` (kvaData object)
- **Multi-Service Save:** `kva-erstellen.html:6260` (multi-service logic)

---

## Testing Checklist

✅ All 4 components included in variant.gesamt
✅ Ersatzfahrzeug costs added (if selected)
✅ VAT calculated AFTER all costs (not included in components)
✅ Multi-Service includes breakdown by service
✅ gewaehlteVariante set to single variant (if only 1 exists)

