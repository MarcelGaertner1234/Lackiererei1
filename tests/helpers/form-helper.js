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
 * Setzt Partner-Session in LocalStorage VOR page.goto()
 * WICHTIG: Muss VOR page.goto('/partner-app/anfrage.html') aufgerufen werden!
 * @param {import('@playwright/test').Page} page
 * @param {Object} data
 */
async function setPartnerSession(page, data = {}) {
  const defaults = {
    partnerName: 'Test Partner GmbH',
    partnerEmail: 'test@partner.de',
    partnerTelefon: '+49 123 456789'
  };

  const partnerData = { ...defaults, ...data };

  await page.evaluate((partnerInfo) => {
    const partnerObj = {
      id: 'test-partner-e2e-cascade', // RUN #52: Static ID for CASCADE DELETE tests (prevents partnerId mismatch)
      name: partnerInfo.partnerName,
      email: partnerInfo.partnerEmail,
      telefon: partnerInfo.partnerTelefon,
      adresse: 'Teststraße 123, 12345 Teststadt'
    };
    localStorage.setItem('partner', JSON.stringify(partnerObj));
    console.log('🔧 Partner-Session set in LocalStorage BEFORE goto():', partnerObj.name);
  }, partnerData);
}

/**
 * Füllt Partner-Anfrage Formular mit vollständiger 9-Step Wizard Navigation
 * WICHTIG: setPartnerSession() MUSS vorher aufgerufen worden sein!
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
    baujahr: '2020', // Single field!
    kilometerstand: '50000',
    vin: 'WVWZZZ1JZXW123456', // Optional: 17 chars
    schadenBeschreibung: 'Test-Schaden für automatisierten Test',
    anliefertermin: getFutureDate(5) // Will be ignored - auto-selected by wizard
  };

  const formData = { ...defaults, ...data };

  // Wait for Firebase ready
  console.log('⏳ Waiting for Firebase initialization...');
  await page.waitForFunction(() => {
    return window.firebaseInitialized === true;
  }, { timeout: 10000 });
  console.log('✅ Firebase ready');

  // ============================================================
  // STEP 1: Schadensfotos (REQUIRED: min. 1 photo)
  // ============================================================
  console.log('📸 Step 1: Uploading test photo...');

  // FIX #1: Upload fake photo AND call displayPhotos() + updateNextButtonState()
  await page.evaluate(() => {
    const fakePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // CRITICAL FIX: Set BOTH global AND local scope!
    window.photos = [fakePhoto];  // Global scope
    photos = [fakePhoto];          // Local scope (fixes variable scope bug!)

    // Call displayPhotos() to properly render preview
    if (typeof displayPhotos === 'function') {
      displayPhotos();
    }

    // Enable "Weiter" button by calling updateNextButtonState()
    if (typeof updateNextButtonState === 'function') {
      updateNextButtonState();
    }
  });

  console.log('✅ Photo uploaded, displayPhotos() + updateNextButtonState() called');

  await page.waitForTimeout(300);

  // FIX #3: Explicit wait for button to be enabled
  await page.waitForFunction(() => {
    const btn = document.getElementById('btnNext');
    return btn && !btn.disabled;
  }, { timeout: 5000 });

  console.log('✅ "Weiter" button is enabled, clicking...');

  // Click "Weiter" to Step 2
  await page.click('button:has-text("Weiter")');
  await page.waitForTimeout(500);
  console.log('✅ Step 1 → Step 2');

  // ============================================================
  // STEP 2: Fahrzeug-Referenz + Fahrzeugdaten
  // ============================================================
  console.log('🚗 Step 2: Filling vehicle data...');

  await page.fill('#kennzeichen', formData.kennzeichen);
  await page.selectOption('#marke', formData.marke); // SELECT dropdown!
  await page.fill('#modell', formData.modell);
  await page.fill('#baujahr', formData.baujahr.toString());

  if (formData.kilometerstand) {
    await page.fill('#kilometerstand', formData.kilometerstand.toString());
  }

  await page.waitForTimeout(300);

  // Click "Weiter" to Step 3
  await page.click('button:has-text("Weiter")');
  await page.waitForTimeout(500);
  console.log('✅ Step 2 → Step 3');

  // ============================================================
  // STEP 3: Fahrzeugidentifikation (VIN or Fahrzeugschein-Foto)
  // ============================================================
  console.log('🔑 Step 3: Filling VIN...');

  // Fill VIN (17 chars, uppercase)
  if (formData.vin) {
    await page.fill('#vin', formData.vin.toUpperCase());
  }

  await page.waitForTimeout(300);

  // Click "Weiter" to Step 4
  await page.click('button:has-text("Weiter")');
  await page.waitForTimeout(500);
  console.log('✅ Step 3 → Step 4');

  // ============================================================
  // STEP 4: Schadensbeschreibung
  // ============================================================
  console.log('📝 Step 4: Filling damage description...');

  await page.fill('#schadenBeschreibung', formData.schadenBeschreibung);

  await page.waitForTimeout(300);

  // Click "Weiter" to Step 5
  await page.click('button:has-text("Weiter")');
  await page.waitForTimeout(500);
  console.log('✅ Step 4 → Step 5');

  // ============================================================
  // STEP 5-8: Karosserie, Ersatzteile, Termin, Lieferung
  // All have defaults selected, just click through!
  // ============================================================
  console.log('⚡ Steps 5-8: Using defaults, clicking through...');

  for (let step = 5; step <= 8; step++) {
    // SPECIAL: At Step 7, ensure Termine are available (mock if still loading)
    if (step === 7) {
      console.log('📅 Step 7: Ensuring Termine are mocked if still loading...');
      await page.evaluate(() => {
        const terminGrid = document.getElementById('terminGrid');
        if (terminGrid && terminGrid.innerHTML.includes('Lade')) {
          console.log('🔧 Termine still loading, mocking 4 options...');

          // Mock 4 Termine (EXPRESS, SCHNELL, NORMAL, ENTSPANNT)
          const today = new Date();
          const mockTermine = [
            { days: 1, label: 'EXPRESS', color: '#d32f2f' },
            { days: 2, label: 'SCHNELL', color: '#ff6f00' },
            { days: 5, label: 'NORMAL', color: '#1976d2' },
            { days: 8, label: 'ENTSPANNT', color: '#388e3c' }
          ];

          terminGrid.innerHTML = mockTermine.map((t, idx) => {
            const date = new Date(today);
            date.setDate(today.getDate() + t.days);
            const dateStr = date.toISOString().split('T')[0];
            const wochentag = date.toLocaleDateString('de-DE', { weekday: 'short' });
            const tag = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

            return `
              <label class="termin-option ${idx === 0 ? 'selected' : ''}" onclick="selectTermin(this)">
                <input type="radio" name="anliefertermin" value="${dateStr}" data-label="${t.label}" ${idx === 0 ? 'checked' : ''}>
                <div class="label" style="color: ${t.color};">${t.label}</div>
                <div style="font-weight: 600; margin: 5px 0;">${wochentag}, ${tag}</div>
                <small>🟢 Freie Kapazität</small>
                <small style="display: block; color: #999; margin-top: 3px;">in ${t.days} Tag${t.days > 1 ? 'en' : ''}</small>
              </label>
            `;
          }).join('');

          console.log('✅ Termine mocked (4 options)');
        } else {
          console.log('✅ Termine already loaded from ladeSmartetermine()');
        }
      });

      await page.waitForTimeout(300);  // Let DOM update
    }

    await page.click('button:has-text("Weiter")');
    await page.waitForTimeout(500);
    console.log(`✅ Step ${step} → Step ${step + 1}`);
  }

  // ============================================================
  // STEP 9: Zusammenfassung (Summary)
  // Button text changes to "Anfrage senden"
  // ============================================================
  console.log('✅ Step 9: Ready to submit!');
  console.log('📋 Form filled completely through 9-step wizard');
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
  setPartnerSession,
  fillPartnerRequestForm,
  getFutureDate,
  waitForSuccessMessage
};
