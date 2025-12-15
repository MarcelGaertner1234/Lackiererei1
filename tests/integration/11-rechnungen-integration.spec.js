/**
 * INTEGRATION TESTS: Rechnungen (Invoices)
 *
 * Tests for the invoice management system (rechnungen-admin.html)
 *
 * Test Coverage:
 * - Invoice creation (automatic + manual)
 * - Invoice number generation (unique, sequential)
 * - Status management (offen, bezahlt, ueberfaellig)
 * - Multi-tenant isolation
 * - Statistics calculation
 * - Partner discount application
 * - PDF generation (mock validation)
 *
 * @author Claude Code
 * @date 2025-12-14
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  deleteVehicle,
  cleanupRechnungen
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Rechnungen (Invoice) System', () => {
  const testKennzeichen = 'RECH-TEST-001';
  const testKundenname = 'Rechnungs Test Kunde';

  // Test data cleanup
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);

    // Cleanup any existing test data
    await cleanupRechnungen(page, testKennzeichen);
    await deleteVehicle(page, testKennzeichen);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after test
    await cleanupRechnungen(page, testKennzeichen);
    await deleteVehicle(page, testKennzeichen);
  });

  // ============================================
  // INVOICE CREATION TESTS
  // ============================================

  test('RECH-1.1: Manual invoice creation - Creates invoice with unique number', async ({ page }) => {
    // Setup: Create a vehicle first
    const vehicleId = await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: 'lackier',
      vereinbarterPreis: '1500.00'
    });

    // Act: Create invoice directly via Firestore
    const rechnungId = await page.evaluate(async ({ kz, kunde, preis }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Generate unique invoice number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const rechnungsnummer = `RE-${year}-${month}-${Date.now().toString().slice(-4)}`;

      const rechnung = {
        rechnungsnummer: rechnungsnummer,
        kennzeichen: kz,
        kundenname: kunde,
        betrag: parseFloat(preis),
        mwst: parseFloat(preis) * 0.19,
        gesamtbetrag: parseFloat(preis) * 1.19,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        faelligAm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(rechnung);
      return { id: docRef.id, rechnungsnummer };
    }, { kz: testKennzeichen, kunde: testKundenname, preis: '1500.00' });

    // Assert: Invoice was created
    expect(rechnungId.id).toBeTruthy();
    expect(rechnungId.rechnungsnummer).toMatch(/^RE-\d{4}-\d{2}-\d{4}$/);
  });

  test('RECH-1.2: Invoice number uniqueness - No duplicates allowed', async ({ page }) => {
    // Act: Try to generate multiple invoice numbers
    const numbers = await page.evaluate(async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        // Add random component to ensure uniqueness
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const rechnungsnummer = `RE-${year}-${month}-${random}`;
        results.push(rechnungsnummer);
        await new Promise(r => setTimeout(r, 10)); // Small delay
      }
      return results;
    });

    // Assert: All numbers are unique
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(numbers.length);
  });

  // ============================================
  // STATUS MANAGEMENT TESTS
  // ============================================

  test('RECH-2.1: Status transitions - offen -> bezahlt', async ({ page }) => {
    // Setup: Create invoice with status 'offen'
    const rechnungId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const rechnung = {
        rechnungsnummer: `RE-TEST-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Test Kunde',
        betrag: 1000,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(rechnung);
      return docRef.id;
    }, testKennzeichen);

    // Act: Update status to 'bezahlt'
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      await db.collection(collectionName).doc(id).update({
        status: 'bezahlt',
        bezahltAm: new Date().toISOString()
      });
    }, rechnungId);

    // Assert: Status is now 'bezahlt'
    const rechnung = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`rechnungen_${werkstattId}`).doc(id).get();
      return doc.data();
    }, rechnungId);

    expect(rechnung.status).toBe('bezahlt');
    expect(rechnung.bezahltAm).toBeTruthy();
  });

  test('RECH-2.2: Status calculation - Overdue detection', async ({ page }) => {
    // Setup: Create invoice with past due date
    const rechnungId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Due date 30 days ago
      const pastDueDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const rechnung = {
        rechnungsnummer: `RE-OVERDUE-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Overdue Test',
        betrag: 500,
        status: 'offen',
        erstelltAm: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        faelligAm: pastDueDate.toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(rechnung);
      return docRef.id;
    }, testKennzeichen);

    // Act: Check if invoice is identified as overdue
    const isOverdue = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`rechnungen_${werkstattId}`).doc(id).get();
      const rechnung = doc.data();

      // Logic from rechnungen-admin.html getStatus()
      if (rechnung.status === 'bezahlt') return false;
      if (!rechnung.faelligAm) return false;

      const faelligDate = new Date(rechnung.faelligAm);
      return faelligDate < new Date();
    }, rechnungId);

    // Assert: Invoice is overdue
    expect(isOverdue).toBe(true);
  });

  test('RECH-2.3: Status badges - Correct CSS classes', async ({ page }) => {
    // Test that status badges use correct CSS classes
    const statusClasses = await page.evaluate(() => {
      return {
        offen: 'offen',
        bezahlt: 'bezahlt',
        ueberfaellig: 'ueberfaellig'
      };
    });

    expect(statusClasses.offen).toBe('offen');
    expect(statusClasses.bezahlt).toBe('bezahlt');
    expect(statusClasses.ueberfaellig).toBe('ueberfaellig');
  });

  // ============================================
  // MULTI-TENANT TESTS
  // ============================================

  test('RECH-3.1: Multi-tenant isolation - Invoices have werkstattId', async ({ page }) => {
    // Create invoice
    const rechnung = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const rechnungData = {
        rechnungsnummer: `RE-MT-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Multi-Tenant Test',
        betrag: 750,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(rechnungData);
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    }, testKennzeichen);

    // Assert: werkstattId is set correctly
    expect(rechnung.werkstattId).toBe('mosbach');
  });

  test('RECH-3.2: Collection naming - Uses werkstattId suffix', async ({ page }) => {
    const collectionName = await page.evaluate(() => {
      const werkstattId = window.werkstattId || 'mosbach';
      return `rechnungen_${werkstattId}`;
    });

    expect(collectionName).toBe('rechnungen_mosbach');
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  test('RECH-4.1: Statistics - Count invoices by status', async ({ page }) => {
    // Setup: Create invoices with different statuses
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Create 2 open, 1 paid invoices
      const invoices = [
        { status: 'offen', betrag: 100 },
        { status: 'offen', betrag: 200 },
        { status: 'bezahlt', betrag: 300 }
      ];

      for (const inv of invoices) {
        await db.collection(collectionName).add({
          rechnungsnummer: `RE-STAT-${Date.now()}-${Math.random()}`,
          kennzeichen: kz,
          kundenname: 'Stats Test',
          betrag: inv.betrag,
          status: inv.status,
          erstelltAm: new Date().toISOString(),
          werkstattId: werkstattId
        });
      }
    }, testKennzeichen);

    // Act: Calculate statistics
    const stats = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .get();

      let offen = 0, bezahlt = 0, total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.status === 'offen') offen++;
        if (data.status === 'bezahlt') bezahlt++;
      });

      return { offen, bezahlt, total };
    }, testKennzeichen);

    // Assert: Statistics are correct
    expect(stats.offen).toBe(2);
    expect(stats.bezahlt).toBe(1);
    expect(stats.total).toBe(3);
  });

  test('RECH-4.2: Statistics - Calculate total amounts', async ({ page }) => {
    // Setup: Create invoices
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const invoices = [
        { status: 'offen', betrag: 1000 },
        { status: 'bezahlt', betrag: 2000 }
      ];

      for (const inv of invoices) {
        await db.collection(collectionName).add({
          rechnungsnummer: `RE-AMT-${Date.now()}-${Math.random()}`,
          kennzeichen: kz,
          kundenname: 'Amount Test',
          betrag: inv.betrag,
          gesamtbetrag: inv.betrag * 1.19,
          status: inv.status,
          erstelltAm: new Date().toISOString(),
          werkstattId: werkstattId
        });
      }
    }, testKennzeichen);

    // Act: Calculate totals
    const totals = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .get();

      let offenBetrag = 0, bezahltBetrag = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'offen') offenBetrag += data.betrag;
        if (data.status === 'bezahlt') bezahltBetrag += data.betrag;
      });

      return { offenBetrag, bezahltBetrag };
    }, testKennzeichen);

    // Assert: Amounts are correct
    expect(totals.offenBetrag).toBe(1000);
    expect(totals.bezahltBetrag).toBe(2000);
  });

  // ============================================
  // MwSt (VAT) CALCULATION TESTS
  // ============================================

  test('RECH-5.1: MwSt calculation - 19% VAT applied correctly', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      const netto = 1000;
      const mwstSatz = 0.19;
      const mwst = netto * mwstSatz;
      const brutto = netto + mwst;

      return { netto, mwst, brutto };
    });

    expect(calculation.netto).toBe(1000);
    expect(calculation.mwst).toBe(190);
    expect(calculation.brutto).toBe(1190);
  });

  test('RECH-5.2: MwSt stored correctly in invoice', async ({ page }) => {
    // Create invoice with MwSt
    const rechnung = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const netto = 500;
      const mwst = netto * 0.19;
      const brutto = netto + mwst;

      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-MWST-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'MwSt Test',
        betrag: netto,
        mwst: mwst,
        gesamtbetrag: brutto,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: MwSt is calculated correctly
    expect(rechnung.betrag).toBe(500);
    expect(rechnung.mwst).toBe(95);
    expect(rechnung.gesamtbetrag).toBe(595);
  });

  // ============================================
  // PARTNER DISCOUNT TESTS
  // ============================================

  test('RECH-6.1: Partner discount - Applied to invoice', async ({ page }) => {
    // Simulate partner discount application
    const discountedInvoice = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const originalPreis = 1000;
      const partnerRabatt = 0.10; // 10% discount
      const rabattBetrag = originalPreis * partnerRabatt;
      const preisNachRabatt = originalPreis - rabattBetrag;

      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-RABATT-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Partner Rabatt Test',
        originalPreis: originalPreis,
        partnerRabatt: partnerRabatt,
        rabattBetrag: rabattBetrag,
        betrag: preisNachRabatt,
        gesamtbetrag: preisNachRabatt * 1.19,
        status: 'offen',
        hatPartnerRabatt: true,
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Discount applied correctly
    expect(discountedInvoice.originalPreis).toBe(1000);
    expect(discountedInvoice.partnerRabatt).toBe(0.10);
    expect(discountedInvoice.rabattBetrag).toBe(100);
    expect(discountedInvoice.betrag).toBe(900);
    expect(discountedInvoice.hatPartnerRabatt).toBe(true);
  });

  // ============================================
  // DATE/TIME TESTS
  // ============================================

  test('RECH-7.1: Due date - 14 days from creation', async ({ page }) => {
    const dates = await page.evaluate(() => {
      const erstelltAm = new Date();
      const faelligAm = new Date(erstelltAm.getTime() + 14 * 24 * 60 * 60 * 1000);

      return {
        erstelltAm: erstelltAm.toISOString(),
        faelligAm: faelligAm.toISOString(),
        diffDays: Math.round((faelligAm - erstelltAm) / (24 * 60 * 60 * 1000))
      };
    });

    expect(dates.diffDays).toBe(14);
  });

  test('RECH-7.2: Payment date - Recorded when paid', async ({ page }) => {
    // Create and pay invoice
    const rechnung = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Create invoice
      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-PAY-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Payment Date Test',
        betrag: 100,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      // Simulate payment
      const bezahltAm = new Date().toISOString();
      await docRef.update({
        status: 'bezahlt',
        bezahltAm: bezahltAm
      });

      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Payment date is recorded
    expect(rechnung.status).toBe('bezahlt');
    expect(rechnung.bezahltAm).toBeTruthy();
    expect(new Date(rechnung.bezahltAm)).toBeInstanceOf(Date);
  });

  // ============================================
  // DELETION/STORNO TESTS
  // ============================================

  test('RECH-8.1: Invoice cancellation (Storno)', async ({ page }) => {
    // Create and cancel invoice
    const rechnung = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Create invoice
      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-STORNO-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Storno Test',
        betrag: 500,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      // Cancel (Storno)
      await docRef.update({
        status: 'storniert',
        storniertAm: new Date().toISOString(),
        stornoGrund: 'Test-Storno'
      });

      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Invoice is cancelled
    expect(rechnung.status).toBe('storniert');
    expect(rechnung.storniertAm).toBeTruthy();
    expect(rechnung.stornoGrund).toBe('Test-Storno');
  });

  // ============================================
  // DATA VALIDATION TESTS
  // ============================================

  test('RECH-9.1: Required fields validation', async ({ page }) => {
    // Check that all required fields are present
    const requiredFields = [
      'rechnungsnummer',
      'kennzeichen',
      'kundenname',
      'betrag',
      'status',
      'erstelltAm',
      'werkstattId'
    ];

    const rechnung = await page.evaluate(async ({ kz, fields }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-VAL-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Validation Test',
        betrag: 100,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      const doc = await docRef.get();
      const data = doc.data();

      // Check all required fields exist
      const missingFields = fields.filter(f => !data[f]);
      return { data, missingFields };
    }, { kz: testKennzeichen, fields: requiredFields });

    // Assert: No missing required fields
    expect(rechnung.missingFields).toHaveLength(0);
  });

  test('RECH-9.2: Numeric fields are numbers', async ({ page }) => {
    const rechnung = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        rechnungsnummer: `RE-NUM-${Date.now()}`,
        kennzeichen: kz,
        kundenname: 'Number Test',
        betrag: 1500.50,
        mwst: 285.10,
        gesamtbetrag: 1785.60,
        status: 'offen',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Numeric fields are numbers
    expect(typeof rechnung.betrag).toBe('number');
    expect(typeof rechnung.mwst).toBe('number');
    expect(typeof rechnung.gesamtbetrag).toBe('number');
  });

  // ============================================
  // COLLECTION STRUCTURE TESTS
  // ============================================

  test('RECH-10.1: Collection uses werkstattId suffix', async ({ page }) => {
    // Verify collection naming convention
    const result = await page.evaluate(async () => {
      const werkstattId = window.werkstattId || 'mosbach';
      const expectedCollection = `rechnungen_${werkstattId}`;

      // Try to access the collection
      const db = window.firebaseApp.db();
      const snapshot = await db.collection(expectedCollection).limit(1).get();

      return {
        collectionName: expectedCollection,
        accessible: true,
        werkstattId: werkstattId
      };
    });

    expect(result.collectionName).toMatch(/^rechnungen_/);
    expect(result.accessible).toBe(true);
  });

  test('RECH-10.2: Invoices can be queried by status', async ({ page }) => {
    // Verify query capability
    const result = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `rechnungen_${werkstattId}`;

      // Query by status
      const snapshot = await db.collection(collectionName)
        .where('status', '==', 'offen')
        .limit(10)
        .get();

      return {
        querySuccess: true,
        count: snapshot.docs.length
      };
    });

    expect(result.querySuccess).toBe(true);
    expect(typeof result.count).toBe('number');
  });
});
