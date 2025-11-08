/**
 * @fileoverview Zentrale JSDoc Type Definitions für die Fahrzeugannahme-App
 *
 * Diese Datei enthält alle wichtigen Type Definitions für bessere IDE Auto-Complete
 * und Type-Safety ohne TypeScript Migration.
 *
 * @version 3.2.0
 * @created 2025-11-08
 * @author Claude Code (Quick Win #1: JSDoc Types)
 */

// ============================================================================
// FIRESTORE DOCUMENT TYPES
// ============================================================================

/**
 * Workshop identifier for Multi-Tenant isolation
 * @typedef {'mosbach' | 'heidelberg' | 'mannheim'} WerkstattId
 */

/**
 * User roles for access control
 * @typedef {'admin' | 'werkstatt' | 'mitarbeiter' | 'partner' | 'kunde'} Role
 */

/**
 * Vehicle status in workflow
 * @typedef {'angenommen' | 'in_arbeit' | 'lackierung' | 'trocknung' | 'qualitaetskontrolle' | 'bereit_zur_abholung' | 'abgeschlossen' | 'abgelehnt'} VehicleStatus
 */

/**
 * Service types offered
 * @typedef {'lackier' | 'reifen' | 'mechanik' | 'pflege' | 'tuev' | 'versicherung' | 'glas' | 'klima' | 'dellen' | 'folierung' | 'steinschutz' | 'werbebeklebung'} ServiceTyp
 */

// ============================================================================
// PARTNER TYPES
// ============================================================================

/**
 * Partner (B2B customer) document
 * @typedef {Object} Partner
 * @property {string} id - Firestore document ID
 * @property {string} email - Partner email (lowercase)
 * @property {string} name - Company name
 * @property {string} werkstattId - Associated workshop
 * @property {Role} role - Always 'partner'
 * @property {Object} kontakt - Contact information
 * @property {string} kontakt.telefon - Phone number
 * @property {string} kontakt.ansprechpartner - Contact person
 * @property {Object} adresse - Address
 * @property {string} adresse.strasse - Street
 * @property {string} adresse.plz - Postal code
 * @property {string} adresse.ort - City
 * @property {number} bonusLevel - Bonus tier (1-3)
 * @property {number} verfuegbarerBonus - Available bonus in EUR
 * @property {boolean} approved - Registration approved
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Partner service request document
 * @typedef {Object} PartnerAnfrage
 * @property {string} id - Firestore document ID
 * @property {string} partnerId - Partner who created request
 * @property {string} partnerEmail - Partner email
 * @property {string} werkstattId - Workshop ID
 * @property {ServiceTyp} serviceTyp - Type of service requested
 * @property {VehicleStatus} status - Current status
 * @property {Object} fahrzeugDaten - Vehicle information
 * @property {string} fahrzeugDaten.kennzeichen - License plate
 * @property {string} fahrzeugDaten.marke - Make
 * @property {string} fahrzeugDaten.modell - Model
 * @property {string} fahrzeugDaten.fin - Vehicle identification number
 * @property {Object} serviceSpezifischeFelder - Service-specific fields
 * @property {boolean} fahrzeugAngelegt - Vehicle created in main system
 * @property {string} [partnerAnfrageId] - Reference to this request
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Bonus payout document
 * @typedef {Object} BonusAuszahlung
 * @property {string} id - Firestore document ID
 * @property {string} partnerId - Partner receiving bonus
 * @property {string} partnerEmail - Partner email
 * @property {string} werkstattId - Workshop ID
 * @property {number} betrag - Amount in EUR
 * @property {number} bonusLevel - Bonus level at creation
 * @property {string} monat - Month (YYYY-MM format)
 * @property {boolean} ausgezahlt - Payment completed
 * @property {number} timestamp - Creation timestamp
 */

// ============================================================================
// VEHICLE TYPES
// ============================================================================

/**
 * Vehicle document
 * @typedef {Object} Fahrzeug
 * @property {string} id - Firestore document ID
 * @property {string} kennzeichen - License plate (uppercase)
 * @property {string} marke - Make
 * @property {string} modell - Model
 * @property {string} fin - Vehicle identification number
 * @property {VehicleStatus} status - Current status
 * @property {ServiceTyp} serviceTyp - Service type
 * @property {Object} kunde - Customer information
 * @property {string} kunde.name - Customer name
 * @property {string} kunde.email - Customer email
 * @property {string} kunde.telefon - Customer phone
 * @property {Object} serviceSpezifischeFelder - Service-specific fields
 * @property {string[]} fotos - Photo URLs
 * @property {string} notizen - Notes
 * @property {string} [partnerAnfrageId] - Reference to partner request
 * @property {string} werkstattId - Workshop ID
 * @property {number} timestamp - Creation timestamp
 * @property {number} [abholungGeplant] - Planned pickup timestamp
 */

/**
 * Customer document
 * @typedef {Object} Kunde
 * @property {string} id - Firestore document ID
 * @property {string} name - Customer name
 * @property {string} email - Customer email
 * @property {string} telefon - Phone number
 * @property {string} werkstattId - Workshop ID
 * @property {number} timestamp - Creation timestamp
 */

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

/**
 * Employee document
 * @typedef {Object} Mitarbeiter
 * @property {string} id - Firestore document ID
 * @property {string} name - Employee name
 * @property {string} email - Employee email
 * @property {string} werkstattId - Workshop ID
 * @property {Role} rolle - Role (mitarbeiter)
 * @property {Object} berechtigungen - Permissions
 * @property {boolean} berechtigungen.fahrzeugAnnahme - Can intake vehicles
 * @property {boolean} berechtigungen.fahrzeugAbnahme - Can complete vehicles
 * @property {boolean} berechtigungen.material - Can order materials
 * @property {boolean} berechtigungen.kalender - Can access calendar
 * @property {boolean} berechtigungen.kunden - Can manage customers
 * @property {boolean} berechtigungen.dienstplan - Can access schedule
 * @property {number} sollStundenProWoche - Planned hours per week
 * @property {number} istStunden - Actual hours worked (total)
 * @property {number} ueberstunden - Overtime hours
 * @property {number} urlaubstageGesamt - Total vacation days
 * @property {number} urlaubstageGenommen - Vacation days taken
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Time tracking event
 * @typedef {Object} ZeiterfassungEvent
 * @property {string} typ - Event type ('start' | 'pause' | 'zurueck' | 'feierabend')
 * @property {number} timestamp - Event timestamp
 */

/**
 * Time tracking document
 * @typedef {Object} Zeiterfassung
 * @property {string} id - Document ID format: {datum}_{mitarbeiterId}
 * @property {string} mitarbeiterId - Employee ID
 * @property {string} datum - Date (YYYY-MM-DD)
 * @property {string} werkstattId - Workshop ID
 * @property {ZeiterfassungEvent[]} events - Time tracking events
 * @property {string} status - Status ('laufend' | 'pause' | 'abgeschlossen')
 * @property {number} calculatedHours - Calculated work hours
 * @property {number} sollStunden - Planned hours for this day
 * @property {boolean} [manuallyEdited] - Admin edited this record
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Employee shift document
 * @typedef {Object} Schicht
 * @property {string} id - Firestore document ID
 * @property {string} mitarbeiterId - Employee ID
 * @property {string} datum - Date (YYYY-MM-DD)
 * @property {string} start - Start time (HH:MM)
 * @property {string} ende - End time (HH:MM)
 * @property {string} werkstattId - Workshop ID
 * @property {number} sollStunden - Planned hours for shift
 * @property {string} [notiz] - Shift notes
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Vacation request document
 * @typedef {Object} Urlaubsantrag
 * @property {string} id - Firestore document ID
 * @property {string} mitarbeiterId - Employee ID
 * @property {string} werkstattId - Workshop ID
 * @property {number} von - Start date timestamp
 * @property {number} bis - End date timestamp
 * @property {number} tage - Number of days
 * @property {string} status - Status ('pending' | 'approved' | 'rejected')
 * @property {string} [grund] - Reason for vacation
 * @property {number} timestamp - Creation timestamp
 */

// ============================================================================
// WISSENSDATENBANK TYPES
// ============================================================================

/**
 * Category document
 * @typedef {Object} Category
 * @property {string} id - Firestore document ID
 * @property {string} name - Category name
 * @property {string} typ - Type ('standard' | 'custom')
 * @property {string} werkstattId - Workshop ID
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Guideline document
 * @typedef {Object} Guideline
 * @property {string} id - Firestore document ID
 * @property {string} titel - Guideline title
 * @property {string} beschreibung - Description
 * @property {string} categoryId - Category ID
 * @property {string} werkstattId - Workshop ID
 * @property {string} [dateiUrl] - Attachment URL
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Announcement document
 * @typedef {Object} Announcement
 * @property {string} id - Firestore document ID
 * @property {string} titel - Announcement title
 * @property {string} nachricht - Message content
 * @property {string} categoryId - Category ID
 * @property {string} werkstattId - Workshop ID
 * @property {string} prioritaet - Priority ('normal' | 'wichtig' | 'dringend')
 * @property {number} timestamp - Creation timestamp
 */

/**
 * Shift handover document
 * @typedef {Object} ShiftHandover
 * @property {string} id - Firestore document ID
 * @property {string} von - From employee
 * @property {string} an - To employee
 * @property {string} nachricht - Handover message
 * @property {string} categoryId - Category ID
 * @property {string} werkstattId - Workshop ID
 * @property {number} timestamp - Creation timestamp
 */

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Firestore collection reference
 * @typedef {Object} FirestoreCollection
 * @property {Function} doc - Get document reference
 * @property {Function} add - Add new document
 * @property {Function} where - Query documents
 * @property {Function} orderBy - Order documents
 * @property {Function} limit - Limit results
 * @property {Function} get - Execute query
 */

/**
 * Firebase Storage reference
 * @typedef {Object} StorageReference
 * @property {Function} child - Get child reference
 * @property {Function} put - Upload file
 * @property {Function} getDownloadURL - Get file URL
 * @property {Function} delete - Delete file
 */

/**
 * Window globals for Firebase
 * @typedef {Object} WindowGlobals
 * @property {boolean} firebaseInitialized - Firebase ready flag
 * @property {WerkstattId} werkstattId - Current workshop
 * @property {Role} currentUserRole - Current user role
 * @property {string} selectedMitarbeiterId - Selected employee ID (2-stage auth)
 * @property {Function} getCollection - Multi-tenant collection helper
 */

// ============================================================================
// FUNCTION SIGNATURES (Common patterns)
// ============================================================================

/**
 * Multi-tenant collection helper
 * @function getCollection
 * @param {string} baseCollectionName - Collection name without suffix
 * @returns {FirestoreCollection} Firestore collection with werkstattId suffix
 * @example
 * const collection = window.getCollection('fahrzeuge'); // → 'fahrzeuge_mosbach'
 */

/**
 * Type-safe ID comparison
 * @function compareIds
 * @param {string|number} id1 - First ID
 * @param {string|number} id2 - Second ID
 * @returns {boolean} True if IDs match
 * @example
 * const match = String(id1) === String(id2);
 */

// ============================================================================
// EXPORT (for IDE support)
// ============================================================================

// This file is intentionally empty of exports - it's for JSDoc only
// Types are used via triple-slash references: /// <reference path="types.js" />
// Or via @type {Partner} annotations in code

console.log('✅ JSDoc Types loaded - IDE Auto-Complete active!');
