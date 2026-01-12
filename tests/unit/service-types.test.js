/**
 * Unit Tests for service-types.js
 * Session #15 (2026-01-12)
 *
 * Tests für Service-Type Normalisierung und Validierung
 */

// Mock window object for browser-based code
global.window = global.window || {
    DEBUG: false
};

// Load the module (sets up window.* properties)
require('../../js/service-types');

const {
    SERVICE_TYPES,
    SERVICE_TYPE_ALIASES,
    SERVICE_TYPE_CONFIG,
    normalizeServiceType,
    validateServiceType,
    getServiceTypeConfig,
    getServiceTypeLabel,
    getAllServiceTypes,
    getServiceTypesByCategory,
    normalizeAndValidateServiceType,
    SERVICE_DEFAULT_HOURS,
    QUEUE_DEFAULT_CAPACITY,
    canMoveToQueue,
    getEstimatedHours,
    calculateKvaHours
} = window;

describe('service-types.js', () => {
    // ================================================================
    // SERVICE_TYPES Constants
    // ================================================================

    describe('SERVICE_TYPES', () => {
        test('contains all 12 service types', () => {
            expect(Object.keys(SERVICE_TYPES)).toHaveLength(12);
        });

        test('contains all canonical values', () => {
            expect(SERVICE_TYPES.LACKIER).toBe('lackier');
            expect(SERVICE_TYPES.REIFEN).toBe('reifen');
            expect(SERVICE_TYPES.MECHANIK).toBe('mechanik');
            expect(SERVICE_TYPES.PFLEGE).toBe('pflege');
            expect(SERVICE_TYPES.TUEV).toBe('tuev');
            expect(SERVICE_TYPES.VERSICHERUNG).toBe('versicherung');
            expect(SERVICE_TYPES.GLAS).toBe('glas');
            expect(SERVICE_TYPES.KLIMA).toBe('klima');
            expect(SERVICE_TYPES.DELLEN).toBe('dellen');
            expect(SERVICE_TYPES.FOLIERUNG).toBe('folierung');
            expect(SERVICE_TYPES.STEINSCHUTZ).toBe('steinschutz');
            expect(SERVICE_TYPES.WERBEBEKLEBUNG).toBe('werbebeklebung');
        });
    });

    // ================================================================
    // normalizeServiceType()
    // ================================================================

    describe('normalizeServiceType()', () => {
        describe('Canonical values', () => {
            test('returns canonical value unchanged', () => {
                expect(normalizeServiceType('lackier')).toBe('lackier');
                expect(normalizeServiceType('reifen')).toBe('reifen');
                expect(normalizeServiceType('mechanik')).toBe('mechanik');
            });

            test('handles uppercase input', () => {
                expect(normalizeServiceType('LACKIER')).toBe('lackier');
                expect(normalizeServiceType('REIFEN')).toBe('reifen');
            });

            test('handles mixed case input', () => {
                expect(normalizeServiceType('LaCkIeR')).toBe('lackier');
            });
        });

        describe('Alias normalization', () => {
            test('normalizes lackierung aliases', () => {
                expect(normalizeServiceType('lackierung')).toBe('lackier');
                expect(normalizeServiceType('lack')).toBe('lackier');
                expect(normalizeServiceType('karosserie')).toBe('lackier');
            });

            test('normalizes dellen aliases', () => {
                expect(normalizeServiceType('smart-repair')).toBe('dellen');
                expect(normalizeServiceType('pdr')).toBe('dellen');
                expect(normalizeServiceType('beule')).toBe('dellen');
            });

            test('normalizes tuev aliases', () => {
                expect(normalizeServiceType('tüv')).toBe('tuev');
                expect(normalizeServiceType('tuv')).toBe('tuev');
                expect(normalizeServiceType('hu')).toBe('tuev');
            });

            test('normalizes glas aliases', () => {
                expect(normalizeServiceType('steinschlag')).toBe('glas');
                expect(normalizeServiceType('scheibe')).toBe('glas');
            });
        });

        describe('Invalid input handling', () => {
            test('returns original for unknown input', () => {
                expect(normalizeServiceType('unknown')).toBe('unknown');
            });

            test('returns input for null', () => {
                expect(normalizeServiceType(null)).toBeNull();
            });

            test('returns input for undefined', () => {
                expect(normalizeServiceType(undefined)).toBeUndefined();
            });

            test('returns input for empty string', () => {
                expect(normalizeServiceType('')).toBe('');
            });
        });

        describe('Whitespace handling', () => {
            test('trims whitespace', () => {
                expect(normalizeServiceType('  lackier  ')).toBe('lackier');
                expect(normalizeServiceType('\tlackierung\n')).toBe('lackier');
            });
        });
    });

    // ================================================================
    // validateServiceType()
    // ================================================================

    describe('validateServiceType()', () => {
        describe('Valid canonical types', () => {
            test('validates all canonical types', () => {
                const canonicalTypes = Object.values(SERVICE_TYPES);
                canonicalTypes.forEach(type => {
                    expect(validateServiceType(type)).toBe(true);
                });
            });
        });

        describe('Invalid types', () => {
            test('rejects unknown types', () => {
                expect(validateServiceType('unknown')).toBe(false);
                expect(validateServiceType('invalid')).toBe(false);
            });

            test('rejects aliases (must normalize first)', () => {
                expect(validateServiceType('lackierung')).toBe(false);
                expect(validateServiceType('smart-repair')).toBe(false);
            });
        });

        describe('Edge cases', () => {
            test('rejects null', () => {
                expect(validateServiceType(null)).toBe(false);
            });

            test('rejects undefined', () => {
                expect(validateServiceType(undefined)).toBe(false);
            });

            test('rejects empty string', () => {
                expect(validateServiceType('')).toBe(false);
            });
        });
    });

    // ================================================================
    // normalizeAndValidateServiceType()
    // ================================================================

    describe('normalizeAndValidateServiceType()', () => {
        describe('Valid inputs', () => {
            test('returns normalized canonical value', () => {
                expect(normalizeAndValidateServiceType('lackier')).toBe('lackier');
                expect(normalizeAndValidateServiceType('LACKIER')).toBe('lackier');
            });

            test('normalizes aliases and validates', () => {
                expect(normalizeAndValidateServiceType('lackierung')).toBe('lackier');
                expect(normalizeAndValidateServiceType('smart-repair')).toBe('dellen');
                expect(normalizeAndValidateServiceType('tüv')).toBe('tuev');
            });
        });

        describe('Fallback behavior', () => {
            test('returns default fallback for invalid input', () => {
                expect(normalizeAndValidateServiceType('invalid')).toBe('lackier');
            });

            test('returns custom fallback when specified', () => {
                expect(normalizeAndValidateServiceType('invalid', 'glas')).toBe('glas');
                expect(normalizeAndValidateServiceType('invalid', 'reifen')).toBe('reifen');
            });

            test('returns fallback for null', () => {
                expect(normalizeAndValidateServiceType(null)).toBe('lackier');
                expect(normalizeAndValidateServiceType(null, 'mechanik')).toBe('mechanik');
            });

            test('returns fallback for undefined', () => {
                expect(normalizeAndValidateServiceType(undefined)).toBe('lackier');
            });

            test('returns fallback for empty string', () => {
                expect(normalizeAndValidateServiceType('')).toBe('lackier');
            });
        });
    });

    // ================================================================
    // getServiceTypeConfig() and getServiceTypeLabel()
    // ================================================================

    describe('getServiceTypeConfig()', () => {
        test('returns config for valid type', () => {
            const config = getServiceTypeConfig('lackier');
            expect(config).toBeDefined();
            expect(config.label).toBe('🎨 Lackierung');
            expect(config.icon).toBe('🎨');
            expect(config.category).toBe('repair');
        });

        test('returns null for invalid type', () => {
            expect(getServiceTypeConfig('invalid')).toBeNull();
        });

        test('returns null for null input', () => {
            expect(getServiceTypeConfig(null)).toBeNull();
        });
    });

    describe('getServiceTypeLabel()', () => {
        test('returns label with emoji for valid type', () => {
            expect(getServiceTypeLabel('lackier')).toBe('🎨 Lackierung');
            expect(getServiceTypeLabel('reifen')).toBe('🛞 Reifen-Service');
            expect(getServiceTypeLabel('mechanik')).toBe('🔧 Mechanik');
        });

        test('returns input for invalid type', () => {
            expect(getServiceTypeLabel('invalid')).toBe('invalid');
            expect(getServiceTypeLabel('unknown')).toBe('unknown');
        });
    });

    // ================================================================
    // getAllServiceTypes() and getServiceTypesByCategory()
    // ================================================================

    describe('getAllServiceTypes()', () => {
        test('returns all service types', () => {
            const all = getAllServiceTypes();
            expect(all).toHaveLength(12);
        });

        test('returns sorted by priority', () => {
            const all = getAllServiceTypes();
            expect(all[0].key).toBe('lackier'); // priority 1
            expect(all[1].key).toBe('reifen');  // priority 2
        });

        test('includes key property', () => {
            const all = getAllServiceTypes();
            all.forEach(item => {
                expect(item.key).toBeDefined();
            });
        });
    });

    describe('getServiceTypesByCategory()', () => {
        test('returns repair category services', () => {
            const repair = getServiceTypesByCategory('repair');
            const keys = repair.map(s => s.key);
            expect(keys).toContain('lackier');
            expect(keys).toContain('mechanik');
            expect(keys).toContain('glas');
            expect(keys).toContain('dellen');
        });

        test('returns maintenance category services', () => {
            const maintenance = getServiceTypesByCategory('maintenance');
            const keys = maintenance.map(s => s.key);
            expect(keys).toContain('reifen');
            expect(keys).toContain('pflege');
            expect(keys).toContain('klima');
        });

        test('returns empty array for unknown category', () => {
            const unknown = getServiceTypesByCategory('unknown');
            expect(unknown).toHaveLength(0);
        });
    });

    // ================================================================
    // SERVICE_DEFAULT_HOURS and QUEUE_DEFAULT_CAPACITY
    // ================================================================

    describe('SERVICE_DEFAULT_HOURS', () => {
        test('contains all service types', () => {
            Object.values(SERVICE_TYPES).forEach(type => {
                expect(SERVICE_DEFAULT_HOURS[type]).toBeDefined();
            });
        });

        test('contains logistic queues', () => {
            expect(SERVICE_DEFAULT_HOURS.abhol_fahrt).toBe(1.5);
            expect(SERVICE_DEFAULT_HOURS.liefer_fahrt).toBe(1.5);
        });

        test('all values are positive numbers', () => {
            Object.values(SERVICE_DEFAULT_HOURS).forEach(hours => {
                expect(typeof hours).toBe('number');
                expect(hours).toBeGreaterThan(0);
            });
        });
    });

    describe('QUEUE_DEFAULT_CAPACITY', () => {
        test('is 8 hours', () => {
            expect(QUEUE_DEFAULT_CAPACITY).toBe(8.0);
        });
    });

    // ================================================================
    // canMoveToQueue()
    // ================================================================

    describe('canMoveToQueue()', () => {
        test('allows move to queue without dependencies', () => {
            const fahrzeug = { serviceTyp: 'lackier' };
            expect(canMoveToQueue(fahrzeug, 'mechanik').allowed).toBe(true);
            expect(canMoveToQueue(fahrzeug, 'reifen').allowed).toBe(true);
        });

        test('allows move when dependencies are completed', () => {
            const fahrzeug = {
                serviceTyp: 'lackier',
                requiredServices: ['dellen', 'lackier'],
                completedQueues: ['dellen']
            };
            const result = canMoveToQueue(fahrzeug, 'lackier');
            expect(result.allowed).toBe(true);
        });

        test('blocks move when dependencies are not completed', () => {
            const fahrzeug = {
                serviceTyp: 'lackier',
                requiredServices: ['dellen', 'lackier'],
                completedQueues: []
            };
            const result = canMoveToQueue(fahrzeug, 'lackier');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Dellendrücken');
        });
    });

    // ================================================================
    // getEstimatedHours() and calculateKvaHours()
    // ================================================================

    describe('calculateKvaHours()', () => {
        test('returns null for fahrzeug without kalkulationData', () => {
            expect(calculateKvaHours({})).toBeNull();
            expect(calculateKvaHours({ kennzeichen: 'MOS-123' })).toBeNull();
        });

        test('calculates hours from arbeitslohn', () => {
            const fahrzeug = {
                kalkulationData: {
                    arbeitslohn: [
                        { stunden: 2.5 },
                        { stunden: 1.5 }
                    ]
                }
            };
            expect(calculateKvaHours(fahrzeug)).toBe(4);
        });

        test('calculates hours from lackierung', () => {
            const fahrzeug = {
                kalkulationData: {
                    lackierung: [
                        { stunden: 3 }
                    ]
                }
            };
            expect(calculateKvaHours(fahrzeug)).toBe(3);
        });

        test('calculates combined hours', () => {
            const fahrzeug = {
                kalkulationData: {
                    arbeitslohn: [{ stunden: 2 }],
                    lackierung: [{ stunden: 3 }]
                }
            };
            expect(calculateKvaHours(fahrzeug)).toBe(5);
        });
    });

    describe('getEstimatedHours()', () => {
        test('returns KVA hours if available', () => {
            const fahrzeug = {
                serviceTyp: 'lackier',
                kalkulationData: {
                    arbeitslohn: [{ stunden: 5 }]
                }
            };
            expect(getEstimatedHours(fahrzeug)).toBe(5);
        });

        test('returns geschaetzteStunden if set', () => {
            const fahrzeug = {
                serviceTyp: 'lackier',
                geschaetzteStunden: 3.5
            };
            expect(getEstimatedHours(fahrzeug)).toBe(3.5);
        });

        test('returns queue-specific default', () => {
            const fahrzeug = { serviceTyp: 'lackier' };
            expect(getEstimatedHours(fahrzeug, 'abhol_fahrt')).toBe(1.5);
        });

        test('returns service-type default', () => {
            const fahrzeug = { serviceTyp: 'reifen' };
            expect(getEstimatedHours(fahrzeug)).toBe(0.5);
        });

        test('returns 1.0 as fallback', () => {
            const fahrzeug = {};
            expect(getEstimatedHours(fahrzeug)).toBe(1.0);
        });
    });
});
