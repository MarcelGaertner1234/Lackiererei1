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

    // Setup: Erstelle vollständigen Partner-Flow
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen,
      marke: 'Audi',
      modell: 'A4 B9'
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

    expect(anfrageId).toBeTruthy();

    // Simuliere KVA erstellt und angenommen (Fahrzeug erstellt)
    await page.evaluate(async ({ id, kz, partner }) => {
      const db = window.firebaseApp.db();

      // Update Anfrage zu beauftragt
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'beauftragt',
        kva: {
          gesamtpreis: 1800,
          positionen: [{ beschreibung: 'Lackierung', menge: 1, einzelpreis: 1800 }]
        }
      });

      // Erstelle Fahrzeug
      const fahrzeugId = 'fzg_' + Date.now();
      await db.collection('fahrzeuge').doc(fahrzeugId).set({
        kennzeichen: kz,
        kundenname: partner,
        quelle: 'Partner-Portal',
        prozessStatus: 'terminiert',
        vereinbarterPreis: '1800',
        createdAt: Date.now()
      });

      // Speichere Fahrzeug-ID in Anfrage
      await db.collection('partnerAnfragen').doc(id).update({
        fahrzeugId: fahrzeugId
      });
    }, { id: anfrageId, kz: testKennzeichen, partner: testPartnerName });

    // Verify: Fahrzeug existiert
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    let vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBe(true);

    // Test: Storniere Anfrage
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

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
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    for (let i = 0; i < 10; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #52: Anfrage-card found after ${i + 1} attempts`);
        break;
      }
      console.log(`⏳ RUN #52: Attempt ${i + 1}/10 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1000);
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

    // Setup: Erstelle Anfrage → KVA → Annahme mit Fotos
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

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
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

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
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    for (let i = 0; i < 10; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #52: Anfrage-card found after ${i + 1} attempts`);
        break;
      }
      console.log(`⏳ RUN #52: Attempt ${i + 1}/10 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1000);
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

    // Setup: Erstelle Fahrzeug mit Fotos
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

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

    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

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
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    for (let i = 0; i < 10; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #52: Anfrage-card found after ${i + 1} attempts`);
        break;
      }
      console.log(`⏳ RUN #52: Attempt ${i + 1}/10 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1000);
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

    // Setup: Erstelle und storniere Anfrage
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

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
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

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
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    for (let i = 0; i < 10; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #52: Anfrage-card found after ${i + 1} attempts`);
        break;
      }
      console.log(`⏳ RUN #52: Attempt ${i + 1}/10 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1000);
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
    // Setup: Erstelle Anfrage mit lowercase Kennzeichen
    const lowercaseKennzeichen = 'hd-cas-001'; // lowercase!

    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: lowercaseKennzeichen // lowercase input
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz.toUpperCase()) // Search uppercase
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, lowercaseKennzeichen);

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
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

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
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    for (let i = 0; i < 10; i++) {
      const visible = await anfrageCard.isVisible().catch(() => false);
      if (visible) {
        console.log(`✅ RUN #52: Anfrage-card found after ${i + 1} attempts`);
        break;
      }
      console.log(`⏳ RUN #52: Attempt ${i + 1}/10 - Waiting for anfrage-card...`);
      await page.waitForTimeout(1000);
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
