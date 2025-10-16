/**
 * Smoke Test - Grundlegende Funktionalität prüfen
 *
 * Dieser Test prüft ob die App überhaupt lädt
 */

const { test, expect } = require('@playwright/test');

test.describe('Smoke Tests', () => {
  test('App lädt erfolgreich: index.html', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle(/Fahrzeugannahme/i);
    console.log('✅ index.html geladen');
  });

  test('Firebase lädt: firebase-config.js', async ({ page }) => {
    await page.goto('/annahme.html');

    // Warte max 10 Sekunden auf Firebase
    try {
      await page.waitForFunction(() => {
        return typeof window.firebaseApp !== 'undefined';
      }, { timeout: 10000 });
      console.log('✅ Firebase-Config geladen');
    } catch (e) {
      console.log('❌ Firebase-Config NICHT geladen nach 10s');
      throw e;
    }
  });

  test('Firebase initialisiert', async ({ page }) => {
    await page.goto('/annahme.html');

    // Warte auf Firebase Initialisierung
    const firebaseReady = await page.evaluate(async () => {
      // Warte max 15 Sekunden
      for (let i = 0; i < 30; i++) {
        if (window.firebaseInitialized === true) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return false;
    });

    console.log('Firebase initialized:', firebaseReady);
    expect(firebaseReady).toBe(true);
  });

  test('Form-Felder sind vorhanden', async ({ page }) => {
    await page.goto('/annahme.html');

    // Prüfe wichtigste Form-Felder
    await expect(page.locator('#kennzeichen')).toBeVisible();
    await expect(page.locator('#kundenname')).toBeVisible();
    await expect(page.locator('button:has-text("Speichern")')).toBeVisible();
    console.log('✅ Form-Felder vorhanden');
  });
});
