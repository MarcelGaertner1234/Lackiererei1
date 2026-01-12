/**
 * @fileoverview Form Validation Utilities
 *
 * Zentrale Validierungsfunktionen für Formulare.
 * Extrahiert aus: annahme.html, kunden.html, partner-app Formulare
 *
 * @version 3.2.0
 * @created 2025-11-09
 * @author Claude Code (Quick Win #2: Utility Extraction)
 *
 * Session #15 (2026-01-12): CommonJS Export für Unit Tests hinzugefügt
 */

/// <reference path="../types.js" />

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validate email address (RFC 5322 simplified)
 * @param {string} email - Email address to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { valid: false, error: 'E-Mail-Adresse ist erforderlich' };
    }

    // RFC 5322 simplified regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email.trim())) {
        return { valid: false, error: 'Ungültige E-Mail-Adresse' };
    }

    return { valid: true, error: null };
}

// ============================================================================
// PHONE VALIDATION (German)
// ============================================================================

/**
 * Validate German phone number (flexible format)
 * @param {string} phone - Phone number to validate
 * @returns {{valid: boolean, error: string|null, formatted: string|null}} Validation result
 */
function validatePhone(phone) {
    if (!phone || phone.trim() === '') {
        return { valid: false, error: 'Telefonnummer ist erforderlich', formatted: null };
    }

    // Remove all spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-\(\)\/]/g, '');

    // German phone number patterns:
    // - Landline: 0621-1234567 or +49621-1234567
    // - Mobile: 0171-1234567 or +4917-1234567
    const phoneRegex = /^(\+49|0)[1-9][0-9]{1,14}$/;

    if (!phoneRegex.test(cleaned)) {
        return { valid: false, error: 'Ungültige Telefonnummer (Format: 0621-1234567 oder +49621-1234567)', formatted: null };
    }

    // Format: Add spaces for readability
    let formatted = cleaned;
    if (formatted.startsWith('+49')) {
        formatted = '+49 ' + formatted.substring(3);
    } else if (formatted.startsWith('0')) {
        formatted = '0' + formatted.substring(1).match(/.{1,3}/g)?.join(' ') || formatted;
    }

    return { valid: true, error: null, formatted };
}

// ============================================================================
// LICENSE PLATE VALIDATION (German)
// ============================================================================

/**
 * Validate German license plate (Kennzeichen)
 * @param {string} plate - License plate to validate
 * @returns {{valid: boolean, error: string|null, formatted: string|null}} Validation result
 */
function validateKennzeichen(plate) {
    if (!plate || plate.trim() === '') {
        return { valid: false, error: 'Kennzeichen ist erforderlich', formatted: null };
    }

    // Remove spaces and convert to uppercase
    const cleaned = plate.replace(/\s/g, '').toUpperCase();

    // German license plate formats:
    // - Standard: AB-CD 1234 (1-3 letters city, 1-2 letters, 1-4 digits)
    // - Electric: AB-E 1234
    // - Historical: AB-H 1234
    const plateRegex = /^[A-ZÖÜÄ]{1,3}[- ]?[A-ZÖÜÄ]{1,2}[- ]?[1-9][0-9]{0,3}[EH]?$/;

    if (!plateRegex.test(cleaned)) {
        return { valid: false, error: 'Ungültiges Kennzeichen (Format: AB-CD 1234)', formatted: null };
    }

    // Format with dashes: AB-CD-1234
    const match = cleaned.match(/^([A-ZÖÜÄ]{1,3})([A-ZÖÜÄ]{1,2})([1-9][0-9]{0,3}[EH]?)$/);
    if (match) {
        const formatted = `${match[1]}-${match[2]} ${match[3]}`;
        return { valid: true, error: null, formatted };
    }

    return { valid: true, error: null, formatted: cleaned };
}

// ============================================================================
// VIN/FIN VALIDATION (Vehicle Identification Number)
// ============================================================================

/**
 * Validate Vehicle Identification Number (FIN/VIN)
 * @param {string} fin - FIN/VIN to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validateFIN(fin) {
    if (!fin || fin.trim() === '') {
        return { valid: false, error: 'Fahrzeugidentifikationsnummer (FIN) ist erforderlich' };
    }

    // Remove spaces and convert to uppercase
    const cleaned = fin.replace(/\s/g, '').toUpperCase();

    // FIN/VIN is exactly 17 characters (ISO 3779)
    // No I, O, Q to avoid confusion with 1, 0
    const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

    if (cleaned.length !== 17) {
        return { valid: false, error: 'FIN muss genau 17 Zeichen haben' };
    }

    if (!finRegex.test(cleaned)) {
        return { valid: false, error: 'Ungültige FIN (keine I, O, Q erlaubt)' };
    }

    return { valid: true, error: null };
}

// ============================================================================
// POSTAL CODE VALIDATION (German)
// ============================================================================

/**
 * Validate German postal code (PLZ)
 * @param {string} plz - Postal code to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validatePLZ(plz) {
    if (!plz || plz.trim() === '') {
        return { valid: false, error: 'Postleitzahl ist erforderlich' };
    }

    // German PLZ: exactly 5 digits
    const plzRegex = /^[0-9]{5}$/;

    if (!plzRegex.test(plz.trim())) {
        return { valid: false, error: 'Ungültige PLZ (5 Ziffern erforderlich)' };
    }

    return { valid: true, error: null };
}

// ============================================================================
// REQUIRED FIELD VALIDATION
// ============================================================================

/**
 * Validate required field (not empty)
 * @param {string} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validateRequired(value, fieldName = 'Feld') {
    if (!value || String(value).trim() === '') {
        return { valid: false, error: `${fieldName} ist erforderlich` };
    }

    return { valid: true, error: null };
}

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Validate date string (YYYY-MM-DD format)
 * @param {string} dateStr - Date string to validate
 * @returns {{valid: boolean, error: string|null, date: Date|null}} Validation result
 */
function validateDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') {
        return { valid: false, error: 'Datum ist erforderlich', date: null };
    }

    // Check format YYYY-MM-DD
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(dateRegex);

    if (!match) {
        return { valid: false, error: 'Ungültiges Datumsformat (YYYY-MM-DD erforderlich)', date: null };
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    // Check if date is valid
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return { valid: false, error: 'Ungültiges Datum', date: null };
    }

    return { valid: true, error: null, date };
}

// ============================================================================
// NUMBER VALIDATION
// ============================================================================

/**
 * Validate number (integer or decimal)
 * @param {string|number} value - Value to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.min] - Minimum value
 * @param {number} [options.max] - Maximum value
 * @param {boolean} [options.integer=false] - Require integer
 * @returns {{valid: boolean, error: string|null, number: number|null}} Validation result
 */
function validateNumber(value, options = {}) {
    const { min, max, integer = false } = options;

    if (value === null || value === undefined || String(value).trim() === '') {
        return { valid: false, error: 'Zahl ist erforderlich', number: null };
    }

    const num = Number(value);

    if (isNaN(num)) {
        return { valid: false, error: 'Ungültige Zahl', number: null };
    }

    if (integer && !Number.isInteger(num)) {
        return { valid: false, error: 'Ganzzahl erforderlich', number: null };
    }

    if (min !== undefined && num < min) {
        return { valid: false, error: `Wert muss mindestens ${min} sein`, number: null };
    }

    if (max !== undefined && num > max) {
        return { valid: false, error: `Wert darf maximal ${max} sein`, number: null };
    }

    return { valid: true, error: null, number: num };
}

// ============================================================================
// FORM VALIDATION HELPER
// ============================================================================

/**
 * Validate entire form object
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules
 * @returns {{valid: boolean, errors: Object}} Validation result with field-specific errors
 *
 * @example
 * const result = validateForm({
 *   email: 'test@example.com',
 *   phone: '0621-1234567',
 *   kennzeichen: 'HD-AB 1234'
 * }, {
 *   email: { validator: validateEmail },
 *   phone: { validator: validatePhone },
 *   kennzeichen: { validator: validateKennzeichen }
 * });
 */
function validateForm(formData, validationRules) {
    const errors = {};
    let hasErrors = false;

    for (const [field, rule] of Object.entries(validationRules)) {
        const value = formData[field];
        const result = rule.validator(value, rule.options);

        if (!result.valid) {
            errors[field] = result.error;
            hasErrors = true;
        }
    }

    return { valid: !hasErrors, errors };
}

// ============================================================================
// EXPORTS (Browser + Node.js)
// ============================================================================

// Browser: Assign to window object
if (typeof window !== 'undefined') {
    window.validateEmail = validateEmail;
    window.validatePhone = validatePhone;
    window.validateKennzeichen = validateKennzeichen;
    window.validateFIN = validateFIN;
    window.validatePLZ = validatePLZ;
    window.validateRequired = validateRequired;
    window.validateDate = validateDate;
    window.validateNumber = validateNumber;
    window.validateForm = validateForm;
}

// Node.js: CommonJS export for Jest unit tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmail,
        validatePhone,
        validateKennzeichen,
        validateFIN,
        validatePLZ,
        validateRequired,
        validateDate,
        validateNumber,
        validateForm
    };
}

console.log('✅ Validation Utilities loaded');
