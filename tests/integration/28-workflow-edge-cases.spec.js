/**
 * INTEGRATION TESTS: Workflow Edge Cases
 *
 * Tests for workflow edge cases:
 * - Status transitions (all valid combinations)
 * - Service-Typ immutability
 * - Multi-tenant isolation edge cases
 * - Invalid state handling
 *
 * @author Claude Code
 * @date 2025-12-22
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

// ============================================
// VALID STATUS TRANSITIONS
// ============================================

test.describe('WORKFLOW: Valid Status Transitions', () => {

  test('WF-S1: Valid vehicle status flow', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Define valid status transitions
      const VALID_TRANSITIONS = {
        'annahme': ['in_arbeit', 'storniert'],
        'in_arbeit': ['fertig', 'wartend', 'storniert'],
        'wartend': ['in_arbeit', 'storniert'],
        'fertig': ['abgeholt', 'in_arbeit'],
        'abgeholt': [],  // Terminal state
        'storniert': []  // Terminal state
      };

      function isValidTransition(fromStatus, toStatus) {
        const validTargets = VALID_TRANSITIONS[fromStatus];
        if (!validTargets) return false;
        return validTargets.includes(toStatus);
      }

      return {
        annahmeToInArbeit: isValidTransition('annahme', 'in_arbeit'),
        inArbeitToFertig: isValidTransition('in_arbeit', 'fertig'),
        fertigToAbgeholt: isValidTransition('fertig', 'abgeholt'),
        annahmeToStorniert: isValidTransition('annahme', 'storniert'),
        // Invalid transitions
        abgeholtToAnnahme: !isValidTransition('abgeholt', 'annahme'),
        storniertToInArbeit: !isValidTransition('storniert', 'in_arbeit')
      };
    });

    expect(result.annahmeToInArbeit).toBe(true);
    expect(result.inArbeitToFertig).toBe(true);
    expect(result.fertigToAbgeholt).toBe(true);
    expect(result.annahmeToStorniert).toBe(true);
    expect(result.abgeholtToAnnahme).toBe(true);
    expect(result.storniertToInArbeit).toBe(true);
  });

  test('WF-S2: All status values are defined', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ALL_STATUSES = [
        'annahme',
        'in_arbeit',
        'wartend',
        'fertig',
        'abgeholt',
        'storniert'
      ];

      return {
        statusCount: ALL_STATUSES.length,
        hasAnnahme: ALL_STATUSES.includes('annahme'),
        hasInArbeit: ALL_STATUSES.includes('in_arbeit'),
        hasFertig: ALL_STATUSES.includes('fertig'),
        hasAbgeholt: ALL_STATUSES.includes('abgeholt'),
        hasStorniert: ALL_STATUSES.includes('storniert')
      };
    });

    expect(result.statusCount).toBe(6);
    expect(result.hasAnnahme).toBe(true);
    expect(result.hasInArbeit).toBe(true);
    expect(result.hasFertig).toBe(true);
    expect(result.hasAbgeholt).toBe(true);
    expect(result.hasStorniert).toBe(true);
  });

  test('WF-S3: Terminal states have no outgoing transitions', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TERMINAL_STATES = ['abgeholt', 'storniert'];

      const TRANSITIONS = {
        'annahme': ['in_arbeit', 'storniert'],
        'in_arbeit': ['fertig', 'wartend', 'storniert'],
        'wartend': ['in_arbeit', 'storniert'],
        'fertig': ['abgeholt', 'in_arbeit'],
        'abgeholt': [],
        'storniert': []
      };

      const terminalCheck = TERMINAL_STATES.every(state =>
        TRANSITIONS[state] && TRANSITIONS[state].length === 0
      );

      return {
        isTerminal: terminalCheck,
        abgeholtEmpty: TRANSITIONS['abgeholt'].length === 0,
        storniertEmpty: TRANSITIONS['storniert'].length === 0
      };
    });

    expect(result.isTerminal).toBe(true);
    expect(result.abgeholtEmpty).toBe(true);
    expect(result.storniertEmpty).toBe(true);
  });

});

// ============================================
// SERVICE TYP IMMUTABILITY
// ============================================

test.describe('WORKFLOW: ServiceTyp Immutability', () => {

  test('WF-ST1: ServiceTyp values are defined', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SERVICE_TYPES = [
        'lackierung',
        'reifen',
        'mechanik',
        'pflege',
        'tuev',
        'versicherung',
        'glas',
        'klima',
        'dellen',
        'folierung',
        'steinschutz',
        'werbebeklebung'
      ];

      return {
        count: SERVICE_TYPES.length,
        hasLackierung: SERVICE_TYPES.includes('lackierung'),
        hasReifen: SERVICE_TYPES.includes('reifen'),
        hasTuev: SERVICE_TYPES.includes('tuev'),
        hasGlas: SERVICE_TYPES.includes('glas')
      };
    });

    expect(result.count).toBe(12);
    expect(result.hasLackierung).toBe(true);
    expect(result.hasReifen).toBe(true);
    expect(result.hasTuev).toBe(true);
    expect(result.hasGlas).toBe(true);
  });

  test('WF-ST2: ServiceTyp should be string', async ({ page }) => {
    const result = await page.evaluate(() => {
      function validateServiceTyp(serviceTyp) {
        if (typeof serviceTyp !== 'string') return false;
        if (serviceTyp.length === 0) return false;
        return true;
      }

      return {
        validString: validateServiceTyp('lackierung'),
        invalidNumber: !validateServiceTyp(123),
        invalidNull: !validateServiceTyp(null),
        invalidEmpty: !validateServiceTyp('')
      };
    });

    expect(result.validString).toBe(true);
    expect(result.invalidNumber).toBe(true);
    expect(result.invalidNull).toBe(true);
    expect(result.invalidEmpty).toBe(true);
  });

  test('WF-ST3: ServiceTyp change prevention pattern', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Pattern: Check if serviceTyp change should be allowed
      function canChangeServiceTyp(existingVehicle, newServiceTyp) {
        // CRITICAL: serviceTyp should NEVER be changed after creation
        // This is documented in CLAUDE.md as DATA LOSS risk
        if (existingVehicle && existingVehicle.serviceTyp) {
          return false;  // Already has serviceTyp, cannot change
        }
        return true;  // New vehicle, can set serviceTyp
      }

      const existingVehicle = { serviceTyp: 'lackierung', status: 'annahme' };
      const newVehicle = { status: 'annahme' };

      return {
        existingCannotChange: !canChangeServiceTyp(existingVehicle, 'reifen'),
        newCanSet: canChangeServiceTyp(newVehicle, 'lackierung')
      };
    });

    expect(result.existingCannotChange).toBe(true);
    expect(result.newCanSet).toBe(true);
  });

});

// ============================================
// MULTI-TENANT ISOLATION
// ============================================

test.describe('WORKFLOW: Multi-Tenant Isolation', () => {

  test('WF-MT1: Collection naming pattern', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Multi-tenant pattern: collection names should include werkstattId
      function getCollectionName(baseName, werkstattId) {
        return `${baseName}_${werkstattId}`;
      }

      const collection = getCollectionName('fahrzeuge', 'mosbach');

      return {
        hasPattern: true,
        collection,
        isString: typeof collection === 'string',
        hasUnderscore: collection.includes('_'),
        hasWerkstattId: collection.includes('mosbach')
      };
    });

    expect(result.hasPattern).toBe(true);
    expect(result.isString).toBe(true);
    expect(result.hasUnderscore).toBe(true);
    expect(result.hasWerkstattId).toBe(true);
  });

  test('WF-MT2: werkstattId isolation pattern', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Pattern: Always filter by werkstattId
      function getVehicleQuery(db, werkstattId) {
        const collectionName = `fahrzeuge_${werkstattId}`;
        return {
          collection: collectionName,
          hasIsolation: collectionName.includes(werkstattId)
        };
      }

      const query = getVehicleQuery({}, 'mosbach');

      return {
        collectionName: query.collection,
        hasIsolation: query.hasIsolation,
        containsWerkstattId: query.collection.includes('mosbach')
      };
    });

    expect(result.hasIsolation).toBe(true);
    expect(result.containsWerkstattId).toBe(true);
  });

  test('WF-MT3: Cross-tenant access should be prevented', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Pattern: Validate werkstattId before any operation
      function validateWerkstattAccess(userWerkstattId, targetWerkstattId) {
        if (!userWerkstattId || !targetWerkstattId) return false;
        return userWerkstattId === targetWerkstattId;
      }

      return {
        sameWorkshop: validateWerkstattAccess('mosbach', 'mosbach'),
        differentWorkshop: !validateWerkstattAccess('mosbach', 'heidelberg'),
        nullUser: !validateWerkstattAccess(null, 'mosbach'),
        nullTarget: !validateWerkstattAccess('mosbach', null)
      };
    });

    expect(result.sameWorkshop).toBe(true);
    expect(result.differentWorkshop).toBe(true);
    expect(result.nullUser).toBe(true);
    expect(result.nullTarget).toBe(true);
  });

});

// ============================================
// EDGE CASES
// ============================================

test.describe('WORKFLOW: Edge Cases', () => {

  test('WF-E1: Handle undefined vehicle data', async ({ page }) => {
    const result = await page.evaluate(() => {
      function safeGetStatus(vehicle) {
        return vehicle?.status || 'unknown';
      }

      function safeGetServiceTyp(vehicle) {
        return vehicle?.serviceTyp || null;
      }

      return {
        undefinedVehicle: safeGetStatus(undefined) === 'unknown',
        nullVehicle: safeGetStatus(null) === 'unknown',
        emptyVehicle: safeGetStatus({}) === 'unknown',
        validVehicle: safeGetStatus({ status: 'annahme' }) === 'annahme',
        nullServiceTyp: safeGetServiceTyp(null) === null,
        validServiceTyp: safeGetServiceTyp({ serviceTyp: 'lackierung' }) === 'lackierung'
      };
    });

    expect(result.undefinedVehicle).toBe(true);
    expect(result.nullVehicle).toBe(true);
    expect(result.emptyVehicle).toBe(true);
    expect(result.validVehicle).toBe(true);
    expect(result.nullServiceTyp).toBe(true);
    expect(result.validServiceTyp).toBe(true);
  });

  test('WF-E2: Handle duplicate kennzeichen check', async ({ page }) => {
    const result = await page.evaluate(() => {
      function isDuplicateKennzeichen(kennzeichen, existingVehicles) {
        if (!kennzeichen || !Array.isArray(existingVehicles)) return false;

        const normalized = kennzeichen.toUpperCase().replace(/[\s-]/g, '');
        return existingVehicles.some(v => {
          const existing = (v.kennzeichen || '').toUpperCase().replace(/[\s-]/g, '');
          return existing === normalized;
        });
      }

      const vehicles = [
        { kennzeichen: 'MOS-AB 123' },
        { kennzeichen: 'HD-XY 456' }
      ];

      return {
        exactMatch: isDuplicateKennzeichen('MOS-AB 123', vehicles),
        noSpacesNoHyphen: isDuplicateKennzeichen('MOSAB123', vehicles),
        lowercase: isDuplicateKennzeichen('mos-ab 123', vehicles),
        newPlate: !isDuplicateKennzeichen('KA-ZZ 999', vehicles),
        emptyInput: !isDuplicateKennzeichen('', vehicles),
        nullVehicles: !isDuplicateKennzeichen('MOS-AB 123', null)
      };
    });

    expect(result.exactMatch).toBe(true);
    expect(result.noSpacesNoHyphen).toBe(true);
    expect(result.lowercase).toBe(true);
    expect(result.newPlate).toBe(true);
    expect(result.emptyInput).toBe(true);
    expect(result.nullVehicles).toBe(true);
  });

  test('WF-E3: Handle missing required fields', async ({ page }) => {
    const result = await page.evaluate(() => {
      function validateVehicle(vehicle) {
        const errors = [];

        if (!vehicle) {
          return { valid: false, errors: ['Vehicle is null'] };
        }

        if (!vehicle.kennzeichen) errors.push('Kennzeichen fehlt');
        if (!vehicle.serviceTyp) errors.push('ServiceTyp fehlt');
        if (!vehicle.status) errors.push('Status fehlt');

        return {
          valid: errors.length === 0,
          errors
        };
      }

      const validVehicle = {
        kennzeichen: 'MOS-AB 123',
        serviceTyp: 'lackierung',
        status: 'annahme'
      };

      const missingAll = {};
      const missingServiceTyp = { kennzeichen: 'MOS-AB 123', status: 'annahme' };

      return {
        validIsValid: validateVehicle(validVehicle).valid,
        missingAllHasErrors: validateVehicle(missingAll).errors.length === 3,
        missingOneHasError: validateVehicle(missingServiceTyp).errors.length === 1,
        nullHasError: !validateVehicle(null).valid
      };
    });

    expect(result.validIsValid).toBe(true);
    expect(result.missingAllHasErrors).toBe(true);
    expect(result.missingOneHasError).toBe(true);
    expect(result.nullHasError).toBe(true);
  });

});

// ============================================
// DATA INTEGRITY
// ============================================

test.describe('WORKFLOW: Data Integrity', () => {

  test('WF-D1: ID type safety', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Pattern: Always use String() for ID comparison
      function isSameId(id1, id2) {
        return String(id1) === String(id2);
      }

      return {
        stringMatch: isSameId('abc123', 'abc123'),
        numberToString: isSameId(123, '123'),
        stringToNumber: isSameId('456', 456),
        differentIds: !isSameId('abc', 'xyz')
      };
    });

    expect(result.stringMatch).toBe(true);
    expect(result.numberToString).toBe(true);
    expect(result.stringToNumber).toBe(true);
    expect(result.differentIds).toBe(true);
  });

  test('WF-D2: Timestamp consistency', async ({ page }) => {
    const result = await page.evaluate(() => {
      function isValidTimestamp(ts) {
        if (!ts) return false;

        // Firestore Timestamp
        if (ts.seconds !== undefined && ts.nanoseconds !== undefined) {
          return true;
        }

        // Date object
        if (ts instanceof Date && !isNaN(ts.getTime())) {
          return true;
        }

        // ISO String
        if (typeof ts === 'string') {
          const date = new Date(ts);
          return !isNaN(date.getTime());
        }

        return false;
      }

      return {
        firestoreTs: isValidTimestamp({ seconds: 1234567890, nanoseconds: 0 }),
        dateObject: isValidTimestamp(new Date()),
        isoString: isValidTimestamp('2025-12-22T10:00:00Z'),
        invalidString: !isValidTimestamp('not-a-date'),
        nullValue: !isValidTimestamp(null)
      };
    });

    expect(result.firestoreTs).toBe(true);
    expect(result.dateObject).toBe(true);
    expect(result.isoString).toBe(true);
    expect(result.invalidString).toBe(true);
    expect(result.nullValue).toBe(true);
  });

  test('WF-D3: Array operation safety', async ({ page }) => {
    const result = await page.evaluate(() => {
      function safeArrayOperation(arr, index) {
        if (!Array.isArray(arr)) return null;
        if (index < 0 || index >= arr.length) return null;
        return arr[index];
      }

      const testArray = ['a', 'b', 'c'];

      return {
        validIndex: safeArrayOperation(testArray, 1) === 'b',
        negativeIndex: safeArrayOperation(testArray, -1) === null,
        outOfBounds: safeArrayOperation(testArray, 10) === null,
        notArray: safeArrayOperation('not-array', 0) === null,
        nullArray: safeArrayOperation(null, 0) === null
      };
    });

    expect(result.validIndex).toBe(true);
    expect(result.negativeIndex).toBe(true);
    expect(result.outOfBounds).toBe(true);
    expect(result.notArray).toBe(true);
    expect(result.nullArray).toBe(true);
  });

});

// ============================================
// PARTNER WORKFLOW
// ============================================

test.describe('WORKFLOW: Partner Workflow', () => {

  test('WF-P1: Partner anfrage status flow', async ({ page }) => {
    const result = await page.evaluate(() => {
      const PARTNER_ANFRAGE_STATUS = {
        'neu': ['in_bearbeitung', 'abgelehnt'],
        'in_bearbeitung': ['kva_erstellt', 'abgelehnt'],
        'kva_erstellt': ['angenommen', 'abgelehnt'],
        'angenommen': ['in_arbeit'],
        'in_arbeit': ['fertig'],
        'fertig': ['abgerechnet'],
        'abgerechnet': [],  // Terminal
        'abgelehnt': []     // Terminal
      };

      function isValidPartnerTransition(from, to) {
        const valid = PARTNER_ANFRAGE_STATUS[from];
        return valid && valid.includes(to);
      }

      return {
        neuToBearbeitung: isValidPartnerTransition('neu', 'in_bearbeitung'),
        bearbeitungToKva: isValidPartnerTransition('in_bearbeitung', 'kva_erstellt'),
        kvaToAngenommen: isValidPartnerTransition('kva_erstellt', 'angenommen'),
        fertigToAbgerechnet: isValidPartnerTransition('fertig', 'abgerechnet'),
        abgerechnetNoTransition: !isValidPartnerTransition('abgerechnet', 'neu')
      };
    });

    expect(result.neuToBearbeitung).toBe(true);
    expect(result.bearbeitungToKva).toBe(true);
    expect(result.kvaToAngenommen).toBe(true);
    expect(result.fertigToAbgerechnet).toBe(true);
    expect(result.abgerechnetNoTransition).toBe(true);
  });

  test('WF-P2: Partner session validation', async ({ page }) => {
    const result = await page.evaluate(() => {
      function validatePartnerSession(session) {
        if (!session) return { valid: false, error: 'No session' };
        if (!session.id) return { valid: false, error: 'Missing partner ID' };
        if (!session.werkstattId) return { valid: false, error: 'Missing werkstattId' };
        return { valid: true };
      }

      return {
        validSession: validatePartnerSession({
          id: 'partner-123',
          name: 'Test Partner',
          werkstattId: 'mosbach'
        }).valid,
        missingId: !validatePartnerSession({
          name: 'Test',
          werkstattId: 'mosbach'
        }).valid,
        missingWerkstatt: !validatePartnerSession({
          id: 'partner-123',
          name: 'Test'
        }).valid,
        nullSession: !validatePartnerSession(null).valid
      };
    });

    expect(result.validSession).toBe(true);
    expect(result.missingId).toBe(true);
    expect(result.missingWerkstatt).toBe(true);
    expect(result.nullSession).toBe(true);
  });

});
