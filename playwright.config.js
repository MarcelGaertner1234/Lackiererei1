// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration für Fahrzeugannahme App E2E Tests
 *
 * Dokumentation: https://playwright.dev/docs/test-configuration
 */

module.exports = defineConfig({
  testDir: './tests',

  /* Maximale Zeit die ein Test laufen darf */
  timeout: 90 * 1000, // 90 Sekunden (buffer for Firebase + Firestore)

  /* Expect Timeout für Assertions */
  expect: {
    timeout: 15000 // 15 Sekunden (reduced from 30s)
  },

  /* Bei Fehler: Nur 1 Retry statt 2 */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // 1 retry instead of 2

  /* Reporter: HTML + Console */
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  /* Shared settings für alle Tests */
  use: {
    /* Base URL für alle Tests */
    baseURL: 'http://localhost:8000',

    /* Trace bei Fehler aufnehmen (Screenshots, Videos, Network-Logs) */
    trace: 'on-first-retry',

    /* Screenshots bei Fehler */
    screenshot: 'only-on-failure',

    /* Video bei Fehler */
    video: 'retain-on-failure',

    /* Browser-Context Optionen */
    viewport: { width: 1920, height: 1080 },

    /* Locale und Timezone */
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',

    /* Permissions für Kamera/Mikrofon (für Foto-Upload) */
    permissions: ['camera', 'microphone'],

    /* RUN #20 FIX: Clear browser cache to prevent loading stale firebase-config.js */
    /* This ensures the browser always loads the fresh firebase-config.js copied from template */
    storageState: undefined, // No persistent storage state between tests
    serviceWorkers: 'block',  // Block service workers to prevent caching
  },

  /* Test-Projekte für verschiedene Browser */
  /* ✅ FIX BUG #13: Nur Chromium aktiviert (Firefox/WebKit nicht installiert) */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],

        /* RUN #24 RADICAL FIX: Aggressive cache clearing via Chromium launch args */
        /* Query parameters (?v=RUN23) FAILED - browser still cached old file */
        /* Solution: Disable ALL caching mechanisms at browser level */
        launchOptions: {
          args: [
            '--disable-cache',                    // Disable HTTP cache
            '--disable-application-cache',        // Disable application cache
            '--disable-offline-load-stale-cache', // Don't load stale cache when offline
            '--disk-cache-size=0',                // Set disk cache size to 0
            '--media-cache-size=0',               // Set media cache size to 0
          ],
        },
      },
    },

    /* ✅ Firefox aktiviert (RUN #[SESSION_2025-10-28_ABEND]) */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    /* ✅ WebKit/Safari aktiviert (RUN #[SESSION_2025-10-28_ABEND]) */
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile Tests */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    /* ✅ Mobile Safari aktiviert (RUN #[SESSION_2025-10-28_ABEND]) */
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    /* ✅ iPad Tests aktiviert (RUN #[SESSION_2025-10-28_ABEND]) */
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro'] },
    }
  ],

  /* Web Server starten vor Tests */
  /* RUN #39 FIX: Use http-server npm package with cache disabled */
  /* Problem (RUN #38): Custom Python server failed to start (Exit code: 1) */
  /* Solution: Use battle-tested http-server with -c-1 flag (disables caching) */
  webServer: {
    command: 'npx http-server -p 8000 -c-1 --silent',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 10 * 1000,
  },
});
