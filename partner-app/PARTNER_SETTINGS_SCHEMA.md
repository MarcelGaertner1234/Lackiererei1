# Partner Settings - Firestore Schema Documentation

**Created:** 2025-11-11
**Feature:** Partner Self-Service Settings Page (`einstellungen.html`)
**Collection:** `partners_{werkstattId}` (e.g., `partners_mosbach`)

---

## Overview

The Partner Settings feature extends the existing `partners_{werkstattId}` collection with two new nested objects:
- `profil` - Company and contact information
- `benachrichtigungen` - Email notification preferences

**Important:** These fields are OPTIONAL. Existing partners without these fields will continue to function normally. The settings page handles missing data gracefully with default values.

---

## Complete Partner Document Schema

```javascript
{
  // ========================================
  // EXISTING FIELDS (unchanged)
  // ========================================

  partnerId: "partner123",              // Primary identifier
  name: "Autohaus Müller GmbH",        // Company name (used in navigation)
  email: "info@autohaus-mueller.de",   // Login email (Firebase Auth)
  role: "partner",                     // Fixed value: "partner"
  werkstattId: "mosbach",              // Multi-tenant workspace identifier

  // Optional: Custom pricing conditions (admin-managed)
  rabattKonditionen: {
    allgemeinerRabatt: 2,              // Percentage discount (e.g., 2%)
    laufenderRabatt: 70.16,            // Running discount amount
    einmaligerBonus: 0.00              // One-time bonus amount
  },

  createdAt: Timestamp,                // Account creation date
  lastLoginAt: Timestamp,              // Last login timestamp


  // ========================================
  // NEW FIELDS (Partner Settings Feature)
  // ========================================

  // Company Profile & Contact Information
  profil: {
    // Company Details
    firmenname: "Autohaus Müller GmbH",
    website: "https://autohaus-mueller.de",
    oeffnungszeiten: "Mo-Fr: 8-18 Uhr, Sa: 9-13 Uhr",

    // Contact Person
    ansprechpartner: {
      name: "Hans Müller",
      position: "Geschäftsführer",
      telefon: "06261-12345",
      mobil: "0171-1234567"
    },

    // Company Address
    adresse: {
      strasse: "Hauptstraße",
      hausnummer: "42",
      plz: "74821",
      ort: "Mosbach"
    }
  },

  // Notification Preferences
  benachrichtigungen: {
    // Email notification toggles
    email: {
      neuesKVA: true,              // New quote created
      statusaenderung: true,       // Request status changed
      fahrzeugFertig: true,        // Vehicle completed
      chatnachrichten: false       // Chat messages (future feature)
    },

    // Notification frequency
    frequenz: "sofort"             // Options: "sofort" | "taeglich"
  },

  lastModifiedAt: Timestamp        // Last settings update timestamp
}
```

---

## Field Descriptions

### Existing Fields (Protected)

| Field | Type | Editable | Description |
|-------|------|----------|-------------|
| `partnerId` | String | ❌ No | Unique partner identifier |
| `name` | String | ❌ No | Company name (admin manages) |
| `email` | String | ❌ No | Login email (Firebase Auth linked) |
| `role` | String | ❌ No | Fixed: "partner" |
| `werkstattId` | String | ❌ No | Multi-tenant workspace ID |
| `rabattKonditionen` | Object | ❌ No | Custom pricing (admin only) |
| `createdAt` | Timestamp | ❌ No | Account creation date |
| `lastLoginAt` | Timestamp | ❌ No | Auto-updated on login |

### New Fields (Partner-Editable)

#### `profil` Object

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `profil.firmenname` | String | ✅ Yes | 100 chars | Official company name |
| `profil.website` | String | ❌ No | 200 chars | Company website URL |
| `profil.oeffnungszeiten` | String | ❌ No | 200 chars | Business hours |
| `profil.ansprechpartner.name` | String | ✅ Yes | 100 chars | Contact person name |
| `profil.ansprechpartner.position` | String | ❌ No | 100 chars | Job title |
| `profil.ansprechpartner.telefon` | String | ✅ Yes | 20 chars | Office phone |
| `profil.ansprechpartner.mobil` | String | ❌ No | 20 chars | Mobile phone |
| `profil.adresse.strasse` | String | ✅ Yes | 100 chars | Street name |
| `profil.adresse.hausnummer` | String | ✅ Yes | 10 chars | House number |
| `profil.adresse.plz` | String | ✅ Yes | 5 chars | Postal code (German) |
| `profil.adresse.ort` | String | ✅ Yes | 100 chars | City name |

#### `benachrichtigungen` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `benachrichtigungen.email.neuesKVA` | Boolean | `true` | Notify on new quote |
| `benachrichtigungen.email.statusaenderung` | Boolean | `true` | Notify on status change |
| `benachrichtigungen.email.fahrzeugFertig` | Boolean | `true` | Notify when vehicle ready |
| `benachrichtigungen.email.chatnachrichten` | Boolean | `false` | Notify on chat messages |
| `benachrichtigungen.frequenz` | String | `"sofort"` | Options: "sofort", "taeglich" |

#### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `lastModifiedAt` | Timestamp | Server timestamp of last settings update |

---

## Firestore Security Rules

**Required Rules** for `partners_{werkstattId}` collection:

```javascript
// Partner Settings - Self-Service Update Rules
match /partners_{werkstattId}/{partnerId} {

  // Partners can READ their own document
  allow read: if request.auth != null
              && request.auth.token.email == resource.data.email;

  // Partners can UPDATE only profil and benachrichtigungen fields
  allow update: if request.auth != null
                && request.auth.token.email == resource.data.email
                && request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['profil', 'benachrichtigungen', 'lastModifiedAt'])
                // Prevent modification of protected fields
                && request.resource.data.partnerId == resource.data.partnerId
                && request.resource.data.email == resource.data.email
                && request.resource.data.role == resource.data.role
                && request.resource.data.werkstattId == resource.data.werkstattId;

  // Admins can do anything
  allow read, write: if request.auth != null
                     && get(/databases/$(database)/documents/mitarbeiter_$(werkstattId)/$(request.auth.token.email)).data.role == 'admin';
}
```

**Key Security Principles:**
1. Partners can ONLY update `profil`, `benachrichtigungen`, and `lastModifiedAt`
2. Partners CANNOT modify: `partnerId`, `email`, `role`, `werkstattId`, `rabattKonditionen`
3. Email changes are DISABLED in UI (require admin approval)
4. Password changes use Firebase Auth API (separate from Firestore)

---

## Data Migration Strategy

**For Existing Partners:**

Existing partner documents without `profil` or `benachrichtigungen` fields will:
- ✅ Continue to function normally (fields are optional)
- ✅ Show empty forms in settings page
- ✅ Create these fields on first save

**JavaScript handles missing data gracefully:**

```javascript
// Load example - handles missing fields
if (data.profil) {
  document.getElementById('firmenname').value = data.profil.firmenname || '';
}

// Save example - creates structure if missing
await window.getCollection('partners').doc(partnerId).update({
  profil: { ... },                    // Creates new structure
  benachrichtigungen: { ... },        // Creates new structure
  lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

**No database migration required!** First save automatically creates the structure.

---

## Usage Examples

### Example 1: New Partner (First-Time Setup)

```javascript
// User opens einstellungen.html for first time
// Document exists with basic fields only:
{
  partnerId: "partner123",
  email: "test@example.com",
  name: "Test Partner",
  role: "partner",
  werkstattId: "mosbach"
}

// User fills out profile form and clicks "Speichern"
// Document updated to:
{
  partnerId: "partner123",
  email: "test@example.com",
  name: "Test Partner",
  role: "partner",
  werkstattId: "mosbach",

  // NEW: profil object created
  profil: {
    firmenname: "Test Autohaus GmbH",
    website: "https://test-autohaus.de",
    ansprechpartner: {
      name: "Max Mustermann",
      telefon: "06261-12345"
    },
    adresse: {
      strasse: "Teststraße",
      hausnummer: "1",
      plz: "74821",
      ort: "Mosbach"
    }
  },

  lastModifiedAt: Timestamp(2025-11-11 12:00:00)
}
```

### Example 2: Update Notification Preferences

```javascript
// User toggles "Fahrzeug fertig" notification OFF
// Document updated:
{
  // ... existing fields unchanged ...

  benachrichtigungen: {
    email: {
      neuesKVA: true,
      statusaenderung: true,
      fahrzeugFertig: false,      // Changed from true
      chatnachrichten: false
    },
    frequenz: "sofort"
  },

  lastModifiedAt: Timestamp(2025-11-11 14:30:00)
}
```

### Example 3: Password Change

```javascript
// Password change does NOT modify Firestore
// Uses Firebase Auth API directly:

const user = firebase.auth().currentUser;
await user.updatePassword('newPassword123');

// ✅ Password updated in Firebase Auth
// ❌ NO changes to Firestore document
// Email remains unchanged
```

---

## UI Flow

### Tab 1: Profil & Kontakt

**Purpose:** Manage company information and contact details

**Fields:**
- Firmendaten: Firmenname*, Website, Öffnungszeiten
- Ansprechpartner: Name*, Position, Telefon*, Mobil
- Adresse: Straße*, Hausnummer*, PLZ*, Ort*

**Validation:**
- Required fields marked with *
- Website validates URL format
- PLZ validates 5-digit format
- All text fields have max-length limits

**Save Action:**
```javascript
// Firestore update
await window.getCollection('partners').doc(partnerId).update({
  profil: { ... },
  lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Tab 2: Sicherheit

**Purpose:** Manage account security

**Features:**
- Display current email (read-only)
- Change password button (Firebase Auth API)
- Email change disabled (message: "Bitte kontaktieren Sie die Werkstatt")

**Password Change Flow:**
1. User clicks "Passwort ändern"
2. Prompt for new password (min. 6 chars)
3. Call `firebase.auth().currentUser.updatePassword()`
4. Success/error message displayed

**No Firestore changes** - password stored in Firebase Auth only.

### Tab 3: Benachrichtigungen

**Purpose:** Configure email notification preferences

**Fields:**
- Email-Benachrichtigungen bei:
  - ✅ Neues Kostenangebot (KVA)
  - ✅ Statusänderung einer Anfrage
  - ✅ Fahrzeug fertiggestellt
  - ❌ Chat-Nachrichten (ausgegraut - future feature)
- Benachrichtigungs-Frequenz:
  - Sofort (Echtzeit)
  - Täglich (Zusammenfassung)

**Save Action:**
```javascript
await window.getCollection('partners').doc(partnerId).update({
  benachrichtigungen: { ... },
  lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

---

## Testing Checklist

### Functional Testing

- [ ] **Load existing partner data**
  - Open `einstellungen.html` as logged-in partner
  - Verify all saved fields populate correctly
  - Verify empty fields show as empty (not error)

- [ ] **Save profile changes**
  - Edit multiple fields in Tab 1
  - Click "Speichern"
  - Verify success message appears
  - Refresh page - verify changes persisted

- [ ] **Save notification preferences**
  - Toggle checkboxes in Tab 3
  - Change frequency dropdown
  - Click "Speichern"
  - Refresh page - verify changes persisted

- [ ] **Password change**
  - Click "Passwort ändern" in Tab 2
  - Enter new password (6+ chars)
  - Verify success message
  - Log out and log back in with new password

- [ ] **Validation errors**
  - Submit Tab 1 form with empty required fields
  - Verify browser validation prevents submission
  - Enter invalid URL format - verify validation

### Security Testing

- [ ] **Partner isolation**
  - Log in as Partner A
  - Open DevTools, try to read Partner B's data
  - Verify permission-denied error

- [ ] **Protected field modification**
  - Try to modify `role` via DevTools console
  - Verify Firestore security rules block the change

- [ ] **Unauthenticated access**
  - Clear localStorage
  - Open `einstellungen.html` directly
  - Verify redirect to `index.html`

### UI/UX Testing

- [ ] **Theme toggle**
  - Test Light Mode appearance
  - Test Dark Mode appearance
  - Verify all text is readable (WCAG 2.1 AA)

- [ ] **Responsive design**
  - Test on mobile (320px width)
  - Test on tablet (768px width)
  - Test on desktop (1920px width)
  - Verify layout adapts correctly

- [ ] **Tab navigation**
  - Click all 3 tabs
  - Verify active state updates
  - Verify content sections show/hide
  - Verify icons render correctly

- [ ] **Navigation**
  - Click "Zurück zu Meine Anfragen"
  - Verify redirects to `meine-anfragen.html`
  - Verify "Einstellungen" button exists in `meine-anfragen.html` header

---

## Future Enhancements

### Phase 2: Advanced Features (Optional)

1. **Email Change Workflow**
   - Admin approval required
   - Email verification step
   - Firestore + Firebase Auth sync

2. **Profile Picture Upload**
   - Firebase Storage integration
   - Image cropping/resizing
   - Display in navigation header

3. **Chat Notifications**
   - Enable checkbox (currently disabled)
   - Real-time messaging system
   - In-app notifications

4. **2-Factor Authentication**
   - SMS verification
   - Authenticator app support
   - Backup codes

5. **Activity Log**
   - Show recent settings changes
   - Login history
   - Security events

6. **Export Data (GDPR)**
   - Download all partner data as JSON
   - Privacy compliance
   - Account deletion request

---

## Developer Notes

### File Locations

- **Settings Page:** `partner-app/einstellungen.html` (702 lines)
- **Navigation Link:** `partner-app/meine-anfragen.html` (Line 2806)
- **This Documentation:** `partner-app/PARTNER_SETTINGS_SCHEMA.md`

### Dependencies

- Firebase SDK: `firebase-app-compat.js`, `firebase-firestore-compat.js`, `firebase-auth-compat.js`
- Icons: Lucide Icons (`<script src="https://unpkg.com/lucide@latest"></script>`)
- Fonts: Google Fonts Inter (`weights: 300, 400, 500, 600, 700, 800`)
- CSS: `../design-system.css` (shared design tokens)

### Code Conventions

- **Multi-Tenant Helper:** Always use `window.getCollection('partners')` instead of `db.collection('partners_mosbach')` directly
- **Type Safety:** All IDs converted to String: `String(partner.partnerId)`
- **Error Handling:** Try-catch blocks with user-friendly error messages
- **Timestamps:** Use `firebase.firestore.FieldValue.serverTimestamp()` for consistency
- **Theme Support:** All components support `data-theme="light"` and `data-theme="dark"`

### Known Limitations

1. **Email change disabled** - Requires admin intervention (prevents Firebase Auth desync)
2. **Chat notifications greyed out** - Feature not yet implemented
3. **No profile picture** - Future enhancement
4. **No data export** - GDPR compliance pending
5. **No 2FA** - Security enhancement pending

---

## Changelog

### Version 1.0 (2025-11-11)

**Initial Release**

- ✅ Created `einstellungen.html` (3-tab layout)
- ✅ Added Profil & Kontakt form (company info, contact person, address)
- ✅ Added Sicherheit tab (password change, email display)
- ✅ Added Benachrichtigungen tab (email preferences, frequency)
- ✅ Integrated with Firestore (`partners_{werkstattId}` collection)
- ✅ Added navigation button in `meine-anfragen.html`
- ✅ Documented Firestore schema (this file)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Theme support (Light/Dark mode)
- ✅ Security rules defined (partner self-service, admin override)

**Files Created:**
- `partner-app/einstellungen.html`
- `partner-app/PARTNER_SETTINGS_SCHEMA.md`

**Files Modified:**
- `partner-app/meine-anfragen.html` (added navigation button)

**Commits:**
- TBD (pending user testing and approval)

---

## Support

For questions or issues, contact:
- **Project Manager:** Marcel Gärtner
- **Buyer:** Christopher Gärtner (info@auto-lackierzentrum.de)

---

_Last Updated: 2025-11-11_
_Document Version: 1.0_
_Feature Status: ✅ MVP Complete - Ready for Testing_
