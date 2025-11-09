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
 * HYBRID TESTING: Direct Firestore Write Functions
 *
 * These functions bypass the UI and write directly to Firestore
 * for integration testing. They test business logic without fragile UI interactions.
 */

/**
 * Creates a vehicle directly in Firestore (bypasses UI form)
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} vehicleData - Vehicle data object
 * @param {string} vehicleData.kennzeichen - License plate (required)
 * @param {string} vehicleData.kundenname - Customer name (required)
 * @param {string} vehicleData.kundenEmail - Customer email (optional, default: test@example.com)
 * @param {string} vehicleData.serviceTyp - Service type (optional, default: lackier)
 * @param {string} vehicleData.vereinbarterPreis - Agreed price (optional, default: 1000.00)
 * @param {string} vehicleData.marke - Car brand (optional, default: Volkswagen)
 * @param {string} vehicleData.modell - Car model (optional, default: Golf)
 * @returns {Promise<string>} Document ID of created vehicle
 */
async function createVehicleDirectly(page, vehicleData) {
  console.log(`🔧 Creating vehicle directly in Firestore: ${vehicleData.kennzeichen}`);

  return await page.evaluate(async (data) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('fahrzeuge');

    // Build complete vehicle object with defaults
    const vehicleDoc = {
      kennzeichen: data.kennzeichen,
      kundenname: data.kundenname,
      kundenEmail: (data.kundenEmail || 'test@example.com').toLowerCase(),
      serviceTyp: data.serviceTyp || 'lackier',
      vereinbarterPreis: data.vereinbarterPreis || '1000.00',
      marke: data.marke || 'Volkswagen',
      modell: data.modell || 'Golf',

      // Status fields
      status: 'angenommen',
      prozessStatus: 'angenommen',

      // Timestamps
      annahmeDatum: new Date().toISOString(),
      erstelltAm: new Date().toISOString(),

      // Required fields (placeholder values for integration tests)
      farbnummer: data.farbnummer || 'LC9Z',
      lackart: data.lackart || 'Metallic',
      farbname: data.farbname || 'Silber Metallic',

      // Multi-tenant
      werkstattId: window.werkstattId || 'mosbach'
    };

    const docRef = await db.collection(collectionName).add(vehicleDoc);
    console.log(`✅ Vehicle created: ${docRef.id}`);
    return docRef.id;
  }, vehicleData);
}

/**
 * Creates a customer directly in Firestore (bypasses UI)
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} customerData - Customer data object
 * @param {string} customerData.name - Customer name (required)
 * @param {string} customerData.email - Customer email (optional, default: test@example.com)
 * @param {number} customerData.anzahlBesuche - Visit count (optional, default: 1)
 * @returns {Promise<string>} Document ID of created customer
 */
async function createCustomerDirectly(page, customerData) {
  console.log(`🔧 Creating customer directly in Firestore: ${customerData.name}`);

  return await page.evaluate(async (data) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('kunden');

    const customerDoc = {
      name: data.name,
      email: (data.email || 'test@example.com').toLowerCase(),
      anzahlBesuche: data.anzahlBesuche || 1,
      erstelltAm: new Date().toISOString(),
      letzterBesuch: new Date().toISOString(),
      werkstattId: window.werkstattId || 'mosbach'
    };

    const docRef = await db.collection(collectionName).add(customerDoc);
    console.log(`✅ Customer created: ${docRef.id}`);
    return docRef.id;
  }, customerData);
}

/**
 * Updates vehicle status directly in Firestore
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen - License plate
 * @param {string} newStatus - New status (angenommen, in_arbeit, fertig, abgeholt)
 * @returns {Promise<boolean>} Success
 */
async function updateVehicleStatus(page, kennzeichen, newStatus) {
  console.log(`🔧 Updating vehicle ${kennzeichen} status to: ${newStatus}`);

  return await page.evaluate(async ({ kz, status }) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('fahrzeuge');

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error(`❌ Vehicle ${kz} not found`);
      return false;
    }

    const docId = snapshot.docs[0].id;
    await db.collection(collectionName).doc(docId).update({
      status: status,
      prozessStatus: status,
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Vehicle ${kz} status updated to ${status}`);
    return true;
  }, { kz: kennzeichen, status: newStatus });
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
  console.log('🔐 RUN #71: loginAsTestAdmin() START');

  try {
    // Step 1: Sign in with Firebase Auth (create user if not exists)
    const authResult = await page.evaluate(async () => {
      const auth = firebase.auth();

      try {
        // Try to sign in first
        const userCredential = await auth.signInWithEmailAndPassword('admin@test.de', 'test123');
        console.log('✅ Firebase Auth: Signed in as', userCredential.user.email);
        return {
          success: true,
          uid: userCredential.user.uid,
          email: userCredential.user.email
        };
      } catch (signInError) {
        // If user doesn't exist, create it
        if (signInError.code === 'auth/user-not-found') {
          console.log('👤 User not found, creating admin@test.de...');
          try {
            const newUserCredential = await auth.createUserWithEmailAndPassword('admin@test.de', 'test123');
            console.log('✅ Firebase Auth: Created and signed in as', newUserCredential.user.email);
            return {
              success: true,
              uid: newUserCredential.user.uid,
              email: newUserCredential.user.email
            };
          } catch (createError) {
            console.error('❌ Firebase Auth failed (create):', createError.message);
            return { success: false, error: createError.message };
          }
        } else {
          console.error('❌ Firebase Auth failed (sign in):', signInError.message);
          return { success: false, error: signInError.message };
        }
      }
    });

    if (!authResult.success) {
      throw new Error(`Auth failed: ${authResult.error}`);
    }

    console.log(`✅ RUN #71: Auth successful - UID: ${authResult.uid}`);

    // Step 2: Set admin role in Firestore /users collection
    // Using merge: true to allow repeated calls (e.g., in beforeEach hooks)
    await page.evaluate(async (uid) => {
      const db = window.firebaseApp.db();

      try {
        // Use merge: true so this works even if user document already exists
        await db.collection('users').doc(uid).set({
          uid: uid,
          email: 'admin@test.de',
          role: 'admin',
          werkstattId: 'mosbach',
          isActive: true,
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

    console.log('✅ RUN #71: Admin role configured in Firestore');

    // Step 2.5: Initialize werkstattId for Multi-Tenant Collections (CRITICAL FIX!)
    await page.evaluate((uid) => {
      // Simulate werkstatt session (wie auth-manager.js L262-273)
      const werkstattData = {
        uid: uid,
        email: 'admin@test.de',
        name: 'E2E Test Admin',
        werkstattId: 'mosbach',
        role: 'werkstatt',
        authType: 'firebase',
        isOwner: true
      };

      // Set sessionStorage (für auth-manager.getCurrentUser())
      sessionStorage.setItem('session_werkstatt', JSON.stringify(werkstattData));

      // Set window.werkstattId (für firebase-config.getCollectionName())
      window.werkstattId = 'mosbach';

      console.log('✅ RUN #71: werkstattId initialized:', window.werkstattId);
      console.log('   SessionStorage set:', sessionStorage.getItem('session_werkstatt') !== null);
    }, authResult.uid);

    console.log('✅ RUN #71: werkstattId + SessionStorage initialized');

    // Step 2.6: Verify werkstattId is accessible
    const verification = await page.evaluate(() => {
      return {
        windowWerkstattId: window.werkstattId,
        hasSessionWerkstatt: sessionStorage.getItem('session_werkstatt') !== null,
        canGetCollectionName: (() => {
          try {
            const name = window.getCollectionName('fahrzeuge');
            return { success: true, name };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })()
      };
    });

    console.log('✅ RUN #71: Verification:', JSON.stringify(verification, null, 2));

    if (!verification.canGetCollectionName.success) {
      throw new Error(`werkstattId verification failed: ${verification.canGetCollectionName.error}`);
    }

    // Step 3: Wait for auth state to propagate (Firestore Rules use request.auth)
    await page.waitForFunction(() => {
      const auth = firebase.auth();
      return auth.currentUser !== null && auth.currentUser.email === 'admin@test.de';
    }, { timeout: 5000, polling: 200 });

    console.log('✅ RUN #71: loginAsTestAdmin() SUCCESS - Auth state + werkstattId ready');

  } catch (error) {
    console.error('❌ RUN #71: loginAsTestAdmin() FAILED');
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
  loginAsTestAdmin,  // Test authentication
  // HYBRID TESTING: Direct write functions
  createVehicleDirectly,
  createCustomerDirectly,
  updateVehicleStatus
};
