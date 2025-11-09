/**
 * HYBRID TESTING: UI Smoke Tests (Accessibility Only)
 *
 * These tests verify that UI elements are accessible and interactive,
 * WITHOUT testing full form submission workflows. They are:
 *
 * ✅ Fast (<2s per test)
 * ✅ Reliable (simple visibility checks)
 * ✅ Tests UI accessibility
 * ✅ No complex form interactions
 *
 * What we DON'T test here:
 * ❌ Form submission (tested manually - works perfectly)
 * ❌ PDF generation (tested manually)
 * ❌ Firestore writes (tested in integration tests)
 * ❌ Customer registration (tested in integration tests)
 *
 * Purpose: Ensure the UI didn't break after deployment
 */

const { test, expect } = require('@playwright/test');
const { waitForFirebaseReady } = require('../helpers/firebase-helper');

test.describe('SMOKE: UI Accessibility Tests', () => {

  test('SMOKE-1.1: annahme.html - Page loads and form is visible', async ({ page }) => {
    // Act: Navigate to intake page
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Assert: Page title
    await expect(page.locator('h1')).toContainText('Fahrzeug-Annahme');

    // Assert: All major form sections visible
    await expect(page.locator('#kennzeichen')).toBeVisible();
    await expect(page.locator('#kundenname')).toBeVisible();
    await expect(page.locator('#kundenEmail')).toBeVisible();
    await expect(page.locator('#marke')).toBeVisible();
    await expect(page.locator('#modell')).toBeVisible();
    await expect(page.locator('#serviceTyp')).toBeVisible();
    await expect(page.locator('#vereinbarterPreis')).toBeVisible();
  });

  test('SMOKE-1.2: annahme.html - Form fields are editable', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Act: Try typing in each field
    await page.fill('#kennzeichen', 'TEST-123');
    await page.fill('#kundenname', 'Test User');
    await page.fill('#kundenEmail', 'test@example.com');
    await page.fill('#modell', 'Test Model');

    // Assert: Values were set
    expect(await page.inputValue('#kennzeichen')).toBe('TEST-123');
    expect(await page.inputValue('#kundenname')).toBe('Test User');
    expect(await page.inputValue('#kundenEmail')).toBe('test@example.com');
    expect(await page.inputValue('#modell')).toBe('Test Model');
  });

  test('SMOKE-1.3: annahme.html - Dropdowns are interactive', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Act: Select options
    await page.selectOption('#marke', 'BMW');
    await page.selectOption('#serviceTyp', 'reifen');

    // Assert: Selections work
    expect(await page.inputValue('#marke')).toBe('BMW');
    expect(await page.inputValue('#serviceTyp')).toBe('reifen');
  });

  test('SMOKE-1.4: annahme.html - Submit button is clickable', async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);

    // Assert: Button exists and is visible
    const submitButton = page.locator('button:has-text("Speichern & PDF erstellen")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('SMOKE-2.1: liste.html - Page loads and table is visible', async ({ page }) => {
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    // Assert: Page title
    await expect(page.locator('h1')).toContainText('Fahrzeug-Liste');

    // Assert: Table structure exists
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('thead')).toBeVisible();
    await expect(page.locator('tbody')).toBeVisible();
  });

  test('SMOKE-2.2: liste.html - Filter controls are interactive', async ({ page }) => {
    await page.goto('/liste.html');
    await waitForFirebaseReady(page);

    // Assert: Filter elements exist
    await expect(page.locator('#searchBox')).toBeVisible();
    await expect(page.locator('#statusFilter')).toBeVisible();

    // Act: Try using filters
    await page.fill('#searchBox', 'test');
    await page.selectOption('#statusFilter', 'angenommen');

    // Assert: Filter values were set
    expect(await page.inputValue('#searchBox')).toBe('test');
    expect(await page.inputValue('#statusFilter')).toBe('angenommen');
  });

  test('SMOKE-3.1: kanban.html - Page loads and columns are visible', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    // Assert: Page title
    await expect(page.locator('h1')).toContainText('Kanban');

    // Assert: Service type selector exists
    await expect(page.locator('#processSelect')).toBeVisible();

    // Act: Select a service type
    await page.selectOption('#processSelect', 'lackier');

    // Assert: Kanban columns for "lackier" process visible
    await expect(page.locator('#cards-angenommen')).toBeVisible();
    await expect(page.locator('#cards-in_arbeit')).toBeVisible();
    await expect(page.locator('#cards-fertig')).toBeVisible();
    await expect(page.locator('#cards-abgeholt')).toBeVisible();
  });

  test('SMOKE-3.2: kanban.html - Process selector works', async ({ page }) => {
    await page.goto('/kanban.html');
    await waitForFirebaseReady(page);

    // Act: Switch between processes
    await page.selectOption('#processSelect', 'reifen');
    await page.waitForTimeout(500); // Wait for UI update

    // Assert: Columns re-rendered (element IDs should still exist)
    await expect(page.locator('#cards-angenommen')).toBeVisible();
  });

  test('SMOKE-4.1: kunden.html - Page loads and customer table is visible', async ({ page }) => {
    await page.goto('/kunden.html');
    await waitForFirebaseReady(page);

    // Assert: Page title
    await expect(page.locator('h1')).toContainText('Kunden');

    // Assert: Table structure
    await expect(page.locator('table')).toBeVisible();
  });

  test('SMOKE-5.1: index.html - Main menu loads with all tiles', async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);

    // Assert: Page loads
    await expect(page.locator('h1')).toContainText('Werkstatt-Management');

    // Assert: Main navigation tiles exist (check a few key ones)
    await expect(page.locator('text=Fahrzeug-Annahme')).toBeVisible();
    await expect(page.locator('text=Fahrzeug-Liste')).toBeVisible();
    await expect(page.locator('text=Kanban')).toBeVisible();
    await expect(page.locator('text=Kunden')).toBeVisible();
  });

  test('SMOKE-5.2: index.html - Navigation links work', async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);

    // Act: Click on "Fahrzeug-Annahme" tile
    await page.click('text=Fahrzeug-Annahme');

    // Assert: Navigated to annahme.html
    await page.waitForURL(/annahme\.html/);
    await expect(page.locator('h1')).toContainText('Fahrzeug-Annahme');
  });

  test('SMOKE-6.1: Dark mode toggle works', async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);

    // Get initial dark mode state
    const initialDarkMode = await page.evaluate(() => {
      return document.body.classList.contains('dark');
    });

    // Act: Click dark mode toggle button
    const darkModeButton = page.locator('button[title="Toggle Light/Dark Mode"], button:has(img[alt="Dark Mode"])').first();
    await darkModeButton.click();

    // Assert: Dark mode state changed
    const newDarkMode = await page.evaluate(() => {
      return document.body.classList.contains('dark');
    });

    expect(newDarkMode).toBe(!initialDarkMode);
  });

  test('SMOKE-7.1: Firebase initialization successful', async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);

    // Assert: Firebase objects available
    const firebaseState = await page.evaluate(() => ({
      hasApp: !!window.firebaseApp,
      hasDb: !!(window.firebaseApp && window.firebaseApp.db),
      initialized: window.firebaseInitialized === true,
      werkstattId: window.werkstattId
    }));

    expect(firebaseState.hasApp).toBeTruthy();
    expect(firebaseState.hasDb).toBeTruthy();
    expect(firebaseState.initialized).toBeTruthy();
    expect(firebaseState.werkstattId).toBeTruthy();
  });
});
