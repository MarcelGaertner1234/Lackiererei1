/**
 * =============================================================================
 * LOHNABRECHNUNG-PDF.JS - PDF-Generation für deutsche Lohnabrechnungen
 * =============================================================================
 *
 * Erstellt professionelle Lohnabrechnung als PDF mit:
 * - Firmen- und Mitarbeiterdaten
 * - Brutto-Aufschlüsselung
 * - Steuer-Aufschlüsselung (LSt, Soli, KiSt)
 * - SV-Aufschlüsselung (KV, RV, AV, PV)
 * - Netto-Berechnung
 * - Bankverbindung für Überweisung
 *
 * Basiert auf jsPDF (muss geladen sein!)
 *
 * @author Claude Code (Anthropic)
 * @version 1.0.0
 * @date 2025-11-25
 */

// =============================================================================
// KONSTANTEN
// =============================================================================

const PDF_CONFIG = {
    // Seitenformat
    format: 'a4',
    orientation: 'portrait',
    unit: 'mm',

    // Ränder
    margin: {
        top: 15,
        right: 15,
        bottom: 20,
        left: 15
    },

    // Farben
    colors: {
        primary: [41, 128, 185],      // Blau
        secondary: [52, 73, 94],      // Dunkelgrau
        accent: [46, 204, 113],       // Grün
        text: [44, 62, 80],           // Textfarbe
        lightGray: [236, 240, 241],   // Hintergrund
        border: [189, 195, 199]       // Rahmen
    },

    // Schriften
    fonts: {
        title: 16,
        subtitle: 12,
        header: 10,
        normal: 9,
        small: 8
    }
};

// Monatsnamen
const MONATSNAMEN = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formatiert eine Zahl als Euro-Betrag
 */
function formatEuro(betrag) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(betrag || 0);
}

/**
 * Formatiert eine Zahl mit Dezimalstellen
 */
function formatZahl(zahl, dezimal = 2) {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: dezimal,
        maximumFractionDigits: dezimal
    }).format(zahl || 0);
}

/**
 * Formatiert Datum
 */
function formatDatum(datum) {
    if (!datum) return '-';
    const d = new Date(datum);
    return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// =============================================================================
// PDF GENERATION
// =============================================================================

/**
 * Erstellt eine Lohnabrechnung als PDF
 *
 * @param {Object} abrechnung - Berechnete Lohnabrechnung (von berechneLohnabrechnung)
 * @param {Object} werkstatt - Werkstatt-Stammdaten (Firma)
 * @returns {jsPDF} Das PDF-Dokument
 */
function erstelleLohnabrechnung(abrechnung, werkstatt) {
    // jsPDF prüfen
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        throw new Error('jsPDF ist nicht geladen! Bitte jsPDF-Bibliothek einbinden.');
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({
        orientation: PDF_CONFIG.orientation,
        unit: PDF_CONFIG.unit,
        format: PDF_CONFIG.format
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = PDF_CONFIG.margin;
    const contentWidth = pageWidth - margin.left - margin.right;

    let y = margin.top;

    // =========================================================================
    // HEADER - Firmenlogo & Titel
    // =========================================================================

    // Firmenname
    doc.setFontSize(PDF_CONFIG.fonts.title);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(werkstatt?.name || 'Auto-Lackierzentrum Mosbach', margin.left, y);

    // Firmenadresse (rechts)
    doc.setFontSize(PDF_CONFIG.fonts.small);
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.setFont('helvetica', 'normal');
    const firmenAdresse = [
        werkstatt?.strasse || 'Pfalzgraf-Otto-Str. 34',
        `${werkstatt?.plz || '74821'} ${werkstatt?.ort || 'Mosbach'}`,
        `Tel: ${werkstatt?.telefon || '06261-8929866'}`
    ];
    firmenAdresse.forEach((zeile, i) => {
        doc.text(zeile, pageWidth - margin.right, y + (i * 4), { align: 'right' });
    });

    y += 20;

    // Titel
    doc.setFontSize(PDF_CONFIG.fonts.subtitle);
    doc.setTextColor(...PDF_CONFIG.colors.text);
    doc.setFont('helvetica', 'bold');
    doc.text('LOHNABRECHNUNG', margin.left, y);

    // Abrechnungszeitraum
    const monatName = MONATSNAMEN[abrechnung.monat - 1];
    doc.setFontSize(PDF_CONFIG.fonts.header);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monatName} ${abrechnung.jahr}`, pageWidth - margin.right, y, { align: 'right' });

    y += 10;

    // Trennlinie
    doc.setDrawColor(...PDF_CONFIG.colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin.left, y, pageWidth - margin.right, y);

    y += 8;

    // =========================================================================
    // MITARBEITER-DATEN
    // =========================================================================

    // Linke Spalte: Mitarbeiter
    doc.setFontSize(PDF_CONFIG.fonts.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.text('Mitarbeiter', margin.left, y);

    // Rechte Spalte: Steuer-/SV-Daten
    doc.text('Steuer- & SV-Daten', pageWidth / 2 + 10, y);

    y += 6;

    doc.setFontSize(PDF_CONFIG.fonts.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.text);

    // Mitarbeiter-Infos (links)
    const mitarbeiterInfos = [
        ['Name:', abrechnung.mitarbeiterName],
        ['Personal-Nr:', abrechnung.mitarbeiterId?.substring(0, 8) || '-'],
        ['Eintrittsdatum:', formatDatum(abrechnung.stammdaten?.eintrittsdatum)],
        ['Abrechnungsdatum:', formatDatum(abrechnung.abrechnungsDatum)]
    ];

    mitarbeiterInfos.forEach((info, i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(info[0], margin.left, y + (i * 5));
        doc.setFont('helvetica', 'normal');
        doc.text(info[1], margin.left + 35, y + (i * 5));
    });

    // Steuer-/SV-Infos (rechts)
    const steuerInfos = [
        ['Steuerklasse:', abrechnung.stammdaten?.steuerklasse || '-'],
        ['Steuer-ID:', abrechnung.stammdaten?.steuerID || '-'],
        ['SV-Nummer:', abrechnung.stammdaten?.svNummer || '-'],
        ['Krankenkasse:', abrechnung.stammdaten?.krankenkasse || '-']
    ];

    steuerInfos.forEach((info, i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(info[0], pageWidth / 2 + 10, y + (i * 5));
        doc.setFont('helvetica', 'normal');
        doc.text(info[1], pageWidth / 2 + 45, y + (i * 5));
    });

    y += 28;

    // =========================================================================
    // ARBEITSZEIT-ÜBERSICHT
    // =========================================================================

    // Hintergrund-Box
    doc.setFillColor(...PDF_CONFIG.colors.lightGray);
    doc.roundedRect(margin.left, y, contentWidth, 18, 2, 2, 'F');

    y += 6;

    doc.setFontSize(PDF_CONFIG.fonts.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.text('Arbeitszeit', margin.left + 3, y);

    y += 5;

    doc.setFontSize(PDF_CONFIG.fonts.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.text);

    const arbeitszeit = abrechnung.arbeitszeit || {};
    const arbeitszeitText = `Soll: ${formatZahl(arbeitszeit.sollstunden)} Std. | ` +
        `Ist: ${formatZahl(arbeitszeit.iststunden)} Std. | ` +
        `Differenz: ${formatZahl(arbeitszeit.differenz)} Std.`;
    doc.text(arbeitszeitText, margin.left + 3, y);

    y += 12;

    // =========================================================================
    // BRUTTO-BEREICH
    // =========================================================================

    y = zeichneAbschnitt(doc, 'BRUTTO', y, margin, contentWidth, [
        { label: 'Grundgehalt', wert: abrechnung.brutto?.grundgehalt },
        { label: 'Zulagen', wert: abrechnung.brutto?.zulagen, optional: true },
        { label: 'Zuschläge', wert: abrechnung.brutto?.zuschlaege, optional: true }
    ], abrechnung.brutto?.gesamt, PDF_CONFIG.colors.accent);

    // =========================================================================
    // ABZÜGE: STEUERN
    // =========================================================================

    y = zeichneAbschnitt(doc, 'STEUERN', y, margin, contentWidth, [
        { label: 'Lohnsteuer', wert: abrechnung.steuern?.lohnsteuer },
        { label: 'Solidaritätszuschlag', wert: abrechnung.steuern?.solidaritaetszuschlag },
        { label: 'Kirchensteuer', wert: abrechnung.steuern?.kirchensteuer }
    ], abrechnung.steuern?.gesamt, PDF_CONFIG.colors.secondary, true);

    // =========================================================================
    // ABZÜGE: SOZIALVERSICHERUNG
    // =========================================================================

    y = zeichneAbschnitt(doc, 'SOZIALVERSICHERUNG (AN-Anteil)', y, margin, contentWidth, [
        { label: 'Krankenversicherung', wert: abrechnung.sozialversicherung?.krankenversicherung },
        { label: 'Rentenversicherung', wert: abrechnung.sozialversicherung?.rentenversicherung },
        { label: 'Arbeitslosenversicherung', wert: abrechnung.sozialversicherung?.arbeitslosenversicherung },
        { label: 'Pflegeversicherung', wert: abrechnung.sozialversicherung?.pflegeversicherung }
    ], abrechnung.sozialversicherung?.gesamt, PDF_CONFIG.colors.secondary, true);

    // =========================================================================
    // NETTO-BEREICH
    // =========================================================================

    y += 5;

    // Netto-Box mit Highlight
    doc.setFillColor(...PDF_CONFIG.colors.primary);
    doc.roundedRect(margin.left, y, contentWidth, 16, 2, 2, 'F');

    doc.setFontSize(PDF_CONFIG.fonts.subtitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('NETTO-AUSZAHLUNG', margin.left + 5, y + 10);
    doc.text(formatEuro(abrechnung.netto), pageWidth - margin.right - 5, y + 10, { align: 'right' });

    y += 22;

    // =========================================================================
    // ZUSAMMENFASSUNG
    // =========================================================================

    doc.setFontSize(PDF_CONFIG.fonts.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.secondary);

    const zusammenfassung = [
        `Brutto: ${formatEuro(abrechnung.brutto?.gesamt)}`,
        `- Steuern: ${formatEuro(abrechnung.abzuege?.steuern)}`,
        `- SV: ${formatEuro(abrechnung.abzuege?.sozialversicherung)}`,
        `= Netto: ${formatEuro(abrechnung.netto)}`
    ];

    doc.text(zusammenfassung.join('  |  '), margin.left, y);

    y += 10;

    // =========================================================================
    // BANKVERBINDUNG
    // =========================================================================

    // Trennlinie
    doc.setDrawColor(...PDF_CONFIG.colors.border);
    doc.line(margin.left, y, pageWidth - margin.right, y);

    y += 6;

    doc.setFontSize(PDF_CONFIG.fonts.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.text('Überweisung an:', margin.left, y);

    y += 5;

    doc.setFontSize(PDF_CONFIG.fonts.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.text);

    const bank = abrechnung.bankverbindung || {};
    const bankText = [
        `Kontoinhaber: ${bank.kontoinhaber || abrechnung.mitarbeiterName}`,
        `IBAN: ${bank.iban || '-'}`,
        `BIC: ${bank.bic || '-'}`,
        `Bank: ${bank.bank || '-'}`
    ];

    bankText.forEach((zeile, i) => {
        doc.text(zeile, margin.left, y + (i * 4.5));
    });

    // =========================================================================
    // FOOTER
    // =========================================================================

    const footerY = pageHeight - margin.bottom;

    doc.setDrawColor(...PDF_CONFIG.colors.border);
    doc.line(margin.left, footerY - 5, pageWidth - margin.right, footerY - 5);

    doc.setFontSize(PDF_CONFIG.fonts.small);
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.text(
        `Erstellt am ${formatDatum(new Date())} | ${werkstatt?.name || 'Auto-Lackierzentrum Mosbach'} | Diese Lohnabrechnung wurde maschinell erstellt.`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
    );

    return doc;
}

/**
 * Zeichnet einen Abschnitt (Brutto/Steuern/SV)
 */
function zeichneAbschnitt(doc, titel, y, margin, contentWidth, zeilen, summe, farbe, istAbzug = false) {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(PDF_CONFIG.fonts.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...farbe);
    doc.text(titel, margin.left, y);

    y += 5;

    // Zeilen
    doc.setFontSize(PDF_CONFIG.fonts.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_CONFIG.colors.text);

    zeilen.forEach(zeile => {
        // Optional: Zeile nur anzeigen wenn Wert > 0
        if (zeile.optional && (!zeile.wert || zeile.wert === 0)) return;

        doc.text(zeile.label, margin.left + 5, y);
        doc.text(
            (istAbzug ? '- ' : '') + formatEuro(zeile.wert),
            pageWidth - margin.right,
            y,
            { align: 'right' }
        );
        y += 4.5;
    });

    // Summenzeile
    doc.setDrawColor(...PDF_CONFIG.colors.border);
    doc.line(margin.left, y, pageWidth - margin.right, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(`Summe ${titel}`, margin.left + 5, y);
    doc.text(
        (istAbzug ? '- ' : '') + formatEuro(summe),
        pageWidth - margin.right,
        y,
        { align: 'right' }
    );

    y += 8;

    return y;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Erstellt und öffnet Lohnabrechnung als PDF im neuen Tab
 */
async function lohnabrechnungAlsPDF(abrechnung, werkstatt) {
    const doc = erstelleLohnabrechnung(abrechnung, werkstatt);

    // PDF als Blob öffnen
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

    return doc;
}

/**
 * Lädt Lohnabrechnung als PDF herunter
 */
async function lohnabrechnungDownload(abrechnung, werkstatt) {
    const doc = erstelleLohnabrechnung(abrechnung, werkstatt);

    // Dateiname generieren
    const monatName = MONATSNAMEN[abrechnung.monat - 1];
    const filename = `Lohnabrechnung_${abrechnung.mitarbeiterName.replace(/\s+/g, '_')}_${monatName}_${abrechnung.jahr}.pdf`;

    doc.save(filename);

    return filename;
}

/**
 * Gibt Lohnabrechnung als Base64-String zurück (für Email-Anhang)
 */
async function lohnabrechnungAlsBase64(abrechnung, werkstatt) {
    const doc = erstelleLohnabrechnung(abrechnung, werkstatt);
    return doc.output('datauristring');
}

// =============================================================================
// EXPORT FÜR BROWSER
// =============================================================================

window.LohnabrechnungPDF = {
    erstelle: erstelleLohnabrechnung,
    oeffnen: lohnabrechnungAlsPDF,
    download: lohnabrechnungDownload,
    alsBase64: lohnabrechnungAlsBase64,

    // Helper
    formatEuro,
    formatZahl,
    formatDatum,
    MONATSNAMEN
};

console.log('✅ Lohnabrechnung-PDF Modul geladen (Version 1.0.0)');
