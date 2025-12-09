/**
 * ✅ BUG #7 FIX: Service Type Normalization - Central Registry
 *
 * Purpose: Canonical service type definitions with auto-correction and validation
 * Risk Level: LOW (Zero breaking changes - preserves current values)
 *
 * @version 1.0.0
 * @date 2025-11-21
 */

// ============================================================================
// CANONICAL SERVICE TYPE CONSTANTS (DO NOT CHANGE - BREAKING!)
// ============================================================================

/**
 * Official service type values used throughout the application
 * These values MUST match Firestore data and Kanban status mappings
 *
 * ⚠️ WARNING: Changing these values requires data migration!
 */
window.SERVICE_TYPES = {
    LACKIER: 'lackier',           // Lackierung / Karosserie
    REIFEN: 'reifen',             // Reifen-Service / Reifenwechsel
    MECHANIK: 'mechanik',         // Mechanik / Reparatur
    PFLEGE: 'pflege',             // Fahrzeugpflege / Aufbereitung
    TUEV: 'tuev',                 // TÜV/AU / Hauptuntersuchung
    VERSICHERUNG: 'versicherung', // Versicherungsschaden / Unfall
    GLAS: 'glas',                 // Glasreparatur / Steinschlag
    KLIMA: 'klima',               // Klimaservice / Klimaanlage
    DELLEN: 'dellen',             // Dellendrücken / Smart Repair / PDR
    FOLIERUNG: 'folierung',       // Folierung / Wrap
    STEINSCHUTZ: 'steinschutz',   // Steinschutzfolie / Lackschutz
    WERBEBEKLEBUNG: 'werbebeklebung' // Werbebeklebung / Beschriftung
};

// ============================================================================
// SERVICE TYPE CONFIGURATION (Display Labels, Icons, Categories)
// ============================================================================

/**
 * Display configuration for each service type
 * Used for consistent UI rendering across all pages
 */
window.SERVICE_TYPE_CONFIG = {
    'lackier': {
        label: '🎨 Lackierung',
        displayName: 'Lackierung',
        icon: '🎨',
        category: 'repair',
        priority: 1,
        description: 'Karosserielackierung und Smart Repair'
    },
    'reifen': {
        label: '🛞 Reifen-Service',
        displayName: 'Reifen-Service',
        icon: '🛞',
        category: 'maintenance',
        priority: 2,
        description: 'Reifenwechsel, Einlagerung, Montage'
    },
    'mechanik': {
        label: '🔧 Mechanik',
        displayName: 'Mechanik',
        icon: '🔧',
        category: 'repair',
        priority: 3,
        description: 'Mechanische Reparaturen'
    },
    'pflege': {
        label: '✨ Fahrzeugpflege',
        displayName: 'Fahrzeugpflege',
        icon: '✨',
        category: 'maintenance',
        priority: 4,
        description: 'Aufbereitung, Reinigung, Polierung'
    },
    'tuev': {
        label: '📋 TÜV/AU',
        displayName: 'TÜV/AU',
        icon: '📋',
        category: 'inspection',
        priority: 5,
        description: 'Hauptuntersuchung und Abgasuntersuchung'
    },
    'versicherung': {
        label: '🛡️ Versicherungsschaden',
        displayName: 'Versicherungsschaden',
        icon: '🛡️',
        category: 'insurance',
        priority: 6,
        description: 'Unfallschäden, Gutachten, Abwicklung'
    },
    'glas': {
        label: '🪟 Glasreparatur',
        displayName: 'Glasreparatur',
        icon: '🪟',
        category: 'repair',
        priority: 7,
        description: 'Steinschlagreparatur, Scheibentausch'
    },
    'klima': {
        label: '❄️ Klimaservice',
        displayName: 'Klimaservice',
        icon: '❄️',
        category: 'maintenance',
        priority: 8,
        description: 'Klimaanlagen-Wartung, Desinfektion'
    },
    'dellen': {
        label: '🔨 Dellendrücken',
        displayName: 'Dellendrücken',
        icon: '🔨',
        category: 'repair',
        priority: 9,
        description: 'Smart Repair, PDR (Paintless Dent Removal)'
    },
    'folierung': {
        label: '🌈 Folierung',
        displayName: 'Folierung',
        icon: '🌈',
        category: 'customization',
        priority: 10,
        description: 'Vollfolierung, Teilfolierung, Wrap'
    },
    'steinschutz': {
        label: '🛡️ Steinschutzfolie',
        displayName: 'Steinschutzfolie',
        icon: '🛡️',
        category: 'customization',
        priority: 11,
        description: 'Lackschutzfolie, PPF (Paint Protection Film)'
    },
    'werbebeklebung': {
        label: '📢 Werbebeklebung',
        displayName: 'Werbebeklebung',
        icon: '📢',
        category: 'customization',
        priority: 12,
        description: 'Fahrzeugbeschriftung, Werbung'
    }
};

// ============================================================================
// SERVICE TYPE ALIASES (Auto-Correction for Typos & Variations)
// ============================================================================

/**
 * Map common typos/variations to canonical service types
 * Expands existing auto-correction logic from glas-anfrage.html
 */
window.SERVICE_TYPE_ALIASES = {
    // Lackierung variations
    'lackierung': 'lackier',
    'lack': 'lackier',
    'karosserie': 'lackier',
    'bodyshop': 'lackier',

    // Smart Repair / Dellen variations
    'smart-repair': 'dellen',
    'smartrepair': 'dellen',
    'smart_repair': 'dellen',
    'pdr': 'dellen',
    'paintless-dent-removal': 'dellen',
    'beule': 'dellen',
    'beulen': 'dellen',

    // Pflege variations
    'aufbereitung': 'pflege',
    'reinigung': 'pflege',
    'polierung': 'pflege',
    'detailing': 'pflege',

    // TÜV variations
    'tüv': 'tuev',
    'tauv': 'tuev',
    'tuv': 'tuev',
    'au': 'tuev',
    'hauptuntersuchung': 'tuev',
    'hu': 'tuev',

    // Versicherung variations
    'unfall': 'versicherung',
    'unfallschaden': 'versicherung',
    'insurance': 'versicherung',
    'gutachten': 'versicherung',

    // Steinschutz variations
    'lackschutz': 'steinschutz',
    'ppf': 'steinschutz',
    'paint-protection': 'steinschutz',
    'schutzfolie': 'steinschutz',

    // Glas variations
    'glasschaden': 'glas',
    'steinschlag': 'glas',
    'scheibe': 'glas',
    'windschutzscheibe': 'glas',

    // Klima variations
    'klimaanlage': 'klima',
    'ac': 'klima',
    'aircon': 'klima',

    // Folierung variations
    'wrap': 'folierung',
    'folie': 'folierung',
    'vollfolierung': 'folierung',

    // Mechanik variations
    'reparatur': 'mechanik',
    'werkstatt': 'mechanik',
    'instandsetzung': 'mechanik',

    // Reifen variations
    'reifenwechsel': 'reifen',
    'reifenmontage': 'reifen',
    'raeder': 'reifen',
    'räder': 'reifen',
    'wheels': 'reifen',

    // Werbebeklebung variations
    'werbung': 'werbebeklebung',
    'beschriftung': 'werbebeklebung',
    'beklebung': 'werbebeklebung',
    'lettering': 'werbebeklebung'
};

// ============================================================================
// NORMALIZATION FUNCTION (Auto-Correct Typos)
// ============================================================================

/**
 * Normalize service type input by auto-correcting typos and variations
 *
 * @param {string} input - Raw service type input (may contain typos)
 * @returns {string} - Normalized canonical service type
 *
 * @example
 * normalizeServiceType('lackierung')  // → 'lackier'
 * normalizeServiceType('smart-repair') // → 'dellen'
 * normalizeServiceType('TÜV')          // → 'tuev'
 */
window.normalizeServiceType = function(input) {
    if (!input || typeof input !== 'string') {
        return input;
    }

    // Convert to lowercase for case-insensitive matching
    const lowercase = input.toLowerCase().trim();

    // Check if alias exists
    if (window.SERVICE_TYPE_ALIASES[lowercase]) {
        return window.SERVICE_TYPE_ALIASES[lowercase];
    }

    // Return original if no alias found (might be already canonical)
    return lowercase;
};

// ============================================================================
// VALIDATION FUNCTION (Reject Invalid Service Types)
// ============================================================================

/**
 * Validate that a service type is one of the canonical values
 *
 * @param {string} serviceTyp - Service type to validate
 * @returns {boolean} - True if valid, false otherwise
 *
 * @example
 * validateServiceType('lackier')     // → true
 * validateServiceType('invalid')     // → false
 * validateServiceType('lackierung')  // → false (use normalizeServiceType first!)
 */
window.validateServiceType = function(serviceTyp) {
    if (!serviceTyp || typeof serviceTyp !== 'string') {
        return false;
    }

    // Check if it's one of the canonical values
    const canonicalValues = Object.values(window.SERVICE_TYPES);
    return canonicalValues.includes(serviceTyp.toLowerCase().trim());
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display configuration for a service type
 *
 * @param {string} serviceTyp - Service type (canonical value)
 * @returns {Object|null} - Configuration object or null if not found
 *
 * @example
 * getServiceTypeConfig('lackier')  // → { label: '🎨 Lackierung', ... }
 */
window.getServiceTypeConfig = function(serviceTyp) {
    if (!serviceTyp) return null;
    return window.SERVICE_TYPE_CONFIG[serviceTyp] || null;
};

/**
 * Get display label for a service type
 *
 * @param {string} serviceTyp - Service type (canonical value)
 * @returns {string} - Display label with emoji or fallback to input
 *
 * @example
 * getServiceTypeLabel('lackier')  // → '🎨 Lackierung'
 * getServiceTypeLabel('invalid')  // → 'invalid'
 */
window.getServiceTypeLabel = function(serviceTyp) {
    const config = window.getServiceTypeConfig(serviceTyp);
    return config ? config.label : serviceTyp;
};

/**
 * Get all service types sorted by priority
 *
 * @returns {Array<Object>} - Array of service type configs sorted by priority
 */
window.getAllServiceTypes = function() {
    return Object.entries(window.SERVICE_TYPE_CONFIG)
        .map(([key, config]) => ({ ...config, key }))
        .sort((a, b) => a.priority - b.priority);
};

/**
 * Get service types by category
 *
 * @param {string} category - Category name (repair, maintenance, inspection, etc.)
 * @returns {Array<Object>} - Array of service type configs in category
 */
window.getServiceTypesByCategory = function(category) {
    return Object.entries(window.SERVICE_TYPE_CONFIG)
        .filter(([_, config]) => config.category === category)
        .map(([key, config]) => ({ ...config, key }))
        .sort((a, b) => a.priority - b.priority);
};

/**
 * Normalize AND validate service type with fallback (combines both operations)
 * This is the recommended function for form submissions
 *
 * @param {string} input - Raw service type input (may contain typos)
 * @param {string} fallbackDefault - Fallback value if validation fails (default: 'lackier')
 * @returns {string} - Normalized and validated service type
 *
 * @example
 * normalizeAndValidateServiceType('lackierung', 'glas')  // → 'lackier'
 * normalizeAndValidateServiceType('invalid', 'glas')     // → 'glas' (fallback)
 * normalizeAndValidateServiceType('smart-repair', 'glas') // → 'dellen' (auto-corrected)
 */
window.normalizeAndValidateServiceType = function(input, fallbackDefault = 'lackier') {
    if (!input || typeof input !== 'string') {
        console.error(`❌ INVALID serviceTyp: "${input}" → Fallback: "${fallbackDefault}"`);
        return fallbackDefault;
    }

    // Step 1: Normalize (auto-correct typos/aliases)
    const normalized = window.normalizeServiceType(input);

    // Step 2: Validate (check if canonical)
    if (!window.validateServiceType(normalized)) {
        console.error(`❌ INVALID serviceTyp: "${input}" → Fallback: "${fallbackDefault}"`);
        return fallbackDefault;
    }

    // Step 3: Log auto-correction if applied
    if (normalized !== input.toLowerCase().trim()) {
        if (window.DEBUG) {
            console.warn(`🔧 AUTO-FIX serviceTyp: "${input}" → "${normalized}"`);
        }
    }

    return normalized;
};

// ============================================================================
// ENABLED SERVICES MANAGEMENT (Werkstatt-Service-Konfiguration)
// ============================================================================

/**
 * Cache for enabled services (performance optimization)
 * @private
 */
let _enabledServicesCache = null;
let _enabledServicesCacheTime = 0;
const ENABLED_SERVICES_CACHE_TTL = 60000; // 1 Minute Cache TTL

/**
 * Get list of enabled services for current werkstatt
 * Uses caching for performance (1 minute TTL)
 *
 * @returns {Promise<Array<string>>} - Array of enabled service type keys
 *
 * @example
 * const enabled = await getEnabledServices();
 * // → ['lackier', 'reifen', 'mechanik'] (only enabled ones)
 */
window.getEnabledServices = async function() {
    // Cache prüfen
    if (_enabledServicesCache && (Date.now() - _enabledServicesCacheTime) < ENABLED_SERVICES_CACHE_TTL) {
        return _enabledServicesCache;
    }

    try {
        // Warte auf Settings Manager
        if (!window.settingsManager) {
            console.warn('⚠️ [getEnabledServices] Settings Manager nicht verfügbar, alle Services aktiviert');
            return Object.values(window.SERVICE_TYPES);
        }

        const settings = await window.settingsManager.loadSettings();
        const enabledServices = settings?.enabledServices || {};

        // Filter: Nur Services mit enabled=true (default = true wenn nicht explizit false)
        _enabledServicesCache = Object.values(window.SERVICE_TYPES)
            .filter(serviceTyp => enabledServices[serviceTyp] !== false);

        _enabledServicesCacheTime = Date.now();

        if (window.DEBUG) {
            console.log('✅ [getEnabledServices] Cache aktualisiert:', _enabledServicesCache);
        }

        return _enabledServicesCache;
    } catch (error) {
        console.error('❌ [getEnabledServices] Fehler:', error);
        // Fallback: Alle Services aktiviert
        return Object.values(window.SERVICE_TYPES);
    }
};

/**
 * Check if a specific service is enabled for current werkstatt
 *
 * @param {string} serviceTyp - Service type to check (canonical value)
 * @returns {Promise<boolean>} - True if enabled, false if disabled
 *
 * @example
 * const isEnabled = await isServiceEnabled('folierung');
 * if (!isEnabled) {
 *     toast.error('Service nicht verfügbar');
 *     safeNavigate('service-auswahl.html');
 * }
 */
window.isServiceEnabled = async function(serviceTyp) {
    if (!serviceTyp) return false;

    const enabled = await window.getEnabledServices();
    return enabled.includes(serviceTyp);
};

/**
 * Get all service types that are enabled, with full config data
 *
 * @returns {Promise<Array<Object>>} - Array of enabled service type configs
 *
 * @example
 * const services = await getEnabledServiceConfigs();
 * services.forEach(s => console.log(s.label)); // → '🎨 Lackierung', etc.
 */
window.getEnabledServiceConfigs = async function() {
    const enabled = await window.getEnabledServices();

    return Object.entries(window.SERVICE_TYPE_CONFIG)
        .filter(([key]) => enabled.includes(key))
        .map(([key, config]) => ({ ...config, key }))
        .sort((a, b) => a.priority - b.priority);
};

/**
 * Invalidate enabled services cache
 * Call this when settings are changed (especially enabledServices)
 *
 * @example
 * // Nach dem Speichern von Einstellungen:
 * await settingsManager.saveSettings(newSettings);
 * invalidateServiceCache();
 */
window.invalidateServiceCache = function() {
    _enabledServicesCache = null;
    _enabledServicesCacheTime = 0;
    if (window.DEBUG) {
        console.log('🔄 [invalidateServiceCache] Enabled Services Cache geleert');
    }
};

/**
 * Check service availability and redirect if disabled
 * Use at the start of service-specific forms
 *
 * @param {string} serviceTyp - Service type to check
 * @param {string} redirectUrl - URL to redirect to if disabled (default: 'service-auswahl.html')
 * @returns {Promise<boolean>} - True if enabled (safe to continue), false if redirected
 *
 * @example
 * // Am Anfang von mechanik-anfrage.html:
 * if (!await checkServiceAvailability('mechanik')) return;
 */
window.checkServiceAvailability = async function(serviceTyp, redirectUrl = 'service-auswahl.html') {
    const isEnabled = await window.isServiceEnabled(serviceTyp);

    if (!isEnabled) {
        const config = window.getServiceTypeConfig(serviceTyp);
        const serviceName = config ? config.displayName : serviceTyp;

        console.warn(`⚠️ [checkServiceAvailability] Service "${serviceName}" ist deaktiviert`);

        // Toast anzeigen wenn verfügbar
        if (window.toast && typeof window.toast.error === 'function') {
            window.toast.error(`Service "${serviceName}" ist für diese Werkstatt nicht verfügbar`);
        } else if (typeof showToast === 'function') {
            showToast(`Service "${serviceName}" ist für diese Werkstatt nicht verfügbar`, 'error');
        }

        // Redirect mit safeNavigate wenn verfügbar, sonst location.href
        setTimeout(() => {
            if (typeof safeNavigate === 'function') {
                safeNavigate(redirectUrl);
            } else {
                window.location.href = redirectUrl;
            }
        }, 1500);

        return false;
    }

    return true;
};

// ============================================================================
// TAGESPLANUNG: DEFAULT ARBEITSZEITEN PRO SERVICE (Phase 2 Feature)
// ============================================================================

/**
 * Default geschätzte Arbeitszeit in Stunden pro Service-Typ
 * Wird in Tagesplanung verwendet wenn kein individueller Wert gesetzt ist
 *
 * @version 1.0.0
 * @date 2025-12-06
 */
window.SERVICE_DEFAULT_HOURS = {
    // Service-Queues (12)
    lackier: 4.0,           // Lackierung: 4h
    mechanik: 2.0,          // Mechanik: 2h
    reifen: 0.5,            // Reifenwechsel: 30min
    pflege: 1.0,            // Fahrzeugpflege: 1h
    tuev: 1.5,              // TÜV/AU: 1.5h
    versicherung: 1.0,      // Versicherungsfall: 1h (nur Dokumentation)
    glas: 1.0,              // Glasreparatur: 1h
    klima: 1.0,             // Klimaservice: 1h
    dellen: 3.0,            // Dellendrücken: 3h
    folierung: 6.0,         // Folierung: 6h (fast ganzer Tag)
    steinschutz: 2.0,       // Steinschutz: 2h
    werbebeklebung: 4.0,    // Werbung: 4h
    // Logistik-Queues (2 kombinierte Fahrten)
    abhol_fahrt: 1.5,       // Abhol-Fahrt (Fzg abholen + Leih bringen): 1.5h Fallback
    liefer_fahrt: 1.5       // Liefer-Fahrt (Fzg liefern + Leih abholen): 1.5h Fallback
    // Hinweis: Wird dynamisch via Google Maps berechnet wenn verfügbar
};

/**
 * Default Kapazität pro Queue/Tag in Stunden
 * Kann pro Werkstatt überschrieben werden in werkstatt-einstellungen
 */
window.QUEUE_DEFAULT_CAPACITY = 8.0; // 8 Arbeitsstunden pro Tag

// ============================================================================
// TAGESPLANUNG: JOB-ABHÄNGIGKEITEN (Logischer Workflow)
// ============================================================================

/**
 * Abhängigkeitsregeln: Queue X erfordert Queue Y = fertig
 * Null/undefined/leer = keine Abhängigkeiten (kann jederzeit geplant werden)
 *
 * Typischer Unfallschaden-Workflow:
 * Abholen → Dellen/Karosserie → Lackierung → Pflege → Liefern
 *                ↓
 *            Mechanik (parallel möglich)
 *                ↓
 *            Glas (parallel möglich)
 */
window.QUEUE_DEPENDENCIES = {
    // Lackierung erfordert: Dellen/Karosserie fertig (wenn vorhanden)
    'lackier': ['dellen'],

    // Pflege erfordert: Lackierung fertig (wenn vorhanden)
    'pflege': ['lackier'],

    // Liefer-Fahrt erfordert: ALLE Service-Arbeiten fertig
    'liefer_fahrt': ['lackier', 'mechanik', 'glas', 'pflege', 'reifen', 'tuev',
                     'klima', 'dellen', 'folierung', 'steinschutz', 'werbebeklebung']

    // Queues OHNE Abhängigkeiten (können jederzeit geplant werden):
    // abhol_fahrt, mechanik, glas, reifen, tuev, klima,
    // versicherung, folierung, steinschutz, werbebeklebung, dellen
};

/**
 * Helper: Prüft ob ein Fahrzeug in eine bestimmte Queue verschoben werden darf
 *
 * @param {Object} fahrzeug - Fahrzeug-Objekt mit completedQueues Array
 * @param {string} targetQueue - Ziel-Queue ID
 * @returns {Object} - { allowed: boolean, reason?: string }
 *
 * @example
 * const check = canMoveToQueue(fahrzeug, 'lackier');
 * if (!check.allowed) {
 *     toast.warning(check.reason);
 *     return;
 * }
 */
window.canMoveToQueue = function(fahrzeug, targetQueue) {
    const deps = window.QUEUE_DEPENDENCIES[targetQueue];

    // Keine Abhängigkeiten → immer erlaubt
    if (!deps || deps.length === 0) {
        return { allowed: true };
    }

    // Prüfe ob alle Abhängigkeiten erfüllt
    const completedQueues = fahrzeug.completedQueues || [];
    const requiredServices = fahrzeug.requiredServices || [fahrzeug.serviceTyp];
    const missingDeps = [];

    deps.forEach(depQueue => {
        // Prüfe ob Fahrzeug diese Queue überhaupt braucht
        const needsThisQueue = requiredServices.includes(depQueue) ||
                               fahrzeug.serviceTyp === depQueue ||
                               (fahrzeug.multiService && fahrzeug.multiService[depQueue]);

        // Wenn benötigt, prüfe ob bereits erledigt
        if (needsThisQueue && !completedQueues.includes(depQueue)) {
            const config = window.SERVICE_TYPE_CONFIG[depQueue];
            const queueName = config ? config.displayName : depQueue;
            missingDeps.push(queueName);
        }
    });

    if (missingDeps.length > 0) {
        return {
            allowed: false,
            reason: `Erst "${missingDeps.join('", "')}" fertigstellen`
        };
    }

    return { allowed: true };
};

/**
 * Helper: Gibt die Sub-Tasks für eine kombinierte Logistik-Queue zurück
 *
 * @param {string} queueId - 'abhol_fahrt' oder 'liefer_fahrt'
 * @param {Object} fahrzeug - Fahrzeug-Objekt mit zugewiesenesLeihfahrzeug
 * @returns {string[]} - Array von Sub-Task Labels
 *
 * @example
 * getLogistikSubTasks('abhol_fahrt', { zugewiesenesLeihfahrzeug: 'MOS-L 123' })
 * // → ['Fzg. abholen', 'Leih bringen']
 */
window.getLogistikSubTasks = function(queueId, fahrzeug) {
    if (queueId === 'abhol_fahrt') {
        const tasks = ['Fzg. abholen'];
        if (fahrzeug?.zugewiesenesLeihfahrzeug) {
            tasks.push('Leih bringen');
        }
        return tasks;
    }
    if (queueId === 'liefer_fahrt') {
        const tasks = ['Fzg. liefern'];
        if (fahrzeug?.zugewiesenesLeihfahrzeug) {
            tasks.push('Leih abholen');
        }
        return tasks;
    }
    return [];
};

/**
 * Berechnet Arbeitsstunden aus KVA-Kalkulation
 * Summiert arbeitslohn[].stunden + lackierung[].stunden
 *
 * @param {Object} fahrzeug - Fahrzeug-Objekt mit kalkulationData
 * @returns {number|null} - Stunden aus KVA oder null wenn keine KVA vorhanden
 *
 * @example
 * // Fahrzeug mit KVA:
 * calculateKvaHours({ kalkulationData: { arbeitslohn: [{stunden: 2.5}], lackierung: [{stunden: 3}] }})
 * // → 5.5
 */
window.calculateKvaHours = function(fahrzeug) {
    if (!fahrzeug || !fahrzeug.kalkulationData) return null;

    let totalHours = 0;

    // Arbeitslohn-Stunden
    const arbeitslohn = fahrzeug.kalkulationData.arbeitslohn || [];
    arbeitslohn.forEach(pos => {
        totalHours += parseFloat(pos.stunden) || 0;
    });

    // Lackierungs-Stunden
    const lackierung = fahrzeug.kalkulationData.lackierung || [];
    lackierung.forEach(pos => {
        totalHours += parseFloat(pos.stunden) || 0;
    });

    return totalHours > 0 ? totalHours : null;
};

/**
 * Helper: Berechnet geschätzte Stunden für ein Fahrzeug
 * Priorität: KVA > Manuell > Queue-Default > Service-Default > 1h
 *
 * @param {Object} fahrzeug - Fahrzeug-Objekt
 * @param {string} queueId - Optional: Queue-ID für Logistik-Zeiten
 * @returns {number} - Geschätzte Stunden
 */
window.getEstimatedHours = function(fahrzeug, queueId = null) {
    // 1. KVA-Stunden haben höchste Priorität (echte Kalkulation!)
    const kvaHours = window.calculateKvaHours(fahrzeug);
    if (kvaHours) return kvaHours;

    // 2. Explizit gesetzte Stunden
    if (fahrzeug.geschaetzteStunden) {
        return parseFloat(fahrzeug.geschaetzteStunden);
    }

    // 3. Queue-ID für Logistik-Aufträge
    if (queueId && window.SERVICE_DEFAULT_HOURS[queueId]) {
        return window.SERVICE_DEFAULT_HOURS[queueId];
    }

    // 4. Service-Typ Default (nur Fallback wenn keine KVA!)
    if (fahrzeug.serviceTyp && window.SERVICE_DEFAULT_HOURS[fahrzeug.serviceTyp]) {
        return window.SERVICE_DEFAULT_HOURS[fahrzeug.serviceTyp];
    }

    // 5. Ultima Ratio: 1 Stunde
    return 1.0;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

if (window.DEBUG) {
    console.log('✅ [service-types.js] Service Type Registry loaded', {
        canonicalTypes: Object.keys(window.SERVICE_TYPES).length,
        aliases: Object.keys(window.SERVICE_TYPE_ALIASES).length,
        configs: Object.keys(window.SERVICE_TYPE_CONFIG).length,
        enabledServicesHelpers: ['getEnabledServices', 'isServiceEnabled', 'getEnabledServiceConfigs', 'invalidateServiceCache', 'checkServiceAvailability'],
        tagesplanungHelpers: ['SERVICE_DEFAULT_HOURS', 'QUEUE_DEFAULT_CAPACITY', 'QUEUE_DEPENDENCIES', 'canMoveToQueue', 'getEstimatedHours']
    });
}
