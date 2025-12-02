# HTML Files Inventory - Quick Index

**Created:** 2025-11-27  
**Scope:** 20 root-level HTML files (51 total with marketing/utility pages)  
**Total Code:** ~121,000 lines  

## Files in This Inventory

1. **HTML_INVENTORY.json** (22KB)
   - Structured data for all 20+ files
   - Functions, collections, form inputs per file
   - Known issues and fixes documented
   - Machine-readable format (use for tools/scripts)

2. **HTML_INVENTORY_SUMMARY.md** (17KB)
   - Human-readable comprehensive guide
   - Architecture patterns explained
   - Critical error patterns and fixes
   - Security considerations
   - Performance characteristics

3. **HTML_INVENTORY_INDEX.md** (this file)
   - Quick reference and navigation
   - File descriptions and purposes
   - Critical pages highlighted

---

## File Quick Reference

### CRITICAL Files (Production Core)
| File | Size | Functions | Purpose |
|------|------|-----------|---------|
| **annahme.html** | 10,217 | 116 | Vehicle intake form - PRIMARY DATA ENTRY |
| **kanban.html** | 8,946 | 88 | Process management Kanban board |
| **kalkulation.html** | 18,772 | 270 | Advanced costing/quote system with AI |
| **index.html** | 6,097 | 76 | Authentication & main dashboard |

### HIGH Priority Files (Major Features)
| File | Size | Functions | Purpose |
|------|------|-----------|---------|
| **mitarbeiter-verwaltung.html** | 5,699 | 67 | Employee management + wages + time tracking |
| **kunden.html** | 6,373 | 79 | Partner/customer management directory |
| **material.html** | 5,456 | 62 | Material ordering + spare parts management |
| **entwuerfe-bearbeiten.html** | 4,841 | 59 | Draft editing + quote creation |
| **rechnungen-admin.html** | 1,923 | 27 | Invoice management system |

### MEDIUM Priority Files (Supporting Features)
| File | Size | Functions | Purpose |
|------|------|-----------|---------|
| **mitarbeiter-dienstplan.html** | 3,282 | 66 | Employee time clock + personal scheduling |
| **admin-einstellungen.html** | 2,812 | 23 | Admin configuration + email templates |
| **admin-dashboard.html** | 1,666 | 21 | Admin statistics dashboard |
| **admin-bonus-auszahlungen.html** | 2,185 | 18 | Partner bonus management + payouts |
| **wissensdatenbank.html** | 3,723 | 64 | Knowledge base + disassembly guides |
| **dienstplan.html** | 3,493 | 74 | Schedule management + shift creation |
| **liste.html** | 3,584 | 44 | Vehicle list overview + filtering |
| **nutzer-verwaltung.html** | 1,056 | 18 | User account management |
| **registrierung.html** | 950 | 3 | Partner self-registration form |

### LOW Priority Files (Optional Features)
| File | Size | Functions | Purpose |
|------|------|-----------|---------|
| **kalender.html** | 3,703 | 57 | Calendar view + scheduling |
| **leihfahrzeuge.html** | 1,746 | 28 | Loaner vehicle management |

---

## Key Statistics

- **Total Functions:** ~1,200 across all files
- **Firestore Collections:** 20+ (multi-tenant with `_werkstattId` suffix)
- **Form Inputs:** 300+ across all pages
- **Script Dependencies:** 15-25 per page (Firebase, jsPDF, Chart.js, etc.)
- **Mobile Responsive:** Yes (320px-2560px coverage)
- **Dark Mode Support:** Yes (theme toggle available)
- **Accessibility Level:** WCAG Level AA

---

## Critical Firestore Collections

**Multi-Tenant Collections** (suffix: `_{werkstattId}`):
- `fahrzeuge` - Vehicles
- `kunden` - Customers
- `partners` - B2B Partners
- `partnerAnfragen` - Partner service requests
- `mitarbeiter` - Employees
- `zeiterfassung` - Time tracking
- `urlaubsAnfragen` - Vacation requests
- `schichten` - Work shifts
- `schichtTypen` - Shift types
- `bestellungen` - Orders
- `ersatzteile` - Spare parts
- `materialRequests` - Material orders
- `calendar` - Calendar events
- `bonusAuszahlungen` - Partner bonuses
- `counters` - Invoice number counters
- `lohnabrechnungen` - Payroll statements
- `stundennachweise` - Hour records
- `leihfahrzeugPool` - Loaner vehicle pool
- `leihfahrzeugAnfragen` - Rental requests
- `rechnungen` - Invoices

**Global Collections** (no suffix):
- `users` - User accounts
- `settings` - Configuration
- `partnerAutoLoginTokens` - 7-day login tokens

---

## Architecture Highlights

### Multi-Tenant Model
```javascript
// Collections auto-append werkstattId suffix
window.getCollection('fahrzeuge') → 'fahrzeuge_mosbach'
window.getCollection('fahrzeuge') → 'fahrzeuge_heidelberg' (different user)
```

### 2-Stage Authentication
1. Select Werkstatt (localStorage persistent)
2. Login as Employee (Firebase Auth, optional)
3. Role-based access (admin, werkstatt, mitarbeiter, partner, kunde)

### Multi-Service Workflow
- Primary service: `serviceTyp` (IMMUTABLE after creation)
- Additional services: `additionalServices[]` array
- Status tracking: `serviceStatuses` object per service
- Service-specific data: `serviceData` object

### Real-Time Updates
- Firestore `onSnapshot()` listeners
- Listener cleanup with `listenerRegistry.js`
- Background sync tracking (Pattern #57)

---

## Known Issues & Fixes (Bugs #21-57)

### Recent Fixes (Nov 2025)
| Bug | File | Symptom | Fix |
|-----|------|---------|-----|
| #21 | kanban.html | Multi-service data loss | 2-Layer Defense (commits 750d7b2, 7083778) |
| #44 | annahme.html | PDF layout/emoji issues | Y-position fix + ASCII labels |
| #45 | annahme.html | Garbled emoji text | Use ASCII instead of Unicode |
| #46 | annahme.html | Quick mode kundenname error | Fallback value added |
| #47 | entwuerfe-bearbeiten.html | Dark mode invisible elements | Theme-aware opacity |
| #48 | meine-anfragen.html | Firestore type errors | Date → ISO string conversion |
| #50 | kanban.html | Invalid status transitions | Validation rules (bf067ad) |
| #52 | rechnungen-admin.html | Silent PDF failures | Error state persistence |
| #57 | kanban.html | Lost background updates | Failure tracking system |

---

## How to Use This Inventory

### For Code Navigation
1. Find your target file in the Quick Reference above
2. Check importance level and function count
3. Read the section in HTML_INVENTORY_SUMMARY.md
4. Use JSON for detailed structured data

### For Understanding Architecture
- Read "Architecture Highlights" section above
- See multi-tenant pattern explanation
- Study the 2-stage authentication flow
- Review multi-service data model

### For Debugging
1. Check "Known Issues & Fixes" table
2. Look up error pattern in CLAUDE.md (Patterns #1-57)
3. Find the file in inventory
4. Check "known_issues" field in JSON

### For Development
1. Check if page exists in inventory
2. Review required Firestore collections
3. Check form inputs and their IDs
4. Review related functions
5. Check for known issues

---

## File Locations

All files saved in project root:
```
/Users/marcelgaertner/.claude-worktrees/Fahrzeugannahme_App/jolly-khorana/

├── HTML_INVENTORY.json          (Structured data)
├── HTML_INVENTORY_SUMMARY.md    (Detailed guide)
├── HTML_INVENTORY_INDEX.md      (This file)
│
├── annahme.html                 (10,217 lines)
├── kanban.html                  (8,946 lines)
├── index.html                   (6,097 lines)
├── kalkulation.html             (18,772 lines)
├── kunden.html                  (6,373 lines)
├── mitarbeiter-verwaltung.html  (5,699 lines)
├── material.html                (5,456 lines)
├── entwuerfe-bearbeiten.html    (4,841 lines)
│
├── partner-app/                 (12+ service request forms)
├── js/                          (30+ supporting JavaScript files)
├── functions/                   (Cloud Functions)
└── tests/                       (49 test files)
```

---

## Next Steps

1. **For Code Review:** Use HTML_INVENTORY_SUMMARY.md
2. **For Debugging:** Cross-reference with CLAUDE.md error patterns
3. **For Development:** Check inventory before modifying pages
4. **For Testing:** Refer to test status section (49 tests, 100% pass rate)
5. **For Deployment:** Follow pre-push checklist in CLAUDE.md

---

## Document Versions

- **HTML_INVENTORY_INDEX.md** - This quick reference
- **HTML_INVENTORY_SUMMARY.md** - Comprehensive technical guide
- **HTML_INVENTORY.json** - Structured machine-readable data

**All generated:** 2025-11-27  
**Scope:** Production-ready application (Nov 2025 release)

---

*Last Updated: 2025-11-27 by Claude Code*
