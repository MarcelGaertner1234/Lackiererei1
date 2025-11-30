/**
 * escapeHtml() - XSS Prevention Helper
 *
 * Verhindert Cross-Site Scripting (XSS) Attacken indem HTML-Sonderzeichen
 * in sichere HTML-Entities umgewandelt werden.
 *
 * Beispiel:
 *   escapeHtml('<script>alert("XSS")</script>')
 *   → '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * Verwendung:
 *   innerHTML = `<div>${escapeHtml(userInput)}</div>`;
 *
 * @param {string|any} text - Der zu escapende Text
 * @returns {string} - Der escapte Text (sicher für innerHTML)
 *
 * @created 2025-11-30
 * @author Claude Code
 */
window.escapeHtml = function(text) {
    // Null/undefined → leerer String
    if (text == null) return '';

    // Nicht-Strings → zu String konvertieren
    if (typeof text !== 'string') {
        text = String(text);
    }

    // HTML-Sonderzeichen escapen
    return text
        .replace(/&/g, '&amp;')   // & muss ZUERST ersetzt werden!
        .replace(/</g, '&lt;')    // < → verhindert Tag-Öffnung
        .replace(/>/g, '&gt;')    // > → verhindert Tag-Schließung
        .replace(/"/g, '&quot;')  // " → verhindert Attribut-Ausbruch
        .replace(/'/g, '&#039;'); // ' → verhindert Attribut-Ausbruch (single quotes)
};

/**
 * escapeAttr() - Für HTML-Attribute (z.B. onclick, data-*)
 *
 * Zusätzlich zu escapeHtml() werden auch Zeilenumbrüche und Tabs escaped,
 * die in Attributen problematisch sein können.
 *
 * @param {string|any} text - Der zu escapende Text
 * @returns {string} - Der escapte Text (sicher für Attribute)
 */
window.escapeAttr = function(text) {
    if (text == null) return '';
    if (typeof text !== 'string') {
        text = String(text);
    }

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '&#10;')  // Newline
        .replace(/\r/g, '&#13;')  // Carriage Return
        .replace(/\t/g, '&#9;');  // Tab
};

// Für Module-Kompatibilität (falls später auf ES6 Modules umgestellt wird)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml: window.escapeHtml, escapeAttr: window.escapeAttr };
}

console.log('✅ [SECURITY] escapeHtml() und escapeAttr() Helper geladen');
