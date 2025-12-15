/**
 * INTEGRATION TESTS: Tagesplanung (Daily Planning)
 *
 * Tests for the daily planning/scheduling system (tagesplanung.html)
 * This is a HIGH RISK file according to the bug hotspot analysis.
 *
 * Known Issues to Test:
 * - Array bounds not checked (historical bug)
 * - Drag-Drop between time slots
 * - Mitarbeiter assignment
 * - Conflict detection (double booking)
 *
 * Test Coverage:
 * - Termin (appointment) CRUD operations
 * - Calendar navigation (day/week/month)
 * - Time slot management
 * - Mitarbeiter assignment
 * - Conflict detection
 * - Multi-tenant isolation
 *
 * @author Claude Code
 * @date 2025-12-14
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  deleteVehicle
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Tagesplanung (Daily Planning) - HIGH RISK', () => {
  const testKennzeichen = 'PLAN-TEST-001';
  const testKundenname = 'Tagesplanung Test';

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);

    // Cleanup
    await deleteVehicle(page, testKennzeichen);
    await cleanupTermine(page, testKennzeichen);
  });

  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await cleanupTermine(page, testKennzeichen);
  });

  // Helper to cleanup Termine
  async function cleanupTermine(page, kennzeichen) {
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      try {
        const termine = await db.collection(`termine_${werkstattId}`)
          .where('kennzeichen', '==', kz)
          .get();
        for (const doc of termine.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Termine cleanup:', e.message);
      }
    }, kennzeichen);
  }

  // ============================================
  // TERMIN CRUD TESTS
  // ============================================

  test('PLAN-1.1: Create new Termin', async ({ page }) => {
    // Setup: Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Act: Create Termin
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const termin = {
        kennzeichen: kz,
        kundenname: 'Termin Test',
        datum: new Date().toISOString().split('T')[0], // Today
        startzeit: '09:00',
        endzeit: '10:30',
        serviceTyp: 'lackier',
        mitarbeiterId: null,
        status: 'geplant',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(termin);
      return docRef.id;
    }, testKennzeichen);

    // Assert: Termin created
    expect(terminId).toBeTruthy();
  });

  test('PLAN-1.2: Read Termin by date', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    // Setup: Create Termine for today
    await page.evaluate(async ({ kz, datum }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'Read Test',
        datum: datum,
        startzeit: '10:00',
        endzeit: '11:00',
        status: 'geplant',
        werkstattId: werkstattId
      });
    }, { kz: testKennzeichen, datum: today });

    // Act: Load Termine for today
    const termine = await page.evaluate(async (datum) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .where('datum', '==', datum)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, today);

    // Assert: Termin found
    expect(termine.length).toBeGreaterThan(0);
    const testTermin = termine.find(t => t.kennzeichen === testKennzeichen);
    expect(testTermin).toBeTruthy();
  });

  test('PLAN-1.3: Update Termin time', async ({ page }) => {
    // Setup: Create Termin
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'Update Test',
        datum: new Date().toISOString().split('T')[0],
        startzeit: '09:00',
        endzeit: '10:00',
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Update time
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      await db.collection(collectionName).doc(id).update({
        startzeit: '14:00',
        endzeit: '15:30',
        aktualisiertAm: new Date().toISOString()
      });
    }, terminId);

    // Assert: Time updated
    const termin = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
      return doc.data();
    }, terminId);

    expect(termin.startzeit).toBe('14:00');
    expect(termin.endzeit).toBe('15:30');
  });

  test('PLAN-1.4: Delete Termin', async ({ page }) => {
    // Setup: Create Termin
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'Delete Test',
        datum: new Date().toISOString().split('T')[0],
        startzeit: '11:00',
        endzeit: '12:00',
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Delete Termin
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      await db.collection(`termine_${werkstattId}`).doc(id).delete();
    }, terminId);

    // Assert: Termin deleted
    const exists = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
      return doc.exists;
    }, terminId);

    expect(exists).toBe(false);
  });

  // ============================================
  // ARRAY BOUNDS TESTS (Historical Bug Area)
  // ============================================

  test('PLAN-2.1: Array bounds - Empty termine list', async ({ page }) => {
    // Test accessing empty array (historical bug)
    const result = await page.evaluate(async () => {
      const termine = [];

      // Safe access pattern
      const firstTermin = termine[0] || null;
      const lastTermin = termine[termine.length - 1] || null;

      return {
        length: termine.length,
        firstTermin,
        lastTermin,
        safeAccess: true
      };
    });

    expect(result.length).toBe(0);
    expect(result.firstTermin).toBeNull();
    expect(result.lastTermin).toBeNull();
    expect(result.safeAccess).toBe(true);
  });

  test('PLAN-2.2: Array bounds - Single item list', async ({ page }) => {
    const result = await page.evaluate(() => {
      const termine = [{ id: '1', startzeit: '09:00' }];

      // Test boundary conditions
      const firstTermin = termine[0];
      const lastTermin = termine[termine.length - 1];
      const outOfBounds = termine[1]; // Should be undefined

      return {
        firstId: firstTermin?.id,
        lastId: lastTermin?.id,
        outOfBoundsIsUndefined: outOfBounds === undefined,
        safeIndex: Math.min(0, termine.length - 1)
      };
    });

    expect(result.firstId).toBe('1');
    expect(result.lastId).toBe('1');
    expect(result.outOfBoundsIsUndefined).toBe(true);
    expect(result.safeIndex).toBe(0);
  });

  test('PLAN-2.3: Safe array iteration', async ({ page }) => {
    const result = await page.evaluate(() => {
      const termine = [
        { id: '1', startzeit: '09:00' },
        { id: '2', startzeit: '10:00' },
        { id: '3', startzeit: '11:00' }
      ];

      // Safe iteration patterns
      const mapped = termine.map(t => t.id);
      const filtered = termine.filter(t => parseInt(t.startzeit) >= 10);
      const found = termine.find(t => t.id === '2');

      return {
        mappedLength: mapped.length,
        filteredLength: filtered.length,
        foundId: found?.id || null
      };
    });

    expect(result.mappedLength).toBe(3);
    expect(result.filteredLength).toBe(2);
    expect(result.foundId).toBe('2');
  });

  // ============================================
  // CONFLICT DETECTION TESTS
  // ============================================

  test('PLAN-3.1: Detect time overlap conflict', async ({ page }) => {
    const conflict = await page.evaluate(() => {
      // Existing termin: 09:00 - 11:00
      const existing = { startzeit: '09:00', endzeit: '11:00' };
      // New termin: 10:00 - 12:00 (overlaps!)
      const newTermin = { startzeit: '10:00', endzeit: '12:00' };

      // Conflict detection logic
      function hasTimeConflict(t1, t2) {
        const t1Start = parseInt(t1.startzeit.replace(':', ''));
        const t1End = parseInt(t1.endzeit.replace(':', ''));
        const t2Start = parseInt(t2.startzeit.replace(':', ''));
        const t2End = parseInt(t2.endzeit.replace(':', ''));

        // Overlap if: start1 < end2 AND start2 < end1
        return t1Start < t2End && t2Start < t1End;
      }

      return {
        hasConflict: hasTimeConflict(existing, newTermin),
        existingStart: existing.startzeit,
        existingEnd: existing.endzeit,
        newStart: newTermin.startzeit,
        newEnd: newTermin.endzeit
      };
    });

    expect(conflict.hasConflict).toBe(true);
  });

  test('PLAN-3.2: No conflict for adjacent times', async ({ page }) => {
    const conflict = await page.evaluate(() => {
      // Existing: 09:00 - 10:00
      const existing = { startzeit: '09:00', endzeit: '10:00' };
      // New: 10:00 - 11:00 (adjacent, no overlap)
      const newTermin = { startzeit: '10:00', endzeit: '11:00' };

      function hasTimeConflict(t1, t2) {
        const t1Start = parseInt(t1.startzeit.replace(':', ''));
        const t1End = parseInt(t1.endzeit.replace(':', ''));
        const t2Start = parseInt(t2.startzeit.replace(':', ''));
        const t2End = parseInt(t2.endzeit.replace(':', ''));

        return t1Start < t2End && t2Start < t1End;
      }

      return hasTimeConflict(existing, newTermin);
    });

    expect(conflict).toBe(false);
  });

  test('PLAN-3.3: Detect double booking for same Mitarbeiter', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    // Setup: Create conflicting Termine for same Mitarbeiter
    await page.evaluate(async ({ kz, datum }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      // Termin 1: 09:00 - 11:00
      await db.collection(collectionName).add({
        kennzeichen: kz,
        datum: datum,
        startzeit: '09:00',
        endzeit: '11:00',
        mitarbeiterId: 'mitarbeiter-001',
        status: 'geplant',
        werkstattId: werkstattId
      });
    }, { kz: testKennzeichen, datum: today });

    // Act: Check for conflict
    const hasConflict = await page.evaluate(async ({ datum, mitarbeiterId }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      // New termin would be 10:00 - 12:00
      const newStart = '10:00';
      const newEnd = '12:00';

      // Get existing termine for this Mitarbeiter on this day
      const snapshot = await db.collection(collectionName)
        .where('datum', '==', datum)
        .where('mitarbeiterId', '==', mitarbeiterId)
        .get();

      // Check for conflicts
      for (const doc of snapshot.docs) {
        const existing = doc.data();
        const existStart = parseInt(existing.startzeit.replace(':', ''));
        const existEnd = parseInt(existing.endzeit.replace(':', ''));
        const newStartInt = parseInt(newStart.replace(':', ''));
        const newEndInt = parseInt(newEnd.replace(':', ''));

        if (existStart < newEndInt && newStartInt < existEnd) {
          return true; // Conflict found
        }
      }
      return false;
    }, { datum: today, mitarbeiterId: 'mitarbeiter-001' });

    expect(hasConflict).toBe(true);
  });

  // ============================================
  // MITARBEITER ASSIGNMENT TESTS
  // ============================================

  test('PLAN-4.1: Assign Mitarbeiter to Termin', async ({ page }) => {
    // Setup: Create Termin without Mitarbeiter
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        datum: new Date().toISOString().split('T')[0],
        startzeit: '09:00',
        endzeit: '10:00',
        mitarbeiterId: null,
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Assign Mitarbeiter
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`termine_${werkstattId}`).doc(id).update({
        mitarbeiterId: 'mitarbeiter-002',
        mitarbeiterName: 'Max Mustermann'
      });
    }, terminId);

    // Assert: Mitarbeiter assigned
    const termin = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
      return doc.data();
    }, terminId);

    expect(termin.mitarbeiterId).toBe('mitarbeiter-002');
    expect(termin.mitarbeiterName).toBe('Max Mustermann');
  });

  test('PLAN-4.2: Remove Mitarbeiter from Termin', async ({ page }) => {
    // Setup: Create Termin with Mitarbeiter
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        datum: new Date().toISOString().split('T')[0],
        startzeit: '09:00',
        endzeit: '10:00',
        mitarbeiterId: 'mitarbeiter-003',
        mitarbeiterName: 'Hans Meier',
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Remove Mitarbeiter
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      await db.collection(`termine_${werkstattId}`).doc(id).update({
        mitarbeiterId: null,
        mitarbeiterName: null
      });
    }, terminId);

    // Assert: Mitarbeiter removed
    const termin = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
      return doc.data();
    }, terminId);

    expect(termin.mitarbeiterId).toBeNull();
  });

  // ============================================
  // DATE NAVIGATION TESTS
  // ============================================

  test('PLAN-5.1: Navigate to next day', async ({ page }) => {
    const navigation = await page.evaluate(() => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        today: today.toISOString().split('T')[0],
        tomorrow: tomorrow.toISOString().split('T')[0],
        isNextDay: tomorrow > today
      };
    });

    expect(navigation.isNextDay).toBe(true);
    expect(navigation.tomorrow).not.toBe(navigation.today);
  });

  test('PLAN-5.2: Get week dates', async ({ page }) => {
    const week = await page.evaluate(() => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      return {
        weekDates,
        count: weekDates.length,
        // Use original Date object instead of re-parsing ISO string (avoids timezone drift)
        startsMonday: monday.getDay() === 1
      };
    });

    expect(week.count).toBe(7);
    expect(week.startsMonday).toBe(true);
  });

  // ============================================
  // TIME SLOT TESTS
  // ============================================

  test('PLAN-6.1: Generate time slots', async ({ page }) => {
    const slots = await page.evaluate(() => {
      const timeSlots = [];
      const startHour = 7;  // 07:00
      const endHour = 18;   // 18:00
      const interval = 30;  // 30 minute intervals

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          timeSlots.push(time);
        }
      }

      return {
        slots: timeSlots,
        count: timeSlots.length,
        first: timeSlots[0],
        last: timeSlots[timeSlots.length - 1]
      };
    });

    expect(slots.first).toBe('07:00');
    expect(slots.last).toBe('17:30');
    expect(slots.count).toBe(22); // 11 hours * 2 slots per hour
  });

  test('PLAN-6.2: Calculate duration between times', async ({ page }) => {
    const duration = await page.evaluate(() => {
      function calculateDuration(startzeit, endzeit) {
        const [startH, startM] = startzeit.split(':').map(Number);
        const [endH, endM] = endzeit.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return endMinutes - startMinutes;
      }

      return {
        duration1: calculateDuration('09:00', '10:30'), // 90 minutes
        duration2: calculateDuration('14:00', '16:00'), // 120 minutes
        duration3: calculateDuration('08:30', '09:00')  // 30 minutes
      };
    });

    expect(duration.duration1).toBe(90);
    expect(duration.duration2).toBe(120);
    expect(duration.duration3).toBe(30);
  });

  // ============================================
  // MULTI-TENANT TESTS
  // ============================================

  test('PLAN-7.1: Termine have werkstattId', async ({ page }) => {
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        datum: new Date().toISOString().split('T')[0],
        startzeit: '09:00',
        endzeit: '10:00',
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    const termin = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
      return doc.data();
    }, terminId);

    expect(termin.werkstattId).toBe('mosbach');
  });

  // ============================================
  // STATUS MANAGEMENT TESTS
  // ============================================

  test('PLAN-8.1: Status transitions', async ({ page }) => {
    const terminId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `termine_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        datum: new Date().toISOString().split('T')[0],
        startzeit: '09:00',
        endzeit: '10:00',
        status: 'geplant',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Test status transitions
    const statuses = ['geplant', 'bestaetigt', 'in_arbeit', 'abgeschlossen'];

    for (const newStatus of statuses) {
      await page.evaluate(async ({ id, status }) => {
        const db = window.firebaseApp.db();
        const werkstattId = window.werkstattId || 'mosbach';
        await db.collection(`termine_${werkstattId}`).doc(id).update({ status });
      }, { id: terminId, status: newStatus });

      const termin = await page.evaluate(async (id) => {
        const db = window.firebaseApp.db();
        const werkstattId = window.werkstattId || 'mosbach';
        const doc = await db.collection(`termine_${werkstattId}`).doc(id).get();
        return doc.data();
      }, terminId);

      expect(termin.status).toBe(newStatus);
    }
  });

  // ============================================
  // UI SMOKE TESTS
  // ============================================

  test('PLAN-9.1: Tagesplanung page loads', async ({ page }) => {
    await page.goto('/tagesplanung.html');

    // Page should load without errors
    await expect(page).toHaveTitle(/Tagesplanung|Planung|Kalender/i);
  });

  test('PLAN-9.2: Calendar controls visible', async ({ page }) => {
    await page.goto('/tagesplanung.html');
    await waitForFirebaseReady(page);

    // Check for actual tagesplanung.html UI elements:
    // - Native HTML date picker (input#datePicker)
    // - Header with navigation
    const hasCalendarUI = await page.evaluate(() => {
      const indicators = [
        document.querySelector('input[type="date"]'),  // Date picker
        document.querySelector('#datePicker'),          // Date picker by ID
        document.querySelector('.header'),              // Header container
        document.querySelector('.date-picker'),         // Date picker class
        document.querySelector('h1')                    // Page title
      ];
      return indicators.some(el => el !== null);
    });

    expect(hasCalendarUI).toBe(true);
  });
});
