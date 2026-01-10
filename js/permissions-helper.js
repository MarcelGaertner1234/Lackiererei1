/**
 * Permissions Helper
 *
 * Zentrale Helper-Functions für Berechtigungs-Checks
 *
 * @version 1.0.0
 * @date 2025-11-11
 */

/**
 * Prüft ob der aktuelle User Preise sehen darf
 *
 * @returns {boolean} true wenn Preise sichtbar, false wenn ausgeblendet
 *
 * @example
 * if (canViewPrices()) {
 *   // Zeige Preis an
 * } else {
 *   // Zeige "━━━━━━" an
 * }
 */
function canViewPrices() {
    // 🔧 BUG-M3 FIX (2026-01-10): Multi-Tenant werkstattId Validierung
    const userWerkstatt = window.currentUser?.werkstattId;
    const currentWerkstatt = window.werkstattId;

    // Multi-Tenant Check: User muss zur aktuellen Werkstatt gehören
    if (userWerkstatt && currentWerkstatt && userWerkstatt !== currentWerkstatt) {
        console.warn('⚠️ Multi-Tenant Violation: User werkstattId mismatch', {
            userWerkstatt,
            currentWerkstatt
        });
        return false;
    }

    // 1. Prüfe aktuelle User-Rolle (Stage 1: Admin/Werkstatt)
    const role = window.currentUser?.role;

    // Superadmin sieht ALLE Preise (systemweit)
    if (role === 'superadmin') {
        return true;
    }

    // Admin, Werkstatt sehen Preise NUR in ihrer Werkstatt
    if (role === 'admin' || role === 'werkstatt') {
        return true;
    }

    // 2. Für Mitarbeiter (Stage 2): Prüfe Berechtigung
    if (role === 'mitarbeiter') {
        // Hole Mitarbeiter-Session aus sessionStorage
        const mitarbeiter = getMitarbeiterSession();

        // Prüfe Berechtigung (Default: false)
        const hasPermission = mitarbeiter?.berechtigungen?.preiseSichtbar === true;

        return hasPermission;
    }

    // 3. Partner/Kunde/Unbekannte Rolle: KEINE Preise
    return false;
}

/**
 * Prüft ob der aktuelle User Bestellungen verwalten darf
 *
 * @returns {boolean} true wenn Bestellungen verwalten erlaubt, false sonst
 *
 * @example
 * if (canManageBestellungen()) {
 *   // Zeige "Bestellen" Button an
 * } else {
 *   // Verstecke "Bestellen" Button
 * }
 */
function canManageBestellungen() {
    // 🔧 BUG-M3 FIX (2026-01-10): Multi-Tenant werkstattId Validierung
    const userWerkstatt = window.currentUser?.werkstattId;
    const currentWerkstatt = window.werkstattId;

    // Multi-Tenant Check: User muss zur aktuellen Werkstatt gehören
    if (userWerkstatt && currentWerkstatt && userWerkstatt !== currentWerkstatt) {
        console.warn('⚠️ Multi-Tenant Violation: User werkstattId mismatch', {
            userWerkstatt,
            currentWerkstatt
        });
        return false;
    }

    // 1. Prüfe aktuelle User-Rolle (Stage 1: Admin/Werkstatt)
    const role = window.currentUser?.role;

    // Superadmin darf ALLES (systemweit)
    if (role === 'superadmin') {
        return true;
    }

    // Admin, Werkstatt dürfen bestellen (in ihrer Werkstatt)
    if (role === 'admin' || role === 'werkstatt') {
        return true;
    }

    // 2. Für Mitarbeiter (Stage 2): Prüfe Berechtigung
    if (role === 'mitarbeiter') {
        // Hole Mitarbeiter-Session aus sessionStorage
        const mitarbeiter = getMitarbeiterSession();

        // Prüfe Berechtigung (Default: false)
        const hasPermission = mitarbeiter?.berechtigungen?.bestellungenVerwalten === true;

        return hasPermission;
    }

    // 3. Partner/Kunde/Unbekannte Rolle: KEINE Berechtigung
    return false;
}

/**
 * Hilfsfunktion: Hole aktuelle Mitarbeiter-Session
 *
 * @returns {Object|null} Mitarbeiter-Objekt oder null
 */
function getMitarbeiterSession() {
    try {
        const sessionData = sessionStorage.getItem('selectedMitarbeiter');
        if (!sessionData) {
            return null;
        }
        return JSON.parse(sessionData);
    } catch (error) {
        console.error('❌ Fehler beim Laden der Mitarbeiter-Session:', error);
        return null;
    }
}

/**
 * Debug-Function: Zeige aktuelle Berechtigungen in Console
 */
function debugPermissions() {
    console.group('🔐 Permissions Debug');
    console.log('currentUser:', window.currentUser);
    console.log('Role:', window.currentUser?.role);
    console.log('Mitarbeiter-Session:', getMitarbeiterSession());
    console.log('canViewPrices():', canViewPrices());
    console.log('canManageBestellungen():', canManageBestellungen());
    console.groupEnd();
}

// Export für globale Verfügbarkeit
window.canViewPrices = canViewPrices;
window.canManageBestellungen = canManageBestellungen;
window.getMitarbeiterSession = getMitarbeiterSession;
window.debugPermissions = debugPermissions;

console.log('✅ Permissions Helper loaded');
