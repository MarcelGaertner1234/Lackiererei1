/**
 * RUN #37: Firebase Config Diagnostic Test
 *
 * This test directly inspects window.firebaseApp to determine:
 * 1. Which functions are actually loaded at runtime
 * 2. Whether registriereKundenbesuch exists
 * 3. What the actual structure of firebaseApp looks like
 *
 * This bypasses the console.log capture issues we've been having.
 */

const { test, expect } = require('@playwright/test');
const { waitForFirebaseReady } = require('./helpers/firebase-helper');

test.describe('RUN #37: Firebase Config Diagnostics', () => {
  test('Verify firebaseApp structure and registriereKundenbesuch function', async ({ page }) => {
    console.log('🔍 RUN #37: Starting Firebase Config diagnostic test...');

    // RUN #38: Navigate to partner app (no cache parameter needed - server forces reload)
    await page.goto('/partner-app/anfrage.html');
    await waitForFirebaseReady(page);

    console.log('✅ Firebase initialized, inspecting structure...');

    // Direct inspection of window.firebaseApp
    const firebaseInfo = await page.evaluate(() => {
      const info = {
        exists: !!window.firebaseApp,
        type: typeof window.firebaseApp,
        initFlag: window.firebaseInitialized,
        allKeys: window.firebaseApp ? Object.keys(window.firebaseApp) : [],
        functions: [],
        hasRegistriereKundenbesuch: false,
        registriereKundenbesuchType: 'undefined'
      };

      if (window.firebaseApp) {
        // List all functions
        info.functions = Object.keys(window.firebaseApp).filter(key =>
          typeof window.firebaseApp[key] === 'function'
        );

        // Check specific function
        info.hasRegistriereKundenbesuch = !!window.firebaseApp.registriereKundenbesuch;
        info.registriereKundenbesuchType = typeof window.firebaseApp.registriereKundenbesuch;
      }

      return info;
    });

    // Log everything for analysis
    console.log('📋 RUN #37: Firebase Config Analysis:');
    console.log('  window.firebaseApp exists:', firebaseInfo.exists);
    console.log('  window.firebaseApp type:', firebaseInfo.type);
    console.log('  window.firebaseInitialized:', firebaseInfo.initFlag);
    console.log('  Total keys:', firebaseInfo.allKeys.length);
    console.log('  All keys:', JSON.stringify(firebaseInfo.allKeys));
    console.log('  Function count:', firebaseInfo.functions.length);
    console.log('  All functions:', JSON.stringify(firebaseInfo.functions));
    console.log('  registriereKundenbesuch exists:', firebaseInfo.hasRegistriereKundenbesuch);
    console.log('  registriereKundenbesuch type:', firebaseInfo.registriereKundenbesuchType);

    // Check which script tag loaded firebase config
    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const firebaseScripts = scripts
        .filter(s => s.src && s.src.includes('firebase-config'))
        .map(s => ({
          src: s.src,
          loaded: !s.error
        }));

      return firebaseScripts;
    });

    console.log('  Firebase config scripts:', JSON.stringify(scriptInfo));

    // CRITICAL ASSERTIONS
    expect(firebaseInfo.exists).toBe(true);
    expect(firebaseInfo.functions.length).toBeGreaterThan(0);

    // THIS IS THE KEY TEST - Does registriereKundenbesuch exist?
    if (!firebaseInfo.hasRegistriereKundenbesuch) {
      console.error('❌ CRITICAL: registriereKundenbesuch is MISSING from firebaseApp!');
      console.error('   Expected functions: db, getAllFahrzeuge, saveFahrzeug, registriereKundenbesuch, savePhotosToFirestore, ...');
      console.error('   Actual functions:', firebaseInfo.functions);
      console.error('   This proves the function is not being loaded from firebase-config.template.js');
    }

    expect(firebaseInfo.hasRegistriereKundenbesuch).toBe(true);
    expect(firebaseInfo.registriereKundenbesuchType).toBe('function');
  });
});
