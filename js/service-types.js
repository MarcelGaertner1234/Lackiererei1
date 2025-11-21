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
// INITIALIZATION
// ============================================================================

if (window.DEBUG) {
    console.log('✅ [service-types.js] Service Type Registry loaded', {
        canonicalTypes: Object.keys(window.SERVICE_TYPES).length,
        aliases: Object.keys(window.SERVICE_TYPE_ALIASES).length,
        configs: Object.keys(window.SERVICE_TYPE_CONFIG).length
    });
}
