/**
 * Form Helper für E2E Tests
 *
 * Hilfsfunktionen zum Ausfüllen von Formularen
 */

/**
 * Füllt das Fahrzeug-Annahme Formular aus
 * @param {import('@playwright/test').Page} page
 * @param {Object} data
 */
async function fillVehicleIntakeForm(page, data = {}) {
  const defaults = {
    kennzeichen: 'TEST-123',
    kundenname: 'Test Kunde',
    geplantesAbnahmeDatum: getFutureDate(7), // 7 Tage in Zukunft
    serviceTyp: 'lackier',
    fahrzeugAbholung: 'nein',
    marke: 'Volkswagen',
    modell: 'Golf 8',
    baujahrVon: '2022',
    baujahrBis: '2022',
    kmstand: '45000',
    farbname: 'Tiefes Schwarz Perleffekt',
    farbnummer: 'LC9Z',
    lackart: 'perleffekt',
    vereinbarterPreis: '1250.00',
    notizen: 'Test-Notiz für automatisierten Test'
  };

  const formData = { ...defaults, ...data };

  // Basis-Felder
  await page.fill('#kennzeichen', formData.kennzeichen);
  await page.fill('#kundenname', formData.kundenname);
  await page.fill('#geplantesAbnahmeDatum', formData.geplantesAbnahmeDatum);

  // Service-Typ
  await page.selectOption('#serviceTyp', formData.serviceTyp);

  // Fahrzeugabholung
  await page.click(`input[name="fahrzeugAbholung"][value="${formData.fahrzeugAbholung}"]`);

  // Fahrzeugdaten
  await page.fill('#marke', formData.marke);
  await page.fill('#modell', formData.modell);
  await page.fill('#baujahrVon', formData.baujahrVon);
  await page.fill('#baujahrBis', formData.baujahrBis);
  await page.fill('#kmstand', formData.kmstand);

  // Lackierdaten
  await page.fill('#farbname', formData.farbname);
  await page.fill('#farbnummer', formData.farbnummer);
  await page.click(`input[name="lackart"][value="${formData.lackart}"]`);
  await page.fill('#vereinbarterPreis', formData.vereinbarterPreis);
  await page.fill('#notizen', formData.notizen);
}

/**
 * Lädt ein Test-Foto hoch
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - CSS Selector für File Input
 */
async function uploadTestPhoto(page, selector = '#photoInput') {
  // Erstelle ein Test-Bild als Base64
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Konvertiere Base64 zu Blob und simuliere File Upload
  await page.evaluate((selector) => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Konvertiere Data URL zu Blob
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], {type: mime});

    // Erstelle File Object
    const file = new File([blob], 'test-photo.png', { type: 'image/png' });

    // Erstelle FileList
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Setze FileList auf Input
    const input = document.querySelector(selector);
    if (input) {
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, selector);

  // Warte kurz damit Vorschau geladen wird
  await page.waitForTimeout(500);
}

/**
 * Zeichnet eine Test-Unterschrift auf Canvas
 * @param {import('@playwright/test').Page} page
 * @param {string} canvasSelector
 */
async function drawTestSignature(page, canvasSelector = '#signaturePad') {
  await page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(200, 50);
      ctx.lineTo(200, 100);
      ctx.lineTo(50, 100);
      ctx.closePath();
      ctx.stroke();
    }
  }, canvasSelector);

  await page.waitForTimeout(200);
}

/**
 * Füllt Partner-Anfrage Formular
 * @param {import('@playwright/test').Page} page
 * @param {Object} data
 */
async function fillPartnerRequestForm(page, data = {}) {
  const defaults = {
    partnerName: 'Test Partner GmbH',
    partnerEmail: 'test@partner.de',
    partnerTelefon: '+49 123 456789',
    kennzeichen: 'HD-TEST 999',
    marke: 'BMW',
    modell: '3er G20',
    baujahrVon: '2020',
    baujahrBis: '2020',
    kilometerstand: '50000',
    farbnummer: 'A96',
    farbname: 'Mineralweiß Metallic',
    lackart: 'metallic',
    schadenBeschreibung: 'Test-Schaden für automatisierten Test',
    anliefertermin: getFutureDate(5),
    dringlichkeit: 'normal'
  };

  const formData = { ...defaults, ...data };

  // Partner-Session via LocalStorage setzen (statt Formular-Felder)
  // Partner-Portal lädt Partner-Daten aus LocalStorage, nicht aus Input-Feldern!
  await page.evaluate((partnerData) => {
    localStorage.setItem('partner', JSON.stringify({
      id: 'test-partner-' + Date.now(),
      name: partnerData.partnerName,
      email: partnerData.partnerEmail,
      telefon: partnerData.partnerTelefon,
      adresse: 'Teststraße 123, 12345 Teststadt'
    }));
  }, formData);

  // Seite reloaden damit Partner-Daten geladen werden
  await page.reload();
  await page.waitForTimeout(500); // Kurz warten bis Partner-Name angezeigt wird

  // Fahrzeugdaten (Partner-Portal hat andere Felder als Annahme-Seite!)
  await page.fill('#kennzeichen', formData.kennzeichen);
  await page.selectOption('#marke', formData.marke); // SELECT, nicht fill!
  await page.fill('#modell', formData.modell);
  await page.fill('#baujahr', formData.baujahrVon); // NUR baujahr, nicht baujahrVon/Bis!
  await page.fill('#kilometerstand', formData.kilometerstand);

  // Schadensbeschreibung (Step 4 im Wizard)
  await page.fill('#schadenBeschreibung', formData.schadenBeschreibung); // ID statt name-Attribut!

  // HINWEIS: Partner-Portal ist ein Wizard mit 9 Steps!
  // Tests müssen nextStep() aufrufen um durch die Steps zu navigieren.
  // Anliefertermin wird via Radio-Buttons gewählt, nicht Input-Feld.
}

/**
 * Hilfsfunktion: Generiert Datum in Zukunft
 * @param {number} days - Anzahl Tage in Zukunft
 * @returns {string} Datum im Format YYYY-MM-DD
 */
function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Wartet auf Success-Message
 * @param {import('@playwright/test').Page} page
 * @param {string} expectedText
 */
async function waitForSuccessMessage(page, expectedText = 'erfolgreich') {
  await page.waitForSelector('.success-message, .toast.success, [class*="success"]', {
    state: 'visible',
    timeout: 10000
  });

  const messageText = await page.textContent('.success-message, .toast.success, [class*="success"]');
  return messageText?.includes(expectedText);
}

module.exports = {
  fillVehicleIntakeForm,
  uploadTestPhoto,
  drawTestSignature,
  fillPartnerRequestForm,
  getFutureDate,
  waitForSuccessMessage
};
