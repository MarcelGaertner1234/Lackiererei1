/**
 * E2E Tests: Partner Pipeline
 *
 * Tests the complete partner flow:
 * Partner Anfrage → KVA → annehmenKVA → Fahrzeug → Kanban
 *
 * Uses HYBRID approach:
 * - Integration tests for data operations (fast, reliable)
 * - Verifies bidirectional links between collections
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
  getVehicleData,
  deleteVehicle,
  updateVehicleStatus
} = require('../helpers/firebase-helper');

// Test data constants
const E2E_PARTNER_KENNZEICHEN = 'E2E-PART-001';
const E2E_PARTNER_KUNDE = 'E2E Partner Test Kunde';

test.describe('E2E: Partner Pipeline', () => {
  let createdAnfrageId = null;
  let createdFahrzeugId = null;

  test.beforeEach(async ({ page }) => {
    // Setup: Navigate and authenticate
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test anfrage and fahrzeug
    try {
      if (createdFahrzeugId) {
        await deleteVehicle(page, E2E_PARTNER_KENNZEICHEN);
        console.log(`🧹 Cleanup: Deleted fahrzeug ${E2E_PARTNER_KENNZEICHEN}`);
      }
    } catch (e) {
      console.log(`🧹 Cleanup: Fahrzeug not found`);
    }

    try {
      if (createdAnfrageId) {
        await deletePartnerAnfrageById(page, createdAnfrageId);
        console.log(`🧹 Cleanup: Deleted anfrage ${createdAnfrageId}`);
      }
    } catch (e) {
      console.log(`🧹 Cleanup: Anfrage not found`);
    }

    // Reset for next test
    createdAnfrageId = null;
    createdFahrzeugId = null;
  });

  test('E2E-P1: Complete Partner flow - Anfrage to Fahrzeug creation', async ({ page }) => {
    // Step 1: Create Partner-Anfrage
    console.log('📝 Step 1: Creating Partner-Anfrage...');
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: E2E_PARTNER_KUNDE,
      kundenEmail: 'e2e-partner@test.de',
      serviceTyp: 'lackier',
      marke: 'Audi',
      modell: 'A4',
      schadenBeschreibung: 'Kratzer an der Stoßstange'
    });

    expect(createdAnfrageId).toBeTruthy();
    console.log(`✅ Anfrage created with ID: ${createdAnfrageId}`);

    // Step 2: Verify Anfrage in Firestore
    console.log('🔍 Step 2: Verifying Anfrage...');
    const anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);

    expect(anfrageData).toBeTruthy();
    expect(anfrageData.kennzeichen).toBe(E2E_PARTNER_KENNZEICHEN);
    expect(anfrageData.status).toBe('neu');
    expect(anfrageData.fahrzeugId).toBeFalsy(); // Not yet linked
    console.log('✅ Anfrage verified - status: neu, no fahrzeugId yet');

    // Step 3: Add KVA to Anfrage
    console.log('📋 Step 3: Adding KVA...');
    await addKVAToPartnerAnfrage(page, createdAnfrageId, {
      positionen: [
        { beschreibung: 'Lackierung Stoßstange', menge: 1, einzelpreis: 450, gesamt: 450 },
        { beschreibung: 'Material', menge: 1, einzelpreis: 100, gesamt: 100 }
      ],
      summeNetto: 550,
      mwst: 104.50,
      summeBrutto: 654.50
    });

    const anfrageWithKva = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageWithKva.status).toBe('kva_gesendet');
    expect(anfrageWithKva.kva).toBeTruthy();
    expect(anfrageWithKva.kva.summeBrutto).toBe(654.50);
    console.log('✅ KVA added - status: kva_gesendet');

    // Step 4: Simulate annehmenKVA (Partner accepts)
    console.log('✅ Step 4: Simulating annehmenKVA...');
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    expect(createdFahrzeugId).toBeTruthy();
    expect(createdFahrzeugId).toMatch(/^fzg_\d+$/); // Format: fzg_timestamp
    console.log(`✅ annehmenKVA completed - fahrzeugId: ${createdFahrzeugId}`);

    // Step 5: Verify bidirectional link
    console.log('🔍 Step 5: Verifying bidirectional link...');
    const verificationResult = await verifyFahrzeugVerknuepfung(page, createdAnfrageId);

    expect(verificationResult.found).toBe(true);
    expect(verificationResult.anfrageStatus).toBe('angenommen');
    expect(verificationResult.anfrageHasFahrzeugId).toBe(true);
    expect(verificationResult.fahrzeugExists).toBe(true);
    expect(verificationResult.fahrzeugHasPartnerAnfrageId).toBe(true);
    expect(verificationResult.bidirectionalLinkValid).toBe(true);
    console.log('✅ Bidirectional link verified');

    // Step 6: Verify Fahrzeug data
    console.log('🔍 Step 6: Verifying Fahrzeug data...');
    const fahrzeugData = await getVehicleData(page, E2E_PARTNER_KENNZEICHEN);

    expect(fahrzeugData).toBeTruthy();
    expect(fahrzeugData.kennzeichen).toBe(E2E_PARTNER_KENNZEICHEN);
    expect(fahrzeugData.kundenname).toBe(E2E_PARTNER_KUNDE);
    expect(fahrzeugData.serviceTyp).toBe('lackier');
    expect(fahrzeugData.status).toBe('beauftragt');
    expect(fahrzeugData.partnerAnfrageId).toBe(createdAnfrageId);
    console.log('✅ Fahrzeug data verified');

    console.log('🎉 E2E-P1: Complete Partner flow PASSED');
  });

  test('E2E-P2: Anfrage status transitions', async ({ page }) => {
    // Create anfrage
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: E2E_PARTNER_KUNDE,
      serviceTyp: 'lackier'
    });

    // Verify initial status
    let anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('neu');
    console.log('✅ Initial status: neu');

    // Add KVA → status should be kva_gesendet
    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('kva_gesendet');
    console.log('✅ After KVA: kva_gesendet');

    // Simulate annehmenKVA → status should be angenommen
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);
    anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.status).toBe('angenommen');
    console.log('✅ After annehmenKVA: angenommen');

    console.log('🎉 E2E-P2: Status transitions PASSED');
  });

  test('E2E-P3: fahrzeugId is null before annehmenKVA', async ({ page }) => {
    // Create anfrage
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: E2E_PARTNER_KUNDE,
      serviceTyp: 'lackier'
    });

    // Verify fahrzeugId is null/undefined initially
    const anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.fahrzeugId).toBeFalsy();
    console.log('✅ fahrzeugId is correctly null before annehmenKVA');

    // Add KVA - should still be null
    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    const anfrageWithKva = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageWithKva.fahrzeugId).toBeFalsy();
    console.log('✅ fahrzeugId still null after KVA creation');
  });

  test('E2E-P4: fahrzeugId is set after annehmenKVA', async ({ page }) => {
    // Create anfrage with KVA
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: E2E_PARTNER_KUNDE,
      serviceTyp: 'lackier'
    });
    await addKVAToPartnerAnfrage(page, createdAnfrageId);

    // Simulate annehmenKVA
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    // Verify fahrzeugId is set
    const anfrageData = await getPartnerAnfrageById(page, createdAnfrageId);
    expect(anfrageData.fahrzeugId).toBe(createdFahrzeugId);
    expect(anfrageData.fahrzeugAngelegt).toBe(true);
    console.log('✅ fahrzeugId correctly set after annehmenKVA');
  });

  test('E2E-P5: Fahrzeug inherits data from Anfrage', async ({ page }) => {
    // Create anfrage with specific data
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: 'Specific Customer Name',
      kundenEmail: 'specific@email.de',
      serviceTyp: 'reifen',
      marke: 'Mercedes',
      modell: 'C-Klasse'
    });
    await addKVAToPartnerAnfrage(page, createdAnfrageId);

    // Simulate annehmenKVA
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    // Verify fahrzeug inherited data
    const fahrzeugData = await getVehicleData(page, E2E_PARTNER_KENNZEICHEN);

    expect(fahrzeugData.kundenname).toBe('Specific Customer Name');
    expect(fahrzeugData.kundenEmail).toBe('specific@email.de');
    expect(fahrzeugData.serviceTyp).toBe('reifen');
    expect(fahrzeugData.marke).toBe('Mercedes');
    expect(fahrzeugData.modell).toBe('C-Klasse');
    console.log('✅ Fahrzeug correctly inherited data from Anfrage');
  });

  test('E2E-P6: Created Fahrzeug can go through Kanban status flow', async ({ page }) => {
    // Create anfrage and fahrzeug
    createdAnfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: E2E_PARTNER_KENNZEICHEN,
      kundenname: E2E_PARTNER_KUNDE,
      serviceTyp: 'lackier'
    });
    await addKVAToPartnerAnfrage(page, createdAnfrageId);
    createdFahrzeugId = await simulateAnnehmenKVA(page, createdAnfrageId);

    // Verify initial status is beauftragt
    let fahrzeugData = await getVehicleData(page, E2E_PARTNER_KENNZEICHEN);
    expect(fahrzeugData.status).toBe('beauftragt');
    console.log('✅ Initial fahrzeug status: beauftragt');

    // Transition through Kanban statuses
    const statusSequence = ['in_arbeit', 'fertig', 'abgeholt'];

    for (const status of statusSequence) {
      await updateVehicleStatus(page, E2E_PARTNER_KENNZEICHEN, status);
      fahrzeugData = await getVehicleData(page, E2E_PARTNER_KENNZEICHEN);
      expect(fahrzeugData.status).toBe(status);
      console.log(`✅ Status transitioned to: ${status}`);
    }

    console.log('🎉 E2E-P6: Kanban flow from Partner-created Fahrzeug PASSED');
  });

});
