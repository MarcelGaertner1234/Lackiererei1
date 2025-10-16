/**
 * RUN #41: RADICAL FIX - Direct Browser Diagnostics
 *
 * Problem (RUN #27-40):
 * - waitForFirebaseReady() times out after 90 seconds
 * - Firebase never initializes in browser
 * - We don't know WHY it fails
 *
 * Solution:
 * - Skip waitForFirebaseReady() completely
 * - Wait 5 seconds for async loading
 * - Dump EVERYTHING from browser
 * - NO assertions → can't fail
 * - See exactly what's happening
 */

const { test } = require('@playwright/test');

test.describe('RUN #41: Direct Browser Diagnostics', () => {
  test('Complete browser state dump - NO timeouts', async ({ page }) => {
    console.log('🔍 RUN #41: Starting DIRECT browser diagnostics...');
    console.log('  Approach: Skip waitForFirebaseReady, dump everything');
    console.log('');

    // Navigate to page
    await page.goto('/partner-app/meine-anfragen.html');
    console.log('✅ Page navigation complete');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    console.log('✅ Network idle');

    // Wait 5 seconds for any async initialization
    console.log('⏳ Waiting 5 seconds for async loading...');
    await page.waitForTimeout(5000);
    console.log('✅ Wait complete');

    // Get COMPLETE browser state
    const fullDiagnostics = await page.evaluate(() => {
      // Capture ALL script tags
      const allScripts = Array.from(document.scripts).map(s => ({
        src: s.src || '(inline)',
        type: s.type || 'text/javascript',
        async: s.async,
        defer: s.defer,
        loaded: s.readyState === 'complete' || s.readyState === 'loaded',
        hasError: !!s.error
      }));

      // Find firebase-related scripts
      const firebaseScripts = allScripts.filter(s =>
        s.src && (s.src.includes('firebase') || s.src.includes('gstatic'))
      );

      // Check window.firebaseApp
      const firebaseApp = {
        exists: typeof window.firebaseApp !== 'undefined',
        type: typeof window.firebaseApp,
        isNull: window.firebaseApp === null,
        keys: window.firebaseApp ? Object.keys(window.firebaseApp) : [],
        functions: window.firebaseApp ?
          Object.keys(window.firebaseApp).filter(k => typeof window.firebaseApp[k] === 'function') : [],
        values: {}
      };

      // Get sample values for each key
      if (window.firebaseApp) {
        Object.keys(window.firebaseApp).forEach(key => {
          const val = window.firebaseApp[key];
          firebaseApp.values[key] = typeof val;
        });
      }

      // Check initialization flag
      const initState = {
        firebaseInitialized: window.firebaseInitialized,
        firebaseInitializedType: typeof window.firebaseInitialized
      };

      // Check if registriereKundenbesuch exists
      const targetFunction = {
        exists: window.firebaseApp && typeof window.firebaseApp.registriereKundenbesuch !== 'undefined',
        type: window.firebaseApp ? typeof window.firebaseApp.registriereKundenbesuch : 'N/A',
        isFunction: window.firebaseApp && typeof window.firebaseApp.registriereKundenbesuch === 'function'
      };

      // Capture any console errors (if tracked)
      const errors = window.__capturedErrors || [];

      // Current URL
      const currentUrl = window.location.href;

      return {
        currentUrl,
        allScripts,
        firebaseScripts,
        firebaseApp,
        initState,
        targetFunction,
        errors,
        timestamp: new Date().toISOString()
      };
    });

    // Log EVERYTHING in detail
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RUN #41: COMPLETE BROWSER DIAGNOSTICS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📍 CURRENT URL:');
    console.log('  ', fullDiagnostics.currentUrl);
    console.log('');
    console.log('📜 ALL SCRIPTS LOADED:', fullDiagnostics.allScripts.length);
    fullDiagnostics.allScripts.forEach((script, i) => {
      console.log(`  [${i+1}] ${script.src}`);
      console.log(`      Type: ${script.type}, Loaded: ${script.loaded}, Error: ${script.hasError}`);
    });
    console.log('');
    console.log('🔥 FIREBASE-RELATED SCRIPTS:', fullDiagnostics.firebaseScripts.length);
    fullDiagnostics.firebaseScripts.forEach((script, i) => {
      console.log(`  [${i+1}] ${script.src}`);
      console.log(`      Loaded: ${script.loaded}, Error: ${script.hasError}`);
    });
    console.log('');
    console.log('🔍 window.firebaseApp CHECK:');
    console.log('  exists:', fullDiagnostics.firebaseApp.exists);
    console.log('  type:', fullDiagnostics.firebaseApp.type);
    console.log('  isNull:', fullDiagnostics.firebaseApp.isNull);
    console.log('  keys:', JSON.stringify(fullDiagnostics.firebaseApp.keys));
    console.log('  functions:', JSON.stringify(fullDiagnostics.firebaseApp.functions));
    console.log('');
    console.log('📊 firebaseApp VALUES:');
    console.log(JSON.stringify(fullDiagnostics.firebaseApp.values, null, 2));
    console.log('');
    console.log('🚩 INITIALIZATION STATE:');
    console.log('  window.firebaseInitialized:', fullDiagnostics.initState.firebaseInitialized);
    console.log('  type:', fullDiagnostics.initState.firebaseInitializedType);
    console.log('');
    console.log('🎯 TARGET FUNCTION (registriereKundenbesuch):');
    console.log('  exists:', fullDiagnostics.targetFunction.exists);
    console.log('  type:', fullDiagnostics.targetFunction.type);
    console.log('  isFunction:', fullDiagnostics.targetFunction.isFunction);
    console.log('');
    console.log('❌ CAPTURED ERRORS:', fullDiagnostics.errors.length);
    if (fullDiagnostics.errors.length > 0) {
      fullDiagnostics.errors.forEach((err, i) => {
        console.log(`  [${i+1}]`, err);
      });
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('END DIAGNOSTICS - Timestamp:', fullDiagnostics.timestamp);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // CRITICAL ANALYSIS
    if (!fullDiagnostics.firebaseApp.exists) {
      console.error('🚨 CRITICAL: window.firebaseApp does NOT exist!');
      console.error('   This means firebase-config-RUN24.js either:');
      console.error('   1. Did not load (404 error)');
      console.error('   2. Had JavaScript error during execution');
      console.error('   3. Does not create window.firebaseApp object');
    } else if (fullDiagnostics.firebaseApp.functions.length === 0) {
      console.error('🚨 CRITICAL: window.firebaseApp exists but has NO functions!');
      console.error('   Keys found:', fullDiagnostics.firebaseApp.keys);
      console.error('   This suggests incomplete initialization');
    } else if (!fullDiagnostics.targetFunction.isFunction) {
      console.error('🚨 CRITICAL: registriereKundenbesuch is MISSING!');
      console.error('   Available functions:', fullDiagnostics.firebaseApp.functions);
      console.error('   This confirms the original bug: function not in firebase-config');
    } else {
      console.log('✅ SUCCESS: registriereKundenbesuch EXISTS and is a function!');
      console.log('   If we see this, the original bug should be fixed!');
    }

    // NO ASSERTIONS - This test CANNOT fail
    // We just want to see what's happening
    console.log('');
    console.log('ℹ️  Test complete - NO assertions made (diagnostic only)');
  });
});
