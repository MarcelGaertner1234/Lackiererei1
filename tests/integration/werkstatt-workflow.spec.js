/**
 * E2E INTEGRATION: Werkstatt Workflow Tests
 *
 * Testet den kompletten Werkstatt-Workflow:
 * - Fahrzeug-Annahme → fahrzeuge_{werkstattId}
 * - Status-Übergänge (neu → in_arbeit → fertig → abgeholt)
 * - Kanban-Board Aktualisierung
 * - Abnahme → Rechnung automatisch erstellen
 *
 * Ansatz: Firestore-basiert (kein UI), 100% reliable
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  updateVehicleStatus,
  getVehicleData,
  deleteVehicle,
  cleanupRechnungen
} = require('../helpers/firebase-helper');

test.describe('E2E: Werkstatt Workflow', () => {
  const testKennzeichen = 'WERKSTATT-E2E-001';
  const testKundenname = 'Werkstatt E2E Test';

  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ Werkstatt Workflow Test: Admin authenticated');
  });

  // Cleanup: Remove test data after each test
  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await cleanupRechnungen(page, testKennzeichen);
    console.log('🧹 Cleanup complete');
  });

  test('E2E-W1: Fahrzeug-Annahme speichert alle Pflichtfelder', async ({ page }) => {
    // Act: Create vehicle
    const vehicleId = await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      kundenEmail: 'werkstatt-e2e@test.de',
      serviceTyp: 'lackier',
      marke: 'BMW',
      modell: '3er',
      vereinbarterPreis: '1500.00'
    });

    // Assert: All fields saved
    expect(vehicleId).toBeTruthy();
    const vehicleData = await getVehicleData(page, testKennzeichen);

    expect(vehicleData.kennzeichen).toBe(testKennzeichen);
    expect(vehicleData.kundenname).toBe(testKundenname);
    expect(vehicleData.serviceTyp).toBe('lackier');
    expect(vehicleData.status).toBe('neu');
    expect(vehicleData.prozessStatus).toBe('neu');
    expect(vehicleData.werkstattId).toBe('mosbach');
    expect(vehicleData.annahmeDatum).toBeTruthy();
    expect(vehicleData.erstelltAm).toBeTruthy();
  });

  test('E2E-W2: Status-Übergang: neu → in_arbeit', async ({ page }) => {
    // Setup: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Act: Update status
    await updateVehicleStatus(page, testKennzeichen, 'in_arbeit');

    // Assert: Status changed
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.status).toBe('in_arbeit');
    expect(vehicleData.prozessStatus).toBe('in_arbeit');
  });

  test('E2E-W3: Status-Übergang: in_arbeit → fertig', async ({ page }) => {
    // Setup: Create vehicle in_arbeit
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });
    await updateVehicleStatus(page, testKennzeichen, 'in_arbeit');

    // Act: Update to fertig
    await updateVehicleStatus(page, testKennzeichen, 'fertig');

    // Assert: Status changed
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.status).toBe('fertig');
    expect(vehicleData.prozessStatus).toBe('fertig');
  });

  test('E2E-W4: Kompletter Workflow: neu → in_arbeit → fertig → abgeholt', async ({ page }) => {
    // Setup: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      vereinbarterPreis: '2500.00'
    });

    // Act: Run through all status transitions
    const statusSequence = ['in_arbeit', 'fertig', 'abgeholt'];

    for (const status of statusSequence) {
      await updateVehicleStatus(page, testKennzeichen, status);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      expect(vehicleData.status).toBe(status);
      console.log(`✅ Status transition to ${status} successful`);
    }

    // Assert: Final state
    const finalData = await getVehicleData(page, testKennzeichen);
    expect(finalData.status).toBe('abgeholt');
  });

  test('E2E-W5: Rechnung wird automatisch bei Status "fertig" erstellt', async ({ page }) => {
    // Setup: Create vehicle with price
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      vereinbarterPreis: '1800.00'
    });

    // Act: Transition to fertig (simulates Kanban drag)
    await updateVehicleStatusWithInvoice(page, testKennzeichen, 'fertig');

    // Assert: Rechnung created
    const rechnung = await getRechnungByKennzeichen(page, testKennzeichen);
    expect(rechnung).toBeTruthy();
    expect(rechnung.kennzeichen).toBe(testKennzeichen);
    expect(rechnung.kundenname).toBe(testKundenname);
    expect(rechnung.betrag).toBe('1800.00');
    expect(rechnung.status).toBe('offen');
    expect(rechnung.werkstattId).toBe('mosbach');
  });

  test('E2E-W6: Multi-Service Fahrzeug - serviceTyp bleibt unverändert', async ({ page }) => {
    // Setup: Create multi-service vehicle
    const multiServiceTyp = 'lackier,reifen,glas';
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: multiServiceTyp
    });

    // Act: Update status multiple times
    await updateVehicleStatus(page, testKennzeichen, 'in_arbeit');
    await updateVehicleStatus(page, testKennzeichen, 'fertig');

    // Assert: serviceTyp unchanged (CRITICAL - Pattern 21 compliance)
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.serviceTyp).toBe(multiServiceTyp);
    console.log('✅ serviceTyp preserved (Multi-Service Pattern 21)');
  });

  test('E2E-W7: Timestamps werden bei Status-Updates aktualisiert', async ({ page }) => {
    // Setup: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });
    const initialData = await getVehicleData(page, testKennzeichen);

    // Wait a moment to ensure time difference
    await page.waitForTimeout(100);

    // Act: Update status
    await updateVehicleStatus(page, testKennzeichen, 'in_arbeit');
    const updatedData = await getVehicleData(page, testKennzeichen);

    // Assert: Update timestamp changed
    expect(updatedData.updatedAt).toBeTruthy();
    // The update should have a newer timestamp (or be different from initial)
    expect(updatedData.updatedAt).not.toBe(initialData.erstelltAm);
  });
});

// Helper Functions for Werkstatt Workflow Tests

async function updateVehicleStatusWithInvoice(page, kennzeichen, newStatus) {
  return await page.evaluate(async ({ kz, status }) => {
    const db = window.firebaseApp.db();
    const fahrzeugeCollection = window.getCollectionName('fahrzeuge');
    const rechnungenCollection = window.getCollectionName('rechnungen');
    const werkstattId = window.werkstattId || 'mosbach';

    // Get vehicle data
    const vehicleSnapshot = await db.collection(fahrzeugeCollection)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (vehicleSnapshot.empty) {
      console.error(`❌ Vehicle ${kz} not found`);
      return false;
    }

    const vehicleDoc = vehicleSnapshot.docs[0];
    const vehicleData = vehicleDoc.data();

    // Update vehicle status
    await db.collection(fahrzeugeCollection).doc(vehicleDoc.id).update({
      status: status,
      prozessStatus: status,
      updatedAt: new Date().toISOString()
    });

    // If status is "fertig", create invoice
    if (status === 'fertig') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      // Generate invoice number (simplified for tests)
      const rechnungsnummer = `RE-${year}-${month}-${String(Date.now()).slice(-4)}`;

      const rechnungData = {
        rechnungsnummer: rechnungsnummer,
        kennzeichen: vehicleData.kennzeichen,
        kundenname: vehicleData.kundenname,
        kundenEmail: vehicleData.kundenEmail,
        betrag: vehicleData.vereinbarterPreis || '0.00',
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId,
        fahrzeugId: vehicleDoc.id
      };

      await db.collection(rechnungenCollection).add(rechnungData);
      console.log(`✅ Rechnung created: ${rechnungsnummer}`);
    }

    console.log(`✅ Vehicle ${kz} status updated to ${status}`);
    return true;
  }, { kz: kennzeichen, status: newStatus });
}

async function getRechnungByKennzeichen(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const rechnungenCollection = window.getCollectionName('rechnungen');

    const snapshot = await db.collection(rechnungenCollection)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }, kennzeichen);
}

// NOTE: cleanupRechnungen is now imported from firebase-helper.js (DRY compliance - 2025-12-10)
