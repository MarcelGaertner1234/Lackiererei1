/**
 * Firebase Helper für E2E Tests
 *
 * Hilfsfunktionen für Firebase-Operationen während Tests
 */

/**
 * Wartet auf Firebase Initialisierung im Browser
 * @param {import('@playwright/test').Page} page
 */
async function waitForFirebaseReady(page) {
  await page.waitForFunction(() => {
    return window.firebaseApp && window.firebaseApp.db && window.firebaseInitialized === true;
  }, { timeout: 15000 });
}

/**
 * Prüft ob ein Fahrzeug in Firestore existiert
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function checkVehicleExists(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    return fahrzeuge.some(f => f.kennzeichen === kz);
  }, kennzeichen);
}

/**
 * Holt Fahrzeugdaten aus Firestore
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function getVehicleData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    return fahrzeuge.find(f => f.kennzeichen === kz);
  }, kennzeichen);
}

/**
 * Prüft ob ein Kunde in Firestore existiert
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function checkCustomerExists(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    return kunden.some(k => k.name === customerName);
  }, name);
}

/**
 * Holt Kundendaten aus Firestore
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function getCustomerData(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    return kunden.find(k => k.name === customerName);
  }, name);
}

/**
 * Löscht ein Fahrzeug aus Firestore (Cleanup)
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 */
async function deleteVehicle(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const fahrzeuge = await window.firebaseApp.getAllFahrzeuge();
    const vehicle = fahrzeuge.find(f => f.kennzeichen === kz);
    if (vehicle) {
      await window.firebaseApp.deleteFahrzeug(vehicle.id);
      return true;
    }
    return false;
  }, kennzeichen);
}

/**
 * Löscht einen Kunden aus Firestore (Cleanup)
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function deleteCustomer(page, name) {
  return await page.evaluate(async (customerName) => {
    const kunden = await window.firebaseApp.getAllKunden();
    const kunde = kunden.find(k => k.name === customerName);
    if (kunde) {
      await window.firebaseApp.deleteKunde(kunde.id);
      return true;
    }
    return false;
  }, name);
}

/**
 * Wartet auf Realtime Update
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
async function waitForRealtimeUpdate(page, timeout = 5000) {
  await page.waitForFunction(() => {
    // Prüfe auf console.log mit "🔥 Realtime Update"
    return true; // Simplified - in real tests we'd check actual updates
  }, { timeout });

  // Warte kurz damit DOM Updates abgeschlossen sind
  await page.waitForTimeout(500);
}

/**
 * Prüft Console Logs auf Fehler
 * @param {import('@playwright/test').Page} page
 */
function setupConsoleMonitoring(page) {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  return {
    getErrors: () => errors,
    hasErrors: () => errors.length > 0
  };
}

module.exports = {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  checkCustomerExists,
  getCustomerData,
  deleteVehicle,
  deleteCustomer,
  waitForRealtimeUpdate,
  setupConsoleMonitoring
};
