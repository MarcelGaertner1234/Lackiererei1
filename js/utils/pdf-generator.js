/**
 * @fileoverview PDF Generation Utilities
 *
 * Zentrale PDF-Generierung für die Fahrzeugannahme-App.
 * Extrahiert aus: abnahme.html, mitarbeiter-verwaltung.html
 *
 * @version 3.2.0
 * @created 2025-11-09
 * @author Claude Code (Quick Win #2: Utility Extraction)
 */

/// <reference path="../types.js" />

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely add image to PDF with error handling
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} imageData - Base64 image data
 * @param {string} format - Image format (JPEG, PNG)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} [label='Foto'] - Image label for logging
 * @returns {{success: boolean, failedCount: number}} Result object
 */
export function safeAddImage(doc, imageData, format, x, y, width, height, label = 'Foto') {
    try {
        console.log(`📸 [safeAddImage] Versuche ${label} hinzuzufügen:`, {
            hasData: !!imageData,
            dataType: typeof imageData,
            dataLength: imageData ? imageData.length : 0,
            format, x, y, width, height
        });

        if (!imageData || imageData === '') {
            throw new Error('Leeres Foto - imageData ist null oder leer');
        }

        if (typeof imageData !== 'string') {
            throw new Error('Ungültiger imageData Typ: ' + typeof imageData);
        }

        if (!imageData.startsWith('data:image/')) {
            throw new Error('Ungültiges DataURL Format: ' + imageData.substring(0, 50));
        }

        doc.addImage(imageData, format, x, y, width, height);
        console.log(`✅ [safeAddImage] ${label} erfolgreich hinzugefügt`);
        return { success: true, failedCount: 0 };
    } catch (error) {
        console.error(`❌ [safeAddImage] FEHLER beim Hinzufügen (${label}):`, {
            errorName: error.name,
            errorMessage: error.message,
            hasImageData: !!imageData,
            imageDataType: typeof imageData,
            imageDataLength: imageData ? imageData.length : 0,
            imageDataPrefix: imageData ? imageData.substring(0, 50) : 'NULL',
            format, x, y, width, height
        });

        // Render Fallback: Grauer Platzhalter mit Fehlermeldung
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, width, height, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, width, height, 'S');

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('⚠️ Foto konnte nicht', x + width/2, y + height/2 - 5, { align: 'center' });
        doc.text('geladen werden', x + width/2, y + height/2 + 5, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        return { success: false, failedCount: 1 };
    }
}

/**
 * Add standardized header to PDF
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} title - Main title
 * @param {string} [subtitle='Auto-Lackierzentrum Mosbach'] - Subtitle
 * @param {Object} [options] - Header options
 * @param {number} [options.headerColor=[0, 191, 255]] - RGB color array
 * @param {number} [options.height=40] - Header height
 * @returns {void}
 */
export function addPDFHeader(doc, title, subtitle = 'Auto-Lackierzentrum Mosbach', options = {}) {
    const {
        headerColor = [0, 191, 255],
        height = 40
    } = options;

    // Header background
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, 210, height, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(title, 105, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.text(subtitle, 105, 30, { align: 'center' });

    // Reset color
    doc.setTextColor(0, 0, 0);
}

/**
 * Add pagination footer to PDF
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {void}
 */
export function addPDFFooter(doc, pageNumber, totalPages) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `Seite ${pageNumber} von ${totalPages}`,
        105,
        pageHeight - 10,
        { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
}

/**
 * Check if new content would overflow page and add new page if needed
 * @param {jsPDF} doc - jsPDF document instance
 * @param {number} currentY - Current Y position
 * @param {number} neededSpace - Space needed for next content
 * @param {number} [pageHeight=280] - Maximum Y before new page
 * @returns {number} New Y position (reset to 20 if new page added)
 */
export function checkPageOverflow(doc, currentY, neededSpace, pageHeight = 280) {
    if (currentY + neededSpace > pageHeight) {
        doc.addPage();
        return 20; // Start position on new page
    }
    return currentY;
}

/**
 * Add labeled data row to PDF
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} label - Label text (bold)
 * @param {string} value - Value text (normal)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} [labelWidth=40] - Width allocated for label
 * @returns {void}
 */
export function addDataRow(doc, label, value, x, y, labelWidth = 40) {
    doc.setFont(undefined, 'bold');
    doc.text(label, x, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), x + labelWidth, y);
}

// ============================================================================
// SPECIALIZED PDF GENERATORS
// ============================================================================

/**
 * Generate Fahrzeug-Abnahmeprotokoll (Vehicle Completion Protocol) PDF
 * @param {Object} data - Vehicle completion data
 * @param {string} data.datum - Intake date
 * @param {string} data.zeit - Intake time
 * @param {string} data.abnahmeDatum - Completion date
 * @param {string} data.abnahmeZeit - Completion time
 * @param {string} data.kennzeichen - License plate
 * @param {string} data.marke - Vehicle make
 * @param {string} data.modell - Vehicle model
 * @param {string} data.kunde - Customer name
 * @param {Array<string>} [data.fotos] - Photo data URLs
 * @param {string} [data.notizen] - Notes
 * @returns {jsPDF} Generated PDF document
 */
export function generateCompletionPDF(data) {
    const doc = new jsPDF();
    let failedImages = 0;

    // Header
    addPDFHeader(doc, 'Fahrzeug-Abnahmeprotokoll');

    // Data section
    let y = 55;

    addDataRow(doc, 'Annahme:', `${data.datum} ${data.zeit}`, 20, y);
    y += 10;

    addDataRow(doc, 'Abnahme:', `${data.abnahmeDatum} ${data.abnahmeZeit}`, 20, y);
    y += 10;

    addDataRow(doc, 'Kennzeichen:', data.kennzeichen, 20, y);
    y += 10;

    addDataRow(doc, 'Fahrzeug:', `${data.marke} ${data.modell}`, 20, y);
    y += 10;

    addDataRow(doc, 'Kunde:', data.kunde, 20, y);
    y += 15;

    // Photos section (if any)
    if (data.fotos && data.fotos.length > 0) {
        y = checkPageOverflow(doc, y, 80);

        doc.setFont(undefined, 'bold');
        doc.text('Fotos:', 20, y);
        doc.setFont(undefined, 'normal');
        y += 10;

        data.fotos.forEach((foto, index) => {
            y = checkPageOverflow(doc, y, 60);

            const result = safeAddImage(
                doc,
                foto,
                'JPEG',
                20,
                y,
                80,
                60,
                `Foto ${index + 1}`
            );

            if (!result.success) {
                failedImages += result.failedCount;
            }

            y += 70;
        });
    }

    // Notes section (if any)
    if (data.notizen) {
        y = checkPageOverflow(doc, y, 40);

        doc.setFont(undefined, 'bold');
        doc.text('Notizen:', 20, y);
        doc.setFont(undefined, 'normal');
        y += 10;

        const splitNotes = doc.splitTextToSize(data.notizen, 170);
        doc.text(splitNotes, 20, y);
    }

    // Warning if images failed
    if (failedImages > 0) {
        console.warn(`⚠️ PDF generiert, aber ${failedImages} Foto(s) konnten nicht geladen werden`);
    }

    return doc;
}

/**
 * Generate Employee Timesheet PDF
 * @param {Object} data - Timesheet data
 * @param {string} data.mitarbeiterName - Employee name
 * @param {string} data.monat - Month (YYYY-MM format)
 * @param {Array<Object>} data.eintraege - Time entries
 * @param {number} data.sollStunden - Planned hours
 * @param {number} data.istStunden - Actual hours
 * @param {number} data.differenz - Difference (actual - planned)
 * @returns {jsPDF} Generated PDF document
 */
export function generateTimesheetPDF(data) {
    const doc = new jsPDF();

    // Header
    addPDFHeader(doc, 'Stundenabrechnung');

    // Employee info
    let y = 55;
    addDataRow(doc, 'Mitarbeiter:', data.mitarbeiterName, 20, y);
    y += 10;
    addDataRow(doc, 'Monat:', data.monat, 20, y);
    y += 15;

    // Summary
    doc.setFont(undefined, 'bold');
    doc.text('Zusammenfassung:', 20, y);
    y += 10;
    doc.setFont(undefined, 'normal');

    addDataRow(doc, 'SOLL-Stunden:', `${data.sollStunden.toFixed(2)} h`, 30, y);
    y += 8;
    addDataRow(doc, 'IST-Stunden:', `${data.istStunden.toFixed(2)} h`, 30, y);
    y += 8;

    // Differenz with color
    const differenzText = `${data.differenz >= 0 ? '+' : ''}${data.differenz.toFixed(2)} h`;
    doc.setFont(undefined, 'bold');
    doc.text('Differenz:', 30, y);
    doc.setFont(undefined, 'normal');

    if (data.differenz >= 0) {
        doc.setTextColor(0, 150, 0); // Green for overtime
    } else {
        doc.setTextColor(200, 0, 0); // Red for deficit
    }
    doc.text(differenzText, 70, y);
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Time entries table (if any)
    if (data.eintraege && data.eintraege.length > 0) {
        y = checkPageOverflow(doc, y, 50);

        doc.setFont(undefined, 'bold');
        doc.text('Zeiteinträge:', 20, y);
        y += 10;

        // Table header
        doc.setFontSize(10);
        doc.text('Datum', 20, y);
        doc.text('Start', 60, y);
        doc.text('Ende', 90, y);
        doc.text('Stunden', 120, y);
        y += 7;

        doc.setFont(undefined, 'normal');

        // Table rows
        data.eintraege.forEach((eintrag) => {
            y = checkPageOverflow(doc, y, 10);

            doc.text(eintrag.datum, 20, y);
            doc.text(eintrag.start || '-', 60, y);
            doc.text(eintrag.ende || '-', 90, y);
            doc.text(`${eintrag.stunden.toFixed(2)} h`, 120, y);
            y += 7;
        });
    }

    return doc;
}

// ============================================================================
// EXPORT NOTE
// ============================================================================

console.log('✅ PDF Generator Utilities loaded');
