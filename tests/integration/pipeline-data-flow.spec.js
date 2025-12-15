/**
 * Integration Tests: Pipeline Data Flow Validation
 *
 * Tests data mapping and consistency between:
 * - partnerAnfragen → fahrzeuge
 * - Status transitions
 * - Multi-tenant isolation
 * - Service type immutability
 *
 * @created 2025-12-13
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createPartnerAnfrageDirectly,
  getPartnerAnfrageById,
  deletePartnerAnfrageById,
  addKVAToPartnerAnfrage,
  simulateAnnehmenKVA,
  verifyFahrzeugVerknuepfung,
  createVehicleDirectly,
  getVehicleData,
  updateVehicleStatus,
  deleteVehicle
} = require('../helpers/firebase-helper');

// Test data constants
const INT_KENNZEICHEN = 'INT-FLOW-001';
const INT_KUNDE = 'Integration Flow Test Kunde';

test.describe('Integration: Pipeline Data Flow', () => {
  let createdAnfrageId = null;
  let createdFahrzeugId = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    try {
      if (createdFahrzeugId || createdAnfrageId) {
        await deleteVehicle(page, INT_KENNZEICHEN);
      }
    } catch (e) { /* ignore */ }

    try {
      if (createdAnfrageId) {
        await deletePartnerAnfrageById(page, createdAnfrageId);
      }
    } catch (e) { /* ignore */ }

    createdAnfrageId = null;
    createdFahrzeugId = null;
  });

  test('INT-DF1: partnerAnfrage → fahrzeuge mapping is correct', async ({ page }) => {
    // Create anfrage with all fields
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: INT_KENNZEICHEN,
      kundenname: INT_KUNDE,
      kundenEmail: 'mapping@test.de',
      serviceTyp: 'mechanik',
      marke: 'Toyota',
      modell: 'Corolla',
      schadenBeschreibung: 'Motor check'
    });

    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    // Verify all fields are mapped
    const fahrzeugData = await getVehicleData(page, INT_KENNZEICHEN);

    expect(fahrzeugData.kennzeichen).toBe(INT_KENNZEICHEN);
    expect(fahrzeugData.kundenname).toBe(INT_KUNDE);
    expect(fahrzeugData.kundenEmail).toBe('mapping@test.de');
    expect(fahrzeugData.serviceTyp).toBe('mechanik');
    expect(fahrzeugData.marke).toBe('Toyota');
    expect(fahrzeugData.modell).toBe('Corolla');
    expect(fahrzeugData.partnerAnfrageId).toBe(createdAnfrageId);

    console.log('✅ INT-DF1: All fields correctly mapped from anfrage to fahrzeug');
  });

  test('INT-DF2: fahrzeugId is correctly set on annehmenKVA', async ({ page }) => {
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: INT_KENNZEICHEN,
      kundenname: INT_KUNDE,
      serviceTyp: 'lackier'
    });

    // Before annehmenKVA
    let anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.fahrzeugId).toBeFalsy();

    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    // After annehmenKVA
    anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.fahrzeugId).toBe(createdFahrzeugId);
    expect(anfrageData.fahrzeugId).toMatch(/^fzg_\d+$/);

    console.log('✅ INT-DF2: fahrzeugId correctly set after annehmenKVA');
  });

  test('INT-DF3: serviceTyp remains String (not Array)', async ({ page }) => {
    // Create with String serviceTyp
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: INT_KENNZEICHEN,
      kundenname: INT_KUNDE,
      serviceTyp: 'pflege'  // String, not Array!
    });

    const anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(typeof anfrageData.serviceTyp).toBe('string');
    expect(anfrageData.serviceTyp).toBe('pflege');

    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    const fahrzeugData = await getVehicleData(page, INT_KENNZEICHEN);
    expect(typeof fahrzeugData.serviceTyp).toBe('string');
    expect(fahrzeugData.serviceTyp).toBe('pflege');

    console.log('✅ INT-DF3: serviceTyp remains String throughout pipeline');
  });

  test('INT-DF4: Status transitions are correct', async ({ page }) => {
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: INT_KENNZEICHEN,
      kundenname: INT_KUNDE,
      serviceTyp: 'lackier'
    });

    // Status: neu
    let anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('neu');

    // Status: kva_gesendet
    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('kva_gesendet');

    // Status: angenommen + fahrzeug status: beauftragt
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);
    anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('angenommen');

    const fahrzeugData = await getVehicleData(page, INT_KENNZEICHEN);
    expect(fahrzeugData.status).toBe('beauftragt');

    console.log('✅ INT-DF4: Status transitions are correct');
  });

  test('INT-DF5: Multi-tenant isolation - werkstattId is set', async ({ page }) => {
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: INT_KENNZEICHEN,
      kundenname: INT_KUNDE,
      serviceTyp: 'lackier'
    });

    const anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.werkstattId).toBe('mosbach');

    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    const fahrzeugData = await getVehicleData(page, INT_KENNZEICHEN);
    expect(fahrzeugData.werkstattId).toBe('mosbach');

    console.log('✅ INT-DF5: Multi-tenant werkstattId correctly set');
  });

});
