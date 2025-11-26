/**
 * INTEGRATION TESTS: Leihfahrzeug Business Logic
 *
 * Tests the Leihfahrzeug (rental vehicle) management system:
 * - CRUD Operations (Create, Read, Update, Delete)
 * - Multi-Tenant Isolation
 * - Pool Sharing (Cross-Werkstatt)
 * - Anfragen Workflow (Request/Approve/Reject)
 *
 * Created: 2025-11-26
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createLeihfahrzeugDirectly,
  getLeihfahrzeugData,
  deleteLeihfahrzeug,
  updateLeihfahrzeugStatus,
  createPoolEntry,
  createLeihfahrzeugAnfrage,
  createLeihfahrzeugBuchung
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Leihfahrzeug Business Logic', () => {
  // Test data
  const testKennzeichen = 'LF-TEST-001';
  const testKennzeichen2 = 'LF-TEST-002';
  const testMarke = 'BMW';
  const testModell = '3er Touring';

  // Setup before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // Cleanup after each test
  test.afterEach(async ({ page }) => {
    // Clean up all test vehicles
    await deleteLeihfahrzeug(page, testKennzeichen);
    await deleteLeihfahrzeug(page, testKennzeichen2);
  });

  // ============================================
  // GRUPPE A: CRUD Operations (6 Tests)
  // ============================================

  test('LF-1.1: Create Leihfahrzeug - Document created in Firestore', async ({ page }) => {
    // Act: Create a Leihfahrzeug directly in Firestore
    const docId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell,
      tagesmiete: 55.00,
      kaution: 600.00
    });

    // Assert: Document was created
    expect(docId).toBeTruthy();

    // Assert: Data is correct
    const data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data).toBeTruthy();
    expect(data.kennzeichen).toBe(testKennzeichen);
    expect(data.marke).toBe(testMarke);
    expect(data.modell).toBe(testModell);
    expect(data.tagesmiete).toBe(55.00);
    expect(data.kaution).toBe(600.00);
    expect(data.status).toBe('verfuegbar');
  });

  test('LF-1.2: Read Leihfahrzeug - Query by kennzeichen returns correct data', async ({ page }) => {
    // Arrange: Create test vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: 'Mercedes',
      modell: 'C-Klasse',
      kategorie: 'limousine',
      baujahr: 2023,
      tagesmiete: 75.00
    });

    // Act: Read the vehicle
    const data = await getLeihfahrzeugData(page, testKennzeichen);

    // Assert: All fields correct
    expect(data).toBeTruthy();
    expect(data.kennzeichen).toBe(testKennzeichen);
    expect(data.marke).toBe('Mercedes');
    expect(data.modell).toBe('C-Klasse');
    expect(data.kategorie).toBe('limousine');
    expect(data.baujahr).toBe(2023);
    expect(data.tagesmiete).toBe(75.00);
  });

  test('LF-1.3: Update Leihfahrzeug - Status change persists', async ({ page }) => {
    // Arrange: Create test vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Update status to 'verliehen'
    const success = await updateLeihfahrzeugStatus(page, testKennzeichen, 'verliehen');

    // Assert: Update succeeded
    expect(success).toBeTruthy();

    // Assert: Status changed
    const data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data.status).toBe('verliehen');
  });

  test('LF-1.4: Delete Leihfahrzeug - Document removed from collection', async ({ page }) => {
    // Arrange: Create test vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Verify it exists
    const before = await getLeihfahrzeugData(page, testKennzeichen);
    expect(before).toBeTruthy();

    // Act: Delete the vehicle
    await deleteLeihfahrzeug(page, testKennzeichen);

    // Assert: Document no longer exists
    const after = await getLeihfahrzeugData(page, testKennzeichen);
    expect(after).toBeNull();
  });

  test('LF-1.5: Status Transitions - verfuegbar → verliehen → verfuegbar', async ({ page }) => {
    // Arrange: Create test vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell,
      status: 'verfuegbar'
    });

    // Act & Assert: verfuegbar → verliehen
    await updateLeihfahrzeugStatus(page, testKennzeichen, 'verliehen');
    let data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data.status).toBe('verliehen');

    // Act & Assert: verliehen → verfuegbar
    await updateLeihfahrzeugStatus(page, testKennzeichen, 'verfuegbar');
    data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data.status).toBe('verfuegbar');
  });

  test('LF-1.6: Status wartung - Vehicle can be set to maintenance', async ({ page }) => {
    // Arrange: Create test vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Set to wartung
    await updateLeihfahrzeugStatus(page, testKennzeichen, 'wartung');

    // Assert
    const data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data.status).toBe('wartung');
  });

  // ============================================
  // GRUPPE B: Multi-Tenant Isolation (4 Tests)
  // ============================================

  test('LF-2.1: Collection Naming - getCollectionName adds werkstattId suffix', async ({ page }) => {
    // Act: Check collection name
    const collectionName = await page.evaluate(() => {
      return window.getCollectionName('leihfahrzeuge');
    });

    // Assert: Has werkstattId suffix
    expect(collectionName).toBe('leihfahrzeuge_mosbach');
  });

  test('LF-2.2: werkstattId Field - Created vehicle has correct werkstattId', async ({ page }) => {
    // Arrange & Act: Create vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Assert: werkstattId is set correctly
    const data = await getLeihfahrzeugData(page, testKennzeichen);
    expect(data.werkstattId).toBe('mosbach');
  });

  test('LF-2.3: Multi-Tenant - Vehicle stored in tenant-specific collection', async ({ page }) => {
    // Arrange: Create vehicle
    await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Query both tenant and global collection
    const result = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();

      // Check tenant-specific collection
      const tenantSnapshot = await db.collection('leihfahrzeuge_mosbach')
        .where('kennzeichen', '==', kz)
        .get();

      // Try to check global collection (should be empty or throw)
      let globalCount = 0;
      try {
        const globalSnapshot = await db.collection('leihfahrzeuge')
          .where('kennzeichen', '==', kz)
          .get();
        globalCount = globalSnapshot.size;
      } catch (e) {
        globalCount = 0;  // Permission denied = no access
      }

      return {
        tenantCount: tenantSnapshot.size,
        globalCount: globalCount
      };
    }, testKennzeichen);

    // Assert: Data only in tenant collection
    expect(result.tenantCount).toBe(1);
    expect(result.globalCount).toBe(0);
  });

  test('LF-2.4: Buchungen Collection - Has werkstattId suffix', async ({ page }) => {
    // Arrange: Create vehicle and booking
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Create a booking
    const buchungId = await createLeihfahrzeugBuchung(page, {
      leihfahrzeugId: lfId,
      kennzeichen: testKennzeichen
    });

    // Assert: Booking created
    expect(buchungId).toBeTruthy();

    // Assert: Check collection name
    const buchungCollectionName = await page.evaluate(() => {
      return window.getCollectionName('leihfahrzeugBuchungen');
    });
    expect(buchungCollectionName).toBe('leihfahrzeugBuchungen_mosbach');
  });

  // ============================================
  // GRUPPE C: Pool Sharing (4 Tests)
  // ============================================

  test('LF-3.1: Enable Pool - imPoolFreigegeben creates pool entry', async ({ page }) => {
    // Arrange: Create vehicle with pool sharing enabled
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell,
      imPoolFreigegeben: true
    });

    // Act: Manually create pool entry (simulating updatePool function)
    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell,
      tagesmiete: 45.00
    });

    // Assert: Pool entry exists
    expect(poolId).toBeTruthy();

    // Assert: Pool data correct
    const poolData = await page.evaluate(async (pid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugPool').doc(pid).get();
      return doc.exists ? doc.data() : null;
    }, poolId);

    expect(poolData).toBeTruthy();
    expect(poolData.kennzeichen).toBe(testKennzeichen);
    expect(poolData.besitzerWerkstattId).toBe('mosbach');
    expect(poolData.verfuegbar).toBe(true);
  });

  test('LF-3.2: Pool Data - Contains correct vehicle information', async ({ page }) => {
    // Arrange: Create vehicle and pool entry
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: 'Audi',
      modell: 'A4 Avant',
      kategorie: 'kombi',
      tagesmiete: 65.00
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: 'Audi',
      modell: 'A4 Avant',
      kategorie: 'kombi',
      tagesmiete: 65.00
    });

    // Assert: All pool data correct
    const poolData = await page.evaluate(async (pid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugPool').doc(pid).get();
      return doc.data();
    }, poolId);

    expect(poolData.marke).toBe('Audi');
    expect(poolData.modell).toBe('A4 Avant');
    expect(poolData.kategorie).toBe('kombi');
    expect(poolData.tagesmiete).toBe(65.00);
    expect(poolData.besitzerWerkstattName).toBe('Auto-Lackierzentrum Mosbach');
  });

  test('LF-3.3: Pool - originalId links to source vehicle', async ({ page }) => {
    // Arrange: Create vehicle and pool entry
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Assert: originalId matches
    const poolData = await page.evaluate(async (pid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugPool').doc(pid).get();
      return doc.data();
    }, poolId);

    expect(poolData.originalId).toBe(lfId);
  });

  test('LF-3.4: Pool verfuegbar - Can be set to false when reserved', async ({ page }) => {
    // Arrange: Create pool entry
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Set verfuegbar to false
    await page.evaluate(async (pid) => {
      const db = window.firebaseApp.db();
      await db.collection('leihfahrzeugPool').doc(pid).update({
        verfuegbar: false,
        reserviertFuer: 'other-werkstatt'
      });
    }, poolId);

    // Assert
    const poolData = await page.evaluate(async (pid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugPool').doc(pid).get();
      return doc.data();
    }, poolId);

    expect(poolData.verfuegbar).toBe(false);
    expect(poolData.reserviertFuer).toBe('other-werkstatt');
  });

  // ============================================
  // GRUPPE D: Cross-Werkstatt Anfragen (4 Tests)
  // ============================================

  test('LF-4.1: Create Request - Anfrage document created', async ({ page }) => {
    // Arrange: Create pool entry first
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    // Act: Create an anfrage
    const anfrageId = await createLeihfahrzeugAnfrage(page, poolId, 'other-werkstatt', testKennzeichen);

    // Assert
    expect(anfrageId).toBeTruthy();

    // Assert: Anfrage data correct
    const anfrageData = await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugAnfragen').doc(aid).get();
      return doc.data();
    }, anfrageId);

    expect(anfrageData).toBeTruthy();
    expect(anfrageData.status).toBe('pending');
    expect(anfrageData.kennzeichen).toBe(testKennzeichen);
  });

  test('LF-4.2: Request Fields - All required fields present', async ({ page }) => {
    // Arrange
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const anfrageId = await createLeihfahrzeugAnfrage(page, poolId, 'besitzer-werkstatt', testKennzeichen);

    // Assert: All fields present
    const anfrageData = await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugAnfragen').doc(aid).get();
      return doc.data();
    }, anfrageId);

    expect(anfrageData.poolFahrzeugId).toBe(poolId);
    expect(anfrageData.besitzerWerkstattId).toBe('besitzer-werkstatt');
    expect(anfrageData.anfragerWerkstattId).toBe('mosbach');
    expect(anfrageData.kennzeichen).toBe(testKennzeichen);
    expect(anfrageData.grund).toBeTruthy();
    expect(anfrageData.status).toBe('pending');
    expect(anfrageData.erstelltAm).toBeTruthy();
  });

  test('LF-4.3: Approve Request - Status changes to genehmigt', async ({ page }) => {
    // Arrange
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const anfrageId = await createLeihfahrzeugAnfrage(page, poolId, 'mosbach', testKennzeichen);

    // Act: Approve the request
    await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      await db.collection('leihfahrzeugAnfragen').doc(aid).update({
        status: 'genehmigt',
        genehmigtAm: Date.now()
      });
    }, anfrageId);

    // Assert
    const anfrageData = await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugAnfragen').doc(aid).get();
      return doc.data();
    }, anfrageId);

    expect(anfrageData.status).toBe('genehmigt');
    expect(anfrageData.genehmigtAm).toBeTruthy();
  });

  test('LF-4.4: Reject Request - Status changes to abgelehnt', async ({ page }) => {
    // Arrange
    const lfId = await createLeihfahrzeugDirectly(page, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const poolId = await createPoolEntry(page, lfId, {
      kennzeichen: testKennzeichen,
      marke: testMarke,
      modell: testModell
    });

    const anfrageId = await createLeihfahrzeugAnfrage(page, poolId, 'mosbach', testKennzeichen);

    // Act: Reject the request
    await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      await db.collection('leihfahrzeugAnfragen').doc(aid).update({
        status: 'abgelehnt',
        abgelehntAm: Date.now(),
        ablehnungsgrund: 'Fahrzeug wird selbst benötigt'
      });
    }, anfrageId);

    // Assert
    const anfrageData = await page.evaluate(async (aid) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('leihfahrzeugAnfragen').doc(aid).get();
      return doc.data();
    }, anfrageId);

    expect(anfrageData.status).toBe('abgelehnt');
    expect(anfrageData.ablehnungsgrund).toBe('Fahrzeug wird selbst benötigt');
  });

  // ============================================
  // BUG DETECTION TEST
  // ============================================

  test('LF-BUG-1: formatKategorie function exists in leihfahrzeuge.html', async ({ page }) => {
    // Navigate to leihfahrzeuge page (loginAsTestAdmin already sets up werkstattId on index.html)
    await page.goto('/leihfahrzeuge.html');
    await waitForFirebaseReady(page);

    // Check if function exists globally (window.formatKategorie)
    const hasFunction = await page.evaluate(() => {
      return typeof window.formatKategorie === 'function';
    });

    // Assert: Function should exist (we fixed it earlier and made it global)
    expect(hasFunction).toBeTruthy();

    // Navigate back to index.html to preserve werkstattId for afterEach cleanup
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
  });
});
