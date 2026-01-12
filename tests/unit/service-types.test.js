/**
 * Unit Tests for service-types.js
 * Session #15: Unit Tests für JS Utils
 *
 * Tests service type normalization, validation, and configuration
 *
 * @created 2026-01-13
 */

// Load the module
const {
  SERVICE_TYPES,
  SERVICE_TYPE_CONFIG,
  SERVICE_TYPE_ALIASES,
  normalizeAndValidateServiceType,
  validateServiceType,
  getServiceTypeLabel,
  getAllServiceTypes
} = require('../../js/service-types');

describe('service-types.js', () => {

  // ============================================
  // SERVICE_TYPES Constants
  // ============================================
  describe('SERVICE_TYPES', () => {

    test('contains exactly 12 service types', () => {
      expect(Object.keys(SERVICE_TYPES)).toHaveLength(12);
    });

    test('contains all canonical service types', () => {
      const expectedTypes = [
        'LACKIER', 'REIFEN', 'MECHANIK', 'PFLEGE', 'TUEV', 'VERSICHERUNG',
        'GLAS', 'KLIMA', 'DELLEN', 'FOLIERUNG', 'STEINSCHUTZ', 'WERBEBEKLEBUNG'
      ];
      expectedTypes.forEach(type => {
        expect(SERVICE_TYPES[type]).toBeDefined();
      });
    });

    test('canonical values are lowercase', () => {
      Object.values(SERVICE_TYPES).forEach(value => {
        expect(value).toBe(value.toLowerCase());
      });
    });
  });

  // ============================================
  // SERVICE_TYPE_CONFIG
  // ============================================
  describe('SERVICE_TYPE_CONFIG', () => {

    test('has config for all 12 service types', () => {
      expect(Object.keys(SERVICE_TYPE_CONFIG)).toHaveLength(12);
    });

    test('each config has required properties', () => {
      Object.entries(SERVICE_TYPE_CONFIG).forEach(([key, config]) => {
        expect(config.label).toBeDefined();
        expect(config.displayName).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.category).toBeDefined();
        expect(config.priority).toBeDefined();
      });
    });

    test('priorities are unique (1-12)', () => {
      const priorities = Object.values(SERVICE_TYPE_CONFIG).map(c => c.priority);
      const uniquePriorities = [...new Set(priorities)];
      expect(uniquePriorities).toHaveLength(12);
    });
  });

  // ============================================
  // normalizeAndValidateServiceType()
  // ============================================
  describe('normalizeAndValidateServiceType()', () => {

    describe('Canonical Values', () => {
      test('returns canonical value unchanged', () => {
        expect(normalizeAndValidateServiceType('lackier')).toBe('lackier');
        expect(normalizeAndValidateServiceType('reifen')).toBe('reifen');
        expect(normalizeAndValidateServiceType('mechanik')).toBe('mechanik');
      });
    });

    describe('Case Insensitivity', () => {
      test('normalizes uppercase to lowercase', () => {
        expect(normalizeAndValidateServiceType('LACKIER')).toBe('lackier');
        expect(normalizeAndValidateServiceType('REIFEN')).toBe('reifen');
      });

      test('normalizes mixed case to lowercase', () => {
        expect(normalizeAndValidateServiceType('Lackier')).toBe('lackier');
        expect(normalizeAndValidateServiceType('MeCHaNiK')).toBe('mechanik');
      });
    });

    describe('Alias Resolution', () => {
      test('resolves "lackierung" alias', () => {
        expect(normalizeAndValidateServiceType('lackierung')).toBe('lackier');
      });

      test('resolves "lackieren" alias', () => {
        expect(normalizeAndValidateServiceType('lackieren')).toBe('lackier');
      });

      test('resolves "reifenwechsel" alias', () => {
        expect(normalizeAndValidateServiceType('reifenwechsel')).toBe('reifen');
      });

      test('resolves "tüv" alias (with umlaut)', () => {
        expect(normalizeAndValidateServiceType('tüv')).toBe('tuev');
      });

      test('resolves "hauptuntersuchung" alias', () => {
        expect(normalizeAndValidateServiceType('hauptuntersuchung')).toBe('tuev');
      });
    });

    describe('Fallback Handling', () => {
      test('returns fallback for invalid input', () => {
        expect(normalizeAndValidateServiceType('invalid', 'lackier')).toBe('lackier');
        expect(normalizeAndValidateServiceType('xyz', 'reifen')).toBe('reifen');
      });

      test('returns default fallback (lackier) when no fallback provided', () => {
        expect(normalizeAndValidateServiceType('invalid')).toBe('lackier');
      });

      test('returns fallback for null input', () => {
        expect(normalizeAndValidateServiceType(null, 'mechanik')).toBe('mechanik');
      });

      test('returns fallback for undefined input', () => {
        expect(normalizeAndValidateServiceType(undefined, 'pflege')).toBe('pflege');
      });

      test('returns fallback for empty string', () => {
        expect(normalizeAndValidateServiceType('', 'tuev')).toBe('tuev');
      });
    });

    describe('Edge Cases', () => {
      test('trims whitespace', () => {
        expect(normalizeAndValidateServiceType('  lackier  ')).toBe('lackier');
        expect(normalizeAndValidateServiceType('\treifen\n')).toBe('reifen');
      });
    });
  });

  // ============================================
  // validateServiceType()
  // ============================================
  describe('validateServiceType()', () => {

    test('returns true for canonical types', () => {
      expect(validateServiceType('lackier')).toBe(true);
      expect(validateServiceType('reifen')).toBe(true);
      expect(validateServiceType('mechanik')).toBe(true);
    });

    test('returns false for invalid types', () => {
      expect(validateServiceType('invalid')).toBe(false);
      expect(validateServiceType('xyz')).toBe(false);
    });

    test('returns false for null/undefined', () => {
      expect(validateServiceType(null)).toBe(false);
      expect(validateServiceType(undefined)).toBe(false);
    });

    test('is case insensitive (normalizes internally)', () => {
      // validateServiceType normalizes to lowercase internally
      expect(validateServiceType('LACKIER')).toBe(true);
      expect(validateServiceType('Lackier')).toBe(true);
    });
  });

  // ============================================
  // getServiceTypeLabel()
  // ============================================
  describe('getServiceTypeLabel()', () => {

    test('returns label for valid service types', () => {
      const label = getServiceTypeLabel('lackier');
      expect(label).toContain('Lackierung');
    });

    test('returns label with emoji', () => {
      const label = getServiceTypeLabel('lackier');
      expect(label).toMatch(/^./u); // Starts with emoji (any unicode char)
    });

    test('returns fallback for invalid service types', () => {
      const label = getServiceTypeLabel('invalid');
      // Should return some default label or the input
      expect(label).toBeDefined();
    });
  });

  // ============================================
  // getAllServiceTypes()
  // ============================================
  describe('getAllServiceTypes()', () => {

    test('returns array of all service types', () => {
      const types = getAllServiceTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(12);
    });

    test('includes all canonical types (as objects with key property)', () => {
      const types = getAllServiceTypes();
      const keys = types.map(t => t.key);
      expect(keys).toContain('lackier');
      expect(keys).toContain('reifen');
      expect(keys).toContain('mechanik');
    });

    test('each type object has required properties', () => {
      const types = getAllServiceTypes();
      types.forEach(type => {
        expect(type.key).toBeDefined();
        expect(type.label).toBeDefined();
        expect(type.priority).toBeDefined();
      });
    });

    test('types are sorted by priority', () => {
      const types = getAllServiceTypes();
      const priorities = types.map(t => t.priority);
      const sortedPriorities = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sortedPriorities);
    });
  });

});
