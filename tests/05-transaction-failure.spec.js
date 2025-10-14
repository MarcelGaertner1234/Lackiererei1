/**
 * CRITICAL: Transaction Failure & Orphaned Photos Prevention Tests
 *
 * Tests FIX #1: Fotos NACH Transaction Save
 *
 * Vor der Fix:
 * - Fotos wurden VOR Transaction gespeichert
 * - Transaction Failure → Orphaned Photos in Firestore
 *
 * Nach der Fix:
 * - Fotos werden NACH erfolgreicher Transaction gespeichert
 * - Transaction Failure → KEINE Orphaned Photos
 * - fotosFehlgeschlagen flag bei Foto-Upload Fehler
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  deleteVehicle,
  setupConsoleMonitoring,
  findPartnerAnfrageWithRetry
} = require('./helpers/firebase-helper');
const {
  setPartnerSession,
  fillPartnerRequestForm,
  waitForSuccessMessage
} = require('./helpers/form-helper');

test.describe('CRITICAL: Transaction Failure Tests', () => {
  const testKennzeichen = 'HD-TXN-001';
  const testPartnerName = 'E2E Transaction Test GmbH';

  test.beforeEach(async ({ page }) => {
    // Cleanup vor jedem Test
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await deleteVehicle(page, testKennzeichen);

    // Lösche Partner-Anfrage
    await page.evaluate(async (kz) => {
      if (window.firebaseApp && window.firebaseApp.db) {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('partnerAnfragen')
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          // Lösche auch Fotos falls vorhanden
          const fotosSnapshot = await db.collection('fahrzeuge')
            .doc('fzg_' + doc.id)
            .collection('fotos')
            .get();

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
          const fotosSnapshot = await db.collection('fahrzeuge')
            .doc('fzg_' + doc.id)
            .collection('fotos')
            .get();

          for (const fotoDoc of fotosSnapshot.docs) {
            await fotoDoc.ref.delete();
          }

          await doc.ref.delete();
        }
      }
    }, testKennzeichen);
  });

  test('5.1 CRITICAL: Optimistic Locking verhindert Doppel-Annahme', async ({ page, context }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // Setup: Erstelle Anfrage mit KVA
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen,
      marke: 'BMW',
      modell: '3er G20',
      anliefertermin: '2025-10-20'
    });

    // CRITICAL FIX: Wait for button to be enabled and ready to click
    console.log('⏳ Waiting for button "Anfrage senden" to be enabled...');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnNext');
      return btn && !btn.disabled && btn.textContent.includes('Anfrage senden');
    }, { timeout: 5000 });

    console.log('✅ Button "Anfrage senden" is enabled, clicking...');
    await page.click('button:has-text("Anfrage senden")');

    // NEW: Wait for submitAnfrage() to execute (success message OR navigation to detail page)
    console.log('⏳ Waiting for submitAnfrage() to complete...');
    await page.waitForFunction(() => {
      const successMsg = document.querySelector('#successMessage.show');
      const errorMsg = document.querySelector('#error');
      return successMsg || errorMsg || window.location.href.includes('anfrage-detail');
    }, { timeout: 10000 });
    console.log('✅ Submit completed');

    await waitForSuccessMessage(page);

    // CRITICAL FIX RUN #32: Use Retry-Logic to wait for Firestore Index
    console.log('🔍 Test 5.1: Finding Partner-Anfrage with Retry-Logic...');
    const anfrageId = await findPartnerAnfrageWithRetry(page, testKennzeichen, {
      maxAttempts: 10,
      retryDelay: 1000
    });

    expect(anfrageId).toBeTruthy();

    // Simuliere KVA erstellt
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        kva: {
          gesamtpreis: 1500,
          positionen: [
            { beschreibung: 'Stoßstange lackieren', menge: 1, einzelpreis: 1500 }
          ],
          materialkosten: 0,
          notiz: 'E2E Transaction Test'
        }
      });
    }, anfrageId);

    // CRITICAL FIX RUN #31: Verify Firestore status BEFORE opening page
    console.log('⏳ Waiting 5s for Firestore commit + indexing...');
    await page.waitForTimeout(5000);

    // Verify status is correct in Firestore
    const firestoreStatus = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('partnerAnfragen').doc(id).get();
      return doc.exists ? doc.data().status : null;
    }, anfrageId);

    console.log('🔍 Firestore Status BEFORE navigation:', firestoreStatus);
    expect(firestoreStatus).toBe('kva_gesendet'); // MUST be correct!
    console.log('✅ Status verified: kva_gesendet');

    // Test: Simuliere gleichzeitige Annahme von 2 Partnern

    // Partner A öffnet Detail-Seite
    await page.goto(`/partner-app/anfrage-detail.html?id=${anfrageId}`);
    await page.waitForTimeout(500); // Wait for DOMContentLoaded + Firebase init

    // Wait for either #content OR #error to be visible (fail fast if document not found)
    const pageState = await Promise.race([
      page.waitForSelector('#content', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      page.waitForSelector('#error', { state: 'visible', timeout: 15000 }).then(() => 'error')
    ]);

    if (pageState === 'error') {
      const errorMsg = await page.textContent('#error');
      throw new Error(`Partner-Anfrage not found in Firestore: ${errorMsg}`);
    }

    // CRITICAL FIX RUN #31: Wait for button to be visible on Partner A BEFORE opening Partner B
    page.on('dialog', dialog => dialog.accept());

    console.log('⏳ Partner A: Waiting for "KVA annehmen" button to become visible...');
    await page.waitForSelector('button:has-text("KVA annehmen")', {
      state: 'visible',
      timeout: 30000  // 30 seconds to wait for button
    });
    console.log('✅ Partner A: Button visible!');

    // NOW open Partner B page (for simultaneous test)
    const partnerB = await context.newPage();
    const consoleBMonitor = setupConsoleMonitoring(partnerB);
    await partnerB.goto(`/partner-app/anfrage-detail.html?id=${anfrageId}`);
    await partnerB.waitForTimeout(500); // Wait for DOMContentLoaded + Firebase init

    // Wait for either #content OR #error to be visible
    const pageStateB = await Promise.race([
      partnerB.waitForSelector('#content', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      partnerB.waitForSelector('#error', { state: 'visible', timeout: 15000 }).then(() => 'error')
    ]);

    if (pageStateB === 'error') {
      const errorMsgB = await partnerB.textContent('#error');
      throw new Error(`Partner B: Anfrage not found in Firestore: ${errorMsgB}`);
    }

    // Partner A klickt Button (button is already visible from above check)
    console.log('⏳ Partner A: Clicking button...');

    await page.click('button:has-text("KVA annehmen")');

    // Warte kurz bis Transaction processed
    await page.waitForTimeout(2000);

    // Partner B versucht GLEICHZEITIG anzunehmen (sollte FEHLSCHLAGEN)
    partnerB.on('dialog', dialog => dialog.accept());

    // Erwarte Error Toast oder Alert
    let errorDetected = false;
    partnerB.on('dialog', dialog => {
      if (dialog.message().includes('bereits bearbeitet') ||
          dialog.message().includes('Optimistic Locking')) {
        errorDetected = true;
      }
      dialog.accept();
    });

    await partnerB.click('button:has-text("KVA annehmen")');
    await partnerB.waitForTimeout(2000);

    // KRITISCH: Prüfe dass NUR EIN Fahrzeug erstellt wurde
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const vehicleCount = await page.evaluate(async (kz) => {
      const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
      return fahrzeuge.filter(f => f.kennzeichen === kz).length;
    }, testKennzeichen);

    expect(vehicleCount).toBe(1); // NUR EINS, nicht 2!

    // Prüfe dass Fahrzeug korrekte Daten hat
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.kennzeichen).toBe(testKennzeichen);
    expect(vehicleData.vereinbarterPreis).toBe('1500');

    // Cleanup
    await partnerB.close();
  });

  test('5.2 CRITICAL: Transaction Failure → KEINE Orphaned Photos', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // Setup: Erstelle Anfrage mit KVA UND Fotos
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });

    // Füge Foto hinzu (simuliert)
    await page.evaluate(() => {
      // Simuliere Foto-Upload
      const fakePhotoData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      window.testPhotoData = [fakePhotoData];
    });

    // CRITICAL FIX: Wait for button to be enabled and ready to click
    console.log('⏳ Waiting for button "Anfrage senden" to be enabled...');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnNext');
      return btn && !btn.disabled && btn.textContent.includes('Anfrage senden');
    }, { timeout: 5000 });

    console.log('✅ Button "Anfrage senden" is enabled, clicking...');
    await page.click('button:has-text("Anfrage senden")');

    // NEW: Wait for submitAnfrage() to execute (success message OR navigation to detail page)
    console.log('⏳ Waiting for submitAnfrage() to complete...');
    await page.waitForFunction(() => {
      const successMsg = document.querySelector('#successMessage.show');
      const errorMsg = document.querySelector('#error');
      return successMsg || errorMsg || window.location.href.includes('anfrage-detail');
    }, { timeout: 10000 });
    console.log('✅ Submit completed');

    await waitForSuccessMessage(page);

    // CRITICAL FIX RUN #32: Use Retry-Logic to wait for Firestore Index
    console.log('🔍 Test 5.2: Finding Partner-Anfrage with Retry-Logic...');
    const anfrageId = await findPartnerAnfrageWithRetry(page, testKennzeichen, {
      maxAttempts: 10,
      retryDelay: 1000
    });

    // Simuliere KVA mit Fotos
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const fakePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        schadenfotos: [fakePhoto], // Foto-Daten vorhanden
        kva: {
          gesamtpreis: 1500,
          positionen: [{ beschreibung: 'Test', menge: 1, einzelpreis: 1500 }]
        }
      });
    }, anfrageId);

    // Test: Provoziere Transaction Failure durch Status-Änderung VOR Annahme
    await page.goto(`/partner-app/anfrage-detail.html?id=${anfrageId}`);
    await page.waitForTimeout(500); // Wait for DOMContentLoaded + Firebase init

    // Wait for either #content OR #error to be visible
    const pageState2 = await Promise.race([
      page.waitForSelector('#content', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      page.waitForSelector('#error', { state: 'visible', timeout: 15000 }).then(() => 'error')
    ]);

    if (pageState2 === 'error') {
      const errorMsg = await page.textContent('#error');
      throw new Error(`Test 5.2: Anfrage not found in Firestore: ${errorMsg}`);
    }

    // Ändere Status zu 'beauftragt' (macht Transaction fehlschlagen)
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt' // Transaction wird fehlschlagen wegen Optimistic Locking
      });
    }, anfrageId);

    // Versuche KVA anzunehmen (sollte fehlschlagen)
    let errorOccurred = false;
    page.on('dialog', dialog => {
      if (dialog.message().includes('bereits bearbeitet')) {
        errorOccurred = true;
      }
      dialog.accept();
    });

    // CRITICAL FIX RUN #30: Increased timeout to wait for onSnapshot re-render
    console.log('⏳ Test 5.2: Waiting for "KVA annehmen" button to become visible...');
    await page.waitForSelector('button:has-text("KVA annehmen")', {
      state: 'visible',
      timeout: 30000  // 30 seconds to wait for onSnapshot cycle
    });
    console.log('✅ Button visible, clicking...');

    await page.click('button:has-text("KVA annehmen")');
    await page.waitForTimeout(2000);

    // KRITISCH: Prüfe dass KEIN Fahrzeug erstellt wurde
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBe(false); // Fahrzeug sollte NICHT existieren

    // KRITISCH: Prüfe dass KEINE Orphaned Photos existieren
    const orphanedPhotos = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();

      // Suche alle Fahrzeuge Collections nach Fotos mit diesem Kennzeichen
      const fahrzeugeSnapshot = await db.collection('fahrzeuge').get();

      for (const doc of fahrzeugeSnapshot.docs) {
        const fotosSnapshot = await db.collection('fahrzeuge')
          .doc(doc.id)
          .collection('fotos')
          .get();

        if (!fotosSnapshot.empty) {
          // Prüfe ob Foto-IDs mit unserem Kennzeichen matchen
          console.log('Found fotos subcollection for:', doc.id);
          return true;
        }
      }

      return false;
    }, testKennzeichen);

    expect(orphanedPhotos).toBe(false); // KEINE Orphaned Photos!
    expect(errorOccurred).toBe(true); // Error sollte aufgetreten sein
  });

  test('5.3 Foto-Upload Fehler → fotosFehlgeschlagen Flag gesetzt', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // Setup: Erstelle Anfrage mit KVA
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });

    // CRITICAL FIX: Wait for button to be enabled and ready to click
    console.log('⏳ Waiting for button "Anfrage senden" to be enabled...');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnNext');
      return btn && !btn.disabled && btn.textContent.includes('Anfrage senden');
    }, { timeout: 5000 });

    console.log('✅ Button "Anfrage senden" is enabled, clicking...');
    await page.click('button:has-text("Anfrage senden")');

    // NEW: Wait for submitAnfrage() to execute (success message OR navigation to detail page)
    console.log('⏳ Waiting for submitAnfrage() to complete...');
    await page.waitForFunction(() => {
      const successMsg = document.querySelector('#successMessage.show');
      const errorMsg = document.querySelector('#error');
      return successMsg || errorMsg || window.location.href.includes('anfrage-detail');
    }, { timeout: 10000 });
    console.log('✅ Submit completed');

    await waitForSuccessMessage(page);

    // CRITICAL FIX RUN #32: Use Retry-Logic to wait for Firestore Index
    console.log('🔍 Test 5.3: Finding Partner-Anfrage with Retry-Logic...');
    const anfrageId = await findPartnerAnfrageWithRetry(page, testKennzeichen, {
      maxAttempts: 10,
      retryDelay: 1000
    });

    // Simuliere KVA mit KAPUTTEN Foto-Daten (provoziert Upload-Fehler)
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        schadenfotos: ['INVALID_BASE64_DATA'], // Kaputte Foto-Daten
        kva: {
          gesamtpreis: 1500,
          positionen: [{ beschreibung: 'Test', menge: 1, einzelpreis: 1500 }]
        }
      });
    }, anfrageId);

    // Override savePhotosToFirestore um Fehler zu provozieren
    await page.evaluate(() => {
      const originalSave = window.firebaseApp.savePhotosToFirestore;
      window.firebaseApp.savePhotosToFirestore = async function() {
        throw new Error('SIMULATED FOTO UPLOAD FEHLER');
      };
    });

    // KVA annehmen (Transaction sollte ERFOLGEN, Foto-Upload FEHLSCHLAGEN)
    await page.goto(`/partner-app/anfrage-detail.html?id=${anfrageId}`);
    await page.waitForTimeout(500); // Wait for DOMContentLoaded + Firebase init

    // Wait for either #content OR #error to be visible
    const pageState3 = await Promise.race([
      page.waitForSelector('#content', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      page.waitForSelector('#error', { state: 'visible', timeout: 15000 }).then(() => 'error')
    ]);

    if (pageState3 === 'error') {
      const errorMsg = await page.textContent('#error');
      throw new Error(`Test 5.3: Anfrage not found in Firestore: ${errorMsg}`);
    }

    page.on('dialog', dialog => dialog.accept());

    // CRITICAL FIX RUN #30: Increased timeout to wait for onSnapshot re-render
    console.log('⏳ Test 5.3: Waiting for "KVA annehmen" button to become visible...');
    await page.waitForSelector('button:has-text("KVA annehmen")', {
      state: 'visible',
      timeout: 30000  // 30 seconds to wait for onSnapshot cycle
    });
    console.log('✅ Button visible, clicking...');

    await page.click('button:has-text("KVA annehmen")');
    await page.waitForTimeout(3000);

    // KRITISCH: Fahrzeug sollte existieren (Transaction erfolgreich)
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBe(true); // Fahrzeug SOLLTE existieren

    // KRITISCH: fotosFehlgeschlagen Flag sollte gesetzt sein
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.fotosFehlgeschlagen).toBe(true);
    expect(vehicleData.fotosFehlerMeldung).toBeTruthy();
    expect(vehicleData.fotosFehlerMeldung).toContain('FOTO UPLOAD FEHLER');

    console.log('✅ Fahrzeug erstellt mit fotosFehlgeschlagen flag:', vehicleData.fotosFehlgeschlagen);
    console.log('✅ Error Message:', vehicleData.fotosFehlerMeldung);
  });

  test('5.4 LocalStorage Fallback bei Foto-Upload Fehler', async ({ page }) => {
    // Setup: Erstelle Anfrage mit KVA und Fotos
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });

    // CRITICAL FIX: Wait for button to be enabled and ready to click
    console.log('⏳ Waiting for button "Anfrage senden" to be enabled...');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnNext');
      return btn && !btn.disabled && btn.textContent.includes('Anfrage senden');
    }, { timeout: 5000 });

    console.log('✅ Button "Anfrage senden" is enabled, clicking...');
    await page.click('button:has-text("Anfrage senden")');

    // NEW: Wait for submitAnfrage() to execute (success message OR navigation to detail page)
    console.log('⏳ Waiting for submitAnfrage() to complete...');
    await page.waitForFunction(() => {
      const successMsg = document.querySelector('#successMessage.show');
      const errorMsg = document.querySelector('#error');
      return successMsg || errorMsg || window.location.href.includes('anfrage-detail');
    }, { timeout: 10000 });
    console.log('✅ Submit completed');

    await waitForSuccessMessage(page);

    // CRITICAL FIX RUN #32: Use Retry-Logic to wait for Firestore Index
    console.log('🔍 Test 5.4: Finding Partner-Anfrage with Retry-Logic...');
    const anfrageId = await findPartnerAnfrageWithRetry(page, testKennzeichen, {
      maxAttempts: 10,
      retryDelay: 1000
    });

    // Simuliere KVA mit Fotos
    const testPhotoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await page.evaluate(async ({ id, photo }) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        schadenfotos: [photo],
        kva: {
          gesamtpreis: 1500,
          positionen: [{ beschreibung: 'Test', menge: 1, einzelpreis: 1500 }]
        }
      });
    }, { id: anfrageId, photo: testPhotoBase64 });

    // Override Firestore savePhotosToFirestore um Fehler zu simulieren
    await page.evaluate(() => {
      window.firebaseApp.savePhotosToFirestore = async function() {
        throw new Error('FIRESTORE FOTO SAVE FAILED');
      };
    });

    // KVA annehmen
    await page.goto(`/partner-app/anfrage-detail.html?id=${anfrageId}`);
    await page.waitForTimeout(500); // Wait for DOMContentLoaded + Firebase init

    // Wait for either #content OR #error to be visible
    const pageState4 = await Promise.race([
      page.waitForSelector('#content', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      page.waitForSelector('#error', { state: 'visible', timeout: 15000 }).then(() => 'error')
    ]);

    if (pageState4 === 'error') {
      const errorMsg = await page.textContent('#error');
      throw new Error(`Test 5.4: Anfrage not found in Firestore: ${errorMsg}`);
    }

    page.on('dialog', dialog => dialog.accept());

    // CRITICAL FIX RUN #30: Increased timeout to wait for onSnapshot re-render
    console.log('⏳ Test 5.4: Waiting for "KVA annehmen" button to become visible...');
    await page.waitForSelector('button:has-text("KVA annehmen")', {
      state: 'visible',
      timeout: 30000  // 30 seconds to wait for onSnapshot cycle
    });
    console.log('✅ Button visible, clicking...');

    await page.click('button:has-text("KVA annehmen")');
    await page.waitForTimeout(3000);

    // Prüfe LocalStorage Fallback
    const localStorageData = await page.evaluate((kz) => {
      const key = `vehicle_photos_${kz}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }, testKennzeichen);

    expect(localStorageData).toBeTruthy();
    expect(localStorageData.photos).toBeTruthy();
    expect(localStorageData.photos.length).toBeGreaterThan(0);

    console.log('✅ LocalStorage Fallback funktioniert:', localStorageData);
  });
});
