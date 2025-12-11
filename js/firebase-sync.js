/**
 * Firebase Collection Sync Utility
 *
 * Synchronizes data between fahrzeuge_{werkstattId} and partnerAnfragen_{werkstattId} collections.
 * This ensures both collections stay in sync when making updates.
 *
 * Usage:
 *   await window.syncUpdateFahrzeug(fahrzeugId, updateData, anfrageId);
 *
 * @author Claude Code
 * @version 1.0.0
 * @created 2025-12-11
 */

(function() {
    'use strict';

    /**
     * List of fields that should be synchronized between collections.
     * Add new fields here when they need to be kept in sync.
     */
    const SYNC_FIELDS = [
        // Service Plan & Scheduling
        'servicePlan',
        'geplantesAbnahmeDatum',
        'fertigstellungsdatum',
        'anliefertermin',
        'abholtermin',
        'queueDatum',

        // KVA Termine
        'kva.termine.start',
        'kva.termine.ende',

        // Angebot Details
        'angebotDetails.fertigstellungsdatum',

        // Status (already synced by Cloud Function, but included for completeness)
        'status',
        'prozessStatus',

        // Metadata
        'lastModified',
        'lastModifiedBy'
    ];

    /**
     * Flattens nested field paths for Firestore dot notation
     * @param {Object} data - The data object
     * @param {string} prefix - Current path prefix
     * @returns {Object} Flattened object with dot notation keys
     */
    function flattenForFirestore(data, prefix = '') {
        const result = {};

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const value = data[key];

                // Don't flatten Firestore special values or arrays
                if (value !== null &&
                    typeof value === 'object' &&
                    !Array.isArray(value) &&
                    typeof value.toDate !== 'function' && // Firestore Timestamp
                    !(value instanceof firebase.firestore.FieldValue)) { // FieldValue

                    Object.assign(result, flattenForFirestore(value, fullKey));
                } else {
                    result[fullKey] = value;
                }
            }
        }

        return result;
    }

    /**
     * Updates a fahrzeug document AND its corresponding partnerAnfrage atomically.
     * Uses Firestore batched writes for consistency.
     *
     * @param {string} fahrzeugId - The fahrzeug document ID
     * @param {Object} updateData - The data to update
     * @param {string|null} anfrageId - The corresponding partnerAnfrage ID (optional)
     * @returns {Promise<void>}
     *
     * @example
     * await window.syncUpdateFahrzeug('fzg_123', {
     *     servicePlan: [...],
     *     geplantesAbnahmeDatum: '15.12.2025',
     *     lastModified: firebase.firestore.FieldValue.serverTimestamp()
     * }, 'anfrage_456');
     */
    window.syncUpdateFahrzeug = async function(fahrzeugId, updateData, anfrageId = null) {
        if (!fahrzeugId) {
            throw new Error('syncUpdateFahrzeug: fahrzeugId ist erforderlich');
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            console.warn('syncUpdateFahrzeug: Keine Daten zum Aktualisieren');
            return;
        }

        const batch = window.db.batch();

        // 1. Update fahrzeuge collection
        const fahrzeugRef = window.getCollection('fahrzeuge').doc(fahrzeugId);
        const flattenedData = flattenForFirestore(updateData);
        batch.update(fahrzeugRef, flattenedData);

        console.log(`🔄 [Sync] Updating fahrzeuge/${fahrzeugId}:`, Object.keys(flattenedData));

        // 2. Update partnerAnfragen collection (if linked)
        if (anfrageId) {
            const anfrageRef = window.getCollection('partnerAnfragen').doc(String(anfrageId));
            batch.update(anfrageRef, flattenedData);
            console.log(`🔄 [Sync] Updating partnerAnfragen/${anfrageId}:`, Object.keys(flattenedData));
        }

        try {
            await batch.commit();
            console.log('✅ [Sync] Batch commit erfolgreich');
        } catch (error) {
            console.error('❌ [Sync] Batch commit fehlgeschlagen:', error);
            throw error;
        }
    };

    /**
     * Gets the anfrageId from a fahrzeug object.
     * Handles multiple field name variations.
     *
     * @param {Object} fahrzeug - The fahrzeug object
     * @returns {string|null} The anfrageId or null
     */
    window.getAnfrageIdFromFahrzeug = function(fahrzeug) {
        if (!fahrzeug) return null;
        return fahrzeug.anfrage_id ||
               fahrzeug.anfrageId ||
               fahrzeug.originalAnfrageId ||
               fahrzeug.partnerAnfrageId ||
               null;
    };

    /**
     * Returns the list of fields that are synchronized between collections.
     * Useful for debugging and documentation.
     *
     * @returns {string[]} Array of field names
     */
    window.getSyncFields = function() {
        return [...SYNC_FIELDS];
    };

    /**
     * Checks if a specific field is in the sync list.
     *
     * @param {string} fieldName - The field name to check
     * @returns {boolean} True if field is synced
     */
    window.isSyncField = function(fieldName) {
        return SYNC_FIELDS.some(f =>
            f === fieldName ||
            fieldName.startsWith(f + '.') ||
            f.startsWith(fieldName + '.')
        );
    };

    console.log('✅ firebase-sync.js geladen - syncUpdateFahrzeug() verfügbar');
})();
