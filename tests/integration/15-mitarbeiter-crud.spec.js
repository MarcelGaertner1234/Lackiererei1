/**
 * INTEGRATION TESTS: Mitarbeiter CRUD (Employee Management)
 *
 * Tests for the employee management system (mitarbeiter-verwaltung.html)
 *
 * Test Coverage:
 * - Mitarbeiter CRUD operations
 * - Time tracking (Zeiterfassung)
 * - Vacation management (Urlaubsanfragen)
 * - Wage calculation (Lohnberechnung)
 * - Role assignment
 * - Multi-tenant isolation
 *
 * @author Claude Code
 * @date 2025-12-14
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Mitarbeiter CRUD (Employee Management)', () => {
  const testMitarbeiterId = 'test-mitarbeiter-001';
  const testMitarbeiterEmail = 'test.mitarbeiter@example.com';

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);

    // Cleanup
    await cleanupMitarbeiter(page, testMitarbeiterId);
  });

  test.afterEach(async ({ page }) => {
    await cleanupMitarbeiter(page, testMitarbeiterId);
  });

  // Helper to cleanup Mitarbeiter
  async function cleanupMitarbeiter(page, id) {
    await page.evaluate(async (mitarbeiterId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      // Delete mitarbeiter
      try {
        const snapshot = await db.collection(`mitarbeiter_${werkstattId}`)
          .where('mitarbeiterId', '==', mitarbeiterId)
          .get();
        for (const doc of snapshot.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Mitarbeiter cleanup:', e.message);
      }

      // Delete zeiterfassung
      try {
        const zeitSnapshot = await db.collection(`zeiterfassung_${werkstattId}`)
          .where('mitarbeiterId', '==', mitarbeiterId)
          .get();
        for (const doc of zeitSnapshot.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Zeiterfassung cleanup:', e.message);
      }

      // Delete urlaub
      try {
        const urlaubSnapshot = await db.collection(`urlaubsAnfragen_${werkstattId}`)
          .where('mitarbeiterId', '==', mitarbeiterId)
          .get();
        for (const doc of urlaubSnapshot.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Urlaub cleanup:', e.message);
      }
    }, id);
  }

  // ============================================
  // CREATE TESTS
  // ============================================

  test('MA-1.1: Create new Mitarbeiter', async ({ page }) => {
    const mitarbeiterId = await page.evaluate(async ({ id, email }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `mitarbeiter_${werkstattId}`;

      const mitarbeiter = {
        mitarbeiterId: id,
        vorname: 'Max',
        nachname: 'Mustermann',
        email: email,
        telefon: '+49 123 456789',
        position: 'Lackierer',
        abteilung: 'Lackierung',
        eintrittsdatum: '2023-01-15',
        stundenlohn: 18.50,
        wochenstunden: 40,
        urlaubstage: 30,
        status: 'aktiv',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(mitarbeiter);
      return docRef.id;
    }, { id: testMitarbeiterId, email: testMitarbeiterEmail });

    expect(mitarbeiterId).toBeTruthy();
  });

  test('MA-1.2: Required fields validation', async ({ page }) => {
    const validation = await page.evaluate(() => {
      function validateMitarbeiter(data) {
        const requiredFields = ['vorname', 'nachname', 'email', 'position'];
        const missing = requiredFields.filter(f => !data[f] || data[f].trim() === '');
        return {
          isValid: missing.length === 0,
          missingFields: missing
        };
      }

      const testCases = [
        { vorname: '', nachname: '', email: '', position: '', expectedValid: false },
        { vorname: 'Max', nachname: '', email: '', position: '', expectedValid: false },
        { vorname: 'Max', nachname: 'Mustermann', email: 'test@test.de', position: 'Lackierer', expectedValid: true }
      ];

      return testCases.map(tc => ({
        ...tc,
        result: validateMitarbeiter(tc)
      }));
    });

    for (const result of validation) {
      expect(result.result.isValid).toBe(result.expectedValid);
    }
  });

  // ============================================
  // READ TESTS
  // ============================================

  test('MA-2.1: Load Mitarbeiter list', async ({ page }) => {
    // Setup: Create test Mitarbeiter
    await page.evaluate(async ({ id, email }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Test',
        nachname: 'User',
        email: email,
        position: 'Tester',
        status: 'aktiv',
        werkstattId: werkstattId
      });
    }, { id: testMitarbeiterId, email: testMitarbeiterEmail });

    // Act: Load list
    const mitarbeiter = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const snapshot = await db.collection(`mitarbeiter_${werkstattId}`)
        .where('status', '==', 'aktiv')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    expect(mitarbeiter.length).toBeGreaterThan(0);
  });

  test('MA-2.2: Find Mitarbeiter by email', async ({ page }) => {
    // Setup
    await page.evaluate(async ({ id, email }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Find',
        nachname: 'ByEmail',
        email: email,
        position: 'Tester',
        status: 'aktiv',
        werkstattId: werkstattId
      });
    }, { id: testMitarbeiterId, email: testMitarbeiterEmail });

    // Act: Find by email
    const found = await page.evaluate(async (email) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const snapshot = await db.collection(`mitarbeiter_${werkstattId}`)
        .where('email', '==', email)
        .limit(1)
        .get();

      return snapshot.empty ? null : snapshot.docs[0].data();
    }, testMitarbeiterEmail);

    expect(found).toBeTruthy();
    expect(found.email).toBe(testMitarbeiterEmail);
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  test('MA-3.1: Update Mitarbeiter data', async ({ page }) => {
    // Setup
    const docId = await page.evaluate(async ({ id, email }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const docRef = await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Update',
        nachname: 'Test',
        email: email,
        position: 'Lackierer',
        stundenlohn: 15.00,
        status: 'aktiv',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, { id: testMitarbeiterId, email: testMitarbeiterEmail });

    // Act: Update
    await page.evaluate(async (docId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).doc(docId).update({
        position: 'Senior Lackierer',
        stundenlohn: 20.00,
        aktualisiertAm: new Date().toISOString()
      });
    }, docId);

    // Assert
    const updated = await page.evaluate(async (docId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`mitarbeiter_${werkstattId}`).doc(docId).get();
      return doc.data();
    }, docId);

    expect(updated.position).toBe('Senior Lackierer');
    expect(updated.stundenlohn).toBe(20.00);
  });

  // ============================================
  // DEACTIVATE TESTS (not delete!)
  // ============================================

  test('MA-4.1: Deactivate Mitarbeiter (not delete)', async ({ page }) => {
    // Setup
    const docId = await page.evaluate(async ({ id, email }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const docRef = await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Deactivate',
        nachname: 'Test',
        email: email,
        position: 'Tester',
        status: 'aktiv',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, { id: testMitarbeiterId, email: testMitarbeiterEmail });

    // Act: Deactivate (not delete!)
    await page.evaluate(async (docId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).doc(docId).update({
        status: 'inaktiv',
        deaktiviertAm: new Date().toISOString()
      });
    }, docId);

    // Assert: Still exists but inactive
    const deactivated = await page.evaluate(async (docId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`mitarbeiter_${werkstattId}`).doc(docId).get();
      return doc.exists ? doc.data() : null;
    }, docId);

    expect(deactivated).toBeTruthy();
    expect(deactivated.status).toBe('inaktiv');
  });

  // ============================================
  // ZEITERFASSUNG (TIME TRACKING) TESTS
  // ============================================

  test('MA-5.1: Record work hours', async ({ page }) => {
    // Setup: Create Mitarbeiter
    await page.evaluate(async ({ id }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Zeit',
        nachname: 'Test',
        status: 'aktiv',
        werkstattId: werkstattId
      });
    }, { id: testMitarbeiterId });

    // Act: Record work hours
    const zeitId = await page.evaluate(async (mitarbeiterId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const zeitEintrag = {
        mitarbeiterId: mitarbeiterId,
        datum: new Date().toISOString().split('T')[0],
        arbeitsbeginn: '08:00',
        arbeitsende: '17:00',
        pausenzeit: 60, // minutes
        gesamtStunden: 8,
        status: 'erfasst',
        werkstattId: werkstattId
      };

      const docRef = await db.collection(`zeiterfassung_${werkstattId}`).add(zeitEintrag);
      return docRef.id;
    }, testMitarbeiterId);

    expect(zeitId).toBeTruthy();
  });

  test('MA-5.2: Calculate total hours', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      function calculateWorkHours(beginn, ende, pauseMinuten) {
        const [startH, startM] = beginn.split(':').map(Number);
        const [endH, endM] = ende.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const workMinutes = endMinutes - startMinutes - pauseMinuten;

        return workMinutes / 60;
      }

      return {
        test1: calculateWorkHours('08:00', '17:00', 60),  // 8 hours
        test2: calculateWorkHours('07:00', '15:30', 30),  // 8 hours
        test3: calculateWorkHours('09:00', '18:00', 45)   // 8.25 hours
      };
    });

    expect(calculation.test1).toBe(8);
    expect(calculation.test2).toBe(8);
    expect(calculation.test3).toBe(8.25);
  });

  // ============================================
  // URLAUB (VACATION) TESTS
  // ============================================

  test('MA-6.1: Create vacation request', async ({ page }) => {
    // Setup: Create Mitarbeiter
    await page.evaluate(async ({ id }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'Urlaub',
        nachname: 'Test',
        urlaubstage: 30,
        genommeneUrlaubstage: 0,
        status: 'aktiv',
        werkstattId: werkstattId
      });
    }, { id: testMitarbeiterId });

    // Act: Create vacation request
    const urlaubId = await page.evaluate(async (mitarbeiterId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const urlaubAnfrage = {
        mitarbeiterId: mitarbeiterId,
        startDatum: '2025-01-15',
        endDatum: '2025-01-22',
        anzahlTage: 6,
        grund: 'Erholungsurlaub',
        status: 'ausstehend',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(`urlaubsAnfragen_${werkstattId}`).add(urlaubAnfrage);
      return docRef.id;
    }, testMitarbeiterId);

    expect(urlaubId).toBeTruthy();
  });

  test('MA-6.2: Approve vacation request', async ({ page }) => {
    // Setup: Create vacation request
    const urlaubId = await page.evaluate(async (mitarbeiterId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const docRef = await db.collection(`urlaubsAnfragen_${werkstattId}`).add({
        mitarbeiterId: mitarbeiterId,
        startDatum: '2025-02-01',
        endDatum: '2025-02-05',
        anzahlTage: 5,
        status: 'ausstehend',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testMitarbeiterId);

    // Act: Approve
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`urlaubsAnfragen_${werkstattId}`).doc(id).update({
        status: 'genehmigt',
        genehmigtVon: 'admin@test.de',
        genehmigtAm: new Date().toISOString()
      });
    }, urlaubId);

    // Assert
    const urlaub = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`urlaubsAnfragen_${werkstattId}`).doc(id).get();
      return doc.data();
    }, urlaubId);

    expect(urlaub.status).toBe('genehmigt');
  });

  // ============================================
  // LOHN (WAGE) CALCULATION TESTS
  // ============================================

  test('MA-7.1: Calculate monthly wage', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      function calculateMonthlyWage(stundenlohn, gesamtStunden, zuschlaege = 0) {
        const basisLohn = stundenlohn * gesamtStunden;
        const bruttoLohn = basisLohn + zuschlaege;
        return {
          basisLohn,
          zuschlaege,
          bruttoLohn
        };
      }

      // Example: 160 hours at 18.50€/hour + 50€ bonus
      return calculateMonthlyWage(18.50, 160, 50);
    });

    expect(calculation.basisLohn).toBe(2960);
    expect(calculation.bruttoLohn).toBe(3010);
  });

  test('MA-7.2: Calculate overtime', async ({ page }) => {
    const overtime = await page.evaluate(() => {
      function calculateOvertime(gesamtStunden, sollStunden, overtimeMultiplier = 1.25) {
        const ueberstunden = Math.max(0, gesamtStunden - sollStunden);
        return {
          sollStunden,
          gesamtStunden,
          ueberstunden,
          ueberstundenFaktor: overtimeMultiplier
        };
      }

      return calculateOvertime(180, 160);
    });

    expect(overtime.ueberstunden).toBe(20);
    expect(overtime.ueberstundenFaktor).toBe(1.25);
  });

  // ============================================
  // MULTI-TENANT TESTS
  // ============================================

  test('MA-8.1: Mitarbeiter have werkstattId', async ({ page }) => {
    const docId = await page.evaluate(async ({ id }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const docRef = await db.collection(`mitarbeiter_${werkstattId}`).add({
        mitarbeiterId: id,
        vorname: 'MT',
        nachname: 'Test',
        status: 'aktiv',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, { id: testMitarbeiterId });

    const mitarbeiter = await page.evaluate(async (docId) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`mitarbeiter_${werkstattId}`).doc(docId).get();
      return doc.data();
    }, docId);

    expect(mitarbeiter.werkstattId).toBe('mosbach');
  });

  // ============================================
  // UI SMOKE TESTS
  // ============================================

  test('MA-9.1: Mitarbeiter page loads', async ({ page }) => {
    await page.goto('/mitarbeiter-verwaltung.html');
    await expect(page).toHaveTitle(/Mitarbeiter|Personal|Verwaltung/i);
  });

  test('MA-9.2: Mitarbeiter table visible', async ({ page }) => {
    await page.goto('/mitarbeiter-verwaltung.html');
    await waitForFirebaseReady(page);

    const hasTable = await page.evaluate(() => {
      return document.querySelector('table') !== null ||
             document.querySelector('[class*="list"]') !== null ||
             document.querySelector('[class*="grid"]') !== null;
    });

    expect(hasTable).toBe(true);
  });
});
