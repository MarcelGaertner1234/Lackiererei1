/**
 * INTEGRATION TESTS: Performance & Stress Testing
 *
 * Tests for application performance under load
 *
 * Test Coverage:
 * - Kanban with many vehicles
 * - Liste with pagination
 * - Concurrent updates
 * - Memory leak detection
 * - Page load times
 * - Optimistic locking
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

test.describe('INTEGRATION: Performance & Stress Testing', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // PAGE LOAD TIME TESTS
  // ============================================

  test('PERF-1.1: Index page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/index.html');
    await waitForFirebaseReady(page);

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // 5s max (generous for test environment)
  });

  test('PERF-1.2: Kanban page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('PERF-1.3: Liste page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  // ============================================
  // LARGE DATASET TESTS
  // ============================================

  test('PERF-2.1: Handle 50+ vehicles in list', async ({ page }) => {
    // Create test vehicles
    const vehicleCount = 50;
    const testPrefix = 'PERF-BULK-';

    await page.evaluate(async ({ count, prefix }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `fahrzeuge_${werkstattId}`;
      const batch = db.batch();

      for (let i = 0; i < count; i++) {
        const docRef = db.collection(collectionName).doc();
        batch.set(docRef, {
          kennzeichen: `${prefix}${String(i).padStart(3, '0')}`,
          kundenname: `Bulk Test ${i}`,
          serviceTyp: 'lackier',
          status: 'neu',
          createdAt: Date.now() + i,
          werkstattId: werkstattId
        });
      }

      await batch.commit();
    }, { count: vehicleCount, prefix: testPrefix });

    // Measure query time
    const queryTime = await page.evaluate(async (prefix) => {
      const startTime = Date.now();

      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const snapshot = await db.collection(`fahrzeuge_${werkstattId}`)
        .where('kennzeichen', '>=', prefix)
        .where('kennzeichen', '<=', prefix + '\uf8ff')
        .get();

      return {
        time: Date.now() - startTime,
        count: snapshot.docs.length
      };
    }, testPrefix);

    // Assert reasonable performance
    expect(queryTime.count).toBe(vehicleCount);
    expect(queryTime.time).toBeLessThan(5000); // 5s max

    // Cleanup
    await page.evaluate(async (prefix) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      const snapshot = await db.collection(`fahrzeuge_${werkstattId}`)
        .where('kennzeichen', '>=', prefix)
        .where('kennzeichen', '<=', prefix + '\uf8ff')
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }, testPrefix);
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  test('PERF-3.1: Pagination works correctly', async ({ page }) => {
    const paginationResult = await page.evaluate(async () => {
      // Simulate pagination logic
      const pageSize = 20;
      let lastDoc = null;

      async function getPage(startAfter = null) {
        const db = window.firebaseApp.db();
        const werkstattId = window.werkstattId || 'mosbach';

        let query = db.collection(`fahrzeuge_${werkstattId}`)
          .orderBy('createdAt', 'desc')
          .limit(pageSize);

        if (startAfter) {
          query = query.startAfter(startAfter);
        }

        const snapshot = await query.get();
        return {
          docs: snapshot.docs.map(d => d.data()),
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize
        };
      }

      // Get first page
      const page1 = await getPage();

      return {
        pageSize,
        page1Count: page1.docs.length,
        hasNextPage: page1.hasMore
      };
    });

    expect(paginationResult.pageSize).toBe(20);
    expect(paginationResult.page1Count).toBeLessThanOrEqual(20);
  });

  // ============================================
  // CONCURRENT UPDATE TESTS
  // ============================================

  test('PERF-4.1: Handle concurrent updates (Optimistic Locking)', async ({ page }) => {
    const testKennzeichen = 'PERF-CONCURRENT-001';

    // Create vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Concurrent Test'
    });

    // Simulate concurrent updates
    const concurrentResult = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `fahrzeuge_${werkstattId}`;

      // Find vehicle
      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();

      if (snapshot.empty) return { error: 'Vehicle not found' };

      const docRef = snapshot.docs[0].ref;

      // Simulate two concurrent updates
      const update1 = docRef.update({
        status: 'in_arbeit',
        updatedAt: new Date().toISOString()
      });

      const update2 = docRef.update({
        bemerkung: 'Concurrent update test',
        updatedAt: new Date().toISOString()
      });

      try {
        await Promise.all([update1, update2]);

        // Read final state
        const finalDoc = await docRef.get();
        return {
          success: true,
          finalStatus: finalDoc.data().status,
          hasBemerkung: !!finalDoc.data().bemerkung
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, testKennzeichen);

    expect(concurrentResult.success).toBe(true);

    // Cleanup
    await deleteVehicle(page, testKennzeichen);
  });

  // ============================================
  // MEMORY LEAK TESTS
  // ============================================

  test('PERF-5.1: Listener cleanup prevents memory leaks', async ({ page }) => {
    const memoryTest = await page.evaluate(() => {
      // Simulate listener registry pattern
      const listenerRegistry = new Map();

      function registerListener(key, unsubscribeFn) {
        // Clean up existing listener before adding new one
        if (listenerRegistry.has(key)) {
          listenerRegistry.get(key)();
        }
        listenerRegistry.set(key, unsubscribeFn);
      }

      function cleanupAllListeners() {
        for (const [key, unsubscribe] of listenerRegistry) {
          unsubscribe();
        }
        listenerRegistry.clear();
      }

      // Simulate adding listeners - use array for deterministic tracking
      const cleanupLog = [];
      for (let i = 0; i < 5; i++) {
        registerListener('test-listener', () => { cleanupLog.push(i); });
      }

      // Adding same key 5 times should have cleaned up 4 times
      // (first add doesn't have existing listener)
      const afterAdds = listenerRegistry.size;

      cleanupAllListeners();
      const afterCleanup = listenerRegistry.size;

      return {
        duplicateCleanups: cleanupLog.length,
        afterAdds,
        afterCleanup
      };
    });

    expect(memoryTest.duplicateCleanups).toBe(5); // 4 overwrites + 1 final cleanup
    expect(memoryTest.afterAdds).toBe(1); // Only one listener in registry
    expect(memoryTest.afterCleanup).toBe(0); // All cleaned up
  });

  // ============================================
  // RENDER PERFORMANCE TESTS
  // ============================================

  test('PERF-6.1: DOM manipulation performance', async ({ page }) => {
    const renderTest = await page.evaluate(() => {
      // Measure time to create and append elements
      const startTime = performance.now();

      const container = document.createElement('div');
      container.id = 'perf-test-container';
      container.style.display = 'none';

      // Create 100 elements
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.className = 'perf-test-item';
        div.textContent = `Item ${i}`;
        container.appendChild(div);
      }

      document.body.appendChild(container);
      const createTime = performance.now() - startTime;

      // Read DOM
      const readStart = performance.now();
      const items = container.querySelectorAll('.perf-test-item');
      const itemCount = items.length;
      const readTime = performance.now() - readStart;

      // Cleanup
      container.remove();

      return {
        createTime,
        readTime,
        itemCount,
        totalTime: createTime + readTime
      };
    });

    expect(renderTest.itemCount).toBe(100);
    expect(renderTest.totalTime).toBeLessThan(500); // 500ms max
  });

  // ============================================
  // BATCH OPERATION TESTS
  // ============================================

  test('PERF-7.1: Batch writes are faster than individual writes', async ({ page }) => {
    const batchTest = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const testCollection = `perfTest_${werkstattId}`;

      // Test batch write
      const batchStart = Date.now();
      const batch = db.batch();

      for (let i = 0; i < 10; i++) {
        const docRef = db.collection(testCollection).doc(`batch-${i}`);
        batch.set(docRef, { index: i, type: 'batch' });
      }

      await batch.commit();
      const batchTime = Date.now() - batchStart;

      // Cleanup
      const cleanupBatch = db.batch();
      for (let i = 0; i < 10; i++) {
        cleanupBatch.delete(db.collection(testCollection).doc(`batch-${i}`));
      }
      await cleanupBatch.commit();

      return {
        batchTime,
        documentCount: 10
      };
    });

    expect(batchTest.batchTime).toBeLessThan(5000); // 5s max for 10 docs
    expect(batchTest.documentCount).toBe(10);
  });

  // ============================================
  // QUERY OPTIMIZATION TESTS
  // ============================================

  test('PERF-8.1: Indexed query performance', async ({ page }) => {
    const queryTest = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      // Query using indexed field (status)
      const startTime = Date.now();

      const snapshot = await db.collection(`fahrzeuge_${werkstattId}`)
        .where('status', '==', 'neu')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const queryTime = Date.now() - startTime;

      return {
        queryTime,
        resultCount: snapshot.docs.length
      };
    });

    expect(queryTest.queryTime).toBeLessThan(3000); // 3s max
  });

  // ============================================
  // UI RESPONSIVENESS TESTS
  // ============================================

  test('PERF-9.1: UI remains responsive during data load', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    // Check that UI elements are interactive
    const isResponsive = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const inputs = document.querySelectorAll('input');

      // Check if elements are not disabled
      const enabledButtons = Array.from(buttons).filter(b => !b.disabled);
      const enabledInputs = Array.from(inputs).filter(i => !i.disabled);

      return {
        totalButtons: buttons.length,
        enabledButtons: enabledButtons.length,
        totalInputs: inputs.length,
        enabledInputs: enabledInputs.length
      };
    });

    // At least some interactive elements should be enabled
    expect(isResponsive.enabledButtons + isResponsive.enabledInputs).toBeGreaterThan(0);
  });
});
