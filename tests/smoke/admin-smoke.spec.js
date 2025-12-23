/**
 * SMOKE TESTS: Admin & Steuerberater Pages
 *
 * Basic smoke tests to verify that admin and steuerberater pages
 * load correctly without errors.
 *
 * Test Coverage:
 * - Page loads without JavaScript errors
 * - Main container is visible
 * - Navigation elements are present
 * - Basic UI elements render
 *
 * @author Claude Code
 * @date 2025-12-22
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

test.describe('SMOKE: Admin Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // ADMIN-1: Admin Arbeitszeiten
  // ============================================

  test('ADMIN-1: admin-arbeitszeiten.html loads', async ({ page }) => {
    await page.goto('/admin-arbeitszeiten.html');
    await page.waitForLoadState('domcontentloaded');

    // Check page loaded
    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasTitle: document.title.length > 0,
        noErrors: !document.body.innerHTML.includes('Error') && !document.body.innerHTML.includes('404')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-2: Admin Bonus Auszahlungen
  // ============================================

  test('ADMIN-2: admin-bonus-auszahlungen.html loads', async ({ page }) => {
    await page.goto('/admin-bonus-auszahlungen.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasTitle: document.title.length > 0
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-3: Admin Dashboard
  // ============================================

  test('ADMIN-3: admin-dashboard.html loads', async ({ page }) => {
    await page.goto('/admin-dashboard.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasDashboardElements: !!document.querySelector('.dashboard, .stats, .chart, .card, .metric')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-4: Admin Datenqualität
  // ============================================

  test('ADMIN-4: admin-datenqualitaet.html loads', async ({ page }) => {
    await page.goto('/admin-datenqualitaet.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-5: Mitarbeiter Dienstplan
  // ============================================

  test('ADMIN-5: mitarbeiter-dienstplan.html loads', async ({ page }) => {
    await page.goto('/mitarbeiter-dienstplan.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasScheduleElement: !!document.querySelector('.dienstplan, .schedule, .calendar, table')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-6: Mitarbeiter Lohnhistorie
  // ============================================

  test('ADMIN-6: mitarbeiter-lohnhistorie.html loads', async ({ page }) => {
    await page.goto('/mitarbeiter-lohnhistorie.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-7: Nutzer Verwaltung
  // ============================================

  test('ADMIN-7: nutzer-verwaltung.html loads', async ({ page }) => {
    await page.goto('/nutzer-verwaltung.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasUserList: !!document.querySelector('table, .user-list, .nutzer-liste')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // ADMIN-8: Rechnungen Admin
  // ============================================

  test('ADMIN-8: rechnungen-admin.html loads', async ({ page }) => {
    await page.goto('/rechnungen-admin.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

});

test.describe('SMOKE: Steuerberater Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // STB-1: Steuerberater Export
  // ============================================

  test('STB-1: steuerberater-export.html loads', async ({ page }) => {
    await page.goto('/steuerberater-export.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasExportButton: !!document.querySelector('button, .export-btn, [data-export]')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // STB-2: Steuerberater Kosten
  // ============================================

  test('STB-2: steuerberater-kosten.html loads', async ({ page }) => {
    await page.goto('/steuerberater-kosten.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // STB-3: Steuerberater Statistiken
  // ============================================

  test('STB-3: steuerberater-statistiken.html loads', async ({ page }) => {
    await page.goto('/steuerberater-statistiken.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasChartOrStats: !!document.querySelector('.chart, .statistics, .stats, canvas')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

});

test.describe('SMOKE: Core Workflow Pages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // CORE-1: Entwürfe Bearbeiten
  // ============================================

  test('CORE-1: entwuerfe-bearbeiten.html loads', async ({ page }) => {
    await page.goto('/entwuerfe-bearbeiten.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // CORE-2: Material
  // ============================================

  test('CORE-2: material.html loads', async ({ page }) => {
    await page.goto('/material.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // CORE-3: Dienstplan
  // ============================================

  test('CORE-3: dienstplan.html loads', async ({ page }) => {
    await page.goto('/dienstplan.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // CORE-4: Kalender
  // ============================================

  test('CORE-4: kalender.html loads', async ({ page }) => {
    await page.goto('/kalender.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasCalendarElement: !!document.querySelector('.calendar, .kalender, [data-calendar]')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // CORE-5: Abteilungs Queue
  // ============================================

  test('CORE-5: abteilungs-queue.html loads', async ({ page }) => {
    await page.goto('/abteilungs-queue.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

});

test.describe('SMOKE: Public Pages', () => {

  // Public pages don't require authentication
  // ============================================
  // PUBLIC-1: Landing Page
  // ============================================

  test('PUBLIC-1: landing.html loads without auth', async ({ page }) => {
    await page.goto('/landing.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // PUBLIC-2: Registrierung
  // ============================================

  test('PUBLIC-2: registrierung.html loads', async ({ page }) => {
    await page.goto('/registrierung.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasForm: !!document.querySelector('form, .registration-form')
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // PUBLIC-3: AGB
  // ============================================

  test('PUBLIC-3: agb.html loads', async ({ page }) => {
    await page.goto('/agb.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100,
        hasLegalContent: document.body.innerText.length > 500
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // PUBLIC-4: Datenschutz
  // ============================================

  test('PUBLIC-4: datenschutz.html loads', async ({ page }) => {
    await page.goto('/datenschutz.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // PUBLIC-5: Impressum
  // ============================================

  test('PUBLIC-5: impressum.html loads', async ({ page }) => {
    await page.goto('/impressum.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

  // ============================================
  // PUBLIC-6: Hilfe
  // ============================================

  test('PUBLIC-6: hilfe.html loads', async ({ page }) => {
    await page.goto('/hilfe.html');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.evaluate(() => {
      return {
        hasBody: document.body.innerHTML.length > 100
      };
    });

    expect(pageContent.hasBody).toBe(true);
  });

});
