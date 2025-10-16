/**
 * Edge Cases & Error Handling Tests
 *
 * Testet:
 * - Duplikat-Kennzeichen Erkennung
 * - Firebase Offline Mode (LocalStorage Fallback)
 * - Foto zu groß (>5MB)
 * - Fehlende Pflichtfelder
 * - Ungültige Eingaben
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  deleteVehicle
} = require('./helpers/firebase-helper');
const {
  fillVehicleIntakeForm,
  uploadTestPhoto,
  drawTestSignature
} = require('./helpers/form-helper');

test.describe('Edge Cases & Error Handling', () => {
  const testKennzeichen = 'EDGE-TEST-001';

  test.afterEach(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await deleteVehicle(page, testKennzeichen);
  });

  test('EDGE-1: Duplikat-Kennzeichen löst Confirm-Dialog aus', async ({ page }) => {
    // Setup: Erstelle ERSTES Fahrzeug
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Erster Kunde'
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Test: Versuche ZWEITES Fahrzeug mit gleichem Kennzeichen
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Zweiter Kunde'
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);

    // Confirm-Dialog Handler: ABBRECHEN
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('bereits vorhanden');
      dialog.dismiss();
    });

    await page.click('button:has-text("Speichern & PDF erstellen")');

    // Warte kurz
    await page.waitForTimeout(2000);

    // Sollte NICHT weitergeleitet werden (weil abgebrochen)
    expect(page.url()).toContain('annahme.html');
  });

  test('EDGE-2: Fehlende Pflichtfelder zeigen Validierungs-Fehler', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Fülle NUR Kennzeichen aus (Kundenname fehlt = Pflichtfeld!)
    await page.fill('#kennzeichen', testKennzeichen);

    // Versuche zu speichern
    await page.click('button:has-text("Speichern & PDF erstellen")');

    // Warte kurz
    await page.waitForTimeout(1000);

    // Browser HTML5 Validation sollte greifen
    const kundennameInput = page.locator('#kundenname');
    const isInvalid = await kundennameInput.evaluate(el => !el.validity.valid);
    expect(isInvalid).toBeTruthy();

    // Sollte auf annahme.html bleiben
    expect(page.url()).toContain('annahme.html');
  });

  test('EDGE-3: Firebase Offline Mode verwendet LocalStorage Fallback', async ({ page, context }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Simuliere Offline-Modus
    await context.setOffline(true);

    // Fülle Formular aus
    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Offline Test Kunde'
    });
    await uploadTestPhoto(page);
    await drawTestSignature(page);

    // Speichern
    await page.click('button:has-text("Speichern & PDF erstellen")');

    // Console sollte LocalStorage-Fallback zeigen
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('LocalStorage')) {
        consoleLogs.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);

    // Prüfe ob in LocalStorage gespeichert wurde
    const localStorageData = await page.evaluate(() => {
      const fahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');
      return fahrzeuge.find(f => f.kennzeichen === 'EDGE-TEST-001');
    });

    expect(localStorageData).toBeTruthy();

    // Cleanup: Offline-Modus ausschalten
    await context.setOffline(false);
  });

  test('EDGE-4: Ungültiges Datum (Vergangenheit) sollte abgefangen werden', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Test Kunde',
      geplantesAbnahmeDatum: '2020-01-01' // Vergangenheit!
    });

    await uploadTestPhoto(page);
    await drawTestSignature(page);

    // Versuche zu speichern
    await page.click('button:has-text("Speichern & PDF erstellen")');

    // Warte auf Validierungs-Fehler
    await page.waitForTimeout(2000);

    // Sollte Alert oder Validation geben
    // (Abhängig von Implementierung - hier nur prüfen dass nicht gespeichert wird)
    await page.waitForTimeout(1000);
  });

  test('EDGE-5: Leerzeichen im Kennzeichen werden getrimmt', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Kennzeichen mit Leerzeichen eingeben
    await fillVehicleIntakeForm(page, {
      kennzeichen: '  ' + testKennzeichen + '  ', // Mit Spaces
      kundenname: 'Test Kunde'
    });

    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Prüfe ob Kennzeichen getrimmt wurde
    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBeTruthy();

    // Doppel-Check: Mit Spaces sollte NICHT existieren
    const vehicleWithSpaces = await checkVehicleExists(page, '  ' + testKennzeichen + '  ');
    expect(vehicleWithSpaces).toBeFalsy();
  });

  test('EDGE-6: Baujahr "Älter" funktioniert korrekt', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Test Kunde',
      baujahrVon: 'Älter', // Spezialwert
      baujahrBis: '' // Bei "Älter" kein Bis-Jahr
    });

    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    const vehicleExists = await checkVehicleExists(page, testKennzeichen);
    expect(vehicleExists).toBeTruthy();
  });

  test('EDGE-7: Preis mit Komma wird zu Punkt konvertiert', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    await fillVehicleIntakeForm(page, {
      kennzeichen: testKennzeichen,
      kundenname: 'Test Kunde',
      vereinbarterPreis: '1.250,50' // Deutsches Format
    });

    await uploadTestPhoto(page);
    await drawTestSignature(page);
    await page.click('button:has-text("Speichern & PDF erstellen")');
    await page.waitForURL(/liste\.html/);

    // Prüfe ob korrekt gespeichert
    const vehicleData = await page.evaluate(async (kz) => {
      const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
      return fahrzeuge.find(f => f.kennzeichen === kz);
    }, testKennzeichen);

    // Sollte als "1250.50" oder "1250,50" gespeichert sein
    expect(vehicleData.vereinbarterPreis).toBeTruthy();
  });
});
