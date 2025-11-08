/**
 * @fileoverview Status Badge and Icon Utilities
 *
 * Zentrale Funktionen für Status-Badges und Icons.
 * Extrahiert aus: kanban.html, liste.html, meine-anfragen.html
 *
 * @version 3.2.0
 * @created 2025-11-09
 * @author Claude Code (Quick Win #2: Utility Extraction)
 */

/// <reference path="../types.js" />

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

/**
 * Vehicle status configuration
 * @type {Object<string, {label: string, color: string, bgColor: string, icon: string}>}
 */
const VEHICLE_STATUS_CONFIG = {
    'angenommen': {
        label: 'Angenommen',
        color: '#3498db',
        bgColor: '#ebf5fb',
        icon: '📋'
    },
    'in_arbeit': {
        label: 'In Arbeit',
        color: '#f39c12',
        bgColor: '#fef5e7',
        icon: '🔧'
    },
    'lackierung': {
        label: 'Lackierung',
        color: '#9b59b6',
        bgColor: '#f4ecf7',
        icon: '🎨'
    },
    'trocknung': {
        label: 'Trocknung',
        color: '#e67e22',
        bgColor: '#fdf2e9',
        icon: '⏰'
    },
    'qualitaetskontrolle': {
        label: 'Qualitätskontrolle',
        color: '#16a085',
        bgColor: '#e8f8f5',
        icon: '✓'
    },
    'bereit_zur_abholung': {
        label: 'Bereit zur Abholung',
        color: '#27ae60',
        bgColor: '#eafaf1',
        icon: '✅'
    },
    'abgeschlossen': {
        label: 'Abgeschlossen',
        color: '#95a5a6',
        bgColor: '#f4f6f6',
        icon: '🏁'
    },
    'abgelehnt': {
        label: 'Abgelehnt',
        color: '#e74c3c',
        bgColor: '#fdedec',
        icon: '❌'
    }
};

/**
 * Service type configuration
 * @type {Object<string, {label: string, icon: string, color: string}>}
 */
const SERVICE_TYPE_CONFIG = {
    'lackier': {
        label: 'Lackierung',
        icon: '🎨',
        color: '#9b59b6'
    },
    'reifen': {
        label: 'Reifen',
        icon: '🛞',
        color: '#34495e'
    },
    'mechanik': {
        label: 'Mechanik',
        icon: '🔧',
        color: '#e67e22'
    },
    'pflege': {
        label: 'Pflege',
        icon: '✨',
        color: '#3498db'
    },
    'tuev': {
        label: 'TÜV',
        icon: '✓',
        color: '#16a085'
    },
    'versicherung': {
        label: 'Versicherung',
        icon: '🛡️',
        color: '#2ecc71'
    },
    'glas': {
        label: 'Glas',
        icon: '🪟',
        color: '#1abc9c'
    },
    'klima': {
        label: 'Klima',
        icon: '❄️',
        color: '#00bcd4'
    },
    'dellen': {
        label: 'Dellen',
        icon: '🔨',
        color: '#f39c12'
    },
    'folierung': {
        label: 'Folierung',
        icon: '📦',
        color: '#8e44ad'
    },
    'steinschutz': {
        label: 'Steinschutz',
        icon: '🛡️',
        color: '#95a5a6'
    },
    'werbebeklebung': {
        label: 'Werbebeklebung',
        icon: '📢',
        color: '#e91e63'
    }
};

// ============================================================================
// STATUS BADGE GENERATION
// ============================================================================

/**
 * Get status badge HTML
 * @param {VehicleStatus} status - Vehicle status
 * @param {Object} [options] - Badge options
 * @param {boolean} [options.showIcon=true] - Show icon
 * @param {boolean} [options.uppercase=false] - Uppercase text
 * @param {string} [options.size='normal'] - Badge size ('small', 'normal', 'large')
 * @returns {string} HTML badge string
 */
export function getStatusBadge(status, options = {}) {
    const {
        showIcon = true,
        uppercase = false,
        size = 'normal'
    } = options;

    const config = VEHICLE_STATUS_CONFIG[status];

    if (!config) {
        console.warn(`Unknown status: ${status}`);
        return `<span class="status-badge status-unknown">${status}</span>`;
    }

    const icon = showIcon ? config.icon + ' ' : '';
    const label = uppercase ? config.label.toUpperCase() : config.label;

    const sizeClass = size !== 'normal' ? `status-badge-${size}` : '';

    return `<span class="status-badge ${sizeClass}" style="
        background-color: ${config.bgColor};
        color: ${config.color};
        padding: 4px 12px;
        border-radius: 12px;
        font-size: ${size === 'small' ? '11px' : size === 'large' ? '14px' : '12px'};
        font-weight: 600;
        display: inline-block;
        white-space: nowrap;
    ">${icon}${label}</span>`;
}

/**
 * Get status color
 * @param {VehicleStatus} status - Vehicle status
 * @returns {string} Color hex code
 */
export function getStatusColor(status) {
    const config = VEHICLE_STATUS_CONFIG[status];
    return config ? config.color : '#95a5a6';
}

/**
 * Get status background color
 * @param {VehicleStatus} status - Vehicle status
 * @returns {string} Background color hex code
 */
export function getStatusBgColor(status) {
    const config = VEHICLE_STATUS_CONFIG[status];
    return config ? config.bgColor : '#f4f6f6';
}

/**
 * Get status icon
 * @param {VehicleStatus} status - Vehicle status
 * @returns {string} Status icon emoji
 */
export function getStatusIcon(status) {
    const config = VEHICLE_STATUS_CONFIG[status];
    return config ? config.icon : '❓';
}

/**
 * Get status label
 * @param {VehicleStatus} status - Vehicle status
 * @returns {string} Status label in German
 */
export function getStatusLabel(status) {
    const config = VEHICLE_STATUS_CONFIG[status];
    return config ? config.label : status;
}

// ============================================================================
// SERVICE TYPE HELPERS
// ============================================================================

/**
 * Get service type badge HTML
 * @param {ServiceTyp} serviceTyp - Service type
 * @param {Object} [options] - Badge options
 * @param {boolean} [options.showIcon=true] - Show icon
 * @param {string} [options.size='normal'] - Badge size
 * @returns {string} HTML badge string
 */
export function getServiceBadge(serviceTyp, options = {}) {
    const {
        showIcon = true,
        size = 'normal'
    } = options;

    const config = SERVICE_TYPE_CONFIG[serviceTyp];

    if (!config) {
        console.warn(`Unknown service type: ${serviceTyp}`);
        return `<span class="service-badge">${serviceTyp}</span>`;
    }

    const icon = showIcon ? config.icon + ' ' : '';
    const fontSize = size === 'small' ? '11px' : size === 'large' ? '14px' : '12px';

    return `<span class="service-badge" style="
        background-color: ${config.color}15;
        color: ${config.color};
        padding: 4px 12px;
        border-radius: 12px;
        font-size: ${fontSize};
        font-weight: 600;
        display: inline-block;
        white-space: nowrap;
    ">${icon}${config.label}</span>`;
}

/**
 * Get service type icon
 * @param {ServiceTyp} serviceTyp - Service type
 * @returns {string} Service icon emoji
 */
export function getServiceIcon(serviceTyp) {
    const config = SERVICE_TYPE_CONFIG[serviceTyp];
    return config ? config.icon : '🔧';
}

/**
 * Get service type label
 * @param {ServiceTyp} serviceTyp - Service type
 * @returns {string} Service label in German
 */
export function getServiceLabel(serviceTyp) {
    const config = SERVICE_TYPE_CONFIG[serviceTyp];
    return config ? config.label : serviceTyp;
}

/**
 * Get service type color
 * @param {ServiceTyp} serviceTyp - Service type
 * @returns {string} Color hex code
 */
export function getServiceColor(serviceTyp) {
    const config = SERVICE_TYPE_CONFIG[serviceTyp];
    return config ? config.color : '#95a5a6';
}

// ============================================================================
// PRIORITY BADGES
// ============================================================================

/**
 * Get priority badge HTML
 * @param {string} priority - Priority level ('normal', 'wichtig', 'dringend')
 * @returns {string} HTML badge string
 */
export function getPriorityBadge(priority) {
    const config = {
        'normal': {
            label: 'Normal',
            color: '#3498db',
            bgColor: '#ebf5fb',
            icon: '📌'
        },
        'wichtig': {
            label: 'Wichtig',
            color: '#f39c12',
            bgColor: '#fef5e7',
            icon: '⚠️'
        },
        'dringend': {
            label: 'Dringend',
            color: '#e74c3c',
            bgColor: '#fdedec',
            icon: '🚨'
        }
    };

    const cfg = config[priority] || config['normal'];

    return `<span class="priority-badge" style="
        background-color: ${cfg.bgColor};
        color: ${cfg.color};
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
    ">${cfg.icon} ${cfg.label}</span>`;
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Get next possible statuses for current status
 * @param {VehicleStatus} currentStatus - Current vehicle status
 * @returns {VehicleStatus[]} Array of possible next statuses
 */
export function getNextStatuses(currentStatus) {
    const transitions = {
        'angenommen': ['in_arbeit', 'abgelehnt'],
        'in_arbeit': ['lackierung', 'qualitaetskontrolle'],
        'lackierung': ['trocknung'],
        'trocknung': ['qualitaetskontrolle'],
        'qualitaetskontrolle': ['bereit_zur_abholung', 'in_arbeit'],
        'bereit_zur_abholung': ['abgeschlossen'],
        'abgeschlossen': [],
        'abgelehnt': []
    };

    return transitions[currentStatus] || [];
}

/**
 * Check if status transition is valid
 * @param {VehicleStatus} fromStatus - Current status
 * @param {VehicleStatus} toStatus - Target status
 * @returns {boolean} True if transition is valid
 */
export function isValidStatusTransition(fromStatus, toStatus) {
    const nextStatuses = getNextStatuses(fromStatus);
    return nextStatuses.includes(toStatus);
}

// ============================================================================
// EXPORT NOTE
// ============================================================================

console.log('✅ Status Helper Utilities loaded');
