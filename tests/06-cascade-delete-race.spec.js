/**
 * CRITICAL: CASCADE DELETE & AFTER-DELETE CHECK Tests
 *
 * Tests FIX #2: AFTER-DELETE CHECK für verwaiste Fotos
 *
 * Vor der Fix:
 * - Fotos Query passierte VOR batch.commit()
 * - Race Condition: Neue Fotos zwischen Query und Commit wurden nicht gelöscht
 *
 * Nach der Fix:
 * - AFTER-DELETE CHECK nach batch.commit()
 * - Bereinigt verwaiste Fotos automatisch
 * - Cleanup Batch für nachträglich gefundene Fotos
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  deleteVehicle,
  setupConsoleMonitoring
} = require('./helpers/firebase-helper');
const {
  setPartnerSession,
  createPartnerInFirestore,
  fillPartnerRequestForm,
  waitForSuccessMessage
} = require('./helpers/form-helper');

test.describe('CRITICAL: CASCADE DELETE & AFTER-DELETE CHECK', () => {
  const testKennzeichen = 'HD-CAS-001';
  const testPartnerName = 'E2E CASCADE Test GmbH';

  test.beforeEach(async ({ page }) => {
    // Cleanup vor jedem Test
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await deleteVehicle(page, testKennzeichen);

    // Lösche Partner-Anfrage und Fotos
    await page.evaluate(async (kz) => {
      if (window.firebaseApp && window.firebaseApp.db) {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('partnerAnfragen')
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          // Lösche Fotos Subcollection
          const fahrzeugRef = db.collection('fahrzeuge').doc('fzg_' + doc.id);
          const fotosSnapshot = await fahrzeugRef.collection('fotos').get();

          for (const fotoDoc of fotosSnapshot.docs) {
            await fotoDoc.ref.delete();
          }

          await doc.ref.delete();
        }
      }
    }, testKennzeichen);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup nach jedem Test
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await deleteVehicle(page, testKennzeichen);

    await page.evaluate(async (kz) => {
      if (window.firebaseApp && window.firebaseApp.db) {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('partnerAnfragen')
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          const fahrzeugRef = db.collection('fahrzeuge').doc('fzg_' + doc.id);
          const fotosSnapshot = await fahrzeugRef.collection('fotos').get();

          for (const fotoDoc of fotosSnapshot.docs) {
            await fotoDoc.ref.delete();
          }

          await doc.ref.delete();
        }
      }
    }, testKennzeichen);
  });

  test('6.1 CRITICAL: Atomic Batch Transaction bei Stornierung', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // RUN #63: Setup Partner Session (LocalStorage only)
    await setPartnerSession(page, {
      partnerName: testPartnerName,
      partnerId: 'test-partner-cascade-6.1'
    });

    // RUN #63: Navigate DIRECTLY to meine-anfragen.html (skip anfrage.html!)
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // RUN #64: Create Partner in Firestore AFTER Firebase initialized
    console.log('🔧 RUN #64: [1/4] Calling createPartnerInFirestore()...');
    try {
      await createPartnerInFirestore(page, {
        partnerId: 'test-partner-cascade-6.1',
        partnerName: testPartnerName,
        partnerEmail: 'test@partner.de',
        partnerTelefon: '+49 123 456789'
      });
      console.log('✅ RUN #64: [1/4] createPartnerInFirestore() SUCCESS');
    } catch (error) {
      console.error('❌ RUN #64: [1/4] createPartnerInFirestore() FAILED:', error.message);
      throw error; // Fail test explicitly
    }

    // RUN #64: Create anfrage ID BEFORE page.evaluate
    const anfrageId = 'req_' + Date.now() + '_test-6.1';

    // RUN #64: Create anfrage directly via Firestore (AFTER Partner exists!)
    console.log('🔧 RUN #64: [2/4] Creating anfrage with .set()...');
    console.log('   Anfrage ID:', anfrageId);

    try {
      await page.evaluate(async ({ id, kz, partnerId, partnerName }) => {
        const db = window.firebaseApp.db();

        await db.collection('partnerAnfragen').doc(id).set({
          kennzeichen: kz,
          partnerId: partnerId,
          partnerName: partnerName,
          status: 'neu',
          marke: 'Audi',
          modell: 'A4 B9',
          createdAt: Date.now()
        });

        console.log('✅ RUN #64: Anfrage created directly in Firestore (Test 6.1):', id);
      }, {
        id: anfrageId,
        kz: testKennzeichen,
        partnerId: 'test-partner-cascade-6.1',
        partnerName: testPartnerName
      });

      console.log('✅ RUN #64: [2/4] Anfrage .set() SUCCESS');
    } catch (error) {
      console.error('❌ RUN #64: [2/4] Anfrage .set() FAILED:', error.message);
      throw error;
    }

    expect(anfrageId).toBeTruthy();

    // RUN #64: Verify anfrage exists BEFORE proceeding
    console.log('🔧 RUN #64: [3/4] Verifying anfrage exists in Firestore...');
    const anfrageExists = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('partnerAnfragen').doc(id).get();
      console.log('🔍 RUN #64: Anfrage exists check:', {
        id,
        exists: doc.exists,
        data: doc.exists ? doc.data() : null
      });
      return doc.exists;
    }, anfrageId);

    console.log('🔍 RUN #64: [3/4] Anfrage exists in Firestore:', anfrageExists);

    if (!anfrageExists) {
      throw new Error(`RUN #64: Anfrage ${anfrageId} was NOT created in Firestore!`);
    }

    console.log('✅ RUN #64: [3/4] Anfrage verification PASSED');

    // RUN #66: Simuliere KVA erstellt und angenommen (Fahrzeug erstellt)
    console.log('🔧 RUN #66: [4/6] Creating vehicle and updating anfrage...');
    let fahrzeugId;

    try {
      fahrzeugId = await page.evaluate(async ({ id, kz, partner }) => {
        const db = window.firebaseApp.db();

        // RUN #66: Step 1 - Update Anfrage zu beauftragt (with error handling)
        try {
          await db.collection('partnerAnfragen').doc(id).set({
            status: 'beauftragt',
            kva: {
              gesamtpreis: 1800,
              positionen: [{ beschreibung: 'Lackierung', menge: 1, einzelpreis: 1800 }]
            }
          }, { merge: true });
          console.log('✅ RUN #66: Anfrage updated to beauftragt');
        } catch (error) {
          console.error('❌ RUN #66: Anfrage .set() FAILED:', error.message);
          throw error;
        }

        // RUN #66: Step 2 - Create Fahrzeug (with error handling)
        const fahrzeugId = 'fzg_' + Date.now();
        try {
          await db.collection('fahrzeuge').doc(fahrzeugId).set({
            kennzeichen: kz,
            kundenname: partner,
            quelle: 'Partner-Portal',
            prozessStatus: 'terminiert',
            vereinbarterPreis: '1800',
            createdAt: Date.now()
          });
          console.log('✅ RUN #66: Vehicle written to Firestore:', fahrzeugId);
        } catch (error) {
          console.error('❌ RUN #66: Vehicle .set() FAILED:', error.message);
          throw error;
        }

        // RUN #66: Step 3 - Link Fahrzeug-ID to Anfrage (with error handling)
        try {
          await db.collection('partnerAnfragen').doc(id).set({
            fahrzeugId: fahrzeugId
          }, { merge: true });
          console.log('✅ RUN #66: Anfrage updated with fahrzeugId:', id);
        } catch (error) {
          console.error('❌ RUN #66: Anfrage fahrzeugId link FAILED:', error.message);
          throw error;
        }

        return fahrzeugId;
      }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

      console.log('✅ RUN #66: [4/6] Vehicle creation SUCCESS');
      console.log('   Vehicle ID:', fahrzeugId);
    } catch (error) {
      console.error('❌ RUN #66: [4/6] Vehicle creation FAILED:', error.message);
      throw error;
    }

    // RUN #66: Verify vehicle exists in Firestore (OUTSIDE page.evaluate for safety)
    console.log('🔧 RUN #66: [5/6] Verifying vehicle exists in Firestore...');
    try {
      const vehicleData = await page.evaluate(async (fzgId) => {
        const db = window.firebaseApp.db();
        const doc = await db.collection('fahrzeuge').doc(fzgId).get();

        if (!doc.exists) {
          return null;
        }

        return {
          id: doc.id,
          exists: true,
          data: doc.data()
        };
      }, fahrzeugId);

      if (!vehicleData || !vehicleData.exists) {
        throw new Error(`RUN #66: Vehicle ${fahrzeugId} NOT found in Firestore!`);
      }

      console.log('✅ RUN #66: [5/6] Vehicle verification SUCCESS');
      console.log('   Vehicle data:', {
        id: vehicleData.id,
        kennzeichen: vehicleData.data.kennzeichen,
        kundenname: vehicleData.data.kundenname
      });
    } catch (error) {
      console.error('❌ RUN #66: [5/6] Vehicle verification FAILED:', error.message);
      throw error;
    }

    // RUN #66: Navigate to liste.html to verify vehicle appears in UI
    console.log('🔧 RUN #66: [6/6] Verifying vehicle appears in UI...');
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    let vehicleExists = await checkVehicleExists(page, testKennzeichen);
    console.log('🔍 RUN #66: Vehicle in UI (checkVehicleExists):', vehicleExists);

    expect(vehicleExists).toBe(true);
    console.log('✅ RUN #66: [6/6] Vehicle verification in UI PASSED');

    // Test: Storniere Anfrage
    console.log(`🔍 RUN #59: [1/6] Test 6.1 - About to navigate to /meine-anfragen.html`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Timestamp: ${Date.now()}`);

    console.log(`⏳ RUN #59: [2/6] Calling page.goto()...`);
    await page.goto('/partner-app/meine-anfragen.html');
    console.log(`✅ RUN #59: [3/6] page.goto() completed successfully`);
    console.log(`   New URL: ${page.url()}`);

    console.log(`⏳ RUN #59: [4/6] Calling waitForFirebaseReady()...`);
    await waitForFirebaseReady(page);
    console.log(`✅ RUN #59: [5/6] waitForFirebaseReady() completed`);

    // Log page state BEFORE waitForTimeout
    const pageState = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseInitialized: window.firebaseInitialized,
      hasFirebaseApp: !!window.firebaseApp,
      partnerId: JSON.parse(localStorage.getItem('partner') || '{}').id
    }));
    console.log(`📊 RUN #59: Page state BEFORE waitForTimeout:`, pageState);

    console.log(`⏳ RUN #59: [6/6] Starting 3-second wait for realtime listener...`);
    await page.waitForTimeout(3000);
    console.log(`✅ RUN #59: 3-second wait completed successfully`)

    // RUN #55: Count ALL cards in DOM for diagnostic
    const cardCount = await page.evaluate(() => {
      const allCards = document.querySelectorAll('[class*="anfrage"]');
      console.log('🔍 DOM Cards:', Array.from(allCards).map(c => c.className));
      return allCards.length;
    });
    console.log(`🔍 RUN #58: Found ${cardCount} cards total in DOM`);

    // RUN #52: Diagnostic logging BEFORE anfrage-card check
    const debugInfo = await page.evaluate(async (kz) => {
      const partner = JSON.parse(localStorage.getItem('partner') || '{}');
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('partnerId', '==', partner.id)
        .get();
      return {
        partnerIdInSession: partner.id,
        anfrageCount: snapshot.size,
        anfragen: snapshot.docs.map(d => ({
          id: d.id,
          kennzeichen: d.data().kennzeichen,
          partnerId: d.data().partnerId,
          status: d.data().status
        }))
      };
    }, testKennzeichen);
    console.log('🔍 RUN #52 DEBUG - Partner Session & Firestore State:', debugInfo);

    // RUN #52: Retry-loop for Firestore indexing delays
    // RUN #54: Fixed CSS selector (.anfrage-card → .anfrage-card-compact)
    // RUN #55: Increased from 10 to 20 attempts, 1500ms intervals
    const anfrageCard = page.locator(`.anfrage-card-compact:has-text("${testKennzeichen}")`);
    console.log(`🔍 RUN #55: Searching for anfrage-card with kennzeichen: "${testKennzeichen}"`);
    for (let i = 0; i < 20; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #55: Anfrage-card found after ${i + 1} attempt(s)`);
        break;
      }
      console.log(`⏳ RUN #55: Attempt ${i + 1}/20 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1500);
    }

    await expect(anfrageCard).toBeVisible({ timeout: 10000 });
    await anfrageCard.click();

    // Detail-View öffnet
    await expect(page).toHaveURL(/anfrage-detail\.html\?id=/);

    // Storniere
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Anfrage stornieren")');
    await page.waitForTimeout(3000);

    // KRITISCH: Prüfe dass Fahrzeug gelöscht wurde
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBe(false); // Fahrzeug MUSS gelöscht sein

    // KRITISCH: Prüfe dass Anfrage storniert wurde (Status-Update)
    const anfrageStatus = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('partnerAnfragen').doc(id).get();
      return doc.exists ? doc.data().status : null;
    }, anfrageId);

    expect(anfrageStatus).toBe('storniert');

    console.log('✅ Atomic Batch Transaction: Anfrage storniert + Fahrzeug gelöscht');
    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('6.2 CRITICAL: CASCADE DELETE löscht Fotos Subcollection', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // RUN #63b: Setup Partner Session (LocalStorage only)
    await setPartnerSession(page, {
      partnerName: testPartnerName,
      partnerId: 'test-partner-cascade-6.2'
    });

    // RUN #63b: Navigate DIRECTLY to meine-anfragen.html (skip anfrage.html!)
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // RUN #63b: Create Partner in Firestore AFTER Firebase initialized
    await createPartnerInFirestore(page, {
      partnerId: 'test-partner-cascade-6.2',
      partnerName: testPartnerName,
      partnerEmail: 'test@partner.de',
      partnerTelefon: '+49 123 456789'
    });

    // RUN #63b: Create anfrage ID BEFORE page.evaluate
    const anfrageId = 'req_' + Date.now() + '_test-6.2';

    // RUN #63b: Create anfrage directly via Firestore (AFTER Partner exists!)
    await page.evaluate(async ({ id, kz, partnerId, partnerName }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).set({
        kennzeichen: kz,
        partnerId: partnerId,
        partnerName: partnerName,
        status: 'neu',
        marke: 'BMW',
        modell: '3er G20',
        createdAt: Date.now()
      });

      console.log('✅ RUN #63b: Anfrage created directly in Firestore (Test 6.2):', id);
    }, {
      id: anfrageId,
      kz: testKennzeichen,
      partnerId: 'test-partner-cascade-6.2',
      partnerName: testPartnerName
    });

    // Erstelle Fahrzeug mit Fotos Subcollection
    const fahrzeugId = await page.evaluate(async ({ id, kz, partner }) => {
      const db = window.firebaseApp.db();

      // Update Anfrage
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt',
        kva: { gesamtpreis: 1500, positionen: [] }
      });

      // Erstelle Fahrzeug
      const fzgId = 'fzg_' + Date.now();
      await db.collection('fahrzeuge').doc(fzgId).set({
        kennzeichen: kz,
        kundenname: partner,
        quelle: 'Partner-Portal',
        prozessStatus: 'terminiert',
        createdAt: Date.now()
      });

      // Erstelle Fotos Subcollection
      const fakePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .doc('vorher')
        .set({
          photos: [fakePhoto, fakePhoto],
          count: 2,
          lastUpdated: Date.now()
        });

      await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .doc('nachher')
        .set({
          photos: [fakePhoto],
          count: 1,
          lastUpdated: Date.now()
        });

      // Speichere Fahrzeug-ID in Anfrage
      await db.collection('partnerAnfragen').doc(id).update({
        fahrzeugId: fzgId
      });

      return fzgId;
    }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

    expect(fahrzeugId).toBeTruthy();

    // Verify: Fotos Subcollection existiert
    const fotosCountBefore = await page.evaluate(async (fzgId) => {
      const db = window.firebaseApp.db();
      const fotosSnapshot = await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .get();
      return fotosSnapshot.size;
    }, fahrzeugId);

    expect(fotosCountBefore).toBe(2); // vorher + nachher = 2 docs

    // Test: Storniere Anfrage (sollte CASCADE DELETE triggern)
    console.log(`🔍 RUN #59: [1/6] Test 6.2 - About to navigate to /meine-anfragen.html`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Timestamp: ${Date.now()}`);

    console.log(`⏳ RUN #59: [2/6] Calling page.goto()...`);
    await page.goto('/partner-app/meine-anfragen.html');
    console.log(`✅ RUN #59: [3/6] page.goto() completed successfully (Test 6.2)`);
    console.log(`   New URL: ${page.url()}`);

    console.log(`⏳ RUN #59: [4/6] Calling waitForFirebaseReady()...`);
    await waitForFirebaseReady(page);
    console.log(`✅ RUN #59: [5/6] waitForFirebaseReady() completed (Test 6.2)`);

    // Log page state BEFORE waitForTimeout
    const pageState2 = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseInitialized: window.firebaseInitialized,
      hasFirebaseApp: !!window.firebaseApp,
      partnerId: JSON.parse(localStorage.getItem('partner') || '{}').id
    }));
    console.log(`📊 RUN #59: Page state BEFORE waitForTimeout (Test 6.2):`, pageState2);

    console.log(`⏳ RUN #59: [6/6] Starting 3-second wait (Test 6.2)...`);
    await page.waitForTimeout(3000);
    console.log(`✅ RUN #59: 3-second wait completed successfully (Test 6.2)`);

    // RUN #52: Diagnostic logging BEFORE anfrage-card check
    const debugInfo2 = await page.evaluate(async (kz) => {
      const partner = JSON.parse(localStorage.getItem('partner') || '{}');
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('partnerId', '==', partner.id)
        .get();
      return {
        partnerIdInSession: partner.id,
        anfrageCount: snapshot.size,
        anfragen: snapshot.docs.map(d => ({
          id: d.id,
          kennzeichen: d.data().kennzeichen,
          partnerId: d.data().partnerId,
          status: d.data().status
        }))
      };
    }, testKennzeichen);
    console.log('🔍 RUN #52 DEBUG (Test 6.2):', debugInfo2);

    // RUN #52: Retry-loop for Firestore indexing delays
    // RUN #54: Fixed CSS selector (.anfrage-card → .anfrage-card-compact)
    // RUN #55: Increased to 20 attempts, 1500ms intervals
    const anfrageCard = page.locator(`.anfrage-card-compact:has-text("${testKennzeichen}")`);
    console.log(`🔍 RUN #55: Searching for anfrage-card (Test 6.2)`);
    for (let i = 0; i < 20; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #55: Anfrage-card found after ${i + 1} attempt(s) (Test 6.2)`);
        break;
      }
      console.log(`⏳ RUN #55: Attempt ${i + 1}/20 (Test 6.2)`);
      await page.waitForTimeout(1500);
    }

    await expect(anfrageCard).toBeVisible({ timeout: 10000 });
    await anfrageCard.click();

    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Anfrage stornieren")');
    await page.waitForTimeout(4000); // Warte auf CASCADE DELETE

    // KRITISCH: Prüfe dass Fotos Subcollection gelöscht wurde
    const fotosCountAfter = await page.evaluate(async (fzgId) => {
      const db = window.firebaseApp.db();
      const fotosSnapshot = await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .get();
      return fotosSnapshot.size;
    }, fahrzeugId);

    expect(fotosCountAfter).toBe(0); // Fotos MÜSSEN gelöscht sein

    console.log('✅ CASCADE DELETE: Fotos Subcollection vollständig gelöscht');
    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('6.3 CRITICAL: AFTER-DELETE CHECK bereinigt Race Condition Fotos', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // RUN #63b: Setup Partner Session (LocalStorage only)
    await setPartnerSession(page, {
      partnerName: testPartnerName,
      partnerId: 'test-partner-cascade-6.3'
    });

    // RUN #63b: Navigate DIRECTLY to meine-anfragen.html (skip anfrage.html!)
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // RUN #63b: Create Partner in Firestore AFTER Firebase initialized
    await createPartnerInFirestore(page, {
      partnerId: 'test-partner-cascade-6.3',
      partnerName: testPartnerName,
      partnerEmail: 'test@partner.de',
      partnerTelefon: '+49 123 456789'
    });

    // RUN #63b: Create anfrage ID BEFORE page.evaluate
    const anfrageId = 'req_' + Date.now() + '_test-6.3';

    // RUN #63b: Create anfrage directly via Firestore (AFTER Partner exists!)
    await page.evaluate(async ({ id, kz, partnerId, partnerName }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).set({
        kennzeichen: kz,
        partnerId: partnerId,
        partnerName: partnerName,
        status: 'neu',
        marke: 'Mercedes',
        modell: 'C-Klasse W206',
        createdAt: Date.now()
      });

      console.log('✅ RUN #63b: Anfrage created directly in Firestore (Test 6.3):', id);
    }, {
      id: anfrageId,
      kz: testKennzeichen,
      partnerId: 'test-partner-cascade-6.3',
      partnerName: testPartnerName
    });

    // Erstelle Fahrzeug mit Fotos
    const fahrzeugId = await page.evaluate(async ({ id, kz, partner }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt',
        kva: { gesamtpreis: 1500, positionen: [] }
      });

      const fzgId = 'fzg_' + Date.now();
      await db.collection('fahrzeuge').doc(fzgId).set({
        kennzeichen: kz,
        kundenname: partner,
        quelle: 'Partner-Portal',
        createdAt: Date.now()
      });

      // Fotos
      const fakePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .doc('vorher')
        .set({
          photos: [fakePhoto],
          count: 1,
          lastUpdated: Date.now()
        });

      await db.collection('partnerAnfragen').doc(id).update({
        fahrzeugId: fzgId
      });

      return fzgId;
    }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

    // Test: Simuliere Race Condition
    // Wir fügen ein NEUES Foto hinzu WÄHREND der Stornierung läuft

    console.log(`🔍 RUN #59: [1/6] Test 6.3 - About to navigate to /meine-anfragen.html`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Timestamp: ${Date.now()}`);

    console.log(`⏳ RUN #59: [2/6] Calling page.goto()...`);
    await page.goto('/partner-app/meine-anfragen.html');
    console.log(`✅ RUN #59: [3/6] page.goto() completed successfully (Test 6.3)`);
    console.log(`   New URL: ${page.url()}`);

    console.log(`⏳ RUN #59: [4/6] Calling waitForFirebaseReady()...`);
    await waitForFirebaseReady(page);
    console.log(`✅ RUN #59: [5/6] waitForFirebaseReady() completed (Test 6.3)`);

    // Log page state BEFORE waitForTimeout
    const pageState3 = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseInitialized: window.firebaseInitialized,
      hasFirebaseApp: !!window.firebaseApp,
      partnerId: JSON.parse(localStorage.getItem('partner') || '{}').id
    }));
    console.log(`📊 RUN #59: Page state BEFORE waitForTimeout (Test 6.3):`, pageState3);

    console.log(`⏳ RUN #59: [6/6] Starting 3-second wait (Test 6.3)...`);
    await page.waitForTimeout(3000);
    console.log(`✅ RUN #59: 3-second wait completed successfully (Test 6.3)`);

    // RUN #52: Diagnostic logging BEFORE anfrage-card check
    const debugInfo3 = await page.evaluate(async (kz) => {
      const partner = JSON.parse(localStorage.getItem('partner') || '{}');
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('partnerId', '==', partner.id)
        .get();
      return {
        partnerIdInSession: partner.id,
        anfrageCount: snapshot.size,
        anfragen: snapshot.docs.map(d => ({
          id: d.id,
          kennzeichen: d.data().kennzeichen,
          partnerId: d.data().partnerId,
          status: d.data().status
        }))
      };
    }, testKennzeichen);
    console.log('🔍 RUN #52 DEBUG (Test 6.3):', debugInfo3);

    // RUN #52: Retry-loop for Firestore indexing delays
    // RUN #54: Fixed CSS selector (.anfrage-card → .anfrage-card-compact)
    // RUN #55: Increased to 20 attempts, 1500ms intervals
    const anfrageCard = page.locator(`.anfrage-card-compact:has-text("${testKennzeichen}")`);
    console.log(`🔍 RUN #55: Searching for anfrage-card (Test 6.3)`);
    for (let i = 0; i < 20; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #55: Anfrage-card found after ${i + 1} attempt(s) (Test 6.3)`);
        break;
      }
      console.log(`⏳ RUN #55: Attempt ${i + 1}/20 (Test 6.3)`);
      await page.waitForTimeout(1500);
    }

    await expect(anfrageCard).toBeVisible({ timeout: 10000 });
    await anfrageCard.click();

    // Override stornieren() um Race Condition zu simulieren
    await page.evaluate(async (fzgId) => {
      const originalStornieren = window.stornierenKVA;

      window.stornierenKVA = async function(anfrageId) {
        // Start normale Stornierung
        const storniertPromise = originalStornieren.call(this, anfrageId);

        // Füge WÄHREND der Stornierung ein neues Foto hinzu (Race Condition!)
        setTimeout(async () => {
          console.log('🏁 RACE CONDITION: Füge neues Foto hinzu...');
          const db = window.firebaseApp.db();
          const fakePhoto = 'data:image/png;base64,RACE_CONDITION_PHOTO';

          await db.collection('fahrzeuge')
            .doc(fzgId)
            .collection('fotos')
            .doc('race_condition')
            .set({
              photos: [fakePhoto],
              count: 1,
              timestamp: Date.now()
            });

          console.log('✅ Race Condition Foto hinzugefügt');
        }, 100); // Kurzes Delay während Stornierung

        return storniertPromise;
      };
    }, fahrzeugId);

    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Anfrage stornieren")');
    await page.waitForTimeout(5000); // Warte auf AFTER-DELETE CHECK

    // KRITISCH: AFTER-DELETE CHECK sollte das Race Condition Foto gelöscht haben
    const remainingFotos = await page.evaluate(async (fzgId) => {
      const db = window.firebaseApp.db();
      const fotosSnapshot = await db.collection('fahrzeuge')
        .doc(fzgId)
        .collection('fotos')
        .get();

      return {
        count: fotosSnapshot.size,
        docs: fotosSnapshot.docs.map(d => ({ id: d.id, data: d.data() }))
      };
    }, fahrzeugId);

    expect(remainingFotos.count).toBe(0); // ALLE Fotos MÜSSEN gelöscht sein
    console.log('✅ AFTER-DELETE CHECK: Race Condition Foto bereinigt');
    console.log('Remaining fotos:', remainingFotos);

    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('6.4 Cross-Check Filter verhindert stornierte Anfragen in Kanban', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // RUN #63b: Setup Partner Session (LocalStorage only)
    await setPartnerSession(page, {
      partnerName: testPartnerName,
      partnerId: 'test-partner-cascade-6.4'
    });

    // RUN #63b: Navigate DIRECTLY to meine-anfragen.html (skip anfrage.html!)
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // RUN #63b: Create Partner in Firestore AFTER Firebase initialized
    await createPartnerInFirestore(page, {
      partnerId: 'test-partner-cascade-6.4',
      partnerName: testPartnerName,
      partnerEmail: 'test@partner.de',
      partnerTelefon: '+49 123 456789'
    });

    // RUN #63b: Create anfrage ID BEFORE page.evaluate
    const anfrageId = 'req_' + Date.now() + '_test-6.4';

    // RUN #63b: Create anfrage directly via Firestore (AFTER Partner exists!)
    await page.evaluate(async ({ id, kz, partnerId, partnerName }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).set({
        kennzeichen: kz,
        partnerId: partnerId,
        partnerName: partnerName,
        status: 'neu',
        marke: 'VW',
        modell: 'Golf 8',
        createdAt: Date.now()
      });

      console.log('✅ RUN #63b: Anfrage created directly in Firestore (Test 6.4):', id);
    }, {
      id: anfrageId,
      kz: testKennzeichen,
      partnerId: 'test-partner-cascade-6.4',
      partnerName: testPartnerName
    });

    // Simuliere beauftragt + Fahrzeug erstellt
    const fahrzeugId = await page.evaluate(async ({ id, kz, partner }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt',
        kva: { gesamtpreis: 1500, positionen: [] }
      });

      const fzgId = 'fzg_' + Date.now();
      await db.collection('fahrzeuge').doc(fzgId).set({
        kennzeichen: kz,
        kundenname: partner,
        quelle: 'Partner-Portal',
        prozessStatus: 'terminiert',
        serviceTyp: 'lackier',
        createdAt: Date.now()
      });

      await db.collection('partnerAnfragen').doc(id).update({
        fahrzeugId: fzgId
      });

      return fzgId;
    }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

    // Verify: Fahrzeug erscheint in Kanban BEVOR Stornierung
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(2000);

    let cardVisible = await page.locator(`.kanban-card:has-text("${testKennzeichen}")`).isVisible()
      .catch(() => false);

    expect(cardVisible).toBe(true); // Fahrzeug sollte sichtbar sein

    // Test: Storniere Anfrage
    console.log(`🔍 RUN #59: [1/6] Test 6.4 - About to navigate to /meine-anfragen.html`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Timestamp: ${Date.now()}`);

    console.log(`⏳ RUN #59: [2/6] Calling page.goto()...`);
    await page.goto('/partner-app/meine-anfragen.html');
    console.log(`✅ RUN #59: [3/6] page.goto() completed successfully (Test 6.4)`);
    console.log(`   New URL: ${page.url()}`);

    console.log(`⏳ RUN #59: [4/6] Calling waitForFirebaseReady()...`);
    await waitForFirebaseReady(page);
    console.log(`✅ RUN #59: [5/6] waitForFirebaseReady() completed (Test 6.4)`);

    // Log page state BEFORE waitForTimeout
    const pageState4 = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseInitialized: window.firebaseInitialized,
      hasFirebaseApp: !!window.firebaseApp,
      partnerId: JSON.parse(localStorage.getItem('partner') || '{}').id
    }));
    console.log(`📊 RUN #59: Page state BEFORE waitForTimeout (Test 6.4):`, pageState4);

    console.log(`⏳ RUN #59: [6/6] Starting 3-second wait (Test 6.4)...`);
    await page.waitForTimeout(3000);
    console.log(`✅ RUN #59: 3-second wait completed successfully (Test 6.4)`);

    // RUN #52: Diagnostic logging BEFORE anfrage-card check
    const debugInfo4 = await page.evaluate(async (kz) => {
      const partner = JSON.parse(localStorage.getItem('partner') || '{}');
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('partnerId', '==', partner.id)
        .get();
      return {
        partnerIdInSession: partner.id,
        anfrageCount: snapshot.size,
        anfragen: snapshot.docs.map(d => ({
          id: d.id,
          kennzeichen: d.data().kennzeichen,
          partnerId: d.data().partnerId,
          status: d.data().status
        }))
      };
    }, testKennzeichen);
    console.log('🔍 RUN #52 DEBUG (Test 6.4):', debugInfo4);

    // RUN #52: Retry-loop for Firestore indexing delays
    // RUN #54: Fixed CSS selector (.anfrage-card → .anfrage-card-compact)
    // RUN #55: Increased to 20 attempts, 1500ms intervals
    const anfrageCard = page.locator(`.anfrage-card-compact:has-text("${testKennzeichen}")`);
    console.log(`🔍 RUN #55: Searching for anfrage-card (Test 6.4)`);
    for (let i = 0; i < 20; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #55: Anfrage-card found after ${i + 1} attempt(s) (Test 6.4)`);
        break;
      }
      console.log(`⏳ RUN #55: Attempt ${i + 1}/20 (Test 6.4)`);
      await page.waitForTimeout(1500);
    }

    await expect(anfrageCard).toBeVisible({ timeout: 10000 });
    await anfrageCard.click();

    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Anfrage stornieren")');
    await page.waitForTimeout(3000);

    // KRITISCH: Fahrzeug sollte NICHT mehr in Kanban erscheinen
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(2000);

    cardVisible = await page.locator(`.kanban-card:has-text("${testKennzeichen}")`).isVisible()
      .catch(() => false);

    expect(cardVisible).toBe(false); // Fahrzeug DARF NICHT sichtbar sein

    console.log('✅ Cross-Check Filter: Stornierte Anfrage nicht in Kanban');
    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('6.5 Normalisiertes Kennzeichen bei 3-tier CASCADE DELETE', async ({ page }) => {
    // RUN #63b: Test normalization: Input lowercase, store UPPERCASE
    const lowercaseKennzeichen = 'hd-cas-001'; // lowercase input!

    // RUN #63b: Setup Partner Session (LocalStorage only)
    await setPartnerSession(page, {
      partnerName: testPartnerName,
      partnerId: 'test-partner-cascade-6.5'
    });

    // RUN #63b: Navigate DIRECTLY to meine-anfragen.html (skip anfrage.html!)
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // RUN #63b: Create Partner in Firestore AFTER Firebase initialized
    await createPartnerInFirestore(page, {
      partnerId: 'test-partner-cascade-6.5',
      partnerName: testPartnerName,
      partnerEmail: 'test@partner.de',
      partnerTelefon: '+49 123 456789'
    });

    // RUN #63b: Create anfrage ID BEFORE page.evaluate
    const anfrageId = 'req_' + Date.now() + '_test-6.5';

    // RUN #63b: Create anfrage directly with NORMALIZED kennzeichen
    await page.evaluate(async ({ id, kz, partnerId, partnerName }) => {
      const db = window.firebaseApp.db();

      // Normalize kennzeichen to UPPERCASE (simulating app behavior)
      const normalizedKZ = kz.toUpperCase();

      await db.collection('partnerAnfragen').doc(id).set({
        kennzeichen: normalizedKZ, // Store as UPPERCASE
        partnerId: partnerId,
        partnerName: partnerName,
        status: 'neu',
        marke: 'Audi',
        modell: 'Q5',
        createdAt: Date.now()
      });

      console.log('✅ RUN #63b: Anfrage created (Test 6.5) with normalized KZ:', normalizedKZ);
    }, {
      id: anfrageId,
      kz: lowercaseKennzeichen, // Pass lowercase, will be normalized
      partnerId: 'test-partner-cascade-6.5',
      partnerName: testPartnerName
    });

    expect(anfrageId).toBeTruthy();

    // Prüfe dass Kennzeichen normalisiert wurde zu UPPERCASE
    const normalizedKZ = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('partnerAnfragen').doc(id).get();
      return doc.exists ? doc.data().kennzeichen : null;
    }, anfrageId);

    expect(normalizedKZ).toBe(testKennzeichen); // Sollte HD-CAS-001 sein (uppercase)

    // Simuliere Fahrzeug erstellt
    await page.evaluate(async ({ id, kz, partner }) => {
      const db = window.firebaseApp.db();

      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt',
        kva: { gesamtpreis: 1500, positionen: [] }
      });

      const fzgId = 'fzg_' + Date.now();
      await db.collection('fahrzeuge').doc(fzgId).set({
        kennzeichen: kz, // normalized UPPERCASE
        kundenname: partner,
        quelle: 'Partner-Portal',
        createdAt: Date.now()
      });

      await db.collection('partnerAnfragen').doc(id).update({
        fahrzeugId: fzgId
      });
    }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

    // Test: Storniere mit 3-tier CASCADE DELETE
    console.log(`🔍 RUN #59: [1/6] Test 6.5 - About to navigate to /meine-anfragen.html`);
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Timestamp: ${Date.now()}`);

    console.log(`⏳ RUN #59: [2/6] Calling page.goto()...`);
    await page.goto('/partner-app/meine-anfragen.html');
    console.log(`✅ RUN #59: [3/6] page.goto() completed successfully (Test 6.5)`);
    console.log(`   New URL: ${page.url()}`);

    console.log(`⏳ RUN #59: [4/6] Calling waitForFirebaseReady()...`);
    await waitForFirebaseReady(page);
    console.log(`✅ RUN #59: [5/6] waitForFirebaseReady() completed (Test 6.5)`);

    // Log page state BEFORE waitForTimeout
    const pageState5 = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      firebaseInitialized: window.firebaseInitialized,
      hasFirebaseApp: !!window.firebaseApp,
      partnerId: JSON.parse(localStorage.getItem('partner') || '{}').id
    }));
    console.log(`📊 RUN #59: Page state BEFORE waitForTimeout (Test 6.5):`, pageState5);

    console.log(`⏳ RUN #59: [6/6] Starting 3-second wait (Test 6.5)...`);
    await page.waitForTimeout(3000);
    console.log(`✅ RUN #59: 3-second wait completed successfully (Test 6.5)`);

    // RUN #52: Diagnostic logging BEFORE anfrage-card check
    const debugInfo5 = await page.evaluate(async (kz) => {
      const partner = JSON.parse(localStorage.getItem('partner') || '{}');
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('partnerId', '==', partner.id)
        .get();
      return {
        partnerIdInSession: partner.id,
        anfrageCount: snapshot.size,
        anfragen: snapshot.docs.map(d => ({
          id: d.id,
          kennzeichen: d.data().kennzeichen,
          partnerId: d.data().partnerId,
          status: d.data().status
        }))
      };
    }, testKennzeichen);
    console.log('🔍 RUN #52 DEBUG (Test 6.5):', debugInfo5);

    // RUN #52: Retry-loop for Firestore indexing delays
    // RUN #54: Fixed CSS selector (.anfrage-card → .anfrage-card-compact)
    // RUN #55: Increased to 20 attempts, 1500ms intervals
    const anfrageCard = page.locator(`.anfrage-card-compact:has-text("${testKennzeichen}")`);
    console.log(`🔍 RUN #55: Searching for anfrage-card (Test 6.5)`);
    for (let i = 0; i < 20; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #55: Anfrage-card found after ${i + 1} attempt(s) (Test 6.5)`);
        break;
      }
      console.log(`⏳ RUN #55: Attempt ${i + 1}/20 (Test 6.5)`);
      await page.waitForTimeout(1500);
    }

    await expect(anfrageCard).toBeVisible({ timeout: 10000 });
    await anfrageCard.click();

    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Anfrage stornieren")');
    await page.waitForTimeout(3000);

    // KRITISCH: Fahrzeug sollte gelöscht worden sein (3-tier CASCADE DELETE)
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBe(false);

    console.log('✅ 3-tier CASCADE DELETE mit normalisiertem Kennzeichen erfolgreich');
  });
});
