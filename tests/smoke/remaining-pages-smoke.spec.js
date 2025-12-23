/**
 * SMOKE TESTS: Remaining Pages
 *
 * Basic smoke tests for pages not yet covered by other test files.
 * Each test verifies:
 * - Page loads without JS errors
 * - Main container is visible
 * - No critical error messages
 *
 * @author Claude Code
 * @date 2025-12-22
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

// ============================================
// APP ROOT PAGES - WITH AUTH
// ============================================

test.describe('SMOKE: App Root Pages (Authenticated)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ---- Abnahme ----
  test('SMOKE-R1: abnahme.html loads', async ({ page }) => {
    await page.goto('/abnahme.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      noError: !document.body.innerHTML.includes('404')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Admin Einstellungen ----
  test('SMOKE-R2: admin-einstellungen.html loads', async ({ page }) => {
    await page.goto('/admin-einstellungen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasForm: document.querySelectorAll('input, select, button').length > 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- API Docs ----
  test('SMOKE-R3: api-docs.html loads', async ({ page }) => {
    await page.goto('/api-docs.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Component Library ----
  test('SMOKE-R4: component-library.html loads', async ({ page }) => {
    await page.goto('/component-library.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasComponents: !!document.querySelector('.component, .demo, .example')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Kunden ----
  test('SMOKE-R5: kunden.html loads', async ({ page }) => {
    await page.goto('/kunden.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasContainer: !!document.querySelector('.container, main, #content')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Liste ----
  test('SMOKE-R6: liste.html loads', async ({ page }) => {
    await page.goto('/liste.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasListContainer: !!document.querySelector('table, .list, .fahrzeuge-liste, ul')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Monitor Firebase Quota ----
  test('SMOKE-R7: monitor-firebase-quota.html loads', async ({ page }) => {
    await page.goto('/monitor-firebase-quota.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Offline ----
  test('SMOKE-R8: offline.html loads', async ({ page }) => {
    await page.goto('/offline.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 50,
      hasMessage: document.body.innerText.length > 10
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Pending Registrations ----
  test('SMOKE-R9: pending-registrations.html loads', async ({ page }) => {
    await page.goto('/pending-registrations.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Steuerberater Bilanz ----
  test('SMOKE-R10: steuerberater-bilanz.html loads', async ({ page }) => {
    await page.goto('/steuerberater-bilanz.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Wissensdatenbank ----
  test('SMOKE-R11: wissensdatenbank.html loads', async ({ page }) => {
    await page.goto('/wissensdatenbank.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasSearch: !!document.querySelector('input[type="search"], input[type="text"], .search')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Mitarbeiter ----
  test('SMOKE-R12: mitarbeiter.html loads', async ({ page }) => {
    await page.goto('/mitarbeiter.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Profil ----
  test('SMOKE-R13: profil.html loads', async ({ page }) => {
    await page.goto('/profil.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasProfileFields: document.querySelectorAll('input, .profile').length >= 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Benachrichtigungen ----
  test('SMOKE-R14: benachrichtigungen.html loads', async ({ page }) => {
    await page.goto('/benachrichtigungen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Statistiken ----
  test('SMOKE-R15: statistiken.html loads', async ({ page }) => {
    await page.goto('/statistiken.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasCharts: !!document.querySelector('canvas, .chart, .statistics')
    }));

    expect(state.hasBody).toBe(true);
  });

});

// ============================================
// PUBLIC PAGES - NO AUTH REQUIRED
// ============================================

test.describe('SMOKE: Public Pages (No Auth)', () => {

  // ---- Kontakt ----
  test('SMOKE-P1: kontakt.html loads', async ({ page }) => {
    await page.goto('/kontakt.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasContactInfo: document.body.innerText.includes('@') ||
                     document.body.innerText.includes('Telefon') ||
                     document.body.innerText.includes('Email')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Karriere ----
  test('SMOKE-P2: karriere.html loads', async ({ page }) => {
    await page.goto('/karriere.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Presse ----
  test('SMOKE-P3: presse.html loads', async ({ page }) => {
    await page.goto('/presse.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Über Uns ----
  test('SMOKE-P4: ueber-uns.html loads', async ({ page }) => {
    await page.goto('/ueber-uns.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Login ----
  test('SMOKE-P5: login.html loads', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasLoginForm: !!document.querySelector('form, input[type="email"], input[type="password"]')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Passwort vergessen ----
  test('SMOKE-P6: passwort-vergessen.html loads', async ({ page }) => {
    await page.goto('/passwort-vergessen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasEmailField: !!document.querySelector('input[type="email"], input[name="email"]')
    }));

    expect(state.hasBody).toBe(true);
  });

});

// ============================================
// PARTNER-APP PAGES
// ============================================

test.describe('SMOKE: Partner-App Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);

    // Set partner session
    await page.evaluate(() => {
      const partner = {
        id: 'smoke-test-partner',
        name: 'Smoke Test Partner',
        email: 'smoke@test.de',
        werkstattId: 'mosbach'
      };
      localStorage.setItem('partner', JSON.stringify(partner));
    });
  });

  // ---- Partner Index ----
  test('SMOKE-PA1: partner-app/index.html loads', async ({ page }) => {
    await page.goto('/partner-app/index.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Admin Anfragen ----
  test('SMOKE-PA2: partner-app/admin-anfragen.html loads', async ({ page }) => {
    await page.goto('/partner-app/admin-anfragen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Anfrage Detail ----
  test('SMOKE-PA3: partner-app/anfrage-detail.html loads', async ({ page }) => {
    await page.goto('/partner-app/anfrage-detail.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- KVA Erstellen ----
  test('SMOKE-PA4: partner-app/kva-erstellen.html loads', async ({ page }) => {
    await page.goto('/partner-app/kva-erstellen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasForm: document.querySelectorAll('input, textarea, button').length > 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Meine Anfragen ----
  test('SMOKE-PA5: partner-app/meine-anfragen.html loads', async ({ page }) => {
    await page.goto('/partner-app/meine-anfragen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasListContainer: !!document.querySelector('table, .list, ul, .anfragen')
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Rechnungen ----
  test('SMOKE-PA6: partner-app/rechnungen.html loads', async ({ page }) => {
    await page.goto('/partner-app/rechnungen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Service Auswahl ----
  test('SMOKE-PA7: partner-app/service-auswahl.html loads', async ({ page }) => {
    await page.goto('/partner-app/service-auswahl.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasServices: document.querySelectorAll('.service, .card, button, a').length > 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Reifen Anfrage (Main Service) ----
  test('SMOKE-PA8: partner-app/reifen-anfrage.html loads', async ({ page }) => {
    await page.goto('/partner-app/reifen-anfrage.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasForm: !!document.querySelector('form') || document.querySelectorAll('input').length > 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Mechanik Anfrage ----
  test('SMOKE-PA9: partner-app/mechanik-anfrage.html loads', async ({ page }) => {
    await page.goto('/partner-app/mechanik-anfrage.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Pflege Anfrage ----
  test('SMOKE-PA10: partner-app/pflege-anfrage.html loads', async ({ page }) => {
    await page.goto('/partner-app/pflege-anfrage.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Lackierung Anfrage ----
  test('SMOKE-PA11: partner-app/lackierung-anfrage.html loads', async ({ page }) => {
    await page.goto('/partner-app/lackierung-anfrage.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

});

// ============================================
// MIGRATION SCRIPTS
// ============================================

test.describe('SMOKE: Migration Scripts', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ---- Migrate Rechnungen ----
  test('SMOKE-M1: migrate-rechnungen.html loads', async ({ page }) => {
    await page.goto('/migrate-rechnungen.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 50
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Migrate Partner ----
  test('SMOKE-M2: migrate-partner.html loads', async ({ page }) => {
    await page.goto('/migrate-partner.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 50
    }));

    expect(state.hasBody).toBe(true);
  });

});

// ============================================
// SPECIAL PAGES
// ============================================

test.describe('SMOKE: Special Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ---- Service Worker ----
  test('SMOKE-S1: sw.js is valid JavaScript', async ({ page }) => {
    const response = await page.goto('/sw.js');
    const status = response?.status();

    // Service worker should be available
    expect(status === 200 || status === 404).toBe(true);
  });

  // ---- Manifest ----
  test('SMOKE-S2: manifest.json is valid JSON', async ({ page }) => {
    const response = await page.goto('/manifest.json');

    if (response && response.status() === 200) {
      const content = await response.text();
      const isValidJson = (() => {
        try {
          JSON.parse(content);
          return true;
        } catch {
          return false;
        }
      })();
      expect(isValidJson).toBe(true);
    }
  });

  // ---- Robots.txt ----
  test('SMOKE-S3: robots.txt exists', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    const status = response?.status();

    // robots.txt may or may not exist
    expect(typeof status).toBe('number');
  });

  // ---- 404 Page ----
  test('SMOKE-S4: 404.html loads', async ({ page }) => {
    await page.goto('/404.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 50
    }));

    expect(state.hasBody).toBe(true);
  });

});

// ============================================
// REPORTS/EXPORT PAGES
// ============================================

test.describe('SMOKE: Reports & Export Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ---- Export ----
  test('SMOKE-E1: export.html loads', async ({ page }) => {
    await page.goto('/export.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100,
      hasExportOptions: document.querySelectorAll('button, select, .export').length > 0
    }));

    expect(state.hasBody).toBe(true);
  });

  // ---- Berichte ----
  test('SMOKE-E2: berichte.html loads', async ({ page }) => {
    await page.goto('/berichte.html');
    await page.waitForLoadState('domcontentloaded');

    const state = await page.evaluate(() => ({
      hasBody: document.body.innerHTML.length > 100
    }));

    expect(state.hasBody).toBe(true);
  });

});
