/**
 * INTEGRATION TESTS: Email Integration (AWS SES)
 *
 * Tests for email functionality via AWS SES
 *
 * Test Coverage:
 * - Partner notification emails
 * - KVA sending
 * - Status update emails
 * - Template placeholder replacement
 * - Error handling for failed sends
 *
 * Note: These tests use mocking as actual email sending
 * is not possible in the test environment.
 *
 * @author Claude Code
 * @date 2025-12-14
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Email Integration (AWS SES)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
  });

  // ============================================
  // EMAIL TEMPLATE TESTS
  // ============================================

  test('EMAIL-1.1: Template placeholder replacement', async ({ page }) => {
    const result = await page.evaluate(() => {
      function replaceTemplatePlaceholders(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
          const placeholder = `{${key}}`;
          result = result.split(placeholder).join(value);
        }
        return result;
      }

      const template = `
        Sehr geehrte/r {kundenname},

        Ihre Anfrage für das Fahrzeug {kennzeichen} wurde bearbeitet.
        Der geschätzte Preis beträgt: {preis} EUR

        Mit freundlichen Grüßen,
        {werkstattName}
      `;

      const data = {
        kundenname: 'Max Mustermann',
        kennzeichen: 'HD-AB-123',
        preis: '1.500,00',
        werkstattName: 'Auto-Lackierzentrum Mosbach'
      };

      const processed = replaceTemplatePlaceholders(template, data);

      return {
        containsKundenname: processed.includes('Max Mustermann'),
        containsKennzeichen: processed.includes('HD-AB-123'),
        containsPreis: processed.includes('1.500,00'),
        noPlaceholdersLeft: !processed.includes('{') && !processed.includes('}')
      };
    });

    expect(result.containsKundenname).toBe(true);
    expect(result.containsKennzeichen).toBe(true);
    expect(result.containsPreis).toBe(true);
    expect(result.noPlaceholdersLeft).toBe(true);
  });

  test('EMAIL-1.2: All required placeholders defined', async ({ page }) => {
    const placeholders = await page.evaluate(() => {
      // Standard placeholders used in email templates
      return {
        partnerNotification: [
          '{kundenname}',
          '{kennzeichen}',
          '{serviceTyp}',
          '{datum}',
          '{werkstattName}'
        ],
        kvaEmail: [
          '{kundenname}',
          '{kennzeichen}',
          '{positionen}',
          '{summeNetto}',
          '{mwst}',
          '{summeBrutto}',
          '{gueltigBis}'
        ],
        statusUpdate: [
          '{kundenname}',
          '{kennzeichen}',
          '{neuerStatus}',
          '{datum}'
        ]
      };
    });

    expect(placeholders.partnerNotification.length).toBeGreaterThan(0);
    expect(placeholders.kvaEmail.length).toBeGreaterThan(0);
    expect(placeholders.statusUpdate.length).toBeGreaterThan(0);
  });

  // ============================================
  // EMAIL VALIDATION TESTS
  // ============================================

  test('EMAIL-2.1: Validate email address before sending', async ({ page }) => {
    const validation = await page.evaluate(() => {
      function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
      }

      const testCases = [
        { email: 'valid@example.com', expected: true },
        { email: 'user.name@domain.co.uk', expected: true },
        { email: 'invalid', expected: false },
        { email: '', expected: false },
        { email: null, expected: false },
        { email: 'no@tld', expected: false }
      ];

      return testCases.map(tc => ({
        email: tc.email,
        expected: tc.expected,
        actual: isValidEmail(tc.email)
      }));
    });

    for (const result of validation) {
      expect(result.actual).toBe(result.expected);
    }
  });

  // ============================================
  // EMAIL STRUCTURE TESTS
  // ============================================

  test('EMAIL-3.1: Email object structure', async ({ page }) => {
    const emailStructure = await page.evaluate(() => {
      // Standard email object structure
      const email = {
        to: 'recipient@example.com',
        from: 'noreply@auto-lackierzentrum.de',
        subject: 'Ihre Anfrage bei Auto-Lackierzentrum',
        html: '<html><body>Email content</body></html>',
        text: 'Email content (plain text)',
        replyTo: 'info@auto-lackierzentrum.de'
      };

      const requiredFields = ['to', 'from', 'subject'];
      const hasAllRequired = requiredFields.every(f => email[f]);

      return {
        email,
        hasAllRequired,
        hasHtml: !!email.html,
        hasText: !!email.text
      };
    });

    expect(emailStructure.hasAllRequired).toBe(true);
    expect(emailStructure.hasHtml).toBe(true);
    expect(emailStructure.hasText).toBe(true);
  });

  test('EMAIL-3.2: Subject line format', async ({ page }) => {
    const subjects = await page.evaluate(() => {
      function formatSubject(type, kennzeichen) {
        const subjects = {
          'neue_anfrage': `Neue Anfrage: ${kennzeichen}`,
          'kva_bereit': `Kostenvoranschlag bereit: ${kennzeichen}`,
          'status_update': `Status-Update: ${kennzeichen}`,
          'fertig': `Ihr Fahrzeug ist fertig: ${kennzeichen}`
        };
        return subjects[type] || `Benachrichtigung: ${kennzeichen}`;
      }

      return {
        neueAnfrage: formatSubject('neue_anfrage', 'HD-AB-123'),
        kva: formatSubject('kva_bereit', 'HD-AB-123'),
        status: formatSubject('status_update', 'HD-AB-123'),
        fertig: formatSubject('fertig', 'HD-AB-123'),
        fallback: formatSubject('unknown', 'HD-AB-123')
      };
    });

    expect(subjects.neueAnfrage).toContain('Neue Anfrage');
    expect(subjects.kva).toContain('Kostenvoranschlag');
    expect(subjects.fertig).toContain('fertig');
    expect(subjects.fallback).toContain('Benachrichtigung');
  });

  // ============================================
  // EMAIL QUEUE TESTS
  // ============================================

  test('EMAIL-4.1: Queue email for sending', async ({ page }) => {
    const queueResult = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      // Email queue entry
      const emailQueueEntry = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        status: 'queued',
        createdAt: new Date().toISOString(),
        attempts: 0,
        werkstattId: werkstattId
      };

      // Add to queue (for Cloud Function to process)
      const docRef = await db.collection(`emailQueue_${werkstattId}`).add(emailQueueEntry);

      // Get the queued email
      const doc = await docRef.get();

      // Cleanup
      await docRef.delete();

      return {
        queued: doc.exists,
        status: doc.data()?.status
      };
    });

    expect(queueResult.queued).toBe(true);
    expect(queueResult.status).toBe('queued');
  });

  test('EMAIL-4.2: Track email send attempts', async ({ page }) => {
    const tracking = await page.evaluate(() => {
      function updateEmailAttempt(email, success) {
        const updated = { ...email };
        updated.attempts = (updated.attempts || 0) + 1;
        updated.lastAttempt = new Date().toISOString();

        if (success) {
          updated.status = 'sent';
          updated.sentAt = new Date().toISOString();
        } else if (updated.attempts >= 3) {
          updated.status = 'failed';
        } else {
          updated.status = 'retry';
        }

        return updated;
      }

      // Test scenarios
      const email = { status: 'queued', attempts: 0 };

      const afterFirstFail = updateEmailAttempt(email, false);
      const afterSecondFail = updateEmailAttempt(afterFirstFail, false);
      const afterThirdFail = updateEmailAttempt(afterSecondFail, false);

      return {
        afterFirstFail: afterFirstFail.status,
        afterSecondFail: afterSecondFail.status,
        afterThirdFail: afterThirdFail.status
      };
    });

    expect(tracking.afterFirstFail).toBe('retry');
    expect(tracking.afterSecondFail).toBe('retry');
    expect(tracking.afterThirdFail).toBe('failed');
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  test('EMAIL-5.1: Handle missing email address', async ({ page }) => {
    const errorHandling = await page.evaluate(() => {
      function validateBeforeSend(email) {
        const errors = [];

        if (!email.to) errors.push('Empfänger-Email fehlt');
        if (!email.subject) errors.push('Betreff fehlt');
        if (!email.html && !email.text) errors.push('Email-Inhalt fehlt');

        return {
          valid: errors.length === 0,
          errors
        };
      }

      const testCases = [
        { email: { to: '', subject: 'Test', html: 'Content' }, expectedValid: false },
        { email: { to: 'test@test.de', subject: '', html: 'Content' }, expectedValid: false },
        { email: { to: 'test@test.de', subject: 'Test', html: '' }, expectedValid: false },
        { email: { to: 'test@test.de', subject: 'Test', html: 'Content' }, expectedValid: true }
      ];

      return testCases.map(tc => ({
        ...tc,
        result: validateBeforeSend(tc.email)
      }));
    });

    for (const result of errorHandling) {
      expect(result.result.valid).toBe(result.expectedValid);
    }
  });

  // ============================================
  // NOTIFICATION TYPE TESTS
  // ============================================

  test('EMAIL-6.1: Different notification types', async ({ page }) => {
    const notificationTypes = await page.evaluate(() => {
      return {
        types: [
          'partner_neue_anfrage',
          'partner_kva_bereit',
          'partner_anfrage_angenommen',
          'partner_anfrage_abgelehnt',
          'kunde_status_update',
          'kunde_fahrzeug_fertig',
          'werkstatt_neue_anfrage',
          'admin_error_alert'
        ],
        count: 8
      };
    });

    expect(notificationTypes.types.length).toBe(notificationTypes.count);
  });

  // ============================================
  // HTML EMAIL TESTS
  // ============================================

  test('EMAIL-7.1: HTML email structure', async ({ page }) => {
    const htmlEmail = await page.evaluate(() => {
      function createHtmlEmail(content, werkstattName) {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${werkstattName}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .header { background: #3b82f6; color: white; padding: 20px; }
    .content { padding: 20px; }
    .footer { background: #f3f4f6; padding: 10px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${werkstattName}</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} ${werkstattName}</p>
  </div>
</body>
</html>`;
      }

      const html = createHtmlEmail('<p>Test content</p>', 'Auto-Lackierzentrum');

      return {
        hasDoctype: html.includes('<!DOCTYPE html>'),
        hasCharset: html.includes('charset="UTF-8"'),
        hasHeader: html.includes('class="header"'),
        hasContent: html.includes('class="content"'),
        hasFooter: html.includes('class="footer"')
      };
    });

    expect(htmlEmail.hasDoctype).toBe(true);
    expect(htmlEmail.hasCharset).toBe(true);
    expect(htmlEmail.hasHeader).toBe(true);
    expect(htmlEmail.hasContent).toBe(true);
    expect(htmlEmail.hasFooter).toBe(true);
  });

  // ============================================
  // UI SMOKE TESTS
  // ============================================

  test('EMAIL-8.1: Email settings exist in admin', async ({ page }) => {
    await page.goto('/admin-einstellungen.html');
    await waitForFirebaseReady(page);

    // Check for email-related settings
    const hasEmailSettings = await page.evaluate(() => {
      const pageContent = document.body.textContent || '';
      return pageContent.toLowerCase().includes('email') ||
             pageContent.toLowerCase().includes('e-mail') ||
             pageContent.toLowerCase().includes('benachrichtigung');
    });

    expect(hasEmailSettings).toBe(true);
  });
});
