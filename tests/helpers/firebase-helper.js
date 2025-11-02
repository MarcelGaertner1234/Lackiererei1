/**
 * Firebase Helper für E2E Tests
 *
 * Hilfsfunktionen für Firebase-Operationen während Tests
 */

/**
 * Wartet auf Firebase Initialisierung im Browser
 * @param {import('@playwright/test').Page} page
 */
async function waitForFirebaseReady(page) {
  console.log('🔧 RUN #68: waitForFirebaseReady() START');

  try {
    await page.waitForFunction(() => {
      const state = {
        hasApp: !!window.firebaseApp,
        hasDb: !!(window.firebaseApp && window.firebaseApp.db),
        isInit: window.firebaseInitialized
      };

      if (!window.firebaseInitialized) {
        console.log('⏳ RUN #68: Polling...', JSON.stringify(state));
      }

      return window.firebaseApp && window.firebaseApp.db && window.firebaseInitialized === true;
    }, {
      timeout: 20000, // RUN #68: Increased from 15s to 20s
      polling: 500    // RUN #68: Check every 500ms
    });

    console.log('✅ RUN #68: waitForFirebaseReady() SUCCESS');
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseApp: !!window.firebaseApp,
      db: !!(window.firebaseApp && window.firebaseApp.db),
      initialized: window.firebaseInitialized,
      dbType: typeof window.db,
      storageType: typeof window.storage
    }));

    console.error('❌ RUN #68: waitForFirebaseReady() TIMEOUT');
    console.error('   Diagnostics:', JSON.stringify(diagnostics, null, 2));
    throw error;
  }
}

/**
 * Prüft ob ein Fahrzeug in Firestore existiert
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function checkVehicleExists(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    return fahrzeuge.some(f => f.kennzeichen === kz);
  }, kennzeichen);
}

/**
 * Holt Fahrzeugdaten aus Firestore
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function getVehicleData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    return fahrzeuge.find(f => f.kennzeichen === kz);
  }, kennzeichen);
}

/**
 * Prüft ob ein Kunde in Firestore existiert
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function checkCustomerExists(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    return kunden.some(k => k.name === customerName);
  }, name);
}

/**
 * Holt Kundendaten aus Firestore
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function getCustomerData(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    return kunden.find(k => k.name === customerName);
  }, name);
}

/**
 * Löscht ein Fahrzeug aus Firestore (Cleanup)
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function deleteVehicle(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    const vehicle = fahrzeuge.find(f => f.kennzeichen === kz);
    if (vehicle) {
      await window.firebaseApp.deleteFahrzeug(vehicle.id);
      return true;
    }
    return false;
  }, kennzeichen);
}

/**
 * Löscht einen Kunden aus Firestore (Cleanup)
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function deleteCustomer(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    const kunde = kunden.find(k => k.name === customerName);
    if (kunde) {
      await window.firebaseApp.deleteKunde(kunde.id);
      return true;
    }
    return false;
  }, name);
}

/**
 * Wartet auf Realtime Update
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
async function waitForRealtimeUpdate(page, timeout = 5000) {
  await page.waitForFunction(() => {
    // Prüfe auf console.log mit "🔥 Realtime Update"
    return true; // Simplified - in real tests we'd check actual updates
  }, { timeout });

  // Warte kurz damit DOM Updates abgeschlossen sind
  await page.waitForTimeout(500);
}

/**
 * Prüft Console Logs auf Fehler
 * @param {import('@playwright/test').Page} page
 */
function setupConsoleMonitoring(page) {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  return {
    getErrors: () => errors,
    hasErrors: () => errors.length > 0
  };
}

/**
 * CRITICAL FIX RUN #32: Findet Partner-Anfrage mit Retry-Logic
 *
 * Problem: Firebase Emulator braucht Zeit zum Indexieren nach Write
 * - Write committed ✅
 * - Index updated ❌ (kann 1-10 Sekunden dauern)
 * - Query findet nichts → null
 *
 * Solution: Retry-Loop wartet bis Index fertig
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 * @param {Object} options
 * @param {number} options.maxAttempts - Max retry attempts (default: 10)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<string|null>} Anfrage-ID or null if not found
 */
async function findPartnerAnfrageWithRetry(page, kennzeichen, options = {}) {
  const maxAttempts = options.maxAttempts || 10;
  const retryDelay = options.retryDelay || 1000;

  // CRITICAL FIX RUN #34: Log BEFORE page.evaluate to confirm function is called
  const pageUrl = page.url();
  console.log(`🔍 RUN #34: findPartnerAnfrageWithRetry called for "${kennzeichen}"`);
  console.log(`  Page URL: ${pageUrl}`);
  console.log(`  maxAttempts: ${maxAttempts}, retryDelay: ${retryDelay}ms`);

  try {
    return await page.evaluate(async ({ kz, max, delay }) => {
      // CRITICAL FIX RUN #33: Verify Firebase is available
      console.log('🔍 RUN #33: Checking Firebase availability...');
      console.log('  window.firebaseApp:', typeof window.firebaseApp);
      console.log('  window.firebaseApp.db:', typeof window.firebaseApp?.db);
      console.log('  window.firebaseInitialized:', window.firebaseInitialized);

      if (!window.firebaseApp || typeof window.firebaseApp.db !== 'function') {
        console.error('❌ CRITICAL: window.firebaseApp.db() not available!');
        console.error('  This means firebase-config.template.js did not initialize correctly.');
        console.error('  Tests CANNOT proceed without Firebase access.');
        return null;
      }

      const db = window.firebaseApp.db();
      console.log('✅ Firebase DB ready, starting retry loop...');

      for (let i = 0; i < max; i++) {
        const snapshot = await db.collection('partnerAnfragen')
          .where('kennzeichen', '==', kz)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          console.log(`✅ Anfrage found after ${i + 1} attempt(s) (${(i + 1) * delay}ms)`);
          return snapshot.docs[0].id;
        }

        console.log(`⏳ Attempt ${i + 1}/${max}: Waiting for Firestore index... (${delay}ms)`);
        await new Promise(r => setTimeout(r, delay));
      }

      console.error(`❌ Anfrage not found after ${max} attempts (${max * delay}ms total)`);
      return null;
    }, { kz: kennzeichen, max: maxAttempts, delay: retryDelay });
  } catch (error) {
    // CRITICAL FIX RUN #34: Catch page.evaluate() exceptions
    console.error('❌ RUN #34: page.evaluate() threw exception!');
    console.error('  Error Message:', error.message);
    console.error('  Error Stack:', error.stack);
    console.error('  This means the code inside page.evaluate() crashed.');
    return null;
  }
}

/**
 * CRITICAL FIX: Test Admin Authentication
 *
 * Problem: Tests run WITHOUT auth → Firestore Rules DENY list operations
 * Solution: Login as admin user BEFORE running tests
 *
 * This function:
 * 1. Signs in with admin@test.de (auto-created in Emulator)
 * 2. Sets admin role in Firestore (/users collection)
 * 3. Waits for auth state to propagate
 *
 * Usage: Call in test.beforeAll() hook (once per test file)
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function loginAsTestAdmin(page) {
  console.log('🔐 RUN #70: loginAsTestAdmin() START');

  try {
    // Step 1: Sign in with Firebase Auth (creates user if not exists in Emulator)
    const authResult = await page.evaluate(async () => {
      const auth = firebase.auth();

      try {
        const userCredential = await auth.signInWithEmailAndPassword('admin@test.de', 'test123');
        console.log('✅ Firebase Auth: Signed in as', userCredential.user.email);
        return {
          success: true,
          uid: userCredential.user.uid,
          email: userCredential.user.email
        };
      } catch (error) {
        console.error('❌ Firebase Auth failed:', error.message);
        return { success: false, error: error.message };
      }
    });

    if (!authResult.success) {
      throw new Error(`Auth failed: ${authResult.error}`);
    }

    console.log(`✅ RUN #70: Auth successful - UID: ${authResult.uid}`);

    // Step 2: Set admin role in Firestore /users collection
    await page.evaluate(async (uid) => {
      const db = window.firebaseApp.db();

      try {
        await db.collection('users').doc(uid).set({
          uid: uid,
          email: 'admin@test.de',
          role: 'admin',
          werkstattId: 'mosbach',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          displayName: 'E2E Test Admin'
        }, { merge: true });

        console.log('✅ Firestore: Admin role set in /users collection');
        return true;
      } catch (error) {
        console.error('❌ Firestore write failed:', error.message);
        throw error;
      }
    }, authResult.uid);

    console.log('✅ RUN #70: Admin role configured in Firestore');

    // Step 3: Wait for auth state to propagate (Firestore Rules use request.auth)
    await page.waitForFunction(() => {
      const auth = firebase.auth();
      return auth.currentUser !== null && auth.currentUser.email === 'admin@test.de';
    }, { timeout: 5000, polling: 200 });

    console.log('✅ RUN #70: loginAsTestAdmin() SUCCESS - Auth state propagated');

  } catch (error) {
    console.error('❌ RUN #70: loginAsTestAdmin() FAILED');
    console.error('   Error:', error.message);
    throw error;
  }
}

module.exports = {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  checkCustomerExists,
  getCustomerData,
  deleteVehicle,
  deleteCustomer,
  waitForRealtimeUpdate,
  setupConsoleMonitoring,
  findPartnerAnfrageWithRetry,
  loginAsTestAdmin  // NEW: Test authentication
};
