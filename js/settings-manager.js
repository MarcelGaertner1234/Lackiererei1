/**
 * ============================================
 * SETTINGS MANAGER
 * Auto-Lackierzentrum Mosbach
 * ============================================
 *
 * Manages all admin settings for the workshop:
 * - Werkstatt Profile
 * - Notifications
 * - Default Values
 * - Email Templates
 * - System Configuration (OpenAI, Firebase)
 * - Backup & Export
 * - Database Maintenance
 *
 * Multi-Tenant Support:
 * - Settings stored in einstellungen_{werkstattId}
 * - Each workshop has isolated settings
 *
 * @version 1.0.0
 * @date 2025-10-28
 */

'use strict';

// ============================================
// DEFAULT SETTINGS TEMPLATE
// ============================================

const DEFAULT_SETTINGS = {
    profil: {
        name: 'Auto-Lackierzentrum Mosbach',
        adresse: 'Musterstraße 1, 74821 Mosbach',
        telefon: '+49 6261 123456',
        email: 'info@auto-lackierzentrum.de',
        website: 'https://auto-lackierzentrum.de',
        logoUrl: '',
        description: 'Ihr Experte für Fahrzeuglackierung'
    },
    benachrichtigungen: {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        neuesFahrzeug: true,
        statusChange: true,
        abnahmeTermin: true,
        materialBestellung: true,
        partnerAnfrage: true
    },
    standards: {
        bearbeitungszeit: 3, // Tage
        waehrung: 'EUR',
        zeitzone: 'Europe/Berlin',
        sprache: 'de',
        datumsformat: 'DD.MM.YYYY',
        uhrzeitformat: 'HH:mm'
    },
    emailVorlagen: {
        bestaetigung: {
            subject: 'Auftragsbestätigung - {{fahrzeugMarke}} {{fahrzeugModell}}',
            body: 'Sehr geehrte/r {{kundenName}},\n\nwir haben Ihren Auftrag für {{fahrzeugMarke}} {{fahrzeugModell}} ({{kennzeichen}}) erhalten.\n\nVoraussichtliche Fertigstellung: {{fertigstellungDatum}}\n\nMit freundlichen Grüßen\n{{werkstattName}}'
        },
        erinnerung: {
            subject: 'Erinnerung: Abholung {{fahrzeugMarke}} {{fahrzeugModell}}',
            body: 'Sehr geehrte/r {{kundenName}},\n\nIhr Fahrzeug {{fahrzeugMarke}} {{fahrzeugModell}} ({{kennzeichen}}) ist fertig und kann ab {{abholungDatum}} abgeholt werden.\n\nBitte vereinbaren Sie einen Termin.\n\nMit freundlichen Grüßen\n{{werkstattName}}'
        },
        abschluss: {
            subject: 'Vielen Dank für Ihren Auftrag',
            body: 'Sehr geehrte/r {{kundenName}},\n\nvielen Dank für Ihren Auftrag.\n\nWir würden uns über eine Bewertung freuen: {{bewertungsLink}}\n\nMit freundlichen Grüßen\n{{werkstattName}}'
        }
    },
    systemConfig: {
        openaiKey: '',
        openaiModel: 'gpt-4-turbo-preview',
        openaiEnabled: false,
        firebaseRegion: 'europe-west1',
        storageMaxSize: 500, // MB
        backupEnabled: true,
        backupFrequency: 'weekly',
        analyticsEnabled: true
    },
    // 🔧 2025-11-18: Steuer-Informationen für rechtskonforme Rechnungen
    steuer: {
        steuernummer: '',              // z.B. "12345/67890"
        ustIdNr: '',                   // z.B. "DE123456789" (Alternative zur Steuernummer)
        mwstSatz: 19,                  // Standardsteuersatz in Prozent
        kleinunternehmer: false        // §19 UStG (keine MwSt-Ausweisung)
    },
    // 🔧 2025-11-18: Bankverbindung für Zahlungen
    bank: {
        iban: '',                      // z.B. "DE89 3704 0044 0532 0130 00"
        bic: '',                       // z.B. "COBADEFFXXX"
        bankName: '',                  // z.B. "Commerzbank Mosbach"
        kontoinhaber: ''               // z.B. "Auto-Lackierzentrum Mosbach GmbH"
    },
    // 🔧 2025-11-18: Rechtliche Angaben (für GmbH erforderlich)
    rechtliches: {
        rechtsform: '',                // z.B. "GmbH", "Einzelunternehmen", "GbR"
        geschaeftsfuehrer: '',         // z.B. "Christopher Gärtner"
        handelsregister: '',           // z.B. "HRB 12345"
        registergericht: '',           // z.B. "Amtsgericht Mosbach"
        sitz: ''                       // z.B. "Mosbach"
    },
    // 🔧 2025-11-18: Rechnungs-Konfiguration
    rechnungsConfig: {
        zahlungsziel: 14,              // Tage bis Zahlung fällig
        zahlungshinweis: 'Zahlbar innerhalb von 14 Tagen ohne Abzug',
        verwendungszweckPrefix: 'RE-', // Prefix für Verwendungszweck
        footerText: 'Vielen Dank für Ihr Vertrauen!'
    },
    // 🔧 2025-11-25: Aktivierte Services (Werkstatt-Service-Konfiguration)
    // Default: alle 12 Services aktiviert - Werkstatt kann einzelne deaktivieren
    enabledServices: {
        lackier: true,          // Lackierung
        reifen: true,           // Reifen & Räder
        mechanik: true,         // Mechanik
        pflege: true,           // Fahrzeugpflege
        tuev: true,             // TÜV/HU/AU
        versicherung: true,     // Versicherungsschäden
        glas: true,             // Glasreparatur
        klima: true,            // Klimaservice
        dellen: true,           // Dellenentfernung (PDR)
        folierung: true,        // Fahrzeugfolierung
        steinschutz: true,      // Steinschlagschutz
        werbebeklebung: true    // Werbebeklebung
    },
    createdAt: null,
    updatedAt: null,
    version: '1.2.0'  // 🔧 2025-11-25: enabledServices für Service-Konfiguration
};

// ============================================
// SETTINGS MANAGER CLASS
// ============================================

class SettingsManager {
    constructor() {
        this.currentSettings = null;
        this.werkstattId = null;
        this.settingsRef = null;
    }

    /**
     * Initialize Settings Manager
     * @returns {Promise<boolean>}
     */
    async init() {
        try {
            console.log('🔧 Settings Manager wird initialisiert...');

            // Wait for Firebase if not ready
            if (!window.db) {
                console.log('⏳ Warte auf Firebase Initialisierung...');
                if (window.firebaseInitialized) {
                    await window.firebaseInitialized;
                } else {
                    console.error('❌ Firebase Promise nicht verfügbar!');
                    return false;
                }
            }

            // Final check after waiting
            if (!window.db) {
                console.error('❌ Firebase ist nicht initialisiert!');
                return false;
            }

            // Check if Auth Manager is available
            if (!window.authManager || typeof window.authManager.getCurrentUser !== 'function') {
                console.warn('⚠️ Auth Manager nicht verfügbar (Partner-App Seite?) - verwende Fallback');
                // Fallback für partner-app: Nutze window.werkstattId direkt
                if (window.werkstattId) {
                    console.log('✅ Verwende werkstattId aus window.werkstattId:', window.werkstattId);
                    this.werkstattId = window.werkstattId;
                    this.settingsRef = window.getCollection('einstellungen'); // ✅ FIX: Set settingsRef for partner-app
                    this.initialized = true;
                    return true;
                }
                console.error('❌ Weder Auth Manager noch window.werkstattId verfügbar!');
                return false;
            }

            // Get current user (contains werkstattId)
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser || !currentUser.werkstattId) {
                console.error('❌ Keine Werkstatt eingeloggt!');
                return false;
            }

            this.werkstattId = currentUser.werkstattId;
            // Use getCollection for consistency (though hardcoded werkstattId works too)
            this.settingsRef = window.getCollection('einstellungen');

            if (!this.settingsRef) {
                console.error('❌ Konnte Collection-Referenz nicht erstellen!');
                return false;
            }

            console.log('✅ Settings Manager initialisiert für Werkstatt:', this.werkstattId);
            return true;
        } catch (error) {
            console.error('❌ Settings Manager Init Error:', error);
            return false;
        }
    }

    /**
     * Load Settings from Firestore
     * Creates default settings if none exist
     * @returns {Promise<Object>}
     */
    async loadSettings() {
        try {
            console.log('📥 Lade Einstellungen...');

            // 🆕 AUTO-INIT: Falls noch nicht initialisiert, init() aufrufen
            if (!this.settingsRef) {
                console.log('⚠️ SettingsManager noch nicht initialisiert, rufe init() auf...');
                const initialized = await this.init();
                if (!initialized) {
                    console.error('❌ Initialisierung fehlgeschlagen, verwende Default-Settings');
                    return DEFAULT_SETTINGS;
                }
            }

            const doc = await this.settingsRef.doc('config').get();

            if (!doc.exists) {
                console.log('⚠️ Keine Einstellungen gefunden, erstelle Default-Einstellungen...');
                await this.createDefaultSettings();
                return DEFAULT_SETTINGS;
            }

            this.currentSettings = doc.data();
            console.log('✅ Einstellungen geladen');
            return this.currentSettings;
        } catch (error) {
            // ✅ FIX 8: Partner haben keine Berechtigung für einstellungen_* - das ist korrekt!
            if (error.code === 'permission-denied') {
                console.log('ℹ️ Partner-User - keine Berechtigung für Einstellungen (erwartet). Verwende DEFAULT_SETTINGS.');
                return DEFAULT_SETTINGS;
            }
            console.error('❌ Fehler beim Laden der Einstellungen:', error);
            return DEFAULT_SETTINGS;
        }
    }

    /**
     * Create Default Settings in Firestore
     * @returns {Promise<void>}
     */
    async createDefaultSettings() {
        try {
            const settings = {
                ...DEFAULT_SETTINGS,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.settingsRef.doc('config').set(settings);
            this.currentSettings = settings;
            console.log('✅ Default-Einstellungen erstellt');
        } catch (error) {
            console.error('❌ Fehler beim Erstellen der Default-Einstellungen:', error);
            throw error;
        }
    }

    /**
     * Save ALL Settings to Firestore
     * @param {Object} settings - Complete settings object
     * @returns {Promise<boolean>}
     */
    async saveSettings(settings) {
        try {
            console.log('💾 Speichere Einstellungen...');

            settings.updatedAt = new Date().toISOString();
            await this.settingsRef.doc('config').set(settings, { merge: true });

            this.currentSettings = settings;
            console.log('✅ Einstellungen gespeichert');
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Speichern der Einstellungen:', error);
            return false;
        }
    }

    /**
     * Update specific section of settings
     * @param {string} section - Section name (profil, benachrichtigungen, etc.)
     * @param {Object} data - Section data
     * @returns {Promise<boolean>}
     */
    async updateSection(section, data) {
        try {
            console.log(`💾 Aktualisiere ${section}...`);

            const update = {
                [section]: data,
                updatedAt: new Date().toISOString()
            };

            await this.settingsRef.doc('config').update(update);

            if (this.currentSettings) {
                this.currentSettings[section] = data;
                this.currentSettings.updatedAt = update.updatedAt;
            }

            console.log(`✅ ${section} aktualisiert`);
            return true;
        } catch (error) {
            console.error(`❌ Fehler beim Aktualisieren von ${section}:`, error);
            return false;
        }
    }

    /**
     * Upload Workshop Logo to Firebase Storage
     * @param {File} file - Logo file
     * @returns {Promise<string|null>} - Logo URL or null
     */
    async uploadLogo(file) {
        try {
            console.log('📤 Lade Logo hoch...');

            if (!file) {
                console.error('❌ Keine Datei ausgewählt!');
                return null;
            }

            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                console.error('❌ Ungültiger Dateityp! Nur PNG, JPG, JPEG, SVG erlaubt.');
                return null;
            }

            // Validate file size (max 2MB)
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (file.size > maxSize) {
                console.error('❌ Datei zu groß! Maximal 2MB erlaubt.');
                return null;
            }

            const timestamp = Date.now();
            const fileName = `logo_${this.werkstattId}_${timestamp}.${file.name.split('.').pop()}`;
            const storageRef = window.storage.ref(`werkstatt-logos/${this.werkstattId}/${fileName}`);

            // Upload file
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            console.log('✅ Logo hochgeladen:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('❌ Fehler beim Hochladen des Logos:', error);
            return null;
        }
    }

    /**
     * Test OpenAI API Key
     * @param {string} apiKey - OpenAI API Key
     * @returns {Promise<Object>} - { success: boolean, message: string, usage: object }
     */
    async testOpenAIKey(apiKey) {
        try {
            console.log('🧪 Teste OpenAI API-Key...');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo-preview',
                    messages: [{ role: 'user', content: 'Test' }],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ OpenAI API-Key ist gültig');
                return {
                    success: true,
                    message: 'API-Key ist gültig und funktioniert!',
                    usage: data.usage || {}
                };
            } else {
                const error = await response.json();
                console.error('❌ OpenAI API-Key ungültig:', error);
                return {
                    success: false,
                    message: error.error?.message || 'API-Key ungültig',
                    usage: null
                };
            }
        } catch (error) {
            console.error('❌ Fehler beim Testen des API-Keys:', error);
            return {
                success: false,
                message: 'Netzwerkfehler beim Testen des API-Keys',
                usage: null
            };
        }
    }

    /**
     * Export ALL data as JSON
     * @returns {Promise<Object>} - Complete data export
     */
    async exportAllData() {
        try {
            console.log('📦 Exportiere alle Daten...');

            const exportData = {
                werkstattId: this.werkstattId,
                exportDate: new Date().toISOString(),
                settings: this.currentSettings,
                fahrzeuge: [],
                kunden: [],
                mitarbeiter: [],
                termine: [],
                materialBestellungen: []
            };

            // Export Fahrzeuge
            const fahrzeugeSnap = await window.getCollection('fahrzeuge').get();
            exportData.fahrzeuge = fahrzeugeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Export Kunden
            const kundenSnap = await window.getCollection('kunden').get();
            exportData.kunden = kundenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Export Mitarbeiter (use getCollection for consistency)
            const mitarbeiterSnap = await window.getCollection('mitarbeiter').get();
            exportData.mitarbeiter = mitarbeiterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log('✅ Daten exportiert:', {
                fahrzeuge: exportData.fahrzeuge.length,
                kunden: exportData.kunden.length,
                mitarbeiter: exportData.mitarbeiter.length
            });

            return exportData;
        } catch (error) {
            console.error('❌ Fehler beim Exportieren der Daten:', error);
            throw error;
        }
    }

    /**
     * Download JSON export as file
     * @param {Object} data - Data to export
     * @param {string} filename - Filename
     */
    downloadJSON(data, filename = 'export.json') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ JSON-Export heruntergeladen:', filename);
    }

    /**
     * Get Database Statistics
     * @returns {Promise<Object>}
     */
    async getDatabaseStats() {
        try {
            console.log('📊 Sammle Datenbank-Statistiken...');

            const fahrzeugeSnap = await window.getCollection('fahrzeuge').get();
            const kundenSnap = await window.getCollection('kunden').get();
            const mitarbeiterSnap = await window.getCollection('mitarbeiter').get();

            const stats = {
                fahrzeuge: {
                    total: fahrzeugeSnap.size,
                    status: {}
                },
                kunden: {
                    total: kundenSnap.size
                },
                mitarbeiter: {
                    total: mitarbeiterSnap.size,
                    active: 0,
                    inactive: 0
                },
                storage: {
                    totalSize: 0,
                    photoCount: 0
                }
            };

            // Count Fahrzeuge by status & Calculate Storage Size
            fahrzeugeSnap.docs.forEach(doc => {
                const data = doc.data();
                const status = data.status || 'unbekannt';
                stats.fahrzeuge.status[status] = (stats.fahrzeuge.status[status] || 0) + 1;

                // Calculate Storage Size (estimate based on JSON size)
                const docSize = JSON.stringify(data).length;
                stats.storage.totalSize += docSize;

                // Count photos
                const fotos = data.fotos || [];
                stats.storage.photoCount += fotos.length;
            });

            // Add Kunden document sizes to storage
            kundenSnap.docs.forEach(doc => {
                const docSize = JSON.stringify(doc.data()).length;
                stats.storage.totalSize += docSize;
            });

            // Count active/inactive Mitarbeiter & Add storage sizes
            mitarbeiterSnap.docs.forEach(doc => {
                const data = doc.data();
                const status = data.status || 'active';
                if (status === 'active') {
                    stats.mitarbeiter.active++;
                } else {
                    stats.mitarbeiter.inactive++;
                }

                // Add Mitarbeiter document size to storage
                const docSize = JSON.stringify(data).length;
                stats.storage.totalSize += docSize;
            });

            console.log('✅ Statistiken gesammelt:', stats);
            return stats;
        } catch (error) {
            console.error('❌ Fehler beim Sammeln der Statistiken:', error);
            return null;
        }
    }

    /**
     * Delete old completed Fahrzeuge
     * @param {number} daysOld - Delete completed vehicles older than X days
     * @returns {Promise<number>} - Number of deleted vehicles
     */
    async deleteOldFahrzeuge(daysOld = 90) {
        try {
            console.log(`🗑️ Lösche Fahrzeuge älter als ${daysOld} Tage...`);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const snapshot = await window.getCollection('fahrzeuge')
                .where('status', '==', 'abgeschlossen')
                .where('abnahmeDatum', '<', cutoffDate.toISOString())
                .get();

            let deletedCount = 0;
            const batch = window.db.batch();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            await batch.commit();

            console.log(`✅ ${deletedCount} Fahrzeuge gelöscht`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Fehler beim Löschen alter Fahrzeuge:', error);
            return 0;
        }
    }

    /**
     * Get Current Settings (cached)
     * @returns {Object}
     */
    getCurrentSettings() {
        return this.currentSettings || DEFAULT_SETTINGS;
    }

    /**
     * Reset Settings to Defaults
     * @returns {Promise<boolean>}
     */
    async resetToDefaults() {
        try {
            console.log('🔄 Setze Einstellungen auf Standard zurück...');
            await this.createDefaultSettings();
            console.log('✅ Einstellungen zurückgesetzt');
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Zurücksetzen:', error);
            return false;
        }
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

window.settingsManager = new SettingsManager();

console.log('✅ Settings Manager geladen');
