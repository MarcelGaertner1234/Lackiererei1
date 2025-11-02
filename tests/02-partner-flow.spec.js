/**
 * FLOW 2: Partner-Annahme (B2B) Tests
 *
 * Testet den kompletten Partner-Flow:
 * - Partner erstellt Anfrage
 * - Werkstatt erstellt KVA
 * - Partner nimmt KVA an
 * - Fahrzeug erscheint in allen Views
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  deleteVehicle,
  setupConsoleMonitoring,
  loginAsTestAdmin  // RUN #70: Test authentication
} = require('./helpers/firebase-helper');
const {
  setPartnerSession,
  fillPartnerRequestForm,
  waitForSuccessMessage
} = require('./helpers/form-helper');

test.describe('FLOW 2: Partner-Annahme (B2B)', () => {
  const testKennzeichen = 'HD-E2E-001';
  const testPartnerName = 'E2E Test Partner GmbH';

  // RUN #70: Login as test admin BEFORE all tests (enables Firestore access)
  test.beforeAll(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ RUN #70: Test suite authenticated as admin');
  });

  test.afterEach(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    await deleteVehicle(page, testKennzeichen);

    // Lösche auch Partner-Anfrage
    await page.evaluate(async (kz) => {
      if (window.firebaseApp && window.firebaseApp.db) {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('partnerAnfragen')
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          await doc.ref.delete();
        }
      }
    }, testKennzeichen);
  });

  test('2.1 Partner erstellt Lackier-Anfrage', async ({ page }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // 1. Öffne Partner Landing Page
    await page.goto('/partner-app/index.html');
    await waitForFirebaseReady(page);

    // 2. Klicke auf "Lackierung" Service-Karte
    await page.click('a[href*="anfrage.html"]');
    await page.waitForURL(/anfrage\.html/);

    // 3. Fülle Partner-Formular aus
    await fillPartnerRequestForm(page, {
      partnerName: testPartnerName,
      partnerEmail: 'test@partner-e2e.de',
      kennzeichen: testKennzeichen,
      marke: 'BMW',
      modell: '3er G20'
    });

    // 4. Absenden
    await page.click('button:has-text("Anfrage senden")');

    // 5. Success-Message
    const success = await waitForSuccessMessage(page, 'erfolgreich');
    expect(success).toBeTruthy();

    // 6. Prüfe Anfrage in Firestore
    const anfrageExists = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return !snapshot.empty;
    }, testKennzeichen);

    expect(anfrageExists).toBeTruthy();

    // 7. Prüfe Status
    const anfrageData = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
      return null;
    }, testKennzeichen);

    expect(anfrageData).toBeTruthy();
    expect(anfrageData.status).toBe('neu_eingegangen');
    expect(anfrageData.serviceTyp).toBe('lackier');
    expect(anfrageData.partnerName).toBe(testPartnerName);

    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('2.2 Werkstatt erstellt KVA für Partner-Anfrage', async ({ page }) => {
    // Setup: Erstelle Anfrage
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen
    });
    await page.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(page);

    // Hole Anfrage-ID
    const anfrageId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();

      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

    expect(anfrageId).toBeTruthy();

    // Test: Öffne KVA-Erstellung (simuliert Werkstatt-Admin)
    await page.goto(`/partner-app/kva-erstellen.html?anfrage_id=${anfrageId}`);
    await waitForFirebaseReady(page);

    // Fülle KVA aus
    await page.fill('input[name="position1_beschreibung"]', 'Kratzer entfernen Frontstoßstange');
    await page.fill('input[name="position1_menge"]', '1');
    await page.fill('input[name="position1_einzelpreis"]', '450');

    await page.fill('input[name="position2_beschreibung"]', 'Kotflügel lackieren');
    await page.fill('input[name="position2_menge"]', '1');
    await page.fill('input[name="position2_einzelpreis"]', '650');

    await page.fill('input[name="materialkosten"]', '180');

    // Gesamtpreis sollte automatisch berechnet werden
    const gesamtpreis = await page.inputValue('input[name="gesamtpreis"]');
    expect(gesamtpreis).toBe('1280');

    // Speichern
    await page.click('button:has-text("KVA speichern")');
    await waitForSuccessMessage(page, 'gespeichert');

    // Prüfe KVA in Firestore
    const kvaData = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const doc = await db.collection('partnerAnfragen').doc(id).get();
      return doc.exists ? doc.data().kva : null;
    }, anfrageId);

    expect(kvaData).toBeTruthy();
    expect(kvaData.gesamtpreis).toBe(1280);
    expect(kvaData.positionen.length).toBe(2);
  });

  test('2.3 KRITISCH: Partner nimmt KVA an → Fahrzeug wird erstellt', async ({ page, context }) => {
    const consoleMonitor = setupConsoleMonitoring(page);

    // Setup: Erstelle Anfrage + KVA
    await setPartnerSession(page, { partnerName: testPartnerName });
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    // CRITICAL FIX RUN #40: Use dynamic date (tomorrow) to prevent validation failure
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const anliefertermin = tomorrow.toISOString().split('T')[0];
    console.log(`📅 Test 2.3: Using dynamic anliefertermin: ${anliefertermin}`);

    await fillPartnerRequestForm(page, {
      kennzeichen: testKennzeichen,
      anliefertermin: anliefertermin
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

    // Simuliere KVA-Erstellung
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        kva: {
          gesamtpreis: 1280,
          positionen: [
            { beschreibung: 'Test Position', menge: 1, einzelpreis: 1280 }
          ],
          materialkosten: 0,
          notiz: 'E2E Test KVA'
        }
      });
    }, anfrageId);

    // Test: Partner nimmt KVA an
    await page.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(page);

    // Finde Anfrage-Karte
    const anfrageCard = page.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    await expect(anfrageCard).toBeVisible({ timeout: 10000 });

    // Klicke auf Karte
    await anfrageCard.click();

    // Detail-View sollte öffnen
    await expect(page).toHaveURL(/anfrage-detail\.html\?id=/);

    // Klicke "KVA annehmen"
    page.on('dialog', dialog => dialog.accept()); // Auto-confirm
    await page.click('button:has-text("KVA annehmen")');

    // Warte auf Success
    await waitForSuccessMessage(page, 'angenommen');

    // KRITISCH: Prüfe ob Fahrzeug erstellt wurde
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBeTruthy();

    // Prüfe Fahrzeugdaten
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData).toBeTruthy();
    expect(vehicleData.kennzeichen).toBe(testKennzeichen);
    expect(vehicleData.kundenname).toBe(testPartnerName);
    expect(vehicleData.prozessStatus).toBe('terminiert'); // NICHT 'angenommen'!
    expect(vehicleData.vereinbarterPreis).toBe('1280');
    expect(vehicleData.geplantesAbnahmeDatum).toBe(anliefertermin); // Dynamic date from above

    // Prüfe Console Logs
    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('2.4 Realtime Update nach Partner-Annahme: Alle Views', async ({ page, context }) => {
    // Setup: Erstelle komplett durchgelaufenen Partner-Flow
    const setupPage = await context.newPage();
    await setupPage.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(setupPage);

    await fillPartnerRequestForm(setupPage, {
      partnerName: testPartnerName,
      kennzeichen: testKennzeichen
    });
    await setupPage.click('button:has-text("Anfrage senden")');
    await waitForSuccessMessage(setupPage);

    const anfrageId = await setupPage.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const snapshot = await db.collection('partnerAnfragen')
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].id;
    }, testKennzeichen);

    // KVA erstellen und annehmen
    await setupPage.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      await db.collection('partnerAnfragen').doc(id).update({
        status: 'kva_gesendet',
        kva: {
          gesamtpreis: 1280,
          positionen: [{ beschreibung: 'Test', menge: 1, einzelpreis: 1280 }]
        }
      });
    }, anfrageId);

    await setupPage.goto('/partner-app/meine-anfragen.html');
    await waitForFirebaseReady(setupPage);
    const anfrageCard = setupPage.locator(`.anfrage-card:has-text("${testKennzeichen}")`);
    await anfrageCard.click();
    setupPage.on('dialog', dialog => dialog.accept());
    await setupPage.click('button:has-text("KVA annehmen")');
    await waitForSuccessMessage(setupPage);

    // Test: Öffne verschiedene Views in parallelen Tabs

    // TAB 1: liste.html
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);
    await expect(page.locator(`tr:has-text("${testKennzeichen}")`)).toBeVisible({ timeout: 10000 });

    // TAB 2: kanban.html
    const kanbanPage = await context.newPage();
    await kanbanPage.goto('/kanban.html');
    await waitForFirebaseReady(kanbanPage);
    await kanbanPage.selectOption('#processSelect', 'lackier');
    await expect(kanbanPage.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 10000 });

    // TAB 3: kunden.html
    const kundenPage = await context.newPage();
    await kundenPage.goto('/kunden.html');
    await waitForFirebaseReady(kundenPage);
    await expect(kundenPage.locator(`tr:has-text("${testPartnerName}")`))
      .toBeVisible({ timeout: 10000 });

    // Cleanup
    await setupPage.close();
    await kanbanPage.close();
    await kundenPage.close();
  });
});
