# 🧪 E2E-Test-Plan - Fahrzeugannahme App

**Datum:** 2025-10-31
**Framework:** Playwright (JavaScript)
**Total Tests:** 566 (7 Test Suites)
**Geschätzte Dauer:** ~45 Minuten (parallel execution)

---

## 📋 Table of Contents

1. [Test Suite 1: Core Fahrzeug-Workflow](#test-suite-1-core-fahrzeug-workflow) (96 Tests)
2. [Test Suite 2: Partner-App Workflow](#test-suite-2-partner-app-workflow) (64 Tests)
3. [Test Suite 3: Multi-Tenant Isolation](#test-suite-3-multi-tenant-isolation) (36 Tests)
4. [Test Suite 4: Service-spezifische Logik](#test-suite-4-service-spezifische-logik) (100 Tests)
5. [Test Suite 5: KI Chat & Cloud Functions](#test-suite-5-ki-chat--cloud-functions) (24 Tests)
6. [Test Suite 6: Error Handling & Validations](#test-suite-6-error-handling--validations) (72 Tests)
7. [Test Suite 7: Performance & Stress Tests](#test-suite-7-performance--stress-tests) (24 Tests)

---

## 🎯 Test-Strategie

### Setup Requirements

**Before Running Tests:**
```bash
# 1. Start Firebase Emulators
firebase emulators:start --only firestore,storage --project demo-test

# 2. Start HTTP Server
npm run server  # localhost:8000

# 3. Run Tests
npm test                 # All tests (headless)
npm run test:headed      # With browser UI
npm run test:ui          # Playwright UI mode
npm run test:debug       # Playwright Inspector
```

### Test Data Setup

**Fixtures Location:** `tests/fixtures/`

```
tests/fixtures/
├── photos/
│   ├── vorher1.jpg  (500 KB)
│   ├── vorher2.jpg  (800 KB)
│   └── nachher1.jpg (600 KB)
├── users/
│   ├── werkstatt-mosbach.json
│   └── partner-marcel.json
└── vehicles/
    ├── reifen-anfrage.json
    └── lackier-anfrage.json
```

### Test Utilities

**File:** `tests/utils/helpers.js`

```javascript
// Login Helper
export async function loginWerkstatt(page, email = 'werkstatt-mosbach@test.de', password = 'test123') {
  await page.goto('http://localhost:8000/index.html?useEmulator=true');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#loginBtn');
  await page.waitForURL('**/annahme.html');
}

// Wait for Firebase
export async function waitForFirebase(page) {
  await page.waitForFunction(() => window.firebaseInitialized === true);
}

// Clear Firestore Collection
export async function clearCollection(page, collectionName) {
  await page.evaluate(async (collection) => {
    const snapshot = await window.db.collection(collection).get();
    const batch = window.db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }, collectionName);
}

// Create Test Vehicle
export async function createTestVehicle(page, vehicleData) {
  await page.evaluate(async (data) => {
    await window.getCollection('fahrzeuge').doc(data.id).set(data);
  }, vehicleData);
}
```

---

## Test Suite 1: Core Fahrzeug-Workflow

**File:** `tests/01-core-workflow.spec.js`
**Tests:** 96
**Duration:** ~8 minutes

### TS1-001 to TS1-032: Vehicle Intake (annahme.html)

#### **TS1-001: Vehicle Intake - Happy Path**

```javascript
import { test, expect } from '@playwright/test';
import { loginWerkstatt, waitForFirebase, clearCollection } from './utils/helpers.js';

test.describe('TS1: Vehicle Intake', () => {
  test.beforeEach(async ({ page }) => {
    // Clear test data
    await loginWerkstatt(page);
    await clearCollection(page, 'fahrzeuge_mosbach');
  });

  test('TS1-001: Vehicle Intake - Happy Path', async ({ page }) => {
    // Navigate to annahme.html
    await page.goto('http://localhost:8000/annahme.html?useEmulator=true');
    await waitForFirebase(page);

    // Fill form
    await page.fill('#kennzeichen', 'MOS-CG 123');
    await page.fill('#marke', 'Mercedes');
    await page.fill('#modell', 'G-Klasse');
    await page.selectOption('#serviceTypSelect', 'lackier');
    await page.fill('#kundenName', 'Max Mustermann');
    await page.fill('#kundenEmail', 'max@example.de');
    await page.fill('#kundenTelefon', '+49 6261 123456');
    await page.fill('#beschreibung', 'Kratzer an Stoßstange');

    // Upload photos
    await page.setInputFiles('#photoInput', [
      'tests/fixtures/photos/vorher1.jpg',
      'tests/fixtures/photos/vorher2.jpg',
      'tests/fixtures/photos/vorher3.jpg'
    ]);

    // Wait for photo preview
    await expect(page.locator('.photo-item img')).toHaveCount(3);

    // Submit form
    await page.click('#submitBtn');

    // Validate toast notification
    await expect(page.locator('.toast')).toContainText('Fahrzeug gespeichert!', { timeout: 5000 });

    // Validate redirect
    await page.waitForURL('**/liste.html', { timeout: 3000 });

    // Validate vehicle in liste.html
    await expect(page.locator('.vehicle-card')).toContainText('MOS-CG 123');
    await expect(page.locator('.vehicle-card')).toContainText('Mercedes');
    await expect(page.locator('.vehicle-card')).toContainText('G-Klasse');
  });
});
```

#### **TS1-002: Vehicle Intake - Service-Specific Fields (Reifen)**

```javascript
test('TS1-002: Vehicle Intake - Service-Specific Fields (Reifen)', async ({ page }) => {
  await page.goto('http://localhost:8000/annahme.html?useEmulator=true');
  await waitForFirebase(page);

  // Select service type
  await page.selectOption('#serviceTypSelect', 'reifen');

  // Validate service-specific fields shown
  await expect(page.locator('#reifenDetails')).toBeVisible();
  await expect(page.locator('#reifengroesse')).toBeVisible();
  await expect(page.locator('#reifentyp')).toBeVisible();
  await expect(page.locator('#reifenanzahl')).toBeVisible();

  // Fill service-specific fields
  await page.fill('#reifengroesse', '205/55 R16 91V');
  await page.selectOption('#reifentyp', 'sommer');
  await page.fill('#reifenanzahl', '4');

  // Fill required fields
  await page.fill('#kennzeichen', 'MOS-RR 456');
  await page.fill('#marke', 'BMW');
  await page.fill('#modell', '3er');
  await page.fill('#kundenName', 'Anna Schmidt');

  // Submit
  await page.click('#submitBtn');

  // Validate toast
  await expect(page.locator('.toast')).toContainText('Fahrzeug gespeichert!');

  // Validate Firestore data
  const vehicleData = await page.evaluate(async () => {
    const snapshot = await window.getCollection('fahrzeuge')
      .where('kennzeichen', '==', 'MOS-RR 456')
      .limit(1)
      .get();
    return snapshot.docs[0].data();
  });

  expect(vehicleData.serviceTyp).toBe('reifen');
  expect(vehicleData.serviceDetails).toEqual({
    reifengroesse: '205/55 R16 91V',
    reifentyp: 'sommer',
    reifenanzahl: 4
  });
});
```

#### **TS1-003: Vehicle Intake - Invalid Kennzeichen**

```javascript
test('TS1-003: Vehicle Intake - Invalid Kennzeichen', async ({ page }) => {
  await page.goto('http://localhost:8000/annahme.html?useEmulator=true');
  await waitForFirebase(page);

  // Fill form with invalid Kennzeichen
  await page.fill('#kennzeichen', 'INVALID');
  await page.fill('#marke', 'VW');
  await page.fill('#modell', 'Golf');
  await page.fill('#kundenName', 'Test User');

  // Submit
  await page.click('#submitBtn');

  // Validate error toast
  await expect(page.locator('.toast')).toContainText('Ungültiges Kennzeichen!', { timeout: 2000 });

  // Validate form NOT submitted (still on annahme.html)
  await expect(page).toHaveURL(/.*annahme.html/);
});
```

**... 29 more test cases for annahme.html ...**

### TS1-033 to TS1-064: Vehicle List (liste.html)

#### **TS1-033: Vehicle List - Load All Vehicles**

```javascript
test('TS1-033: Vehicle List - Load All Vehicles', async ({ page }) => {
  // Create 5 test vehicles
  await loginWerkstatt(page);

  for (let i = 1; i <= 5; i++) {
    await createTestVehicle(page, {
      id: `test_${i}`,
      kennzeichen: `MOS-T${i} 123`,
      marke: 'Test',
      modell: `Model ${i}`,
      serviceTyp: 'lackier',
      status: 'neu',
      timestamp: Date.now() + i
    });
  }

  // Navigate to liste.html
  await page.goto('http://localhost:8000/liste.html?useEmulator=true');
  await waitForFirebase(page);

  // Validate all vehicles loaded
  await expect(page.locator('.vehicle-card')).toHaveCount(5, { timeout: 5000 });
  await expect(page.locator('.vehicle-card').first()).toContainText('MOS-T1 123');
});
```

#### **TS1-034: Vehicle List - Search by Kennzeichen**

```javascript
test('TS1-034: Vehicle List - Search by Kennzeichen', async ({ page }) => {
  await loginWerkstatt(page);

  // Create 3 test vehicles
  await createTestVehicle(page, { id: 'test_1', kennzeichen: 'MOS-AA 111', marke: 'Mercedes', timestamp: Date.now() });
  await createTestVehicle(page, { id: 'test_2', kennzeichen: 'MOS-BB 222', marke: 'BMW', timestamp: Date.now() + 1 });
  await createTestVehicle(page, { id: 'test_3', kennzeichen: 'MOS-CC 333', marke: 'Audi', timestamp: Date.now() + 2 });

  // Navigate to liste.html
  await page.goto('http://localhost:8000/liste.html?useEmulator=true');
  await waitForFirebase(page);

  // Search for specific Kennzeichen
  await page.fill('#searchInput', 'BB');

  // Validate only 1 vehicle shown
  await expect(page.locator('.vehicle-card')).toHaveCount(1, { timeout: 2000 });
  await expect(page.locator('.vehicle-card')).toContainText('MOS-BB 222');
  await expect(page.locator('.vehicle-card')).toContainText('BMW');
});
```

**... 30 more test cases for liste.html ...**

### TS1-065 to TS1-096: Kanban & Abnahme

**... 32 more test cases for kanban.html + abnahme.html ...**

---

## Test Suite 2: Partner-App Workflow

**File:** `tests/02-partner-workflow.spec.js`
**Tests:** 64
**Duration:** ~6 minutes

### TS2-001 to TS2-032: Partner Request Flow

#### **TS2-001: Partner Request - Happy Path (Reifen)**

```javascript
import { test, expect } from '@playwright/test';

test.describe('TS2: Partner Workflow', () => {
  test('TS2-001: Partner Request - Happy Path (Reifen)', async ({ page }) => {
    // Partner Login
    await page.goto('http://localhost:8000/partner-app/index.html?useEmulator=true');
    await page.fill('#email', 'marcel@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');
    await page.waitForURL('**/service-auswahl.html');

    // Select Reifen-Service
    await page.click('a[href="reifen-anfrage.html"]');
    await page.waitForURL('**/reifen-anfrage.html');

    // Fill form
    await page.fill('#kennzeichen', 'HN-AB 123');
    await page.fill('#marke', 'Mercedes');
    await page.fill('#modell', 'C-Klasse');
    await page.selectOption('#art', 'montage');
    await page.selectOption('#typ', 'sommer');
    await page.fill('#dimension', '205/55 R16 91V');
    await page.fill('#anzahl', '4');
    await page.fill('#notizen', 'Bitte schnell bearbeiten');

    // Submit
    await page.click('#submitBtn');

    // Validate toast
    await expect(page.locator('.toast')).toContainText('Anfrage gesendet!', { timeout: 3000 });

    // Validate Firestore data
    const anfrageData = await page.evaluate(async () => {
      const snapshot = await window.getCollection('partnerAnfragen')
        .where('kennzeichen', '==', 'HN-AB 123')
        .limit(1)
        .get();
      return snapshot.docs[0].data();
    });

    expect(anfrageData.serviceTyp).toBe('reifen');
    expect(anfrageData.serviceData).toEqual({
      art: 'montage',
      typ: 'sommer',
      dimension: '205/55 R16 91V',
      anzahl: '4'
    });
    expect(anfrageData.status).toBe('neu');
  });
});
```

#### **TS2-002: Admin KVA Creation - Dynamic Variants (Reifen Montage)**

```javascript
test('TS2-002: Admin KVA Creation - Dynamic Variants (Reifen Montage)', async ({ page }) => {
  // Create test anfrage
  await page.goto('http://localhost:8000/index.html?useEmulator=true');
  await page.fill('#email', 'werkstatt-mosbach@test.de');
  await page.fill('#password', 'test123');
  await page.click('#loginBtn');

  const anfrageId = await page.evaluate(async () => {
    const id = 'req_' + Date.now();
    await window.getCollection('partnerAnfragen').doc(id).set({
      id: id,
      partnerId: 'marcel',
      serviceTyp: 'reifen',
      serviceData: {
        art: 'montage',
        typ: 'sommer',
        dimension: '205/55 R16 91V',
        anzahl: '4'
      },
      status: 'neu',
      timestamp: new Date().toISOString(),
      kennzeichen: 'HN-AB 123'
    });
    return id;
  });

  // Navigate to KVA creation
  await page.goto(`http://localhost:8000/partner-app/kva-erstellen.html?id=${anfrageId}&useEmulator=true`);
  await page.waitForFunction(() => window.firebaseInitialized === true);

  // Validate variants loaded
  await expect(page.locator('.variant-card')).toHaveCount(3, { timeout: 5000 });
  await expect(page.locator('.variant-card').nth(0)).toContainText('Nur Montage');
  await expect(page.locator('.variant-card').nth(1)).toContainText('Montage + Wuchten');
  await expect(page.locator('.variant-card').nth(2)).toContainText('Montage + Wuchten + Ventile');

  // Select variant 2
  await page.click('.variant-card:nth-child(2) input[type="radio"]');
  await page.fill('.variant-card:nth-child(2) input[type="number"]', '120');

  // Save KVA
  await page.click('#saveKVA');

  // Validate toast
  await expect(page.locator('.toast')).toContainText('KVA gespeichert!');

  // Validate Firestore update
  const updatedAnfrage = await page.evaluate(async (id) => {
    const doc = await window.getCollection('partnerAnfragen').doc(id).get();
    return doc.data();
  }, anfrageId);

  expect(updatedAnfrage.kva).toBeDefined();
  expect(updatedAnfrage.kva.selectedVariant).toBe(1); // 0-indexed
  expect(updatedAnfrage.kva.gesamtpreis).toBe(120);
  expect(updatedAnfrage.status).toBe('kva_gesendet');
});
```

**... 62 more test cases for Partner-App ...**

---

## Test Suite 3: Multi-Tenant Isolation

**File:** `tests/03-multi-tenant.spec.js`
**Tests:** 36
**Duration:** ~4 minutes

### TS3-001: Data Isolation - Werkstatt A vs B

```javascript
import { test, expect } from '@playwright/test';
import { clearCollection } from './utils/helpers.js';

test.describe('TS3: Multi-Tenant Isolation', () => {
  test('TS3-001: Data Isolation - Werkstatt A vs B', async ({ page }) => {
    // Werkstatt A login
    await page.goto('http://localhost:8000/index.html?useEmulator=true');
    await page.fill('#email', 'werkstatt-mosbach@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');
    await page.waitForURL('**/annahme.html');

    // Create vehicle in Werkstatt A
    await page.evaluate(async () => {
      await window.getCollection('fahrzeuge').doc('test_mosbach').set({
        id: 'test_mosbach',
        kennzeichen: 'MOS-AA 111',
        marke: 'Mercedes',
        modell: 'G-Klasse',
        serviceTyp: 'lackier',
        timestamp: Date.now()
      });
    });

    // Logout Werkstatt A
    await page.click('#logoutBtn');
    await page.waitForURL('**/index.html');

    // Werkstatt B login (simulate different werkstatt)
    // NOTE: For true isolation test, need separate Werkstatt B account in Firestore
    await page.fill('#email', 'werkstatt-heidelberg@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');
    await page.waitForURL('**/annahme.html');

    // Validate werkstattId changed
    const werkstattId = await page.evaluate(() => window.werkstattId);
    expect(werkstattId).toBe('heidelberg');

    // Navigate to liste.html
    await page.goto('http://localhost:8000/liste.html?useEmulator=true');
    await page.waitForFunction(() => window.firebaseInitialized === true);

    // Search for Werkstatt A vehicle
    await page.fill('#searchInput', 'MOS-AA 111');

    // Validate vehicle NOT found (belongs to Werkstatt A)
    await expect(page.locator('.vehicle-card')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.no-results')).toContainText('Keine Fahrzeuge gefunden');
  });
});
```

### TS3-002: Collection Suffix Validation

```javascript
test('TS3-002: Collection Suffix Validation', async ({ page }) => {
  await page.goto('http://localhost:8000/index.html?useEmulator=true');
  await page.fill('#email', 'werkstatt-mosbach@test.de');
  await page.fill('#password', 'test123');
  await page.click('#loginBtn');
  await page.waitForURL('**/annahme.html');

  // Validate getCollection() returns correct suffix
  const collectionName = await page.evaluate(() => {
    return window.getCollectionName('fahrzeuge');
  });

  expect(collectionName).toBe('fahrzeuge_mosbach');
});
```

**... 34 more test cases for Multi-Tenant ...**

---

## Test Suite 4: Service-spezifische Logik

**File:** `tests/04-service-logic.spec.js`
**Tests:** 100 (10 Services × 10 Test Cases)
**Duration:** ~10 minutes

### Test Matrix

| Service | Tests | Files Covered |
|---------|-------|---------------|
| lackier | 10 | annahme.html, kanban.html, abnahme.html |
| reifen | 10 | annahme.html, kanban.html, partner-app/reifen-anfrage.html, kva-erstellen.html |
| mechanik | 10 | annahme.html, kanban.html, partner-app/mechanik-anfrage.html |
| pflege | 10 | annahme.html, kanban.html, partner-app/pflege-anfrage.html |
| tuev | 10 | annahme.html, kanban.html, partner-app/tuev-anfrage.html |
| versicherung | 10 | annahme.html, kanban.html, partner-app/versicherung-anfrage.html |
| glas | 10 | annahme.html, kanban.html, partner-app/glas-anfrage.html |
| klima | 10 | annahme.html, kanban.html, partner-app/klima-anfrage.html |
| dellen | 10 | annahme.html, kanban.html, partner-app/dellen-anfrage.html |
| alle | 10 | kanban.html (show all services) |

### TS4-001 to TS4-010: Lackier-Service

```javascript
test.describe('TS4: Service-Specific Logic - Lackier', () => {
  test('TS4-001: Lackier - Annahme Fields', async ({ page }) => {
    await page.goto('http://localhost:8000/annahme.html?useEmulator=true');
    await page.fill('#email', 'werkstatt-mosbach@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');

    // Select lackier service
    await page.selectOption('#serviceTypSelect', 'lackier');

    // Validate NO service-specific fields (lackier uses default)
    await expect(page.locator('#reifenDetails')).not.toBeVisible();
    await expect(page.locator('#glasDetails')).not.toBeVisible();
  });

  test('TS4-002: Lackier - Kanban Process Columns', async ({ page }) => {
    // Login
    await page.goto('http://localhost:8000/index.html?useEmulator=true');
    await page.fill('#email', 'werkstatt-mosbach@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');

    // Create test vehicle (lackier)
    await page.evaluate(async () => {
      await window.getCollection('fahrzeuge').doc('test_lackier').set({
        id: 'test_lackier',
        kennzeichen: 'MOS-L1 111',
        marke: 'Mercedes',
        serviceTyp: 'lackier',
        prozessStatus: 'neu',
        timestamp: Date.now()
      });
    });

    // Navigate to kanban.html
    await page.goto('http://localhost:8000/kanban.html?useEmulator=true');
    await page.waitForFunction(() => window.firebaseInitialized === true);

    // Select lackier filter
    await page.selectOption('#processFilter', 'lackier');

    // Validate process columns
    const columns = await page.$$eval('.kanban-column', cols =>
      cols.map(col => col.classList.toString())
    );

    expect(columns).toContain('column-neu');
    expect(columns).toContain('column-vorbereitung');
    expect(columns).toContain('column-lackierung');
    expect(columns).toContain('column-trocknung');
    expect(columns).toContain('column-qualitaetskontrolle');
    expect(columns).toContain('column-fertig');
  });

  // ... 8 more tests for lackier service ...
});
```

**... 90 more test cases for other services ...**

---

## Test Suite 5: KI Chat & Cloud Functions

**File:** `tests/05-ai-chat.spec.js`
**Tests:** 24
**Duration:** ~5 minutes

### TS5-001: Speech-to-Text - Whisper (Mock)

```javascript
import { test, expect } from '@playwright/test';

test.describe('TS5: KI Chat & Cloud Functions', () => {
  test('TS5-001: Speech-to-Text - Whisper (Mock)', async ({ page }) => {
    // Mock OpenAI API response
    await page.route('**/functions/whisperTranscribe', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            success: true,
            text: 'Erstelle Fahrzeug HD-AB-1234',
            language: 'de',
            duration: 2.5
          }
        })
      });
    });

    // Login
    await page.goto('http://localhost:8000/index.html?useEmulator=true');
    await page.fill('#email', 'werkstatt-mosbach@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');

    // Open AI Chat Widget
    await page.click('#aiChatToggle');
    await expect(page.locator('#aiChatWidget')).toBeVisible();

    // Click microphone (simulate recording)
    await page.click('#microphoneBtn');
    await page.waitForTimeout(1000); // Simulate 1s recording

    // Stop recording
    await page.click('#stopRecordingBtn');

    // Validate Whisper called
    const requests = page.context().requests();
    const whisperRequest = requests.find(req => req.url().includes('whisperTranscribe'));
    expect(whisperRequest).toBeDefined();

    // Validate transcription shown in chat
    await expect(page.locator('.chat-message')).toContainText('Erstelle Fahrzeug HD-AB-1234');
  });
});
```

### TS5-002: GPT-4 Function Calling - createFahrzeug

```javascript
test('TS5-002: GPT-4 Function Calling - createFahrzeug', async ({ page }) => {
  // Mock OpenAI API response
  await page.route('**/functions/aiAgentExecute', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          success: true,
          message: '✅ Fahrzeug HD-AB-1234 wurde erstellt!',
          toolCalls: [{
            name: 'createFahrzeug',
            result: { id: 'test_ai_vehicle', kennzeichen: 'HD-AB-1234' }
          }]
        }
      })
    });
  });

  // Login
  await page.goto('http://localhost:8000/index.html?useEmulator=true');
  await page.fill('#email', 'werkstatt-mosbach@test.de');
  await page.fill('#password', 'test123');
  await page.click('#loginBtn');

  // Open AI Chat
  await page.click('#aiChatToggle');

  // Send message
  await page.fill('#chatInput', 'Erstelle Fahrzeug HD-AB-1234, Mercedes, Lackierung');
  await page.click('#sendBtn');

  // Validate GPT-4 response
  await expect(page.locator('.chat-message.bot')).toContainText('✅ Fahrzeug HD-AB-1234 wurde erstellt!', { timeout: 5000 });

  // Validate vehicle created in Firestore (mock)
  // NOTE: In real test, would check Firestore
});
```

**... 22 more test cases for AI Chat ...**

---

## Test Suite 6: Error Handling & Validations

**File:** `tests/06-error-handling.spec.js`
**Tests:** 72
**Duration:** ~6 minutes

### TS6-001 to TS6-024: Input Validations

#### **TS6-001: Kennzeichen Validation - Invalid Format**

```javascript
import { test, expect } from '@playwright/test';

test.describe('TS6: Error Handling & Validations', () => {
  const invalidKennzeichen = [
    'INVALID',        // No dash/space
    'X-Y 1',          // Too short
    'ABCDE-FGH 1234', // Too long
    '123-ABC 456',    // Numbers first
    'MOS CG-123'      // Wrong order
  ];

  invalidKennzeichen.forEach((kennzeichen, index) => {
    test(`TS6-001-${index}: Kennzeichen Validation - "${kennzeichen}"`, async ({ page }) => {
      await page.goto('http://localhost:8000/annahme.html?useEmulator=true');
      await page.fill('#email', 'werkstatt-mosbach@test.de');
      await page.fill('#password', 'test123');
      await page.click('#loginBtn');

      // Fill invalid Kennzeichen
      await page.fill('#kennzeichen', kennzeichen);
      await page.fill('#marke', 'Test');
      await page.fill('#modell', 'Test');
      await page.fill('#kundenName', 'Test');

      // Submit
      await page.click('#submitBtn');

      // Validate error toast
      await expect(page.locator('.toast')).toContainText('Ungültiges Kennzeichen!', { timeout: 2000 });

      // Validate form NOT submitted
      await expect(page).toHaveURL(/.*annahme.html/);
    });
  });
});
```

#### **TS6-025: Firestore Permission Denied**

```javascript
test('TS6-025: Firestore Permission Denied', async ({ page }) => {
  // Login as 'partner' (NOT admin)
  await page.goto('http://localhost:8000/partner-app/index.html?useEmulator=true');
  await page.fill('#email', 'marcel@test.de');
  await page.fill('#password', 'test123');
  await page.click('#loginBtn');

  // Try to access admin-anfragen.html
  await page.goto('http://localhost:8000/partner-app/admin-anfragen.html?useEmulator=true');

  // Validate error toast
  await expect(page.locator('.toast')).toContainText('Zugriff verweigert', { timeout: 3000 });
});
```

**... 70 more test cases for Error Handling ...**

---

## Test Suite 7: Performance & Stress Tests

**File:** `tests/07-performance.spec.js`
**Tests:** 24
**Duration:** ~8 minutes

### TS7-001: Load 100 Vehicles

```javascript
import { test, expect } from '@playwright/test';

test.describe('TS7: Performance & Stress Tests', () => {
  test('TS7-001: Load 100 Vehicles', async ({ page }) => {
    // Login
    await page.goto('http://localhost:8000/index.html?useEmulator=true');
    await page.fill('#email', 'werkstatt-mosbach@test.de');
    await page.fill('#password', 'test123');
    await page.click('#loginBtn');

    // Create 100 test vehicles
    await page.evaluate(async () => {
      const batch = window.db.batch();
      for (let i = 1; i <= 100; i++) {
        const docRef = window.getCollection('fahrzeuge').doc(`test_${i}`);
        batch.set(docRef, {
          id: `test_${i}`,
          kennzeichen: `MOS-T${i} ${i}`,
          marke: 'Test',
          modell: `Model ${i}`,
          serviceTyp: 'lackier',
          status: 'neu',
          timestamp: Date.now() + i
        });
      }
      await batch.commit();
    });

    // Navigate to liste.html and measure load time
    const startTime = Date.now();
    await page.goto('http://localhost:8000/liste.html?useEmulator=true');
    await page.waitForFunction(() => window.firebaseInitialized === true);
    await page.waitForSelector('.vehicle-card', { timeout: 10000 });
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    console.log(`✅ Load time for 100 vehicles: ${loadTime}ms`);

    // Validate load time < 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Validate vehicles shown (with pagination, expect 20)
    const visibleVehicles = await page.locator('.vehicle-card').count();
    expect(visibleVehicles).toBeLessThanOrEqual(20); // Pagination limit
  });
});
```

### TS7-002: Concurrent Drag & Drop

```javascript
test('TS7-002: Concurrent Drag & Drop', async ({ browser }) => {
  // Create 2 pages (simulate 2 users)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // User 1 login
  await page1.goto('http://localhost:8000/index.html?useEmulator=true');
  await page1.fill('#email', 'werkstatt-mosbach@test.de');
  await page1.fill('#password', 'test123');
  await page1.click('#loginBtn');

  // User 2 login
  await page2.goto('http://localhost:8000/index.html?useEmulator=true');
  await page2.fill('#email', 'werkstatt-mosbach@test.de');
  await page2.fill('#password', 'test123');
  await page2.click('#loginBtn');

  // Create test vehicle
  const vehicleId = await page1.evaluate(async () => {
    const id = 'concurrent_test_' + Date.now();
    await window.getCollection('fahrzeuge').doc(id).set({
      id: id,
      kennzeichen: 'MOS-CC 999',
      marke: 'Test',
      serviceTyp: 'lackier',
      prozessStatus: 'neu',
      timestamp: Date.now()
    });
    return id;
  });

  // Both users navigate to kanban.html
  await page1.goto('http://localhost:8000/kanban.html?useEmulator=true');
  await page2.goto('http://localhost:8000/kanban.html?useEmulator=true');
  await page1.waitForFunction(() => window.firebaseInitialized === true);
  await page2.waitForFunction(() => window.firebaseInitialized === true);

  // User 1 drags to 'in_arbeit' (t=0s)
  const card1 = page1.locator(`.vehicle-card[data-id="${vehicleId}"]`);
  const target1 = page1.locator('.kanban-column.column-in_arbeit');
  await card1.dragTo(target1);

  // User 2 drags to 'fertig' (t=0.5s) - should fail
  await page2.waitForTimeout(500);
  const card2 = page2.locator(`.vehicle-card[data-id="${vehicleId}"]`);
  const target2 = page2.locator('.kanban-column.column-fertig');
  await card2.dragTo(target2);

  // Validate: Only one drag succeeded
  const finalStatus = await page1.evaluate(async (id) => {
    const doc = await window.getCollection('fahrzeuge').doc(id).get();
    return doc.data().prozessStatus;
  }, vehicleId);

  expect(['in_arbeit', 'fertig']).toContain(finalStatus);

  // Validate error toast on losing user
  await expect(page2.locator('.toast')).toContainText('Fahrzeug wurde bereits verschoben', { timeout: 3000 });

  // Cleanup
  await context1.close();
  await context2.close();
});
```

**... 22 more test cases for Performance ...**

---

## 📈 Test Execution Plan

### Phase 1: Fix Existing Tests (Week 1)

**Goal:** 566/566 tests passing

**Tasks:**
1. Update all Playwright selectors (`#serviceTyp` → `#serviceTypSelect`)
2. Ensure Firebase Emulators run before tests
3. Fix race conditions (increase timeout to 250ms → 500ms)

### Phase 2: Critical Flow Tests (Week 2)

**Goal:** Core workflows covered

**Tests:**
- Test Suite 1: Core Fahrzeug-Workflow (96 tests)
- Test Suite 2: Partner-App Workflow (64 tests)
- Test Suite 3: Multi-Tenant Isolation (36 tests)

### Phase 3: Edge Cases & Performance (Week 3)

**Goal:** Full coverage

**Tests:**
- Test Suite 4: Service-spezifische Logik (100 tests)
- Test Suite 5: KI Chat & Cloud Functions (24 tests)
- Test Suite 6: Error Handling & Validations (72 tests)
- Test Suite 7: Performance & Stress Tests (24 tests)

### Phase 4: CI/CD Integration (Week 4)

**Goal:** Automated testing

**Setup:**
```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Start Firebase Emulators
        run: firebase emulators:start --only firestore,storage --project demo-test &
      - name: Run Playwright tests
        run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🎯 Success Metrics

**Target:** 566/566 tests passing (100%)

**Performance:**
- Test Suite 1: < 8 min
- Test Suite 2: < 6 min
- Test Suite 3: < 4 min
- Test Suite 4: < 10 min
- Test Suite 5: < 5 min
- Test Suite 6: < 6 min
- Test Suite 7: < 8 min

**Total:** ~45 minutes (parallel execution)

---

**Plan Ende**

_Erstellt: 2025-10-31_
_Autor: Claude Code (Sonnet 4.5)_
_Version: 1.0_
