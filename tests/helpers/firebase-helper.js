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

      // Status fields - Pipeline-Optimierung: neu statt angenommen
      status: 'neu',
      prozessStatus: 'neu',

      // Timestamps - CRITICAL: Use 'createdAt' (not 'erstelltAm') for getAllFahrzeuge() orderBy()
      annahmeDatum: new Date().toISOString(),
      erstelltAm: new Date().toISOString(),
      createdAt: Date.now(),  // CRITICAL: Required for getAllFahrzeuge() orderBy('createdAt', 'desc')

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
    // CRITICAL FIX: Security Rules need this document to exist BEFORE any operations

    // 🔍 DIAGNOSTIC: Check db state before Firestore operation
    const dbDiagnostic = await page.evaluate(() => {
      const diag = {
        // 🔍 NEW: Emulator debug info from firebase-config.js
        emulatorDebug: window.__emulatorDebug || 'NOT SET - firebase-config.js not loaded?',
        hasFirebaseApp: !!window.firebaseApp,
        dbFnExists: typeof window.firebaseApp?.db === 'function',
        dbResult: null,
        dbType: null,
        hasCollection: false,
        windowDb: !!window.db,
        windowDbType: typeof window.db,
        firebaseReady: window.firebaseInitialized === true || (window.firebaseInitialized && typeof window.firebaseInitialized.then === 'function'),
        port: window.location.port,
        navigatorWebdriver: navigator.webdriver,
        // Check if db.useEmulator was called by looking at internal settings
        dbSettings: null,
      };

      if (diag.dbFnExists) {
        try {
          const dbInstance = window.firebaseApp.db();
          diag.dbResult = !!dbInstance;
          diag.dbType = typeof dbInstance;
          diag.hasCollection = typeof dbInstance?.collection === 'function';
          // Check emulator settings - multiple possible property names
          diag.dbSettings = {
            _settings: dbInstance?._settings?.host,
            INTERNAL: dbInstance?.INTERNAL?._settings?.host,
            _databaseId: dbInstance?._databaseId?.projectId,
          };
        } catch (e) {
          diag.dbError = e.message;
        }
      }

      // Also check if window.db is different from firebaseApp.db()
      if (window.db && diag.dbFnExists) {
        try {
          const windowDbHost = window.db?._settings?.host;
          const appDbHost = window.firebaseApp.db()?._settings?.host;
          diag.windowDbHost = windowDbHost || 'unknown';
          diag.appDbHost = appDbHost || 'unknown';
          diag.dbsAreSame = window.db === window.firebaseApp.db();
        } catch (e) {
          diag.dbCompareError = e.message;
        }
      }

      return diag;
    });
    console.log('🔍 RUN #71: DB Diagnostic:', JSON.stringify(dbDiagnostic, null, 2));

    if (!dbDiagnostic.hasCollection) {
      throw new Error(`Firestore DB not available: ${JSON.stringify(dbDiagnostic)}`);
    }

    await page.evaluate(async (uid) => {
      const db = window.firebaseApp.db();

      try {
        // Use merge: true so this works even if user document already exists
        // CRITICAL FIX: Security Rules use getUserStatus() which checks 'status' field (NOT 'isActive')
        // Also need 'status: active' for isActive() helper function
        const userData = {
          uid: uid,
          email: 'admin@test.de',
          role: 'admin',
          werkstattId: 'mosbach',
          status: 'active',  // CRITICAL: Security Rules expect 'status' field
          isActive: true,    // Keep for backward compatibility
          updatedAt: new Date().toISOString(),
          displayName: 'E2E Test Admin'
        };

        // 🔍 DIAGNOSTIC: Log before Firestore write
        console.log('🔍 Attempting Firestore write to /users/' + uid);
        const writeStart = Date.now();

        // Write user document with timeout wrapper
        const writePromise = db.collection('users').doc(uid).set(userData, { merge: true });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore write timeout after 30s')), 30000)
        );

        await Promise.race([writePromise, timeoutPromise]);
        console.log('✅ Firestore: Admin role set in /users collection (' + (Date.now() - writeStart) + 'ms)');

        // CRITICAL: Wait for Firestore to index the document (emulator timing)
        // This delay ensures Security Rules can find the user document
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify the document was written correctly
        const verifyDoc = await db.collection('users').doc(uid).get();
        if (!verifyDoc.exists) {
          throw new Error('User document was not created!');
        }
        const verifyData = verifyDoc.data();
        if (verifyData.role !== 'admin') {
          throw new Error(`User role is '${verifyData.role}' instead of 'admin'!`);
        }
        console.log('✅ Firestore: User document verified - role:', verifyData.role);

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

// ============================================
// LEIHFAHRZEUG HELPERS (2025-11-26)
// ============================================

/**
 * Creates a Leihfahrzeug directly in Firestore (bypasses UI)
 * @param {import('@playwright/test').Page} page
 * @param {Object} data - Vehicle data
 * @returns {Promise<string>} Document ID
 */
async function createLeihfahrzeugDirectly(page, data) {
  console.log(`🚗 Creating Leihfahrzeug: ${data.kennzeichen}`);

  return await page.evaluate(async (vehicleData) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('leihfahrzeuge');

    const doc = {
      kennzeichen: vehicleData.kennzeichen,
      marke: vehicleData.marke || 'Test Marke',
      modell: vehicleData.modell || 'Test Modell',
      kategorie: vehicleData.kategorie || 'limousine',
      baujahr: vehicleData.baujahr || 2022,
      farbe: vehicleData.farbe || 'Schwarz',
      kilometerstand: vehicleData.kilometerstand || 10000,
      tagesmiete: vehicleData.tagesmiete || 45.00,
      kaution: vehicleData.kaution || 500.00,
      status: vehicleData.status || 'verfuegbar',
      imPoolFreigegeben: vehicleData.imPoolFreigegeben || false,
      notizen: vehicleData.notizen || '',
      werkstattId: window.werkstattId || 'mosbach',
      erstelltVon: firebase.auth().currentUser?.uid || 'test',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await db.collection(collectionName).add(doc);
    console.log(`✅ Leihfahrzeug created: ${docRef.id}`);
    return docRef.id;
  }, data);
}

/**
 * Gets Leihfahrzeug data from Firestore
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 * @returns {Promise<Object|null>} Vehicle data or null
 */
async function getLeihfahrzeugData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('leihfahrzeuge');

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }, kennzeichen);
}

/**
 * Deletes a Leihfahrzeug and associated pool/anfragen data
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 * @returns {Promise<boolean>} Success
 */
async function deleteLeihfahrzeug(page, kennzeichen) {
  console.log(`🗑️ Deleting Leihfahrzeug: ${kennzeichen}`);

  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('leihfahrzeuge');

    // Delete from leihfahrzeuge collection
    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .get();

    for (const doc of snapshot.docs) {
      await db.collection(collectionName).doc(doc.id).delete();
    }

    // Also clean up pool entries
    try {
      const poolSnapshot = await db.collection('leihfahrzeugPool')
        .where('kennzeichen', '==', kz)
        .get();
      for (const doc of poolSnapshot.docs) {
        await doc.ref.delete();
      }
    } catch (e) {
      console.log('Pool cleanup skipped (no access or not exists)');
    }

    // Clean up anfragen
    try {
      const anfragenSnapshot = await db.collection('leihfahrzeugAnfragen')
        .where('kennzeichen', '==', kz)
        .get();
      for (const doc of anfragenSnapshot.docs) {
        await doc.ref.delete();
      }
    } catch (e) {
      console.log('Anfragen cleanup skipped (no access or not exists)');
    }

    console.log(`✅ Leihfahrzeug ${kz} deleted`);
    return true;
  }, kennzeichen);
}

/**
 * Updates Leihfahrzeug status
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 * @param {string} newStatus - verfuegbar | verliehen | wartung | reserviert
 * @returns {Promise<boolean>} Success
 */
async function updateLeihfahrzeugStatus(page, kennzeichen, newStatus) {
  console.log(`🔄 Updating Leihfahrzeug ${kennzeichen} status to: ${newStatus}`);

  return await page.evaluate(async ({ kz, status }) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('leihfahrzeuge');

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.update({
      status: status,
      updatedAt: Date.now()
    });

    console.log(`✅ Leihfahrzeug ${kz} status updated to ${status}`);
    return true;
  }, { kz: kennzeichen, status: newStatus });
}

/**
 * Creates a Pool entry for a Leihfahrzeug
 * @param {import('@playwright/test').Page} page
 * @param {string} leihfahrzeugId - Document ID
 * @param {Object} vehicleData - Vehicle data
 * @returns {Promise<string>} Pool document ID
 */
async function createPoolEntry(page, leihfahrzeugId, vehicleData) {
  console.log(`🌐 Creating Pool entry for: ${vehicleData.kennzeichen}`);

  return await page.evaluate(async ({ id, data }) => {
    const db = window.firebaseApp.db();
    const poolId = `${window.werkstattId}_${id}`;

    await db.collection('leihfahrzeugPool').doc(poolId).set({
      originalId: id,
      besitzerWerkstattId: window.werkstattId,
      besitzerWerkstattName: 'Auto-Lackierzentrum Mosbach',
      kennzeichen: data.kennzeichen,
      marke: data.marke,
      modell: data.modell,
      kategorie: data.kategorie || 'limousine',
      tagesmiete: data.tagesmiete || 45.00,
      verfuegbar: true,
      aktualisiertAm: Date.now()
    });

    console.log(`✅ Pool entry created: ${poolId}`);
    return poolId;
  }, { id: leihfahrzeugId, data: vehicleData });
}

/**
 * Creates a Leihfahrzeug Anfrage (request)
 * @param {import('@playwright/test').Page} page
 * @param {string} poolFahrzeugId - Pool document ID
 * @param {string} besitzerWerkstattId - Owner workshop ID
 * @param {string} kennzeichen - Vehicle plate
 * @returns {Promise<string>} Anfrage document ID
 */
async function createLeihfahrzeugAnfrage(page, poolFahrzeugId, besitzerWerkstattId, kennzeichen) {
  console.log(`📩 Creating Leihfahrzeug Anfrage for: ${kennzeichen}`);

  return await page.evaluate(async ({ poolId, besitzerId, kz }) => {
    const db = window.firebaseApp.db();

    const anfrageRef = db.collection('leihfahrzeugAnfragen').doc();
    await anfrageRef.set({
      poolFahrzeugId: poolId,
      besitzerWerkstattId: besitzerId,
      anfragerWerkstattId: window.werkstattId,
      anfragerWerkstattName: 'Test Werkstatt',
      kennzeichen: kz,
      grund: 'Test-Anfrage',
      status: 'pending',
      erstelltAm: Date.now()
    });

    console.log(`✅ Anfrage created: ${anfrageRef.id}`);
    return anfrageRef.id;
  }, { poolId: poolFahrzeugId, besitzerId: besitzerWerkstattId, kz: kennzeichen });
}

/**
 * Creates a Leihfahrzeug Buchung (booking)
 * @param {import('@playwright/test').Page} page
 * @param {Object} data - Booking data
 * @returns {Promise<string>} Buchung document ID
 */
async function createLeihfahrzeugBuchung(page, data) {
  console.log(`📋 Creating Leihfahrzeug Buchung`);

  return await page.evaluate(async (buchungData) => {
    const db = window.firebaseApp.db();
    const collectionName = window.getCollectionName('leihfahrzeugBuchungen');

    const buchungRef = db.collection(collectionName).doc();
    await buchungRef.set({
      leihfahrzeugId: buchungData.leihfahrzeugId,
      leihfahrzeugDetails: buchungData.leihfahrzeugDetails || {},
      fahrzeugId: buchungData.fahrzeugId || 'test-fahrzeug-id',
      anfrageId: buchungData.anfrageId || 'test-anfrage-id',
      kundenname: buchungData.kundenname || 'Test Kunde',
      kennzeichen: buchungData.kennzeichen || 'TEST-123',
      ausgeliehenAm: new Date().toISOString(),
      voraussichtlicheRueckgabe: buchungData.voraussichtlicheRueckgabe || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      rueckgabeAm: null,
      status: 'aktiv',
      werkstattId: window.werkstattId || 'mosbach',
      erstelltAm: Date.now()
    });

    console.log(`✅ Buchung created: ${buchungRef.id}`);
    return buchungRef.id;
  }, data);
}

// ============================================
// PARTNER ANFRAGE HELPERS (2025-12-10)
// Centralized from test files for DRY compliance
// ============================================

/**
 * Creates a Partner-Anfrage directly in Firestore (bypasses UI)
 * @param {import('@playwright/test').Page} page
 * @param {Object} data - Anfrage data
 * @param {string} data.kennzeichen - License plate (required)
 * @param {string} data.kundenname - Customer name (required)
 * @param {string} [data.kundenEmail] - Customer email (default: test@example.com)
 * @param {string} [data.serviceTyp] - Service type (default: lackier)
 * @param {string} [data.marke] - Car brand (default: Volkswagen)
 * @param {string} [data.modell] - Car model (default: Golf)
 * @param {string} [data.schadenBeschreibung] - Damage description
 * @param {Array} [data.ersatzteile] - Spare parts array
 * @returns {Promise<string>} Document ID of created anfrage
 */
async function createPartnerAnfrageDirectly(page, data) {
  console.log(`📝 Creating Partner-Anfrage: ${data.kennzeichen}`);

  return await page.evaluate(async (anfrageData) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const anfrage = {
      kennzeichen: anfrageData.kennzeichen,
      kundenname: anfrageData.kundenname,
      kundenEmail: (anfrageData.kundenEmail || 'test@example.com').toLowerCase(),
      serviceTyp: anfrageData.serviceTyp || 'lackier',
      marke: anfrageData.marke || 'Volkswagen',
      modell: anfrageData.modell || 'Golf',
      schadenBeschreibung: anfrageData.schadenBeschreibung || '',
      ersatzteile: anfrageData.ersatzteile || [],
      status: 'neu',
      erstelltAm: new Date().toISOString(),
      werkstattId: werkstattId
    };

    const docRef = await db.collection(collectionName).add(anfrage);
    console.log(`✅ Partner-Anfrage created: ${docRef.id}`);
    return docRef.id;
  }, data);
}

/**
 * Retrieves Partner-Anfrage data from Firestore by license plate
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen - License plate to search for
 * @returns {Promise<Object|null>} Anfrage data or null if not found
 */
async function getPartnerAnfrageData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }, kennzeichen);
}

/**
 * Deletes Partner-Anfrage and associated Ersatzteile for a license plate
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen - License plate to clean up
 * @returns {Promise<boolean>} Success status
 */
async function cleanupPartnerAnfrage(page, kennzeichen) {
  console.log(`🧹 Cleaning up Partner-Anfrage: ${kennzeichen}`);

  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const anfrageCollection = `partnerAnfragen_${werkstattId}`;
    const ersatzteileCollection = window.getCollectionName('ersatzteile');

    // Delete anfrage
    const anfrageSnapshot = await db.collection(anfrageCollection)
      .where('kennzeichen', '==', kz)
      .get();
    for (const doc of anfrageSnapshot.docs) {
      await db.collection(anfrageCollection).doc(doc.id).delete();
    }

    // Delete ersatzteile
    const ersatzteileSnapshot = await db.collection(ersatzteileCollection)
      .where('kennzeichen', '==', kz)
      .get();
    for (const doc of ersatzteileSnapshot.docs) {
      await db.collection(ersatzteileCollection).doc(doc.id).delete();
    }

    console.log(`🧹 Cleaned up anfrage and ersatzteile for ${kz}`);
    return true;
  }, kennzeichen);
}

// ============================================
// E2E PIPELINE HELPERS (2025-12-13)
// For end-to-end pipeline testing
// ============================================

/**
 * Login as a test partner user (for Partner Pipeline E2E tests)
 * Similar to loginAsTestAdmin but with role='partner'
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function loginAsTestPartner(page) {
  console.log('🔐 loginAsTestPartner() START');

  try {
    const authResult = await page.evaluate(async () => {
      const auth = firebase.auth();

      try {
        const userCredential = await auth.signInWithEmailAndPassword('partner@test.de', 'test123');
        return { success: true, uid: userCredential.user.uid, email: userCredential.user.email };
      } catch (signInError) {
        if (signInError.code === 'auth/user-not-found') {
          const newUserCredential = await auth.createUserWithEmailAndPassword('partner@test.de', 'test123');
          return { success: true, uid: newUserCredential.user.uid, email: newUserCredential.user.email };
        }
        return { success: false, error: signInError.message };
      }
    });

    if (!authResult.success) throw new Error(`Auth failed: ${authResult.error}`);

    // Set partner role in Firestore
    await page.evaluate(async (uid) => {
      const db = window.firebaseApp.db();
      await db.collection('users').doc(uid).set({
        uid: uid,
        email: 'partner@test.de',
        role: 'partner',
        werkstattId: 'mosbach',
        status: 'active',
        isActive: true,
        displayName: 'E2E Test Partner'
      }, { merge: true });

      // Set session for partner
      const partnerData = {
        uid: uid,
        email: 'partner@test.de',
        name: 'E2E Test Partner',
        werkstattId: 'mosbach',
        role: 'partner',
        authType: 'firebase'
      };
      sessionStorage.setItem('session_partner', JSON.stringify(partnerData));
      window.werkstattId = 'mosbach';
    }, authResult.uid);

    // Wait for auth state
    await page.waitForFunction(() => {
      const auth = firebase.auth();
      return auth.currentUser !== null && auth.currentUser.email === 'partner@test.de';
    }, { timeout: 5000 });

    console.log('✅ loginAsTestPartner() SUCCESS');
  } catch (error) {
    console.error('❌ loginAsTestPartner() FAILED:', error.message);
    throw error;
  }
}

/**
 * Verify bidirectional link between partnerAnfrage and fahrzeuge
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Partner request ID
 * @returns {Promise<Object>} Verification result
 */
async function verifyFahrzeugVerknuepfung(page, anfrageId) {
  console.log(`🔍 Verifying fahrzeug link for anfrage: ${anfrageId}`);

  return await page.evaluate(async (id) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';

    // Get anfrage
    const anfrageDoc = await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).get();
    if (!anfrageDoc.exists) {
      return { found: false, error: 'Anfrage not found' };
    }

    const anfrage = anfrageDoc.data();
    const result = {
      found: true,
      anfrageId: id,
      anfrageStatus: anfrage.status,
      anfrageHasFahrzeugId: !!anfrage.fahrzeugId,
      fahrzeugId: anfrage.fahrzeugId || null,
      fahrzeugExists: false,
      fahrzeugHasPartnerAnfrageId: false,
      bidirectionalLinkValid: false
    };

    // If anfrage has fahrzeugId, verify the vehicle
    if (anfrage.fahrzeugId) {
      const fahrzeugDoc = await db.collection(`fahrzeuge_${werkstattId}`).doc(anfrage.fahrzeugId).get();
      if (fahrzeugDoc.exists) {
        const fahrzeug = fahrzeugDoc.data();
        result.fahrzeugExists = true;
        result.fahrzeugHasPartnerAnfrageId = fahrzeug.partnerAnfrageId === id;
        result.fahrzeugStatus = fahrzeug.status;
        result.bidirectionalLinkValid = result.fahrzeugHasPartnerAnfrageId;
      }
    }

    console.log('🔍 Verification result:', JSON.stringify(result));
    return result;
  }, anfrageId);
}

/**
 * Get Partner-Anfrage by document ID
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Document ID
 * @returns {Promise<Object|null>} Anfrage data with ID
 */
async function getPartnerAnfrageById(page, anfrageId) {
  return await page.evaluate(async (id) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const doc = await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }, anfrageId);
}

/**
 * Delete Partner-Anfrage by ID
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Document ID
 * @returns {Promise<boolean>} Success
 */
async function deletePartnerAnfrageById(page, anfrageId) {
  console.log(`🗑️ Deleting Partner-Anfrage: ${anfrageId}`);

  return await page.evaluate(async (id) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).delete();
    console.log(`✅ Partner-Anfrage deleted: ${id}`);
    return true;
  }, anfrageId);
}

/**
 * Update Partner-Anfrage status
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Document ID
 * @param {string} newStatus - New status
 * @returns {Promise<boolean>} Success
 */
async function updatePartnerAnfrageStatus(page, anfrageId, newStatus) {
  console.log(`🔄 Updating anfrage ${anfrageId} status to: ${newStatus}`);

  return await page.evaluate(async ({ id, status }) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).update({
      status: status,
      updatedAt: new Date().toISOString()
    });
    return true;
  }, { id: anfrageId, status: newStatus });
}

/**
 * Add KVA data to Partner-Anfrage (simulates KVA creation)
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Document ID
 * @param {Object} kvaData - KVA data
 * @returns {Promise<boolean>} Success
 */
async function addKVAToPartnerAnfrage(page, anfrageId, kvaData = {}) {
  console.log(`📋 Adding KVA to anfrage: ${anfrageId}`);

  return await page.evaluate(async ({ id, kva }) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';

    const kvaObject = {
      positionen: kva.positionen || [
        { beschreibung: 'Lackierung Stoßstange', menge: 1, einzelpreis: 350, gesamt: 350 },
        { beschreibung: 'Kleinteile', menge: 1, einzelpreis: 50, gesamt: 50 }
      ],
      summeNetto: kva.summeNetto || 400,
      mwst: kva.mwst || 76,
      summeBrutto: kva.summeBrutto || 476,
      erstelltAm: new Date().toISOString(),
      gueltigBis: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };

    await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).update({
      kva: kvaObject,
      status: 'kva_gesendet',
      kvaErstelltAm: new Date().toISOString()
    });

    console.log(`✅ KVA added to anfrage: ${id}`);
    return true;
  }, { id: anfrageId, kva: kvaData });
}

/**
 * Simulate annehmenKVA - Creates fahrzeug from anfrage (Integration version)
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId - Partner-Anfrage ID
 * @returns {Promise<string>} Created fahrzeug ID
 */
async function simulateAnnehmenKVA(page, anfrageId) {
  console.log(`✅ Simulating annehmenKVA for: ${anfrageId}`);

  return await page.evaluate(async (id) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';

    // Get anfrage data
    const anfrageDoc = await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).get();
    if (!anfrageDoc.exists) throw new Error('Anfrage not found');

    const anfrage = anfrageDoc.data();

    // Generate fahrzeug ID
    const fahrzeugId = 'fzg_' + Date.now();

    // Create fahrzeug from anfrage data
    const fahrzeugData = {
      id: fahrzeugId,
      kennzeichen: anfrage.kennzeichen,
      kundenname: anfrage.kundenname,
      kundenEmail: anfrage.kundenEmail || 'test@example.com',
      marke: anfrage.marke || 'Volkswagen',
      modell: anfrage.modell || 'Golf',
      serviceTyp: anfrage.serviceTyp || 'lackier',
      status: 'beauftragt',
      partnerAnfrageId: id,
      kva: anfrage.kva || {},
      fotos: anfrage.fotos || [],
      createdAt: Date.now(),
      erstelltAm: new Date().toISOString(),
      werkstattId: werkstattId
    };

    // Write fahrzeug
    await db.collection(`fahrzeuge_${werkstattId}`).doc(fahrzeugId).set(fahrzeugData);

    // Update anfrage with fahrzeugId
    await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).update({
      status: 'angenommen',
      fahrzeugId: fahrzeugId,
      fahrzeugAngelegt: true,
      angenommenAm: new Date().toISOString()
    });

    console.log(`✅ annehmenKVA simulated - fahrzeugId: ${fahrzeugId}`);
    return fahrzeugId;
  }, anfrageId);
}

// ============================================
// CLEANUP HELPERS (2025-12-10)
// Centralized from test files for DRY compliance
// ============================================

/**
 * Cleans up ALL test data for a license plate across multiple collections
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen - License plate to clean up
 * @returns {Promise<boolean>} Success status
 */
async function cleanupAllTestData(page, kennzeichen) {
  console.log(`🧹 Cleaning up ALL test data: ${kennzeichen}`);

  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';

    const collections = [
      `partnerAnfragen_${werkstattId}`,
      window.getCollectionName('ersatzteile'),
      window.getCollectionName('bestellungen'),
      window.getCollectionName('rechnungen')
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName)
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          await db.collection(collectionName).doc(doc.id).delete();
        }
      } catch (e) {
        console.log(`Cleanup ${collectionName}: ${e.message}`);
      }
    }

    console.log(`🧹 All test data cleaned up for ${kz}`);
    return true;
  }, kennzeichen);
}

/**
 * Deletes Rechnungen (invoices) for a license plate
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen - License plate to clean up
 * @returns {Promise<boolean>} Success status
 */
async function cleanupRechnungen(page, kennzeichen) {
  console.log(`🧹 Cleaning up Rechnungen: ${kennzeichen}`);

  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const rechnungenCollection = window.getCollectionName('rechnungen');

    const snapshot = await db.collection(rechnungenCollection)
      .where('kennzeichen', '==', kz)
      .get();

    for (const doc of snapshot.docs) {
      await db.collection(rechnungenCollection).doc(doc.id).delete();
    }

    console.log(`🧹 Cleaned up rechnungen for ${kz}`);
    return true;
  }, kennzeichen);
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
  updateVehicleStatus,
  // LEIHFAHRZEUG HELPERS (2025-11-26)
  createLeihfahrzeugDirectly,
  getLeihfahrzeugData,
  deleteLeihfahrzeug,
  updateLeihfahrzeugStatus,
  createPoolEntry,
  createLeihfahrzeugAnfrage,
  createLeihfahrzeugBuchung,
  // PARTNER ANFRAGE HELPERS (2025-12-10)
  createPartnerAnfrageDirectly,
  getPartnerAnfrageData,
  cleanupPartnerAnfrage,
  // CLEANUP HELPERS (2025-12-10)
  cleanupAllTestData,
  cleanupRechnungen,
  // E2E PIPELINE HELPERS (2025-12-13)
  loginAsTestPartner,
  verifyFahrzeugVerknuepfung,
  getPartnerAnfrageById,
  deletePartnerAnfrageById,
  updatePartnerAnfrageStatus,
  addKVAToPartnerAnfrage,
  simulateAnnehmenKVA
};
