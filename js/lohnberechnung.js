/**
 * =============================================================================
 * LOHNBERECHNUNG.JS - Deutsches Lohnabrechnungs-Modul
 * =============================================================================
 *
 * Berechnet Brutto-zu-Netto für deutsche Arbeitnehmer inkl.:
 * - Lohnsteuer (via BMF-Steuerrechner API oder Fallback-Tabelle)
 * - Solidaritätszuschlag (5,5% der Lohnsteuer, mit Freigrenzen)
 * - Kirchensteuer (8% oder 9% je nach Bundesland)
 * - Sozialversicherung (KV, RV, AV, PV)
 * - Sonderfälle: Minijob, Midijob, Werkstudent, Rentner, PKV
 *
 * Stand: 2025
 *
 * @author Claude Code (Anthropic)
 * @version 1.0.0
 * @date 2025-11-25
 */

// =============================================================================
// KONSTANTEN 2025
// =============================================================================

const LOHN_KONSTANTEN_2025 = {
    // Beitragsbemessungsgrenzen (BBG) 2025
    bbg: {
        kvPv: 5512.50,      // KV/PV monatlich (66.150€/Jahr)
        rvAv: 7550.00       // RV/AV monatlich West (90.600€/Jahr)
    },

    // Beitragssätze AN-Anteil 2025
    beitraege: {
        kv: 7.3,            // Krankenversicherung (halber Satz von 14,6%)
        rv: 9.3,            // Rentenversicherung (halber Satz von 18,6%)
        av: 1.3,            // Arbeitslosenversicherung (halber Satz von 2,6%)
        pv: 1.7,            // Pflegeversicherung (halber Satz von 3,4%)
        pvKinderlos: 0.6    // PV-Zuschlag kinderlos ab 23 Jahre
    },

    // Minijob/Midijob Grenzen
    geringfuegig: {
        minijobGrenze: 538,         // Minijob-Grenze 2025
        midijobGrenze: 2000,        // Midijob-Obergrenze (Übergangsbereich)
        minijobPauschale: 2.0       // 2% Pauschsteuer für Minijob
    },

    // Kirchensteuer nach Bundesland
    kirchensteuerSatz: {
        BW: 8, BY: 8,               // Baden-Württemberg, Bayern: 8%
        BE: 9, BB: 9, HB: 9,        // Berlin, Brandenburg, Bremen: 9%
        HH: 9, HE: 9, MV: 9,        // Hamburg, Hessen, Mecklenburg-VP: 9%
        NI: 9, NW: 9, RP: 9,        // Niedersachsen, NRW, Rheinland-Pfalz: 9%
        SL: 9, SN: 9, ST: 9,        // Saarland, Sachsen, Sachsen-Anhalt: 9%
        SH: 9, TH: 9                // Schleswig-Holstein, Thüringen: 9%
    },

    // Solidaritätszuschlag Freigrenzen 2025
    soli: {
        freigrenzeLedig: 18130,     // Jahresfreibetrag Lohnsteuer (ledig)
        freigrenzeVerheiratet: 36260, // Jahresfreibetrag (verheiratet)
        satz: 5.5                   // 5,5% der Lohnsteuer
    }
};

// =============================================================================
// LOHNSTEUER-BERECHNUNG (Fallback-Tabelle wenn API nicht verfügbar)
// =============================================================================

/**
 * Vereinfachte Lohnsteuer-Berechnung nach Steuerklasse
 * HINWEIS: Für Production sollte BMF-API verwendet werden!
 *
 * @param {number} brutto - Monatliches Bruttogehalt
 * @param {string} steuerklasse - Steuerklasse (1-6)
 * @param {number} kinderfreibetraege - Anzahl Kinderfreibeträge
 * @returns {number} Monatliche Lohnsteuer
 */
function berechneLohnsteuerFallback(brutto, steuerklasse, kinderfreibetraege = 0) {
    // Jahresbrutto für Berechnung
    const jahresBrutto = brutto * 12;

    // Grundfreibetrag 2025: 12.084€
    const grundfreibetrag = 12084;

    // Kinderfreibetrag pro Kind: 9.312€ (2025)
    const kinderfreibetragProKind = 9312;
    const gesamtKinderfreibetrag = kinderfreibetraege * kinderfreibetragProKind;

    // Zu versteuerndes Einkommen (vereinfacht ohne Werbungskosten etc.)
    let zvE = jahresBrutto - grundfreibetrag - gesamtKinderfreibetrag;

    // Steuerklassen-Modifikator
    const steuerklassenModifikator = {
        '1': 1.0,      // Standard
        '2': 0.85,     // Alleinerziehend (Entlastungsbetrag)
        '3': 0.65,     // Verheiratet, Alleinverdiener
        '4': 1.0,      // Verheiratet, beide verdienen
        '5': 1.35,     // Verheiratet, Zweitverdiener
        '6': 1.15      // Zweitjob (kein Grundfreibetrag)
    };

    // Bei Steuerklasse 6: Kein Grundfreibetrag
    if (steuerklasse === '6') {
        zvE = jahresBrutto - gesamtKinderfreibetrag;
    }

    if (zvE <= 0) return 0;

    // Progressive Besteuerung (vereinfacht, Tarif 2025)
    let steuer = 0;

    if (zvE <= 17005) {
        // Zone 2: Progressionszone I (14% - 24%)
        const y = (zvE - 12084) / 10000;
        steuer = (932.30 * y + 1400) * y;
    } else if (zvE <= 66760) {
        // Zone 3: Progressionszone II (24% - 42%)
        const z = (zvE - 17005) / 10000;
        steuer = (176.64 * z + 2397) * z + 1015.13;
    } else if (zvE <= 277826) {
        // Zone 4: Proportionalzone I (42%)
        steuer = 0.42 * zvE - 10636.31;
    } else {
        // Zone 5: Proportionalzone II (45%)
        steuer = 0.45 * zvE - 18971.10;
    }

    // Steuerklassen-Modifikator anwenden
    steuer *= steuerklassenModifikator[steuerklasse] || 1.0;

    // Monatssteuer zurückgeben (auf 2 Dezimalstellen)
    return Math.round((steuer / 12) * 100) / 100;
}

// =============================================================================
// BMF-STEUERRECHNER API
// =============================================================================

/**
 * Berechnet Lohnsteuer über die offizielle BMF-API
 * https://www.bmf-steuerrechner.de/interface/
 *
 * @param {Object} params - Parameter für die Berechnung
 * @returns {Promise<Object>} Steuerberechnung vom BMF
 */
async function berechneLohnsteuerBMF(params) {
    const {
        brutto,
        steuerklasse,
        kirchensteuer,
        bundesland,
        kinderfreibetraege = 0,
        geburtsjahr = 1990
    } = params;

    // BMF-API Parameter
    const apiParams = new URLSearchParams({
        // Abrechnungszeitraum
        LZZ: '2',                                    // 2 = Monatlich

        // Steuerklasse
        STKL: steuerklasse,

        // Bruttoarbeitslohn (in Cent!)
        RE4: Math.round(brutto * 100),

        // Kirchensteuer (0 = keine, 1 = ja)
        R: kirchensteuer !== 'keine' ? '1' : '0',

        // Bundesland (für KiSt-Satz)
        // Nicht direkt in API, wird über KVSATZAN abgebildet

        // Kinderfreibeträge (als Dezimal * 100)
        ZKF: Math.round(kinderfreibetraege * 100) / 100,

        // Geburtsjahr (für Soli-Berechnung)
        AJAHR: geburtsjahr,

        // Privat versichert (0 = GKV, 1 = PKV)
        PKV: '0',

        // Rentenversicherungspflichtig
        KRV: '0'                                     // 0 = West
    });

    try {
        // BMF-API aufrufen (CORS-Proxy erforderlich in Browser!)
        const response = await fetch(
            `https://www.bmf-steuerrechner.de/interface/2025Version1.xhtml?${apiParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/xml'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`BMF API Error: ${response.status}`);
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        // Ergebnisse extrahieren (Werte in Cent!)
        const lstlzz = parseFloat(xmlDoc.querySelector('LSTLZZ')?.textContent || '0') / 100;
        const solzlzz = parseFloat(xmlDoc.querySelector('SOLZLZZ')?.textContent || '0') / 100;
        const bk = parseFloat(xmlDoc.querySelector('BK')?.textContent || '0') / 100;

        return {
            lohnsteuer: lstlzz,
            solidaritaetszuschlag: solzlzz,
            kirchensteuer: bk,
            quelle: 'BMF-API'
        };

    } catch (error) {
        console.warn('⚠️ BMF-API nicht erreichbar, nutze Fallback:', error.message);

        // Fallback auf lokale Berechnung
        const lohnsteuer = berechneLohnsteuerFallback(brutto, steuerklasse, kinderfreibetraege);
        const soli = berechneSolidaritaetszuschlag(lohnsteuer, steuerklasse);
        const kist = berechneKirchensteuer(lohnsteuer, kirchensteuer, bundesland);

        return {
            lohnsteuer,
            solidaritaetszuschlag: soli,
            kirchensteuer: kist,
            quelle: 'Fallback-Berechnung'
        };
    }
}

// =============================================================================
// SOLIDARITÄTSZUSCHLAG
// =============================================================================

/**
 * Berechnet Solidaritätszuschlag (5,5% der Lohnsteuer mit Freigrenzen)
 *
 * @param {number} lohnsteuer - Monatliche Lohnsteuer
 * @param {string} steuerklasse - Steuerklasse für Freigrenze
 * @returns {number} Monatlicher Solidaritätszuschlag
 */
function berechneSolidaritaetszuschlag(lohnsteuer, steuerklasse) {
    // Jahres-Lohnsteuer
    const jahresLohnsteuer = lohnsteuer * 12;

    // Freigrenze je nach Steuerklasse
    const freigrenze = ['3', '4'].includes(steuerklasse)
        ? LOHN_KONSTANTEN_2025.soli.freigrenzeVerheiratet
        : LOHN_KONSTANTEN_2025.soli.freigrenzeLedig;

    // Unter Freigrenze: Kein Soli
    if (jahresLohnsteuer <= freigrenze) {
        return 0;
    }

    // Soli berechnen (5,5%)
    const jahresSoli = jahresLohnsteuer * (LOHN_KONSTANTEN_2025.soli.satz / 100);

    return Math.round((jahresSoli / 12) * 100) / 100;
}

// =============================================================================
// KIRCHENSTEUER
// =============================================================================

/**
 * Berechnet Kirchensteuer (8% oder 9% der Lohnsteuer je nach Bundesland)
 *
 * @param {number} lohnsteuer - Monatliche Lohnsteuer
 * @param {string} konfession - 'keine', 'ev', 'kath'
 * @param {string} bundesland - Bundesland-Kürzel (BW, BY, BE, etc.)
 * @returns {number} Monatliche Kirchensteuer
 */
function berechneKirchensteuer(lohnsteuer, konfession, bundesland) {
    if (konfession === 'keine') {
        return 0;
    }

    const satz = LOHN_KONSTANTEN_2025.kirchensteuerSatz[bundesland] || 9;
    return Math.round(lohnsteuer * (satz / 100) * 100) / 100;
}

// =============================================================================
// SOZIALVERSICHERUNG
// =============================================================================

/**
 * Berechnet alle Sozialversicherungsbeiträge (AN-Anteil)
 *
 * @param {Object} params - Parameter für SV-Berechnung
 * @returns {Object} SV-Beiträge aufgeschlüsselt
 */
function berechneSozialversicherung(params) {
    const {
        brutto,
        svStatus,           // 'normal', 'minijob', 'midijob', 'werkstudent', 'rentner', 'befreit'
        krankenversicherung, // 'gkv', 'pkv'
        kvZusatzbeitrag = 1.7,
        pkvBeitrag = 0,
        agZuschussPKV = 0,
        kinderlos = false,
        alter = 30
    } = params;

    const bbg = LOHN_KONSTANTEN_2025.bbg;
    const beitraege = LOHN_KONSTANTEN_2025.beitraege;

    // Ergebnis-Objekt
    const sv = {
        krankenversicherung: 0,
        rentenversicherung: 0,
        arbeitslosenversicherung: 0,
        pflegeversicherung: 0,
        gesamt: 0,
        details: {}
    };

    // =========================================================================
    // SONDERFALL: Befreit
    // =========================================================================
    if (svStatus === 'befreit') {
        sv.details.hinweis = 'Befreit von Sozialversicherungspflicht';
        return sv;
    }

    // =========================================================================
    // SONDERFALL: Minijob (bis 538€)
    // =========================================================================
    if (svStatus === 'minijob') {
        // Minijobber zahlen keine SV-Beiträge (AG zahlt Pauschale)
        // Optional: RV mit 3,6% (Differenz zu 18,6% AG-Pauschale)
        sv.details.hinweis = 'Minijob: AN zahlt keine SV-Beiträge (AG-Pauschale)';
        sv.details.rvOptional = Math.round(brutto * 0.036 * 100) / 100;
        return sv;
    }

    // =========================================================================
    // SONDERFALL: Midijob (538€ - 2.000€ Übergangsbereich)
    // =========================================================================
    if (svStatus === 'midijob') {
        // Reduzierte AN-Beiträge im Übergangsbereich (Gleitzone)
        const midijobFaktor = berechneMidijobFaktor(brutto);

        // KV mit reduziertem Satz
        const kvBasis = Math.min(brutto, bbg.kvPv);
        sv.krankenversicherung = Math.round(kvBasis * (beitraege.kv / 100) * midijobFaktor * 100) / 100;

        // KV-Zusatzbeitrag (hälftig)
        sv.krankenversicherung += Math.round(kvBasis * (kvZusatzbeitrag / 2 / 100) * midijobFaktor * 100) / 100;

        // RV
        const rvBasis = Math.min(brutto, bbg.rvAv);
        sv.rentenversicherung = Math.round(rvBasis * (beitraege.rv / 100) * midijobFaktor * 100) / 100;

        // AV
        sv.arbeitslosenversicherung = Math.round(rvBasis * (beitraege.av / 100) * midijobFaktor * 100) / 100;

        // PV
        let pvSatz = beitraege.pv;
        if (kinderlos && alter >= 23) {
            pvSatz += beitraege.pvKinderlos;
        }
        sv.pflegeversicherung = Math.round(kvBasis * (pvSatz / 100) * midijobFaktor * 100) / 100;

        sv.details.midijobFaktor = midijobFaktor;
        sv.details.hinweis = `Midijob: Reduzierte AN-Beiträge (Faktor: ${midijobFaktor.toFixed(4)})`;
    }

    // =========================================================================
    // SONDERFALL: Werkstudent
    // =========================================================================
    else if (svStatus === 'werkstudent') {
        // Werkstudenten: Nur RV (keine KV, PV, AV)
        const rvBasis = Math.min(brutto, bbg.rvAv);
        sv.rentenversicherung = Math.round(rvBasis * (beitraege.rv / 100) * 100) / 100;

        sv.details.hinweis = 'Werkstudent: Nur RV-pflichtig, KV/PV/AV-frei';
    }

    // =========================================================================
    // SONDERFALL: Rentner
    // =========================================================================
    else if (svStatus === 'rentner') {
        // Rentner: KV + PV, keine RV + AV
        if (krankenversicherung === 'gkv') {
            const kvBasis = Math.min(brutto, bbg.kvPv);
            sv.krankenversicherung = Math.round(kvBasis * (beitraege.kv / 100) * 100) / 100;
            sv.krankenversicherung += Math.round(kvBasis * (kvZusatzbeitrag / 2 / 100) * 100) / 100;

            let pvSatz = beitraege.pv;
            if (kinderlos) pvSatz += beitraege.pvKinderlos;
            sv.pflegeversicherung = Math.round(kvBasis * (pvSatz / 100) * 100) / 100;
        } else {
            // PKV: AN-Beitrag minus AG-Zuschuss
            sv.krankenversicherung = Math.max(0, pkvBeitrag - agZuschussPKV);
        }

        sv.details.hinweis = 'Rentner: KV/PV-pflichtig, RV/AV-frei';
    }

    // =========================================================================
    // NORMALFALL: Volle SV
    // =========================================================================
    else {
        // Krankenversicherung
        if (krankenversicherung === 'gkv') {
            const kvBasis = Math.min(brutto, bbg.kvPv);
            // Allgemeiner Beitragssatz (AN-Anteil)
            sv.krankenversicherung = Math.round(kvBasis * (beitraege.kv / 100) * 100) / 100;
            // Zusatzbeitrag (hälftig AN/AG)
            sv.krankenversicherung += Math.round(kvBasis * (kvZusatzbeitrag / 2 / 100) * 100) / 100;
        } else {
            // PKV: AN-Beitrag (AG-Zuschuss wird separat verrechnet)
            sv.krankenversicherung = Math.max(0, pkvBeitrag - agZuschussPKV);
        }

        // Rentenversicherung
        const rvBasis = Math.min(brutto, bbg.rvAv);
        sv.rentenversicherung = Math.round(rvBasis * (beitraege.rv / 100) * 100) / 100;

        // Arbeitslosenversicherung
        sv.arbeitslosenversicherung = Math.round(rvBasis * (beitraege.av / 100) * 100) / 100;

        // Pflegeversicherung
        const pvBasis = Math.min(brutto, bbg.kvPv);
        let pvSatz = beitraege.pv;
        if (kinderlos && alter >= 23) {
            pvSatz += beitraege.pvKinderlos;
            sv.details.pvKinderlosZuschlag = true;
        }
        sv.pflegeversicherung = Math.round(pvBasis * (pvSatz / 100) * 100) / 100;
    }

    // Gesamt berechnen
    sv.gesamt = Math.round((
        sv.krankenversicherung +
        sv.rentenversicherung +
        sv.arbeitslosenversicherung +
        sv.pflegeversicherung
    ) * 100) / 100;

    return sv;
}

/**
 * Berechnet den Midijob-Faktor für den Übergangsbereich
 * Formel nach § 163 Abs. 10 SGB VI
 *
 * @param {number} brutto - Monatliches Bruttogehalt
 * @returns {number} Faktor für AN-Beiträge (0.0 - 1.0)
 */
function berechneMidijobFaktor(brutto) {
    const G = LOHN_KONSTANTEN_2025.geringfuegig.minijobGrenze;  // 538€
    const O = LOHN_KONSTANTEN_2025.geringfuegig.midijobGrenze;  // 2000€

    if (brutto <= G) return 0;
    if (brutto >= O) return 1;

    // Formel: F = (O - G) / (O - G) * ((brutto - G) / (O - G))
    // Vereinfacht: Linearer Anstieg von 0 auf 1
    const faktor = (brutto - G) / (O - G);

    return Math.round(faktor * 10000) / 10000;
}

// =============================================================================
// HAUPT-BERECHNUNG: BRUTTO ZU NETTO
// =============================================================================

/**
 * Berechnet komplette Lohnabrechnung von Brutto zu Netto
 *
 * @param {Object} mitarbeiter - Mitarbeiter-Stammdaten
 * @param {number} monat - Abrechnungsmonat (1-12)
 * @param {number} jahr - Abrechnungsjahr
 * @param {Object} zeiterfassung - Arbeitsstunden des Monats (optional)
 * @returns {Promise<Object>} Komplette Lohnabrechnung
 */
async function berechneLohnabrechnung(mitarbeiter, monat, jahr, zeiterfassung = null) {
    console.log(`💰 Berechne Lohnabrechnung für ${mitarbeiter.name} (${monat}/${jahr})`);

    // =========================================================================
    // 1. BRUTTO ERMITTELN
    // =========================================================================
    let brutto = 0;
    let arbeitsstunden = 0;
    let sollstunden = 0;

    if (mitarbeiter.verguetungsart === 'stundenlohn') {
        // Stundenlohn: Arbeitsstunden * Stundensatz
        if (zeiterfassung) {
            arbeitsstunden = zeiterfassung.gesamtStunden || 0;
        } else {
            // Fallback: Standard-Monatsstunden
            arbeitsstunden = (mitarbeiter.wochenarbeitsstunden || 40) * 4.33;
        }
        brutto = arbeitsstunden * (mitarbeiter.stundenlohn || 0);
        sollstunden = (mitarbeiter.wochenarbeitsstunden || 40) * 4.33;
    } else {
        // Monatsgehalt: Fixer Betrag
        brutto = mitarbeiter.monatsgehalt || 0;
        sollstunden = (mitarbeiter.wochenarbeitsstunden || 40) * 4.33;
        arbeitsstunden = sollstunden; // Bei Gehalt = Soll
    }

    brutto = Math.round(brutto * 100) / 100;

    // =========================================================================
    // 2. STEUERN BERECHNEN
    // =========================================================================
    const steuerBerechnung = await berechneLohnsteuerBMF({
        brutto,
        steuerklasse: mitarbeiter.steuerklasse || '1',
        kirchensteuer: mitarbeiter.kirchensteuer || 'keine',
        bundesland: mitarbeiter.bundesland || 'BW',
        kinderfreibetraege: parseFloat(mitarbeiter.kinderfreibetraege) || 0,
        geburtsjahr: mitarbeiter.geburtsdatum
            ? new Date(mitarbeiter.geburtsdatum).getFullYear()
            : 1990
    });

    // =========================================================================
    // 3. SOZIALVERSICHERUNG BERECHNEN
    // =========================================================================
    const alter = mitarbeiter.geburtsdatum
        ? Math.floor((new Date() - new Date(mitarbeiter.geburtsdatum)) / (365.25 * 24 * 60 * 60 * 1000))
        : 30;

    const svBerechnung = berechneSozialversicherung({
        brutto,
        svStatus: mitarbeiter.svStatus || 'normal',
        krankenversicherung: mitarbeiter.krankenversicherung || 'gkv',
        kvZusatzbeitrag: mitarbeiter.kvZusatzbeitrag || 1.7,
        pkvBeitrag: mitarbeiter.pkvBeitrag || 0,
        agZuschussPKV: mitarbeiter.agZuschussPKV || 0,
        kinderlos: mitarbeiter.kinderlos || false,
        alter
    });

    // =========================================================================
    // 4. NETTO BERECHNEN
    // =========================================================================
    const abzuegeGesamt =
        steuerBerechnung.lohnsteuer +
        steuerBerechnung.solidaritaetszuschlag +
        steuerBerechnung.kirchensteuer +
        svBerechnung.gesamt;

    const netto = Math.round((brutto - abzuegeGesamt) * 100) / 100;

    // =========================================================================
    // 5. ERGEBNIS ZUSAMMENSTELLEN
    // =========================================================================
    const abrechnung = {
        // Meta-Daten
        mitarbeiterId: mitarbeiter.id,
        mitarbeiterName: mitarbeiter.name,
        monat,
        jahr,
        abrechnungsDatum: new Date().toISOString(),

        // Arbeitszeit
        arbeitszeit: {
            sollstunden: Math.round(sollstunden * 100) / 100,
            iststunden: Math.round(arbeitsstunden * 100) / 100,
            differenz: Math.round((arbeitsstunden - sollstunden) * 100) / 100
        },

        // Brutto
        brutto: {
            grundgehalt: brutto,
            zulagen: 0,          // Für spätere Erweiterung
            zuschlaege: 0,       // Für spätere Erweiterung
            gesamt: brutto
        },

        // Steuern
        steuern: {
            lohnsteuer: steuerBerechnung.lohnsteuer,
            solidaritaetszuschlag: steuerBerechnung.solidaritaetszuschlag,
            kirchensteuer: steuerBerechnung.kirchensteuer,
            gesamt: Math.round((
                steuerBerechnung.lohnsteuer +
                steuerBerechnung.solidaritaetszuschlag +
                steuerBerechnung.kirchensteuer
            ) * 100) / 100,
            quelle: steuerBerechnung.quelle
        },

        // Sozialversicherung
        sozialversicherung: {
            krankenversicherung: svBerechnung.krankenversicherung,
            rentenversicherung: svBerechnung.rentenversicherung,
            arbeitslosenversicherung: svBerechnung.arbeitslosenversicherung,
            pflegeversicherung: svBerechnung.pflegeversicherung,
            gesamt: svBerechnung.gesamt,
            details: svBerechnung.details
        },

        // Abzüge Gesamt
        abzuege: {
            steuern: Math.round((
                steuerBerechnung.lohnsteuer +
                steuerBerechnung.solidaritaetszuschlag +
                steuerBerechnung.kirchensteuer
            ) * 100) / 100,
            sozialversicherung: svBerechnung.gesamt,
            sonstige: 0,         // Für spätere Erweiterung (VWL, etc.)
            gesamt: Math.round(abzuegeGesamt * 100) / 100
        },

        // Netto
        netto,

        // Mitarbeiter-Stammdaten (für PDF)
        stammdaten: {
            steuerklasse: mitarbeiter.steuerklasse || '1',
            kirchensteuer: mitarbeiter.kirchensteuer || 'keine',
            bundesland: mitarbeiter.bundesland || 'BW',
            kinderfreibetraege: mitarbeiter.kinderfreibetraege || '0',
            svStatus: mitarbeiter.svStatus || 'normal',
            krankenversicherung: mitarbeiter.krankenversicherung || 'gkv',
            krankenkasse: mitarbeiter.krankenkasseName || '',
            svNummer: mitarbeiter.svNummer || '',
            steuerID: mitarbeiter.steuerID || '',
            verguetungsart: mitarbeiter.verguetungsart || 'monatsgehalt',
            stundenlohn: mitarbeiter.stundenlohn || null,
            monatsgehalt: mitarbeiter.monatsgehalt || null
        },

        // Bankverbindung (für Überweisung)
        bankverbindung: {
            iban: mitarbeiter.iban || '',
            bic: mitarbeiter.bic || '',
            bank: mitarbeiter.bankName || '',
            kontoinhaber: mitarbeiter.kontoinhaber || mitarbeiter.name
        }
    };

    console.log(`✅ Lohnabrechnung berechnet: Brutto ${brutto}€ → Netto ${netto}€`);

    return abrechnung;
}

// =============================================================================
// EXPORT FÜR BROWSER
// =============================================================================

// Global verfügbar machen
window.Lohnberechnung = {
    // Hauptfunktion
    berechne: berechneLohnabrechnung,

    // Einzelne Berechnungen (für Tests/Debugging)
    berechneLohnsteuer: berechneLohnsteuerBMF,
    berechneLohnsteuerFallback,
    berechneSolidaritaetszuschlag,
    berechneKirchensteuer,
    berechneSozialversicherung,
    berechneMidijobFaktor,

    // Konstanten
    KONSTANTEN: LOHN_KONSTANTEN_2025
};

console.log('✅ Lohnberechnung-Modul geladen (Version 1.0.0)');
