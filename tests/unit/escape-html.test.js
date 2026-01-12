/**
 * Unit Tests for escape-html.js
 * Session #15: Unit Tests für JS Utils
 *
 * Tests XSS prevention functions: escapeHtml() and escapeAttr()
 *
 * @created 2026-01-13
 */

// Load the module
const { escapeHtml, escapeAttr } = require('../../js/utils/escape-html');

describe('escape-html.js', () => {

  // ============================================
  // escapeHtml() Tests
  // ============================================
  describe('escapeHtml()', () => {

    describe('Basic HTML Entity Escaping', () => {
      test('escapes < (less than)', () => {
        expect(escapeHtml('<')).toBe('&lt;');
      });

      test('escapes > (greater than)', () => {
        expect(escapeHtml('>')).toBe('&gt;');
      });

      test('escapes & (ampersand)', () => {
        expect(escapeHtml('&')).toBe('&amp;');
      });

      test('escapes " (double quote)', () => {
        expect(escapeHtml('"')).toBe('&quot;');
      });

      test('escapes \' (single quote)', () => {
        expect(escapeHtml("'")).toBe('&#039;');
      });
    });

    describe('XSS Attack Prevention', () => {
      test('escapes script tags', () => {
        const input = '<script>alert("XSS")</script>';
        const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
        expect(escapeHtml(input)).toBe(expected);
      });

      test('escapes onclick attribute injection', () => {
        const input = '" onclick="alert(1)"';
        const expected = '&quot; onclick=&quot;alert(1)&quot;';
        expect(escapeHtml(input)).toBe(expected);
      });

      test('escapes img onerror injection', () => {
        const input = '<img src="x" onerror="alert(1)">';
        const expected = '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;';
        expect(escapeHtml(input)).toBe(expected);
      });

      test('escapes javascript: protocol', () => {
        const input = 'javascript:alert(1)';
        // Should pass through unchanged (no HTML special chars)
        expect(escapeHtml(input)).toBe('javascript:alert(1)');
      });
    });

    describe('Null and Undefined Handling', () => {
      test('returns empty string for null', () => {
        expect(escapeHtml(null)).toBe('');
      });

      test('returns empty string for undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
      });
    });

    describe('Type Coercion', () => {
      test('converts numbers to string', () => {
        expect(escapeHtml(123)).toBe('123');
      });

      test('converts booleans to string', () => {
        expect(escapeHtml(true)).toBe('true');
        expect(escapeHtml(false)).toBe('false');
      });

      test('converts objects to string', () => {
        expect(escapeHtml({})).toBe('[object Object]');
      });

      test('converts arrays to string', () => {
        expect(escapeHtml([1, 2, 3])).toBe('1,2,3');
      });
    });

    describe('Edge Cases', () => {
      test('returns empty string for empty input', () => {
        expect(escapeHtml('')).toBe('');
      });

      test('handles strings with multiple special characters', () => {
        const input = '<div class="test">Hello & Goodbye</div>';
        const expected = '&lt;div class=&quot;test&quot;&gt;Hello &amp; Goodbye&lt;/div&gt;';
        expect(escapeHtml(input)).toBe(expected);
      });

      test('does not double-escape already escaped content', () => {
        // Note: This IS expected behavior - & becomes &amp;
        expect(escapeHtml('&amp;')).toBe('&amp;amp;');
      });

      test('preserves normal text without special characters', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
      });

      test('preserves German umlauts', () => {
        expect(escapeHtml('Äöü ß')).toBe('Äöü ß');
      });
    });
  });

  // ============================================
  // escapeAttr() Tests
  // ============================================
  describe('escapeAttr()', () => {

    describe('Basic Entity Escaping (same as escapeHtml)', () => {
      test('escapes < > & " \'', () => {
        expect(escapeAttr('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#039;');
      });
    });

    describe('Whitespace Escaping', () => {
      test('escapes newlines', () => {
        expect(escapeAttr('line1\nline2')).toBe('line1&#10;line2');
      });

      test('escapes carriage returns', () => {
        expect(escapeAttr('line1\rline2')).toBe('line1&#13;line2');
      });

      test('escapes tabs', () => {
        expect(escapeAttr('col1\tcol2')).toBe('col1&#9;col2');
      });

      test('escapes mixed whitespace', () => {
        const input = 'a\nb\rc\td';
        const expected = 'a&#10;b&#13;c&#9;d';
        expect(escapeAttr(input)).toBe(expected);
      });
    });

    describe('Null and Undefined Handling', () => {
      test('returns empty string for null', () => {
        expect(escapeAttr(null)).toBe('');
      });

      test('returns empty string for undefined', () => {
        expect(escapeAttr(undefined)).toBe('');
      });
    });

    describe('Type Coercion', () => {
      test('converts numbers to string', () => {
        expect(escapeAttr(42)).toBe('42');
      });
    });
  });

});
