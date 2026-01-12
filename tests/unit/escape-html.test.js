/**
 * Unit Tests for escape-html.js
 * Session #15 (2026-01-12)
 *
 * Tests für XSS Prevention Helper Funktionen
 */

// Mock window object BEFORE requiring the module
global.window = global.window || {};

const { escapeHtml, escapeAttr } = require('../../js/utils/escape-html');

describe('escape-html.js', () => {
    // ================================================================
    // escapeHtml() Tests
    // ================================================================

    describe('escapeHtml()', () => {
        describe('HTML tag escaping', () => {
            test('escapes < and > characters', () => {
                expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
            });

            test('escapes script tags', () => {
                expect(escapeHtml('<script>alert("xss")</script>'))
                    .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            });

            test('escapes nested tags', () => {
                expect(escapeHtml('<div><span>text</span></div>'))
                    .toBe('&lt;div&gt;&lt;span&gt;text&lt;/span&gt;&lt;/div&gt;');
            });
        });

        describe('Quote escaping', () => {
            test('escapes double quotes', () => {
                expect(escapeHtml('" onclick="')).toBe('&quot; onclick=&quot;');
            });

            test('escapes single quotes', () => {
                expect(escapeHtml("'")).toBe('&#039;');
            });

            test('escapes both quote types', () => {
                expect(escapeHtml(`"text" 'more'`)).toBe('&quot;text&quot; &#039;more&#039;');
            });
        });

        describe('Ampersand escaping', () => {
            test('escapes & character', () => {
                expect(escapeHtml('&')).toBe('&amp;');
            });

            test('escapes & before other entities (order matters)', () => {
                expect(escapeHtml('&<>')).toBe('&amp;&lt;&gt;');
            });

            test('handles multiple ampersands', () => {
                expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
            });
        });

        describe('Null/undefined handling', () => {
            test('returns empty string for null', () => {
                expect(escapeHtml(null)).toBe('');
            });

            test('returns empty string for undefined', () => {
                expect(escapeHtml(undefined)).toBe('');
            });
        });

        describe('Non-string input handling', () => {
            test('converts number to string', () => {
                expect(escapeHtml(123)).toBe('123');
            });

            test('converts boolean to string', () => {
                expect(escapeHtml(true)).toBe('true');
            });

            test('converts object to string', () => {
                expect(escapeHtml({})).toBe('[object Object]');
            });
        });

        describe('Edge cases', () => {
            test('returns empty string for empty input', () => {
                expect(escapeHtml('')).toBe('');
            });

            test('preserves regular text', () => {
                expect(escapeHtml('Hello World')).toBe('Hello World');
            });

            test('preserves special characters that dont need escaping', () => {
                expect(escapeHtml('äöüß@#$%')).toBe('äöüß@#$%');
            });

            test('handles mixed content', () => {
                expect(escapeHtml('Hello <b>World</b> & "Friends"'))
                    .toBe('Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;');
            });
        });
    });

    // ================================================================
    // escapeAttr() Tests
    // ================================================================

    describe('escapeAttr()', () => {
        describe('Basic escaping (same as escapeHtml)', () => {
            test('escapes < and >', () => {
                expect(escapeAttr('<div>')).toBe('&lt;div&gt;');
            });

            test('escapes quotes', () => {
                expect(escapeAttr('"test"')).toBe('&quot;test&quot;');
            });

            test('escapes ampersand', () => {
                expect(escapeAttr('&')).toBe('&amp;');
            });
        });

        describe('Whitespace escaping (additional)', () => {
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
                expect(escapeAttr('a\nb\tc\rd')).toBe('a&#10;b&#9;c&#13;d');
            });
        });

        describe('Null/undefined handling', () => {
            test('returns empty string for null', () => {
                expect(escapeAttr(null)).toBe('');
            });

            test('returns empty string for undefined', () => {
                expect(escapeAttr(undefined)).toBe('');
            });
        });

        describe('Non-string input handling', () => {
            test('converts number to string', () => {
                expect(escapeAttr(42)).toBe('42');
            });
        });
    });
});
