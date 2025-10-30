// ============================================
// PARTNER-APP KVA LOGIC TESTS (TDD)
// ============================================
// Tests für kva-erstellen.html Logic:
// 1. generateVariants() wird aufgerufen
// 2. Korrekte Varianten basierend auf serviceData
// 3. displayAnfrageInfo() zeigt service-spezifische Details
//
// Expected Behavior:
// - Reifen Montage → ONLY "Montage mitgebrachter Reifen" (NOT "Premium vs Budget")
// - Mechanik Diagnose → NO parts fields shown
// - Admin sees partner's serviceData selections
// ============================================

const { test, expect } = require('@playwright/test');

// Test Configuration
const BASE_URL = 'http://localhost:8000';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';

test.describe('Partner-App KVA Logic Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Enable Firestore emulator if configured
        if (USE_EMULATOR) {
            await page.addInitScript(() => {
                window.USE_EMULATOR = true;
            });
        }
    });

    // ============================================
    // TEST 1: Reifen Montage Request
    // ============================================
    test('KVA shows ONLY Montage variant for Reifen Montage request', async ({ page }) => {
        test.setTimeout(60000); // 60 seconds

        // STEP 1: Create Reifen Montage request
        console.log('📝 Creating Reifen Montage request...');

        await page.goto(`${BASE_URL}/partner-app/reifen-anfrage.html`);
        await page.waitForLoadState('networkidle');

        // Wait for Firebase initialization
        await page.waitForFunction(() => window.firebaseInitialized && window.db, { timeout: 10000 });

        // Login as partner (if needed)
        const loginRequired = await page.locator('input[type="email"]').isVisible().catch(() => false);
        if (loginRequired) {
            await page.fill('input[type="email"]', 'marcel@test.de');
            await page.fill('input[type="password"]', 'test123');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        // Fill Reifen Montage form
        await page.selectOption('select#art', 'montage'); // ← CRITICAL: Montage mitgebrachter Reifen
        await page.selectOption('select#typ', 'sommer');
        await page.fill('input#dimension', '205/55 R16 91V');
        await page.fill('input#anzahl', '4');
        await page.fill('input#kennzeichen', 'TEST-KVA 123');
        await page.fill('textarea#schadenBeschreibung', 'Test: Montage mitgebrachter Reifen');

        // Submit form
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();

        // Wait for success (toast or redirect)
        await page.waitForTimeout(2000);

        // Get request ID from Firestore
        const requestId = await page.evaluate(async () => {
            const snapshot = await window.db.collection('partnerAnfragen')
                .where('kennzeichen', '==', 'TEST-KVA 123')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            return snapshot.docs[0].id;
        });

        console.log('✅ Request created with ID:', requestId);
        expect(requestId).toBeTruthy();

        // STEP 2: Navigate to KVA page
        console.log('📊 Opening KVA page...');
        await page.goto(`${BASE_URL}/partner-app/kva-erstellen.html?id=${requestId}`);
        await page.waitForLoadState('networkidle');

        // Wait for anfrage data to load
        await page.waitForFunction(() => window.anfrage && window.anfrage.serviceData, { timeout: 10000 });

        // STEP 3: Verify serviceData was loaded correctly
        const serviceData = await page.evaluate(() => window.anfrage.serviceData);
        console.log('🔍 ServiceData:', serviceData);

        expect(serviceData).toBeTruthy();
        expect(serviceData.art).toBe('montage');
        expect(serviceData.typ).toBe('sommer');

        // STEP 4: Verify ONLY Montage variant is shown
        console.log('🎯 Checking KVA variants...');

        // Should show "Montage mitgebrachter Reifen" variant
        const montageVariant = await page.locator('h3:has-text("Montage")').first();
        await expect(montageVariant).toBeVisible({ timeout: 5000 });

        // Should NOT show "Premium-Reifen" variant
        const premiumVariant = page.locator('h3:has-text("Premium-Reifen")');
        await expect(premiumVariant).not.toBeVisible();

        // Should NOT show "Budget-Reifen" variant
        const budgetVariant = page.locator('h3:has-text("Budget-Reifen")');
        await expect(budgetVariant).not.toBeVisible();

        // Verify input fields are for Montage (not for purchase)
        const montageInput = await page.locator('input[id*="montage"]').first().isVisible().catch(() => false);
        expect(montageInput).toBe(true);

        console.log('✅ TEST PASSED: Only Montage variant shown');

        // STEP 5: Verify displayAnfrageInfo() shows serviceData details
        console.log('🔍 Checking Anfrage Info section...');

        const anfrageInfo = await page.locator('#anfrageInfo').textContent();

        // Should show service-specific details
        expect(anfrageInfo).toContain('Montage'); // ← CRITICAL: Should show art=montage
        expect(anfrageInfo).toContain('Sommer'); // ← Should show typ=sommer
        expect(anfrageInfo).toContain('205/55 R16'); // ← Should show dimension

        console.log('✅ TEST PASSED: displayAnfrageInfo() shows serviceData');

        // Cleanup: Delete test request
        await page.evaluate(async (id) => {
            await window.db.collection('partnerAnfragen').doc(id).delete();
        }, requestId);
    });

    // ============================================
    // TEST 2: Mechanik Diagnose Request
    // ============================================
    test('KVA shows NO parts fields for Mechanik Diagnose request', async ({ page }) => {
        test.setTimeout(60000);

        // STEP 1: Create Mechanik Diagnose request
        console.log('📝 Creating Mechanik Diagnose request...');

        await page.goto(`${BASE_URL}/partner-app/mechanik-anfrage.html`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.firebaseInitialized && window.db, { timeout: 10000 });

        // Fill Mechanik Diagnose form
        await page.selectOption('select#reparaturart', 'diagnose'); // ← CRITICAL: Diagnose only
        await page.fill('textarea#symptome', 'Motor macht komische Geräusche');
        await page.fill('input#kennzeichen', 'TEST-MECH 456');
        await page.fill('textarea#schadenBeschreibung', 'Test: Diagnose ohne Reparatur');

        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        const requestId = await page.evaluate(async () => {
            const snapshot = await window.db.collection('partnerAnfragen')
                .where('kennzeichen', '==', 'TEST-MECH 456')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            return snapshot.docs[0].id;
        });

        console.log('✅ Request created with ID:', requestId);
        expect(requestId).toBeTruthy();

        // STEP 2: Navigate to KVA page
        console.log('📊 Opening KVA page...');
        await page.goto(`${BASE_URL}/partner-app/kva-erstellen.html?id=${requestId}`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.anfrage && window.anfrage.serviceData, { timeout: 10000 });

        // STEP 3: Verify serviceData
        const serviceData = await page.evaluate(() => window.anfrage.serviceData);
        console.log('🔍 ServiceData:', serviceData);

        expect(serviceData.reparaturart).toBe('diagnose');

        // STEP 4: Verify ONLY Diagnose fields are shown (NO parts fields)
        console.log('🎯 Checking KVA fields...');

        // Should show "Diagnose" variant
        const diagnoseVariant = await page.locator('h3:has-text("Diagnose")').first();
        await expect(diagnoseVariant).toBeVisible({ timeout: 5000 });

        // Should have Diagnose cost field
        const diagnoseField = await page.locator('label:has-text("Diagnose")').first().isVisible().catch(() => false);
        expect(diagnoseField).toBe(true);

        // Should NOT have "Teilekosten" field (since diagnose only)
        const teileField = page.locator('label:has-text("Teilekosten"), label:has-text("Originalteile")');
        const teileVisible = await teileField.isVisible().catch(() => false);
        expect(teileVisible).toBe(false);

        console.log('✅ TEST PASSED: No parts fields for Diagnose');

        // STEP 5: Verify displayAnfrageInfo() shows reparaturart
        const anfrageInfo = await page.locator('#anfrageInfo').textContent();
        expect(anfrageInfo).toContain('Diagnose'); // ← Should show reparaturart

        // Cleanup
        await page.evaluate(async (id) => {
            await window.db.collection('partnerAnfragen').doc(id).delete();
        }, requestId);
    });

    // ============================================
    // TEST 3: Pflege Außenreinigung Request
    // ============================================
    test('KVA shows ONLY Außenreinigung fields for Pflege request', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Creating Pflege Außenreinigung request...');

        await page.goto(`${BASE_URL}/partner-app/pflege-anfrage.html`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.firebaseInitialized && window.db, { timeout: 10000 });

        // Fill Pflege form
        await page.selectOption('select#leistung', 'aussenreinigung'); // ← CRITICAL: Only exterior
        await page.selectOption('select#zustand', 'normal');
        await page.fill('input#kennzeichen', 'TEST-PFLG 789');
        await page.fill('textarea#schadenBeschreibung', 'Test: Nur Außenreinigung');

        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        const requestId = await page.evaluate(async () => {
            const snapshot = await window.db.collection('partnerAnfragen')
                .where('kennzeichen', '==', 'TEST-PFLG 789')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            return snapshot.docs[0].id;
        });

        expect(requestId).toBeTruthy();
        console.log('✅ Request created with ID:', requestId);

        // Navigate to KVA
        await page.goto(`${BASE_URL}/partner-app/kva-erstellen.html?id=${requestId}`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.anfrage && window.anfrage.serviceData, { timeout: 10000 });

        // Verify serviceData
        const serviceData = await page.evaluate(() => window.anfrage.serviceData);
        expect(serviceData.leistung).toBe('aussenreinigung');

        // Should show "Außenreinigung" variant
        const aussenVariant = await page.locator('h3:has-text("Außenreinigung")').first();
        await expect(aussenVariant).toBeVisible({ timeout: 5000 });

        // Should have Außenreinigung field
        const aussenField = await page.locator('label:has-text("Außenreinigung")').first().isVisible();
        expect(aussenField).toBe(true);

        // Should NOT have "Innenreinigung" field
        const innenField = await page.locator('label:has-text("Innenreinigung")').first().isVisible().catch(() => false);
        expect(innenField).toBe(false);

        console.log('✅ TEST PASSED: Only Außenreinigung fields shown');

        // Cleanup
        await page.evaluate(async (id) => {
            await window.db.collection('partnerAnfragen').doc(id).delete();
        }, requestId);
    });
});
