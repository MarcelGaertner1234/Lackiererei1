/**
 * FLOW 1: Manuelle Fahrzeug-Annahme Tests
 *
 * Testet den kompletten Flow:
 * - Fahrzeug in annahme.html anlegen
 * - Realtime Updates in allen Views prüfen
 * - PDF-Generierung
 * - Kunden-Registrierung
 * - Kalender-Eintrag
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  checkCustomerExists,
  getCustomerData,
  deleteVehicle,
  deleteCustomer,
  setupConsoleMonitoring,
  loginAsTestAdmin  // RUN #70: Test authentication
} = require('./helpers/firebase-helper');
const {
  fillVehicleIntakeForm,
  uploadTestPhoto,
  drawTestSignature,
  waitForSuccessMessage
} = require('./helpers/form-helper');

test.describe('FLOW 1: Manuelle Fahrzeug-Annahme', () => {
  const testKennzeichen = 'TEST-E2E-001';
  const testKundenname = 'E2E Test Kunde';

  // RUN #70: Login as test admin BEFORE all tests (enables Firestore access)
  test.beforeAll(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ RUN #70: Test suite authenticated as admin');
  });

  // Cleanup nach jedem Test
  test.afterEach(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    await deleteVehicle(page, testKennzeichen);
    await deleteCustomer(page, testKundenname);
  });

  test('1.1 Basis-Annahme: Fahrzeug anlegen mit Foto und Unterschrift', async ({ page }) => {
    // Console Monitoring aktivieren
    const consoleMonitor = setupConsoleMonitoring(page);

    // 1. Öffne annahme.html
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // 2. Fülle Formular aus
    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: 'lackier',
      vereinbarterPreis: '1250.00'
    });

    // 3. Lade Foto hoch
    await uploadTestPhoto(page, '#photoInput');

    // 4. Zeichne Unterschrift
    await drawTestSignature(page, '#signaturePad');

    // 5. Speichern
    await page.click('button:has-text("Speichern & PDF erstellen")');

    // 6. Warte auf Success-Message
    const success = await waitForSuccessMessage(page, 'erfolgreich');
    expect(success).toBeTruthy();

    // 7. Warte auf Weiterleitung zu liste.html
    await page.waitForURL(/liste\.html/, { timeout: 5000 });

    // 8. Prüfe ob Fahrzeug in Firestore existiert
    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBeTruthy();

    // 9. Hole Fahrzeugdaten
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData).toBeTruthy();
    expect(vehicleData.kennzeichen).toBe(testKennzeichen);
    expect(vehicleData.kundenname).toBe(testKundenname);
    expect(vehicleData.prozessStatus).toBe('angenommen');
    expect(vehicleData.status).toBe('angenommen');
    expect(vehicleData.serviceTyp).toBe('lackier');
    expect(vehicleData.vereinbarterPreis).toBe('1250.00');

    // 10. Prüfe Kunde wurde registriert
    const customerExists = await checkCustomerExists(page, testKundenname);
    expect(customerExists).toBeTruthy();

    const customerData = await getCustomerData(page, testKundenname);
    expect(customerData).toBeTruthy();
    expect(customerData.name).toBe(testKundenname);
    expect(customerData.anzahlBesuche).toBe(1);

    // 11. Prüfe auf Console Errors
    expect(consoleMonitor.hasErrors()).toBeFalsy();
  });

  test('1.2 Realtime Update: Fahrzeug erscheint in liste.html', async ({ page }) => {
    // Setup: Lege Fahrzeug an
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Test: Fahrzeug sollte in Tabelle erscheinen
    await expect(page.locator(`tr:has-text("${testKennzeichen}")`)).toBeVisible({ timeout: 10000 });

    // Prüfe Realtime Listener Log
    const logs = await page.evaluate(() => {
      return window.localStorage.getItem('_test_console_logs');
    });
  });

  test('1.3 Realtime Update: Fahrzeug erscheint in kanban.html', async ({ page, context }) => {
    // Setup: Lege Fahrzeug an
    const setupPage = await context.newPage();
    await setupPage.goto('/annahme.html');
    await waitForFirebaseReady(setupPage);

    await fillVehicleIntakeForm(setupPage, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: 'lackier'
    });
    await uploadTestPhoto(setupPage);
    await drawTestSignature(setupPage);
    await setupPage.click('button:has-text("Speichern & PDF erstellen")');
    await setupPage.waitForURL(/liste\.html/);

    // Öffne kanban.html in ANDEREM Tab
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    // Wähle Service-Typ: Lackierung
    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(1000); // Warte auf Render

    // Test: Fahrzeug sollte in Spalte "Angenommen" erscheinen
    const angenommenColumn = page.locator('#cards-angenommen');
    await expect(angenommenColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 10000 });

    // Cleanup
    await setupPage.close();
  });

  test('1.4 Realtime Update: Kunde erscheint in kunden.html', async ({ page, context }) => {
    // Setup: Lege Fahrzeug an (registriert automatisch Kunde)
    const setupPage = await context.newPage();
    await setupPage.goto('/annahme.html');
    await waitForFirebaseReady(setupPage);

    await fillVehicleIntakeForm(setupPage, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });
    await uploadTestPhoto(setupPage);
    await drawTestSignature(setupPage);
    await setupPage.click('button:has-text("Speichern & PDF erstellen")');
    await setupPage.waitForURL(/liste\.html/);

    // Öffne kunden.html
    await page.goto('/kunden.html');
    await waitForFirebaseReady(page);

    // Test: Kunde sollte in Tabelle erscheinen
    await expect(page.locator(`tr:has-text("${testKundenname}")`)).toBeVisible({ timeout: 10000 });

    // Prüfe Tag "Neukunde"
    const kundeRow = page.locator(`tr:has-text("${testKundenname}")`);
    await expect(kundeRow.locator('.tag:has-text("Neukunde")')).toBeVisible();

    // Cleanup
    await setupPage.close();
  });

  test('1.5 Stammkunde: Zweiter Besuch erhöht anzahlBesuche', async ({ page }) => {
    // Setup: Erstelle ERSTEN Besuch
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen + '-1',
      kundenname: testKundenname
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Cleanup erstes Fahrzeug
    await deleteVehicle(page, testKennzeichen + '-1');

    // Test: Erstelle ZWEITEN Besuch mit gleichem Kunden
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen + '-2',
      kundenname: testKundenname
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Prüfe Kundendaten
    const customerData = await getCustomerData(page, testKundenname);
    expect(customerData.anzahlBesuche).toBe(2);

    // Cleanup zweites Fahrzeug
    await deleteVehicle(page, testKennzeichen + '-2');
  });

  test('1.6 PDF-Generierung: Download wird ausgelöst', async ({ page }) => {
    // Setup Download Listener
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');

    // Warte auf Download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Annahme_.*\.pdf/);
  });
});
