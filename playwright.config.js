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
  timeout: 60 * 1000, // 60 Sekunden (reduced from 180s)

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
  },

  /* Test-Projekte für verschiedene Browser */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile Tests */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    /* Tablet Tests */
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro'] },
    }
  ],

  /* Web Server starten vor Tests */
  webServer: {
    command: 'python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 10 * 1000,
  },
});
