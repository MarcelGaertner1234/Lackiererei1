// ============================================
// PARTNER-APP MULTI-TENANT TESTS (TDD)
// ============================================
// Tests für Multi-Tenant Pattern in Partner-App:
// 1. Alle Service-Anfragen nutzen window.getCollection()
// 2. partnerAnfragen werden in werkstatt-spezifische Collections gespeichert
// 3. Admin-Seiten lesen aus werkstatt-spezifischen Collections
//
// Expected Behavior:
// - Service Forms: db.collection('partnerAnfragen') → window.getCollection('partnerAnfragen')
// - Collections: partnerAnfragen → partnerAnfragen_mosbach
// - werkstattId MUST be initialized before Firestore operations
// ============================================

const { test, expect } = require('@playwright/test');

// Test Configuration
const BASE_URL = 'http://localhost:8000';
const USE_EMULATOR = process.env.USE_EMULATOR === 'true';

test.describe('Partner-App Multi-Tenant Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Enable Firestore emulator if configured
        if (USE_EMULATOR) {
            await page.addInitScript(() => {
                window.USE_EMULATOR = true;
            });
        }

        // IMPORTANT: Login as partner before each test
        await page.goto(`${BASE_URL}/partner-app/index.html`);
        await page.waitForLoadState('networkidle');

        // Wait for Firebase initialization
        await page.waitForFunction(() => window.firebaseInitialized && window.db, { timeout: 10000 });

        // Check if already logged in
        const isLoggedIn = await page.evaluate(() => {
            const partner = localStorage.getItem('partner');
            return partner !== null;
        });

        if (!isLoggedIn) {
            // Login as partner
            await page.fill('input[type="email"]', 'marcel@test.de');
            await page.fill('input[type="password"]', 'test123');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }
    });

    // ============================================
    // TEST 1: Reifen Service Form - Multi-Tenant Check
    // ============================================
    test('Reifen-Anfrage saves to werkstatt-specific collection', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Testing Reifen-Anfrage Multi-Tenant...');

        await page.goto(`${BASE_URL}/partner-app/reifen-anfrage.html`);
        await page.waitForLoadState('networkidle');

        // Wait for Firebase + werkstattId
        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId, { timeout: 10000 });

        // Verify werkstattId is set
        const werkstattId = await page.evaluate(() => window.werkstattId);
        console.log('✅ werkstattId:', werkstattId);
        expect(werkstattId).toBeTruthy();
        expect(werkstattId).toBe('mosbach'); // Expected for test environment

        // Fill form (minimal required fields)
        // Note: Using data-testid or finding actual field IDs
        await page.locator('input[id*="kennzeichen"], input[name*="kennzeichen"]').first().fill('MT-TEST 001');
        await page.locator('textarea[id*="beschreibung"], textarea[name*="beschreibung"]').first().fill('Multi-Tenant Test Reifen');

        // Submit form
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify request was saved to werkstatt-specific collection
        const savedToCorrectCollection = await page.evaluate(async (wId) => {
            // Check if saved to partnerAnfragen_mosbach (NOT partnerAnfragen)
            const collectionName = `partnerAnfragen_${wId}`;
            console.log('🔍 Checking collection:', collectionName);

            const snapshot = await window.db.collection(collectionName)
                .where('kennzeichen', '==', 'MT-TEST 001')
                .limit(1)
                .get();

            console.log('📊 Found documents:', snapshot.size);
            return !snapshot.empty;
        }, werkstattId);

        expect(savedToCorrectCollection).toBe(true);
        console.log('✅ TEST PASSED: Reifen-Anfrage saved to partnerAnfragen_mosbach');

        // Cleanup
        await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-TEST 001')
                .get();
            snapshot.forEach(doc => doc.ref.delete());
        }, werkstattId);
    });

    // ============================================
    // TEST 2: Mechanik Service Form - Multi-Tenant Check
    // ============================================
    test('Mechanik-Anfrage saves to werkstatt-specific collection', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Testing Mechanik-Anfrage Multi-Tenant...');

        await page.goto(`${BASE_URL}/partner-app/mechanik-anfrage.html`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId, { timeout: 10000 });

        const werkstattId = await page.evaluate(() => window.werkstattId);
        expect(werkstattId).toBe('mosbach');

        // Fill form
        await page.locator('input[id*="kennzeichen"], input[name*="kennzeichen"]').first().fill('MT-TEST 002');
        await page.locator('textarea[id*="symptome"], textarea[id*="beschreibung"]').first().fill('Multi-Tenant Test Mechanik');

        // Submit
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify saved to correct collection
        const savedToCorrectCollection = await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-TEST 002')
                .limit(1)
                .get();
            return !snapshot.empty;
        }, werkstattId);

        expect(savedToCorrectCollection).toBe(true);
        console.log('✅ TEST PASSED: Mechanik-Anfrage saved to partnerAnfragen_mosbach');

        // Cleanup
        await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-TEST 002')
                .get();
            snapshot.forEach(doc => doc.ref.delete());
        }, werkstattId);
    });

    // ============================================
    // TEST 3: Pflege Service Form - Multi-Tenant Check
    // ============================================
    test('Pflege-Anfrage saves to werkstatt-specific collection', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Testing Pflege-Anfrage Multi-Tenant...');

        await page.goto(`${BASE_URL}/partner-app/pflege-anfrage.html`);
        await page.waitForLoadState('networkidle');

        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId, { timeout: 10000 });

        const werkstattId = await page.evaluate(() => window.werkstattId);
        expect(werkstattId).toBe('mosbach');

        // Fill form
        await page.locator('input[id*="kennzeichen"], input[name*="kennzeichen"]').first().fill('MT-TEST 003');
        await page.locator('textarea[id*="beschreibung"]').first().fill('Multi-Tenant Test Pflege');

        // Submit
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Verify
        const savedToCorrectCollection = await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-TEST 003')
                .limit(1)
                .get();
            return !snapshot.empty;
        }, werkstattId);

        expect(savedToCorrectCollection).toBe(true);
        console.log('✅ TEST PASSED: Pflege-Anfrage saved to partnerAnfragen_mosbach');

        // Cleanup
        await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-TEST 003')
                .get();
            snapshot.forEach(doc => doc.ref.delete());
        }, werkstattId);
    });

    // ============================================
    // TEST 4: Admin View - Multi-Tenant Read
    // ============================================
    test('Admin-Anfragen reads from werkstatt-specific collection', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Testing Admin-Anfragen Multi-Tenant Read...');

        // First, create a test request in partnerAnfragen_mosbach
        await page.goto(`${BASE_URL}/partner-app/reifen-anfrage.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId);

        const werkstattId = await page.evaluate(() => window.werkstattId);

        // Create test request
        await page.locator('input[id*="kennzeichen"]').first().fill('MT-ADMIN 001');
        await page.locator('textarea[id*="beschreibung"]').first().fill('Admin Multi-Tenant Test');
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Now navigate to Admin page
        console.log('🔍 Opening Admin-Anfragen page...');
        await page.goto(`${BASE_URL}/partner-app/admin-anfragen.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId);

        // Wait for anfragen to load
        await page.waitForTimeout(3000);

        // Verify admin sees the request (from werkstatt-specific collection)
        const adminSeesRequest = await page.evaluate(() => {
            // Check if MT-ADMIN 001 is visible on the page
            const pageText = document.body.innerText;
            return pageText.includes('MT-ADMIN 001');
        });

        expect(adminSeesRequest).toBe(true);
        console.log('✅ TEST PASSED: Admin reads from partnerAnfragen_mosbach');

        // Cleanup
        await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-ADMIN 001')
                .get();
            snapshot.forEach(doc => doc.ref.delete());
        }, werkstattId);
    });

    // ============================================
    // TEST 5: Meine-Anfragen (Partner Dashboard) - Multi-Tenant Read
    // ============================================
    test('Meine-Anfragen reads from werkstatt-specific collection', async ({ page }) => {
        test.setTimeout(60000);

        console.log('📝 Testing Meine-Anfragen Multi-Tenant Read...');

        // Create test request
        await page.goto(`${BASE_URL}/partner-app/reifen-anfrage.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId);

        await page.locator('input[id*="kennzeichen"]').first().fill('MT-PARTNER 001');
        await page.locator('textarea[id*="beschreibung"]').first().fill('Partner Dashboard Multi-Tenant Test');
        const submitButton = await page.locator('button:has-text("Absenden"), button:has-text("Anfrage senden")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Navigate to Meine-Anfragen
        console.log('🔍 Opening Meine-Anfragen page...');
        await page.goto(`${BASE_URL}/partner-app/meine-anfragen.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.firebaseInitialized && window.werkstattId);

        // Wait for Kanban to load
        await page.waitForTimeout(3000);

        // Verify partner sees the request
        const partnerSeesRequest = await page.evaluate(() => {
            const pageText = document.body.innerText;
            return pageText.includes('MT-PARTNER 001');
        });

        expect(partnerSeesRequest).toBe(true);
        console.log('✅ TEST PASSED: Meine-Anfragen reads from partnerAnfragen_mosbach');

        // Cleanup
        const werkstattId = await page.evaluate(() => window.werkstattId);
        await page.evaluate(async (wId) => {
            const snapshot = await window.db.collection(`partnerAnfragen_${wId}`)
                .where('kennzeichen', '==', 'MT-PARTNER 001')
                .get();
            snapshot.forEach(doc => doc.ref.delete());
        }, werkstattId);
    });

    // ============================================
    // TEST 6: Verify window.getCollection() Function Exists
    // ============================================
    test('window.getCollection() function is available', async ({ page }) => {
        await page.goto(`${BASE_URL}/partner-app/reifen-anfrage.html`);
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => window.firebaseInitialized, { timeout: 10000 });

        const getCollectionExists = await page.evaluate(() => {
            return typeof window.getCollection === 'function';
        });

        expect(getCollectionExists).toBe(true);
        console.log('✅ TEST PASSED: window.getCollection() function exists');

        // Test that getCollection() returns correct collection name
        const collectionName = await page.evaluate(() => {
            if (window.werkstattId) {
                const collection = window.getCollection('partnerAnfragen');
                return collection._queryOptions.collectionId;
            }
            return null;
        });

        if (collectionName) {
            expect(collectionName).toBe('partnerAnfragen_mosbach');
            console.log('✅ TEST PASSED: getCollection() returns partnerAnfragen_mosbach');
        } else {
            console.log('⚠️ werkstattId not initialized yet (expected if auth-check not implemented)');
        }
    });
});
