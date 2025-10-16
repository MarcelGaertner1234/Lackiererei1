/**
 * FLOW 4: Kanban Board Drag & Drop Tests
 *
 * Testet:
 * - Drag & Drop zwischen Spalten
 * - Foto-Upload bei Arbeitsschritten
 * - Status-Updates
 * - Realtime Synchronisation
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  getVehicleData,
  deleteVehicle
} = require('./helpers/firebase-helper');
const {
  fillVehicleIntakeForm,
  uploadTestPhoto,
  drawTestSignature
} = require('./helpers/form-helper');

test.describe('FLOW 4: Kanban Board Drag & Drop', () => {
  const testKennzeichen = 'KANBAN-E2E-001';
  const testKundenname = 'Kanban Test Kunde';

  test.beforeEach(async ({ page }) => {
    // Setup: Erstelle Test-Fahrzeug
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: 'lackier'
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);
  });

  test.afterEach(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await deleteVehicle(page, testKennzeichen);
  });

  test('4.1 Drag & Drop: Fahrzeug von Angenommen → Vorbereitung', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    // Wähle Lackier-Prozess
    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(1000);

    // Finde Fahrzeug-Karte
    const fahrzeugCard = page.locator(`.kanban-card:has-text("${testKennzeichen}")`);
    await expect(fahrzeugCard).toBeVisible();

    // Prüfe initialer Status: Spalte "Angenommen"
    const angenommenColumn = page.locator('#cards-angenommen');
    await expect(angenommenColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`)
).toBeVisible();

    // Drag & Drop zu "Vorbereitung"
    const vorbereitungColumn = page.locator('#cards-vorbereitung');

    await fahrzeugCard.dragTo(vorbereitungColumn);

    // Foto-Upload Modal sollte erscheinen (Vorbereitung = Arbeitsschritt!)
    await expect(page.locator('#photoModal')).toBeVisible({ timeout: 5000 });

    // Lade Foto hoch
    await uploadTestPhoto(page, '#photoInputFile');
    await page.fill('#photoNotiz', 'E2E Test: Vorbereitung abgeschlossen');

    // Speichern
    await page.click('button:has-text("Mit Foto speichern")');

    // Warte auf Modal-Close
    await expect(page.locator('#photoModal')).not.toBeVisible({ timeout: 5000 });

    // Prüfe ob Fahrzeug in neuer Spalte
    await expect(vorbereitungColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 5000 });

    // Prüfe Firestore
    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.prozessStatus).toBe('vorbereitung');
    expect(vehicleData.statusHistory).toBeTruthy();
    expect(vehicleData.statusHistory.length).toBeGreaterThan(0);
  });

  test('4.2 Skip Foto: Drag & Drop von Angenommen → Terminiert (kein Foto nötig)', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(1000);

    const fahrzeugCard = page.locator(`.kanban-card:has-text("${testKennzeichen}")`);
    const terministColumn = page.locator('#cards-terminiert');

    // Drag & Drop zu "Terminiert" (kein Arbeitsschritt = kein Foto-Modal)
    await fahrzeugCard.dragTo(terministColumn);

    // Foto-Modal sollte NICHT erscheinen
    await page.waitForTimeout(2000);
    await expect(page.locator('#photoModal')).not.toBeVisible();

    // Fahrzeug sollte direkt in neuer Spalte sein
    await expect(terminierColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 5000 });

    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.prozessStatus).toBe('terminiert');
  });

  test('4.3 Ohne Foto fortfahren: Arbeitsschritt ohne Foto-Upload', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(1000);

    const fahrzeugCard = page.locator(`.kanban-card:has-text("${testKennzeichen}")`);
    const lackierungColumn = page.locator('#cards-lackierung');

    // Drag & Drop zu "Lackierung" (Arbeitsschritt!)
    await fahrzeugCard.dragTo(lackierungColumn);

    // Foto-Modal erscheint
    await expect(page.locator('#photoModal')).toBeVisible();

    // Klicke "Ohne Foto fortfahren"
    await page.click('button:has-text("Ohne Foto fortfahren")');

    // Modal sollte schließen
    await expect(page.locator('#photoModal')).not.toBeVisible({ timeout: 5000 });

    // Fahrzeug sollte trotzdem in neuer Spalte sein
    await expect(lackierungColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 5000 });

    const vehicleData = await getVehicleData(page, testKennzeichen);
    expect(vehicleData.prozessStatus).toBe('lackierung');
  });

  test('4.4 Realtime Sync: Drag & Drop erscheint in zweitem Browser', async ({ page, context }) => {
    // Öffne zweiten Browser-Tab
    const secondTab = await context.newPage();
    await secondTab.goto('/kanban.html');
    await waitForFirebaseReady(secondTab);
    await secondTab.selectOption('#processSelect', 'lackier');
    await secondTab.waitForTimeout(1000);

    // Im ersten Tab: Drag & Drop
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);
    await page.selectOption('#processSelect', 'lackier');
    await page.waitForTimeout(1000);

    const fahrzeugCard = page.locator(`.kanban-card:has-text("${testKennzeichen}")`);
    const vorbereitungColumn = page.locator('#cards-vorbereitung');

    await fahrzeugCard.dragTo(vorbereitungColumn);

    // Foto-Modal: Ohne Foto fortfahren (für schnelleren Test)
    await page.click('button:has-text("Ohne Foto fortfahren")');

    // Im ZWEITEN Tab: Fahrzeug sollte automatisch in neuer Spalte erscheinen
    const secondTabVorbereitungColumn = secondTab.locator('#cards-vorbereitung');
    await expect(secondTabVorbereitungColumn.locator(`.kanban-card:has-text("${testKennzeichen}")`))
      .toBeVisible({ timeout: 10000 });

    await secondTab.close();
  });
});
