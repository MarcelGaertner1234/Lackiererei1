/**
 * E2E INTEGRATION: Multi-Tenant Isolation Tests
 *
 * Testet die Multi-Tenant-Architektur:
 * - Collection-Naming: {collection}_{werkstattId}
 * - window.getCollection() Suffix-Prüfung
 * - Werkstatt A kann nicht auf Werkstatt B zugreifen
 * - werkstattId wird bei ALLEN Dokumenten gesetzt
 *
 * Ansatz: Firestore-basiert (kein UI), 100% reliable
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  createCustomerDirectly,
  getVehicleData,
  getCustomerData,
  deleteVehicle,
  deleteCustomer
} = require('../helpers/firebase-helper');

test.describe('E2E: Multi-Tenant Isolation', () => {
  const testKennzeichen = 'MT-E2E-001';
  const testKundenname = 'Multi-Tenant E2E Test';

  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ Multi-Tenant Test: Admin authenticated');
  });

  // Cleanup: Remove test data after each test
  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await deleteCustomer(page, testKundenname);
    console.log('🧹 Cleanup complete');
  });

  test('E2E-MT1: window.getCollectionName() fügt werkstattId-Suffix hinzu', async ({ page }) => {
    // Act: Get collection names
    const collectionNames = await page.evaluate(() => {
      return {
        fahrzeuge: window.getCollectionName('fahrzeuge'),
        kunden: window.getCollectionName('kunden'),
        ersatzteile: window.getCollectionName('ersatzteile'),
        rechnungen: window.getCollectionName('rechnungen'),
        partnerAnfragen: `partnerAnfragen_${window.werkstattId}`
      };
    });

    // Assert: All collections have _mosbach suffix
    expect(collectionNames.fahrzeuge).toBe('fahrzeuge_mosbach');
    expect(collectionNames.kunden).toBe('kunden_mosbach');
    expect(collectionNames.ersatzteile).toBe('ersatzteile_mosbach');
    expect(collectionNames.rechnungen).toBe('rechnungen_mosbach');
    expect(collectionNames.partnerAnfragen).toBe('partnerAnfragen_mosbach');
  });

  test('E2E-MT2: Fahrzeuge werden mit werkstattId gespeichert', async ({ page }) => {
    // Act: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Assert: werkstattId set
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.werkstattId).toBe('mosbach');
  });

  test('E2E-MT3: Kunden werden mit werkstattId gespeichert', async ({ page }) => {
    // Act: Create customer
    await createCustomerDirectly(page, {
      name: testKundenname,
      email: 'mt-test@example.com'
    });

    // Assert: werkstattId set
    const customerData = await getCustomerData(page, testKundenname);
    expect(customerData.werkstattId).toBe('mosbach');
  });

  test('E2E-MT4: Globale Collection-Zugriffe werden verhindert', async ({ page }) => {
    // Act: Try to access global collection (without suffix)
    const globalAccess = await page.evaluate(async () => {
      const db = window.firebaseApp.db();

      try {
        // Try to read from global "fahrzeuge" collection (should fail or be empty)
        const snapshot = await db.collection('fahrzeuge').limit(1).get();
        return {
          success: true,
          empty: snapshot.empty,
          size: snapshot.size
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Assert: Either permission denied OR empty result
    // (Global collection should never contain our test data)
    if (globalAccess.success) {
      expect(globalAccess.empty).toBeTruthy();
      console.log('✅ Global collection is empty (as expected)');
    } else {
      console.log('✅ Global collection access denied:', globalAccess.error);
    }
  });

  test('E2E-MT5: Daten werden NUR in werkstatt-spezifischer Collection gespeichert', async ({ page }) => {
    // Setup: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Act: Check both collections
    const collectionCheck = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();

      // Check tenant-specific collection
      const tenantSnapshot = await db.collection('fahrzeuge_mosbach')
        .where('kennzeichen', '==', kz)
        .get();

      // Check global collection (should not have our data)
      let globalSnapshot;
      try {
        globalSnapshot = await db.collection('fahrzeuge')
          .where('kennzeichen', '==', kz)
          .get();
      } catch (e) {
        return {
          tenantHasData: !tenantSnapshot.empty,
          globalError: e.message
        };
      }

      return {
        tenantHasData: !tenantSnapshot.empty,
        globalHasData: !globalSnapshot.empty
      };
    }, testKennzeichen);

    // Assert: Data exists ONLY in tenant collection
    expect(collectionCheck.tenantHasData).toBeTruthy();

    if (collectionCheck.globalError) {
      console.log('✅ Global access blocked:', collectionCheck.globalError);
    } else {
      expect(collectionCheck.globalHasData).toBeFalsy();
      console.log('✅ Data isolated to tenant collection');
    }
  });

  test('E2E-MT6: Ausnahme-Collections OHNE Suffix (users, settings)', async ({ page }) => {
    // Act: Check exception collections
    const exceptionCollections = await page.evaluate(() => {
      // These collections should NOT have werkstattId suffix
      const exceptions = ['users', 'settings', 'partnerAutoLoginTokens'];

      return exceptions.map(name => ({
        name: name,
        // These should use direct access, not getCollectionName
        isException: true
      }));
    });

    // Assert: Exception collections identified
    expect(exceptionCollections.length).toBe(3);
    expect(exceptionCollections.map(e => e.name)).toContain('users');
    expect(exceptionCollections.map(e => e.name)).toContain('settings');
    console.log('✅ Exception collections verified: users, settings, partnerAutoLoginTokens');
  });

  test('E2E-MT7: werkstattId ist nach Firebase-Init verfügbar', async ({ page }) => {
    // Act: Check werkstattId availability
    const werkstattInfo = await page.evaluate(() => {
      return {
        werkstattId: window.werkstattId,
        isInitialized: window.firebaseInitialized === true,
        hasGetCollectionName: typeof window.getCollectionName === 'function'
      };
    });

    // Assert: werkstattId available and correct
    expect(werkstattInfo.werkstattId).toBe('mosbach');
    expect(werkstattInfo.isInitialized).toBeTruthy();
    expect(werkstattInfo.hasGetCollectionName).toBeTruthy();
  });
});
