/**
 * ERSATZTEILE DATENBANK
 * Auto-Lackierzentrum Mosbach
 *
 * Umfangreiche Datenbank mit Ersatzteilen und OE-Nummern
 * für alle gängigen Automarken und Modelle.
 *
 * Struktur:
 * - Marke > Modell > Baujahr-Range > Kategorie > Teile
 * - Jedes Teil hat: Name, OE-Nummer(n), Kategorie, Position
 *
 * Erstellt: November 2024
 * Letztes Update: November 2024
 */

const ERSATZTEILE_DB = {
    version: "1.0.0",
    lastUpdate: "2024-11-29",

    // ============================================
    // KATEGORIEN
    // ============================================
    kategorien: {
        karosserie: "Karosserie & Anbauteile",
        beleuchtung: "Beleuchtung",
        verglasung: "Verglasung & Scheiben",
        spiegel: "Außenspiegel",
        stossfaenger: "Stoßfänger & Zubehör",
        motorhaube: "Motorhaube & Frontbereich",
        kotfluegel: "Kotflügel",
        tueren: "Türen & Zubehör",
        heck: "Heckbereich",
        dach: "Dach & Panorama",
        schweller: "Schweller & Unterbodenverkleidung",
        kuehlergrill: "Kühlergrill & Frontverkleidung",
        radlauf: "Radlauf & Radhausschalen",
        motoranbauteile: "Motoranbauteile",
        fahrwerk: "Fahrwerk & Achsteile"
    },

    // ============================================
    // POSITIONEN
    // ============================================
    positionen: {
        vl: "Vorne Links",
        vr: "Vorne Rechts",
        hl: "Hinten Links",
        hr: "Hinten Rechts",
        v: "Vorne",
        h: "Hinten",
        l: "Links",
        r: "Rechts",
        m: "Mitte",
        o: "Oben",
        u: "Unten"
    },

    // ============================================
    // MARKEN & MODELLE
    // ============================================
    marken: {}
};

// ============================================
// VOLKSWAGEN (VW)
// ============================================
ERSATZTEILE_DB.marken.volkswagen = {
    name: "Volkswagen",
    kurzname: "VW",
    modelle: {

        // VW GOLF 7 (2012-2020)
        golf_7: {
            name: "Golf VII",
            baujahre: "2012-2020",
            typen: ["Schrägheck", "Variant", "GTI", "GTD", "GTE", "R"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["5G0823031P", "5G0823031Q", "5G0823031R"],
                    material: "Stahl",
                    hinweis: "Ohne Dämmung"
                },
                motorhauben_daemmung: {
                    name: "Motorhaubendämmung",
                    kategorie: "motorhaube",
                    oe_nummern: ["5G0863831A", "5G0863831B"],
                    material: "Textil/Schaum"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["5G0821105A", "5G0821105B", "5G0821105C"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["5G0821106A", "5G0821106B", "5G0821106C"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5G0807221A", "5G0807221AGRU", "5G0807221BGRU"],
                    material: "Kunststoff",
                    varianten: {
                        standard: "5G0807221A",
                        pdc: "5G0807221AGRU",
                        gti: "5G0807221RGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5G6807421A", "5G6807421AGRU", "5G6807421BGRU"],
                    material: "Kunststoff"
                },
                stossfaenger_gitter_v: {
                    name: "Stoßfängergitter vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5G0853677A", "5G0853677B9B9"],
                    material: "Kunststoff"
                },
                stossfaenger_gitter_vl: {
                    name: "Stoßfängergitter vorne links",
                    kategorie: "stossfaenger",
                    position: "vl",
                    oe_nummern: ["5G0853665A", "5G0853665B9B9"],
                    material: "Kunststoff"
                },
                stossfaenger_gitter_vr: {
                    name: "Stoßfängergitter vorne rechts",
                    kategorie: "stossfaenger",
                    position: "vr",
                    oe_nummern: ["5G0853666A", "5G0853666B9B9"],
                    material: "Kunststoff"
                },
                stossfaenger_traeger_v: {
                    name: "Stoßfängerträger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5Q0807109A", "5Q0807109B", "5Q0807109C"],
                    material: "Aluminium"
                },
                stossfaenger_traeger_h: {
                    name: "Stoßfängerträger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5G6807305A", "5G6807305B"],
                    material: "Stahl"
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["5G0853651A", "5G0853651AJKI", "5G0853651BRYI"],
                    varianten: {
                        standard: "5G0853651A",
                        chromleisten: "5G0853651AJKI",
                        gti: "5G0853651CKZP"
                    }
                },
                vw_emblem_vorne: {
                    name: "VW Emblem vorne",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["5G0853601ADPJ", "5G0853601AFXC", "5G0853601BJZA"],
                    durchmesser: "140mm"
                },
                vw_emblem_hinten: {
                    name: "VW Emblem hinten",
                    kategorie: "heck",
                    position: "h",
                    oe_nummern: ["5G0853630ADPJ", "5G0853630AFXC"],
                    durchmesser: "110mm"
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5G1941005A", "5G1941005B", "5G1941005C"],
                    varianten: {
                        halogen: "5G1941005A",
                        xenon: "5G1941031A",
                        led: "5G1941073A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5G1941006A", "5G1941006B", "5G1941006C"],
                    varianten: {
                        halogen: "5G1941006A",
                        xenon: "5G1941032A",
                        led: "5G1941074A"
                    }
                },
                rueckleuchte_vl: {
                    name: "Rückleuchte links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["5G0945095A", "5G0945095B", "5G0945095C"],
                    varianten: {
                        standard: "5G0945095A",
                        led: "5G0945207A"
                    }
                },
                rueckleuchte_vr: {
                    name: "Rückleuchte rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["5G0945096A", "5G0945096B", "5G0945096C"],
                    varianten: {
                        standard: "5G0945096A",
                        led: "5G0945208A"
                    }
                },
                nebelscheinwerfer_vl: {
                    name: "Nebelscheinwerfer links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5G0941661A", "5G0941661B"]
                },
                nebelscheinwerfer_vr: {
                    name: "Nebelscheinwerfer rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5G0941662A", "5G0941662B"]
                },

                // AUSSENSPIEGEL
                aussenspiegel_vl: {
                    name: "Außenspiegel links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["5G1857507A", "5G1857507AF9B9", "5G1857507AH"],
                    varianten: {
                        manuell: "5G1857507A",
                        elektrisch: "5G1857507AF9B9",
                        anklappbar: "5G1857507AH"
                    }
                },
                aussenspiegel_vr: {
                    name: "Außenspiegel rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["5G2857508A", "5G2857508AF9B9", "5G2857508AH"],
                    varianten: {
                        manuell: "5G2857508A",
                        elektrisch: "5G2857508AF9B9",
                        anklappbar: "5G2857508AH"
                    }
                },
                spiegelglas_vl: {
                    name: "Spiegelglas links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["5G0857521A", "5G0857521B"],
                    varianten: {
                        standard: "5G0857521A",
                        asphärisch: "5G0857521B"
                    }
                },
                spiegelglas_vr: {
                    name: "Spiegelglas rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["5G0857522A", "5G0857522B"],
                    varianten: {
                        standard: "5G0857522A",
                        asphärisch: "5G0857522B"
                    }
                },
                spiegelkappe_vl: {
                    name: "Spiegelkappe links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["5G0857537AGRU", "5G0857537A9B9"],
                    hinweis: "Grundiert oder lackiert lieferbar"
                },
                spiegelkappe_vr: {
                    name: "Spiegelkappe rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["5G0857538AGRU", "5G0857538A9B9"],
                    hinweis: "Grundiert oder lackiert lieferbar"
                },

                // TÜREN
                tuer_vl: {
                    name: "Tür vorne links",
                    kategorie: "tueren",
                    position: "vl",
                    oe_nummern: ["5G4831055A", "5G4831055B"],
                    material: "Stahl"
                },
                tuer_vr: {
                    name: "Tür vorne rechts",
                    kategorie: "tueren",
                    position: "vr",
                    oe_nummern: ["5G4831056A", "5G4831056B"],
                    material: "Stahl"
                },
                tuer_hl: {
                    name: "Tür hinten links",
                    kategorie: "tueren",
                    position: "hl",
                    oe_nummern: ["5G4833055A", "5G4833055B"],
                    material: "Stahl"
                },
                tuer_hr: {
                    name: "Tür hinten rechts",
                    kategorie: "tueren",
                    position: "hr",
                    oe_nummern: ["5G4833056A", "5G4833056B"],
                    material: "Stahl"
                },
                tuerscheibe_vl: {
                    name: "Türscheibe vorne links",
                    kategorie: "verglasung",
                    position: "vl",
                    oe_nummern: ["5G4845201A", "5G4845201ANVB"]
                },
                tuerscheibe_vr: {
                    name: "Türscheibe vorne rechts",
                    kategorie: "verglasung",
                    position: "vr",
                    oe_nummern: ["5G4845202A", "5G4845202ANVB"]
                },

                // VERGLASUNG
                windschutzscheibe: {
                    name: "Windschutzscheibe",
                    kategorie: "verglasung",
                    position: "v",
                    oe_nummern: ["5G0845011ANVB", "5G0845011BNVB", "5G0845011CNVB"],
                    varianten: {
                        standard: "5G0845011ANVB",
                        sensor: "5G0845011BNVB",
                        heizbar: "5G0845011CNVB"
                    }
                },
                heckscheibe: {
                    name: "Heckscheibe",
                    kategorie: "verglasung",
                    position: "h",
                    oe_nummern: ["5G6845051ANVB", "5G6845051BNVB"],
                    hinweis: "Mit Heizung"
                },

                // HECKKLAPPE
                heckklappe: {
                    name: "Heckklappe",
                    kategorie: "heck",
                    position: "h",
                    oe_nummern: ["5G6827025A", "5G6827025B", "5G6827025C"],
                    material: "Stahl"
                },
                heckklappe_daempfer_l: {
                    name: "Heckklappendämpfer links",
                    kategorie: "heck",
                    position: "hl",
                    oe_nummern: ["5G6827550A", "5G6827550B"]
                },
                heckklappe_daempfer_r: {
                    name: "Heckklappendämpfer rechts",
                    kategorie: "heck",
                    position: "hr",
                    oe_nummern: ["5G6827550A", "5G6827550B"]
                },

                // SCHWELLER
                schweller_l: {
                    name: "Schweller links",
                    kategorie: "schweller",
                    position: "l",
                    oe_nummern: ["5G0809605A", "5G0809605B"],
                    material: "Stahl"
                },
                schweller_r: {
                    name: "Schweller rechts",
                    kategorie: "schweller",
                    position: "r",
                    oe_nummern: ["5G0809606A", "5G0809606B"],
                    material: "Stahl"
                },
                seitenschweller_blende_l: {
                    name: "Seitenschweller-Blende links",
                    kategorie: "schweller",
                    position: "l",
                    oe_nummern: ["5G0853855AGRU", "5G0853855BGRU"],
                    material: "Kunststoff"
                },
                seitenschweller_blende_r: {
                    name: "Seitenschweller-Blende rechts",
                    kategorie: "schweller",
                    position: "r",
                    oe_nummern: ["5G0853856AGRU", "5G0853856BGRU"],
                    material: "Kunststoff"
                },

                // RADLAUF
                radhausschale_vl: {
                    name: "Radhausschale vorne links",
                    kategorie: "radlauf",
                    position: "vl",
                    oe_nummern: ["5G0809957A", "5G0809957B"],
                    material: "Kunststoff"
                },
                radhausschale_vr: {
                    name: "Radhausschale vorne rechts",
                    kategorie: "radlauf",
                    position: "vr",
                    oe_nummern: ["5G0809958A", "5G0809958B"],
                    material: "Kunststoff"
                },
                radhausschale_hl: {
                    name: "Radhausschale hinten links",
                    kategorie: "radlauf",
                    position: "hl",
                    oe_nummern: ["5G0810971A", "5G0810971B"],
                    material: "Kunststoff"
                },
                radhausschale_hr: {
                    name: "Radhausschale hinten rechts",
                    kategorie: "radlauf",
                    position: "hr",
                    oe_nummern: ["5G0810972A", "5G0810972B"],
                    material: "Kunststoff"
                },

                // UNTERBODENVERKLEIDUNG
                motorunterschutz: {
                    name: "Motorunterschutz",
                    kategorie: "schweller",
                    position: "u",
                    oe_nummern: ["5Q0825901A", "5Q0825901B", "5Q0825901C"],
                    material: "Kunststoff"
                }
            }
        },

        // VW GOLF 8 (2019-)
        golf_8: {
            name: "Golf VIII",
            baujahre: "2019-",
            typen: ["Schrägheck", "Variant", "GTI", "GTD", "GTE", "R"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["5H0823031A", "5H0823031B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["5H0821105A", "5H0821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["5H0821106A", "5H0821106B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5H0807221A", "5H0807221AGRU"],
                    material: "Kunststoff"
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5H6807421A", "5H6807421AGRU"],
                    material: "Kunststoff"
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["5H0853651A", "5H0853651AATL"],
                    hinweis: "Mit IQ.Light LED Matrix"
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5H1941035A", "5H1941035B"],
                    varianten: {
                        led: "5H1941035A",
                        iq_light: "5H1941035B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5H1941036A", "5H1941036B"],
                    varianten: {
                        led: "5H1941036A",
                        iq_light: "5H1941036B"
                    }
                },
                rueckleuchte_vl: {
                    name: "Rückleuchte links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["5H0945095A", "5H0945095B"]
                },
                rueckleuchte_vr: {
                    name: "Rückleuchte rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["5H0945096A", "5H0945096B"]
                }
            }
        },

        // VW PASSAT B8 (2014-2023)
        passat_b8: {
            name: "Passat B8",
            baujahre: "2014-2023",
            typen: ["Limousine", "Variant", "GTE", "Alltrack"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["3G0823031A", "3G0823031B", "3G0823031C"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["3G0821105A", "3G0821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["3G0821106A", "3G0821106B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["3G0807221A", "3G0807221AGRU", "3G0807221BGRU"],
                    varianten: {
                        standard: "3G0807221A",
                        r_line: "3G0807221BGRU"
                    }
                },
                stossfaenger_hinten_limo: {
                    name: "Stoßfänger hinten (Limousine)",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["3G5807421A", "3G5807421AGRU"]
                },
                stossfaenger_hinten_var: {
                    name: "Stoßfänger hinten (Variant)",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["3G9807421A", "3G9807421AGRU"]
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["3G0853651A", "3G0853651AATL", "3G0853651BRYI"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["3G1941031A", "3G1941031B", "3G1941031C"],
                    varianten: {
                        halogen: "3G1941005A",
                        led: "3G1941031A",
                        matrix_led: "3G1941081A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["3G1941032A", "3G1941032B", "3G1941032C"],
                    varianten: {
                        halogen: "3G1941006A",
                        led: "3G1941032A",
                        matrix_led: "3G1941082A"
                    }
                },

                // AUSSENSPIEGEL
                aussenspiegel_vl: {
                    name: "Außenspiegel links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["3G1857507A", "3G1857507AF9B9", "3G1857507AH"]
                },
                aussenspiegel_vr: {
                    name: "Außenspiegel rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["3G2857508A", "3G2857508AF9B9", "3G2857508AH"]
                }
            }
        },

        // VW POLO 6 (AW) (2017-)
        polo_6: {
            name: "Polo VI (AW)",
            baujahre: "2017-",
            typen: ["Schrägheck", "GTI"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2G0823031A", "2G0823031B"],
                    material: "Stahl"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2G0821105A", "2G0821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2G0821106A", "2G0821106B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2G0807221A", "2G0807221AGRU"],
                    material: "Kunststoff"
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2G6807421A", "2G6807421AGRU"],
                    material: "Kunststoff"
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["2G0853651A", "2G0853651AATL"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2G1941005A", "2G1941031A"],
                    varianten: {
                        halogen: "2G1941005A",
                        led: "2G1941031A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2G1941006A", "2G1941032A"],
                    varianten: {
                        halogen: "2G1941006A",
                        led: "2G1941032A"
                    }
                }
            }
        },

        // VW TIGUAN 2 (AD) (2016-)
        tiguan_2: {
            name: "Tiguan II (AD)",
            baujahre: "2016-",
            typen: ["Standard", "Allspace", "R-Line", "R"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["5NA823031A", "5NA823031B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["5NA821105A", "5NA821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["5NA821106A", "5NA821106B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5NA807221A", "5NA807221AGRU", "5NA807221BGRU"],
                    varianten: {
                        standard: "5NA807221A",
                        r_line: "5NA807221BGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5NA807421A", "5NA807421AGRU"]
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["5NA853651A", "5NA853651AATL", "5NA853651BRYI"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5NB941005A", "5NB941031A", "5NB941081A"],
                    varianten: {
                        halogen: "5NB941005A",
                        led: "5NB941031A",
                        matrix_led: "5NB941081A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5NB941006A", "5NB941032A", "5NB941082A"],
                    varianten: {
                        halogen: "5NB941006A",
                        led: "5NB941032A",
                        matrix_led: "5NB941082A"
                    }
                }
            }
        },

        // VW T-ROC (A11) (2017-)
        t_roc: {
            name: "T-Roc (A11)",
            baujahre: "2017-",
            typen: ["Standard", "Cabriolet", "R-Line", "R"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2GA823031A", "2GA823031B"],
                    material: "Stahl"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2GA821105A", "2GA821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2GA821106A", "2GA821106B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2GA807221A", "2GA807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2GA807421A", "2GA807421AGRU"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2GA941005A", "2GA941031A"],
                    varianten: {
                        halogen: "2GA941005A",
                        led: "2GA941031A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2GA941006A", "2GA941032A"],
                    varianten: {
                        halogen: "2GA941006A",
                        led: "2GA941032A"
                    }
                }
            }
        }
    }
};

// ============================================
// BMW
// ============================================
ERSATZTEILE_DB.marken.bmw = {
    name: "BMW",
    kurzname: "BMW",
    modelle: {

        // BMW 3er F30/F31 (2011-2019)
        serie_3_f30: {
            name: "3er (F30/F31)",
            baujahre: "2011-2019",
            typen: ["Limousine (F30)", "Touring (F31)", "GT (F34)"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007314372", "41007314373"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357256343", "41357256344"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357256344", "41357256345"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117293815", "51117293816", "51117293817"],
                    varianten: {
                        basis: "51117293815",
                        sport: "51117293816",
                        m_sport: "51117293817"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127312725", "51127312726"],
                    varianten: {
                        basis: "51127312725",
                        m_sport: "51127312726"
                    }
                },

                // NIERE/KÜHLERGRILL
                niere_l: {
                    name: "Niere links",
                    kategorie: "kuehlergrill",
                    position: "vl",
                    oe_nummern: ["51137260497", "51137260498"],
                    varianten: {
                        chrom: "51137260497",
                        shadow: "51137260498"
                    }
                },
                niere_r: {
                    name: "Niere rechts",
                    kategorie: "kuehlergrill",
                    position: "vr",
                    oe_nummern: ["51137260498", "51137260499"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117339385", "63117339386", "63117339387"],
                    varianten: {
                        halogen: "63117339385",
                        xenon: "63117339386",
                        led: "63117339387"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117339388", "63117339389", "63117339390"],
                    varianten: {
                        halogen: "63117339388",
                        xenon: "63117339389",
                        led: "63117339390"
                    }
                },
                rueckleuchte_vl: {
                    name: "Rückleuchte links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["63217312845", "63217312846"]
                },
                rueckleuchte_vr: {
                    name: "Rückleuchte rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["63217312846", "63217312847"]
                },

                // AUSSENSPIEGEL
                aussenspiegel_vl: {
                    name: "Außenspiegel links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["51167285009", "51167285010"]
                },
                aussenspiegel_vr: {
                    name: "Außenspiegel rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["51167285010", "51167285011"]
                },
                spiegelglas_vl: {
                    name: "Spiegelglas links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["51167284995", "51167284996"]
                },
                spiegelglas_vr: {
                    name: "Spiegelglas rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["51167284996", "51167284997"]
                }
            }
        },

        // BMW 3er G20/G21 (2018-)
        serie_3_g20: {
            name: "3er (G20/G21)",
            baujahre: "2018-",
            typen: ["Limousine (G20)", "Touring (G21)"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007494941", "41007494942"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357464921", "41357464922"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357464922", "41357464923"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117469143", "51117469144"],
                    varianten: {
                        basis: "51117469143",
                        m_sport: "51117469144"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127469145", "51127469146"]
                },

                // NIERE
                niere_l: {
                    name: "Niere links",
                    kategorie: "kuehlergrill",
                    position: "vl",
                    oe_nummern: ["51138072085", "51138072086"]
                },
                niere_r: {
                    name: "Niere rechts",
                    kategorie: "kuehlergrill",
                    position: "vr",
                    oe_nummern: ["51138072086", "51138072087"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63118496141", "63118496142"],
                    varianten: {
                        led: "63118496141",
                        laser: "63118496142"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63118496143", "63118496144"],
                    varianten: {
                        led: "63118496143",
                        laser: "63118496144"
                    }
                }
            }
        },

        // BMW 5er F10/F11 (2010-2017)
        serie_5_f10: {
            name: "5er (F10/F11)",
            baujahre: "2010-2017",
            typen: ["Limousine (F10)", "Touring (F11)", "GT (F07)"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41617186754", "41617186755"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357186743", "41357186744"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357186745", "41357186746"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117285951", "51117285952", "51117285953"],
                    varianten: {
                        basis: "51117285951",
                        sport: "51117285952",
                        m_sport: "51117285953"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127285654", "51127285655"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117271911", "63117271912", "63117271913"],
                    varianten: {
                        halogen: "63117271911",
                        xenon: "63117271912",
                        led: "63117271913"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117271914", "63117271915", "63117271916"],
                    varianten: {
                        halogen: "63117271914",
                        xenon: "63117271915",
                        led: "63117271916"
                    }
                }
            }
        },

        // BMW X1 F48 (2015-)
        x1_f48: {
            name: "X1 (F48)",
            baujahre: "2015-",
            typen: ["xDrive", "sDrive", "M Sport"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007428769", "41007428770"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357428771", "41357428772"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357428773", "41357428774"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117422811", "51117422812"],
                    varianten: {
                        basis: "51117422811",
                        m_sport: "51117422812"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127422815", "51127422816"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117428709", "63117428710"],
                    varianten: {
                        halogen: "63117428709",
                        led: "63117428710"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117428711", "63117428712"],
                    varianten: {
                        halogen: "63117428711",
                        led: "63117428712"
                    }
                }
            }
        },

        // BMW X3 G01 (2017-)
        x3_g01: {
            name: "X3 (G01)",
            baujahre: "2017-",
            typen: ["xDrive", "M40i", "M Competition"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007436641", "41007436642"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357436643", "41357436644"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357436645", "41357436646"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117436651", "51117436652"],
                    varianten: {
                        basis: "51117436651",
                        m_sport: "51117436652"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127436653", "51127436654"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63118486861", "63118486862"],
                    varianten: {
                        led: "63118486861",
                        adaptive_led: "63118486862"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63118486863", "63118486864"],
                    varianten: {
                        led: "63118486863",
                        adaptive_led: "63118486864"
                    }
                }
            }
        },

        // BMW X5 G05 (2018-)
        x5_g05: {
            name: "X5 (G05)",
            baujahre: "2018-",
            typen: ["xDrive", "M50i", "M Competition"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007486941", "41007486942"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357486943", "41357486944"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357486945", "41357486946"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117486951", "51117486952"],
                    varianten: {
                        basis: "51117486951",
                        m_sport: "51117486952"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127486953", "51127486954"]
                },

                // NIERE (große Niere)
                niere_l: {
                    name: "Niere links",
                    kategorie: "kuehlergrill",
                    position: "vl",
                    oe_nummern: ["51138069605", "51138069606"],
                    hinweis: "Neue große Niere G05"
                },
                niere_r: {
                    name: "Niere rechts",
                    kategorie: "kuehlergrill",
                    position: "vr",
                    oe_nummern: ["51138069607", "51138069608"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63118486965", "63118486966"],
                    varianten: {
                        led: "63118486965",
                        laser: "63118486966"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63118486967", "63118486968"],
                    varianten: {
                        led: "63118486967",
                        laser: "63118486968"
                    }
                }
            }
        }
    }
};

// ============================================
// MERCEDES-BENZ
// ============================================
ERSATZTEILE_DB.marken.mercedes = {
    name: "Mercedes-Benz",
    kurzname: "MB",
    modelle: {

        // Mercedes A-Klasse W177 (2018-)
        a_klasse_w177: {
            name: "A-Klasse (W177)",
            baujahre: "2018-",
            typen: ["Standard", "AMG Line", "AMG A35", "AMG A45"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["A1778800000", "A1778800100"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["A1778810001", "A1778810101"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["A1778810002", "A1778810102"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["A1778850000", "A1778850100"],
                    varianten: {
                        basis: "A1778850000",
                        amg_line: "A1778850100"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["A1778850500", "A1778850600"]
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill (Diamantgrill)",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["A1778880000", "A1778880100"],
                    varianten: {
                        standard: "A1778880000",
                        amg: "A1778880100"
                    }
                },
                mercedes_stern: {
                    name: "Mercedes-Stern",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["A1778170016", "A1778170116"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["A1779060601", "A1779060701"],
                    varianten: {
                        led: "A1779060601",
                        multibeam: "A1779060701"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["A1779060602", "A1779060702"],
                    varianten: {
                        led: "A1779060602",
                        multibeam: "A1779060702"
                    }
                },
                rueckleuchte_vl: {
                    name: "Rückleuchte links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["A1779060301", "A1779060401"]
                },
                rueckleuchte_vr: {
                    name: "Rückleuchte rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["A1779060302", "A1779060402"]
                },

                // AUSSENSPIEGEL
                aussenspiegel_vl: {
                    name: "Außenspiegel links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["A1778100900", "A1778101000"]
                },
                aussenspiegel_vr: {
                    name: "Außenspiegel rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["A1778101100", "A1778101200"]
                }
            }
        },

        // Mercedes C-Klasse W206 (2021-)
        c_klasse_w206: {
            name: "C-Klasse (W206)",
            baujahre: "2021-",
            typen: ["Limousine", "T-Modell (S206)", "AMG Line", "AMG C43", "AMG C63"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["A2068800000", "A2068800100"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["A2068810001", "A2068810101"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["A2068810002", "A2068810102"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["A2068850000", "A2068850100"],
                    varianten: {
                        avantgarde: "A2068850000",
                        amg_line: "A2068850100"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["A2068850500", "A2068850600"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["A2069060601", "A2069060701"],
                    varianten: {
                        led: "A2069060601",
                        digital_light: "A2069060701"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["A2069060602", "A2069060702"],
                    varianten: {
                        led: "A2069060602",
                        digital_light: "A2069060702"
                    }
                }
            }
        },

        // Mercedes C-Klasse W205 (2014-2021)
        c_klasse_w205: {
            name: "C-Klasse (W205)",
            baujahre: "2014-2021",
            typen: ["Limousine", "T-Modell (S205)", "Coupé (C205)", "Cabrio (A205)"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["A2058800057", "A2058800157"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["A2058800018", "A2058800118"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["A2058800118", "A2058800218"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["A2058850025", "A2058850125", "A2058850225"],
                    varianten: {
                        classic: "A2058850025",
                        avantgarde: "A2058850125",
                        amg: "A2058850225"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["A2058852025", "A2058852125"]
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["A2058880023", "A2058880123"],
                    varianten: {
                        avantgarde: "A2058880023",
                        amg: "A2058880123"
                    }
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["A2059063401", "A2059063501", "A2059063601"],
                    varianten: {
                        halogen: "A2059063401",
                        led: "A2059063501",
                        multibeam: "A2059063601"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["A2059063402", "A2059063502", "A2059063602"],
                    varianten: {
                        halogen: "A2059063402",
                        led: "A2059063502",
                        multibeam: "A2059063602"
                    }
                }
            }
        },

        // Mercedes E-Klasse W213 (2016-)
        e_klasse_w213: {
            name: "E-Klasse (W213)",
            baujahre: "2016-",
            typen: ["Limousine", "T-Modell (S213)", "All-Terrain", "AMG E43", "AMG E53", "AMG E63"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["A2138800057", "A2138800157"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["A2138800018", "A2138800118"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["A2138800118", "A2138800218"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["A2138850025", "A2138850125"],
                    varianten: {
                        avantgarde: "A2138850025",
                        amg_line: "A2138850125"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["A2138852025", "A2138852125"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["A2139063301", "A2139063401", "A2139063501"],
                    varianten: {
                        led: "A2139063301",
                        multibeam: "A2139063401",
                        digital_light: "A2139063501"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["A2139063302", "A2139063402", "A2139063502"],
                    varianten: {
                        led: "A2139063302",
                        multibeam: "A2139063402",
                        digital_light: "A2139063502"
                    }
                }
            }
        },

        // Mercedes GLC X254 (2022-)
        glc_x254: {
            name: "GLC (X254)",
            baujahre: "2022-",
            typen: ["Standard", "Coupé", "AMG Line", "AMG GLC 43", "AMG GLC 63"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["A2548800000", "A2548800100"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["A2548810001", "A2548810101"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["A2548810002", "A2548810102"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["A2548850000", "A2548850100"],
                    varianten: {
                        standard: "A2548850000",
                        amg_line: "A2548850100"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["A2548850500", "A2548850600"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["A2549060601", "A2549060701"],
                    varianten: {
                        led: "A2549060601",
                        digital_light: "A2549060701"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["A2549060602", "A2549060702"],
                    varianten: {
                        led: "A2549060602",
                        digital_light: "A2549060702"
                    }
                }
            }
        }
    }
};

// ============================================
// AUDI
// ============================================
ERSATZTEILE_DB.marken.audi = {
    name: "Audi",
    kurzname: "Audi",
    modelle: {

        // Audi A3 8Y (2020-)
        a3_8y: {
            name: "A3 (8Y)",
            baujahre: "2020-",
            typen: ["Sportback", "Limousine", "S3", "RS3"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["8Y0823029A", "8Y0823029B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["8Y0821103A", "8Y0821103B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["8Y0821104A", "8Y0821104B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["8Y0807065A", "8Y0807065AGRU"],
                    varianten: {
                        basis: "8Y0807065A",
                        s_line: "8Y0807065AGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["8Y0807067A", "8Y0807067AGRU"]
                },

                // SINGLEFRAME
                singleframe: {
                    name: "Singleframe Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["8Y0853651A", "8Y0853651ATL"],
                    varianten: {
                        standard: "8Y0853651A",
                        s_line: "8Y0853651ATL"
                    }
                },
                audi_ringe_vorne: {
                    name: "Audi Ringe vorne",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["8Y0853605A2ZZ", "8Y0853605B2ZZ"]
                },
                audi_ringe_hinten: {
                    name: "Audi Ringe hinten",
                    kategorie: "heck",
                    position: "h",
                    oe_nummern: ["8Y0853742A2ZZ", "8Y0853742B2ZZ"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["8Y0941005A", "8Y0941005B"],
                    varianten: {
                        led: "8Y0941005A",
                        matrix_led: "8Y0941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["8Y0941006A", "8Y0941006B"],
                    varianten: {
                        led: "8Y0941006A",
                        matrix_led: "8Y0941006B"
                    }
                },
                rueckleuchte_vl: {
                    name: "Rückleuchte links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["8Y0945091A", "8Y0945091B"]
                },
                rueckleuchte_vr: {
                    name: "Rückleuchte rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["8Y0945092A", "8Y0945092B"]
                }
            }
        },

        // Audi A4 B9 (2015-)
        a4_b9: {
            name: "A4 (B9)",
            baujahre: "2015-",
            typen: ["Limousine", "Avant", "Allroad", "S4", "RS4"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["8W0823029A", "8W0823029B", "8W0823029C"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["8W0821103A", "8W0821103B"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["8W0821104A", "8W0821104B"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["8W0807065A", "8W0807065AGRU", "8W0807065BGRU"],
                    varianten: {
                        basis: "8W0807065A",
                        s_line: "8W0807065AGRU",
                        rs: "8W0807065BGRU"
                    }
                },
                stossfaenger_hinten_limo: {
                    name: "Stoßfänger hinten (Limousine)",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["8W5807067A", "8W5807067AGRU"]
                },
                stossfaenger_hinten_avant: {
                    name: "Stoßfänger hinten (Avant)",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["8W9807067A", "8W9807067AGRU"]
                },

                // SINGLEFRAME
                singleframe: {
                    name: "Singleframe Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["8W0853651A", "8W0853651ATL", "8W0853651BTL"],
                    varianten: {
                        standard: "8W0853651A",
                        s_line: "8W0853651ATL",
                        s4: "8W0853651BTL"
                    }
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["8W0941005A", "8W0941005B", "8W0941005C"],
                    varianten: {
                        halogen: "8W0941005A",
                        led: "8W0941005B",
                        matrix_led: "8W0941005C"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["8W0941006A", "8W0941006B", "8W0941006C"],
                    varianten: {
                        halogen: "8W0941006A",
                        led: "8W0941006B",
                        matrix_led: "8W0941006C"
                    }
                }
            }
        },

        // Audi A6 C8 (2018-)
        a6_c8: {
            name: "A6 (C8)",
            baujahre: "2018-",
            typen: ["Limousine", "Avant", "Allroad", "S6", "RS6"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["4K0823029A", "4K0823029B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["4K0821103A", "4K0821103B"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["4K0821104A", "4K0821104B"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["4K0807065A", "4K0807065AGRU"],
                    varianten: {
                        sport: "4K0807065A",
                        s_line: "4K0807065AGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["4K0807067A", "4K0807067AGRU"]
                },

                // SINGLEFRAME
                singleframe: {
                    name: "Singleframe Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["4K0853651A", "4K0853651ATL"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["4K0941005A", "4K0941005B", "4K0941005C"],
                    varianten: {
                        led: "4K0941005A",
                        hd_matrix: "4K0941005B",
                        laser: "4K0941005C"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["4K0941006A", "4K0941006B", "4K0941006C"],
                    varianten: {
                        led: "4K0941006A",
                        hd_matrix: "4K0941006B",
                        laser: "4K0941006C"
                    }
                }
            }
        },

        // Audi Q3 F3 (2018-)
        q3_f3: {
            name: "Q3 (F3)",
            baujahre: "2018-",
            typen: ["Standard", "Sportback", "S Line", "RS Q3"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["83A823029A", "83A823029B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["83A821103A", "83A821103B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["83A821104A", "83A821104B"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["83A807065A", "83A807065AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["83A807067A", "83A807067AGRU"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["83A941005A", "83A941005B"],
                    varianten: {
                        led: "83A941005A",
                        matrix_led: "83A941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["83A941006A", "83A941006B"],
                    varianten: {
                        led: "83A941006A",
                        matrix_led: "83A941006B"
                    }
                }
            }
        },

        // Audi Q5 FY (2016-)
        q5_fy: {
            name: "Q5 (FY)",
            baujahre: "2016-",
            typen: ["Standard", "Sportback", "S Line", "SQ5"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["80A823029A", "80A823029B"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["80A821103A", "80A821103B"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["80A821104A", "80A821104B"],
                    material: "Aluminium"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["80A807065A", "80A807065AGRU", "80A807065BGRU"],
                    varianten: {
                        basis: "80A807065A",
                        s_line: "80A807065AGRU",
                        sq5: "80A807065BGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["80A807067A", "80A807067AGRU"]
                },

                // SINGLEFRAME
                singleframe: {
                    name: "Singleframe Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["80A853651A", "80A853651ATL"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["80A941005A", "80A941005B", "80A941005C"],
                    varianten: {
                        led: "80A941005A",
                        matrix_led: "80A941005B",
                        hd_matrix: "80A941005C"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["80A941006A", "80A941006B", "80A941006C"],
                    varianten: {
                        led: "80A941006A",
                        matrix_led: "80A941006B",
                        hd_matrix: "80A941006C"
                    }
                }
            }
        }
    }
};

// ============================================
// OPEL
// ============================================
ERSATZTEILE_DB.marken.opel = {
    name: "Opel",
    kurzname: "Opel",
    modelle: {

        // Opel Corsa F (2019-)
        corsa_f: {
            name: "Corsa F",
            baujahre: "2019-",
            typen: ["Standard", "GS Line", "Corsa-e"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["9826609080", "9826609180"],
                    material: "Stahl"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["9826608580", "9826608680"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["9826608780", "9826608880"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9826610280", "9826610380"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9826610480", "9826610580"]
                },

                // KÜHLERGRILL
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["9826611080", "9826611180"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9826614080", "9826614180"],
                    varianten: {
                        halogen: "9826614080",
                        led: "9826614180"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9826614280", "9826614380"],
                    varianten: {
                        halogen: "9826614280",
                        led: "9826614380"
                    }
                }
            }
        },

        // Opel Astra L (2021-)
        astra_l: {
            name: "Astra L",
            baujahre: "2021-",
            typen: ["5-Türer", "Sports Tourer", "GS Line", "Astra-e"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["9841282080", "9841282180"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["9841281580", "9841281680"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["9841281780", "9841281880"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9841284080", "9841284180"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9841284280", "9841284380"]
                },

                // SCHEINWERFER (Vizor-Design)
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9841287080", "9841287180"],
                    varianten: {
                        led: "9841287080",
                        intellilux: "9841287180"
                    },
                    hinweis: "Vizor-Design mit durchgehendem LED-Band"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9841287280", "9841287380"],
                    varianten: {
                        led: "9841287280",
                        intellilux: "9841287380"
                    }
                }
            }
        },

        // Opel Astra K (2015-2021)
        astra_k: {
            name: "Astra K",
            baujahre: "2015-2021",
            typen: ["5-Türer", "Sports Tourer", "OPC Line"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["39095620", "39095621"],
                    material: "Stahl"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["39095530", "39095531"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["39095540", "39095541"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["39095850", "39095851"],
                    varianten: {
                        standard: "39095850",
                        opc_line: "39095851"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["39095860", "39095861"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["39095920", "39095921", "39095922"],
                    varianten: {
                        halogen: "39095920",
                        led: "39095921",
                        intellilux: "39095922"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["39095930", "39095931", "39095932"],
                    varianten: {
                        halogen: "39095930",
                        led: "39095931",
                        intellilux: "39095932"
                    }
                }
            }
        },

        // Opel Insignia B (2017-)
        insignia_b: {
            name: "Insignia B",
            baujahre: "2017-",
            typen: ["Grand Sport", "Sports Tourer", "Country Tourer", "GSi"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["39115120", "39115121"],
                    material: "Aluminium"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["39115030", "39115031"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["39115040", "39115041"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["39115350", "39115351"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["39115360", "39115361"]
                },

                // SCHEINWERFER
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["39115420", "39115421", "39115422"],
                    varianten: {
                        halogen: "39115420",
                        led: "39115421",
                        intellilux: "39115422"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["39115430", "39115431", "39115432"],
                    varianten: {
                        halogen: "39115430",
                        led: "39115431",
                        intellilux: "39115432"
                    }
                }
            }
        },

        // Opel Mokka B (2020-)
        mokka_b: {
            name: "Mokka B",
            baujahre: "2020-",
            typen: ["Standard", "GS Line", "Mokka-e"],
            teile: {
                // MOTORHAUBE
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["9827409080", "9827409180"],
                    material: "Stahl"
                },

                // KOTFLÜGEL
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["9827408580", "9827408680"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["9827408780", "9827408880"],
                    material: "Stahl"
                },

                // STOSSFÄNGER
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9827410280", "9827410380"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9827410480", "9827410580"]
                },

                // SCHEINWERFER (Vizor-Design)
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9827414080", "9827414180"],
                    varianten: {
                        led: "9827414080",
                        intellilux: "9827414180"
                    },
                    hinweis: "Vizor-Design"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9827414280", "9827414380"],
                    varianten: {
                        led: "9827414280",
                        intellilux: "9827414380"
                    }
                }
            }
        }
    }
};

// ============================================
// FORD
// ============================================
ERSATZTEILE_DB.marken.ford = {
    name: "Ford",
    kurzname: "Ford",
    modelle: {

        // Ford Fiesta MK8 (2017-2023)
        fiesta_mk8: {
            name: "Fiesta MK8",
            baujahre: "2017-2023",
            typen: ["3-Türer", "5-Türer", "ST-Line", "ST", "Active"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2289955", "H1BB-16612-A", "H1BB-16612-B"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2171281", "H1BB-16016-A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2171282", "H1BB-16015-A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2171395", "H1BB-17757-A", "H1BB-17757-B"],
                    varianten: {
                        standard: "H1BB-17757-A",
                        st_line: "H1BB-17757-B"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2171396", "H1BB-17K823-A"]
                },
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["2171420", "H1BB-8200-A", "H1BB-8200-B"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2171350", "H1BB-13W030-A", "H1BB-13W030-B"],
                    varianten: {
                        halogen: "H1BB-13W030-A",
                        led: "H1BB-13W030-B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2171351", "H1BB-13W029-A", "H1BB-13W029-B"],
                    varianten: {
                        halogen: "H1BB-13W029-A",
                        led: "H1BB-13W029-B"
                    }
                },
                rueckleuchte_hl: {
                    name: "Rückleuchte hinten links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["2171360", "H1BB-13405-A"]
                },
                rueckleuchte_hr: {
                    name: "Rückleuchte hinten rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["2171361", "H1BB-13404-A"]
                },
                aussenspiegel_vl: {
                    name: "Außenspiegel links",
                    kategorie: "spiegel",
                    position: "vl",
                    oe_nummern: ["2171320", "H1BB-17683-A"]
                },
                aussenspiegel_vr: {
                    name: "Außenspiegel rechts",
                    kategorie: "spiegel",
                    position: "vr",
                    oe_nummern: ["2171321", "H1BB-17682-A"]
                }
            }
        },

        // Ford Focus MK4 (2018-)
        focus_mk4: {
            name: "Focus MK4",
            baujahre: "2018-",
            typen: ["5-Türer", "Turnier", "ST-Line", "ST", "Active"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2406855", "JX7B-16612-A"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2406781", "JX7B-16016-A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2406782", "JX7B-16015-A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2406895", "JX7B-17757-A", "JX7B-17757-B"],
                    varianten: {
                        standard: "JX7B-17757-A",
                        st_line: "JX7B-17757-B"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2406896", "JX7B-17K823-A"]
                },
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["2406920", "JX7B-8200-A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2406850", "JX7B-13W030-A", "JX7B-13W030-B"],
                    varianten: {
                        halogen: "JX7B-13W030-A",
                        led: "JX7B-13W030-B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2406851", "JX7B-13W029-A", "JX7B-13W029-B"],
                    varianten: {
                        halogen: "JX7B-13W029-A",
                        led: "JX7B-13W029-B"
                    }
                }
            }
        },

        // Ford Kuga MK3 (2019-)
        kuga_mk3: {
            name: "Kuga MK3",
            baujahre: "2019-",
            typen: ["Standard", "ST-Line", "Vignale", "PHEV"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2422455", "LV4B-16612-A"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2422381", "LV4B-16016-A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2422382", "LV4B-16015-A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2422495", "LV4B-17757-A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2422496", "LV4B-17K823-A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2422450", "LV4B-13W030-A", "LV4B-13W030-B"],
                    varianten: {
                        led: "LV4B-13W030-A",
                        matrix_led: "LV4B-13W030-B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2422451", "LV4B-13W029-A", "LV4B-13W029-B"],
                    varianten: {
                        led: "LV4B-13W029-A",
                        matrix_led: "LV4B-13W029-B"
                    }
                }
            }
        },

        // Ford Puma (2019-)
        puma: {
            name: "Puma",
            baujahre: "2019-",
            typen: ["Standard", "ST-Line", "ST", "Titanium"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["2428155", "L1TB-16612-A"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["2428081", "L1TB-16016-A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["2428082", "L1TB-16015-A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["2428195", "L1TB-17757-A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["2428196", "L1TB-17K823-A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["2428150", "L1TB-13W030-A"],
                    varianten: {
                        led: "L1TB-13W030-A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["2428151", "L1TB-13W029-A"],
                    varianten: {
                        led: "L1TB-13W029-A"
                    }
                }
            }
        }
    }
};

// ============================================
// SKODA
// ============================================
ERSATZTEILE_DB.marken.skoda = {
    name: "Škoda",
    kurzname: "Skoda",
    modelle: {

        // Skoda Fabia MK4 (NJ) (2021-)
        fabia_nj: {
            name: "Fabia IV (NJ)",
            baujahre: "2021-",
            typen: ["Standard", "Monte Carlo", "Style"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["6VA823031A", "6VA823031B"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["6VA821105A", "6VA821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["6VA821106A", "6VA821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["6VA807221A", "6VA807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["6VA807421A", "6VA807421AGRU"]
                },
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["6VA853651A", "6VA853651AATL"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["6VA941015A", "6VA941015B"],
                    varianten: {
                        led: "6VA941015A",
                        matrix_led: "6VA941015B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["6VA941016A", "6VA941016B"],
                    varianten: {
                        led: "6VA941016A",
                        matrix_led: "6VA941016B"
                    }
                }
            }
        },

        // Skoda Octavia MK4 (NX) (2019-)
        octavia_nx: {
            name: "Octavia IV (NX)",
            baujahre: "2019-",
            typen: ["Schrägheck", "Combi", "RS", "Scout"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["5E3823031A", "5E3823031B"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["5E3821105A", "5E3821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["5E3821106A", "5E3821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5E3807221A", "5E3807221AGRU", "5E3807221BGRU"],
                    varianten: {
                        standard: "5E3807221A",
                        sportline: "5E3807221AGRU",
                        rs: "5E3807221BGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5E5807421A", "5E9807421A"]
                },
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["5E3853651A", "5E3853651AATL"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5E3941015A", "5E3941015B", "5E3941015C"],
                    varianten: {
                        led: "5E3941015A",
                        matrix_led: "5E3941015B",
                        matrix_led_plus: "5E3941015C"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5E3941016A", "5E3941016B", "5E3941016C"],
                    varianten: {
                        led: "5E3941016A",
                        matrix_led: "5E3941016B",
                        matrix_led_plus: "5E3941016C"
                    }
                },
                rueckleuchte_hl: {
                    name: "Rückleuchte hinten links",
                    kategorie: "beleuchtung",
                    position: "hl",
                    oe_nummern: ["5E3945095A", "5E3945095B"]
                },
                rueckleuchte_hr: {
                    name: "Rückleuchte hinten rechts",
                    kategorie: "beleuchtung",
                    position: "hr",
                    oe_nummern: ["5E3945096A", "5E3945096B"]
                }
            }
        },

        // Skoda Superb MK3 (3V) (2015-)
        superb_3v: {
            name: "Superb III (3V)",
            baujahre: "2015-",
            typen: ["Limousine", "Combi", "Sportline", "L&K"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["3V0823031A", "3V0823031B"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["3V0821105A", "3V0821105B"],
                    material: "Aluminium"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["3V0821106A", "3V0821106B"],
                    material: "Aluminium"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["3V0807221A", "3V0807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["3V5807421A", "3V9807421A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["3V1941015A", "3V1941015B"],
                    varianten: {
                        led: "3V1941015A",
                        matrix_led: "3V1941015B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["3V1941016A", "3V1941016B"],
                    varianten: {
                        led: "3V1941016A",
                        matrix_led: "3V1941016B"
                    }
                }
            }
        },

        // Skoda Kodiaq (NS) (2016-)
        kodiaq_ns: {
            name: "Kodiaq (NS)",
            baujahre: "2016-",
            typen: ["Standard", "Sportline", "Scout", "RS"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["565823031A", "565823031B"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["565821105A", "565821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["565821106A", "565821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["565807221A", "565807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["565807421A", "565807421AGRU"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["566941015A", "566941015B"],
                    varianten: {
                        led: "566941015A",
                        matrix_led: "566941015B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["566941016A", "566941016B"],
                    varianten: {
                        led: "566941016A",
                        matrix_led: "566941016B"
                    }
                }
            }
        }
    }
};

// ============================================
// SEAT
// ============================================
ERSATZTEILE_DB.marken.seat = {
    name: "SEAT",
    kurzname: "Seat",
    modelle: {

        // Seat Ibiza MK5 (KJ) (2017-)
        ibiza_kj: {
            name: "Ibiza V (KJ)",
            baujahre: "2017-",
            typen: ["Standard", "FR", "Xcellence"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["6F0823031A", "6F0823031B"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["6F0821105A", "6F0821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["6F0821106A", "6F0821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["6F0807221A", "6F0807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["6F0807421A", "6F0807421AGRU"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["6F1941005A", "6F1941005B"],
                    varianten: {
                        halogen: "6F1941005A",
                        led: "6F1941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["6F1941006A", "6F1941006B"],
                    varianten: {
                        halogen: "6F1941006A",
                        led: "6F1941006B"
                    }
                }
            }
        },

        // Seat Leon MK4 (KL) (2020-)
        leon_kl: {
            name: "Leon IV (KL)",
            baujahre: "2020-",
            typen: ["5-Türer", "Sportstourer", "FR", "Cupra"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["5FA823031A", "5FA823031B"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["5FA821105A", "5FA821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["5FA821106A", "5FA821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["5FA807221A", "5FA807221AGRU"],
                    varianten: {
                        standard: "5FA807221A",
                        fr: "5FA807221AGRU"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["5FA807421A", "5FA807421AGRU"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["5FA941005A", "5FA941005B"],
                    varianten: {
                        led: "5FA941005A",
                        matrix_led: "5FA941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["5FA941006A", "5FA941006B"],
                    varianten: {
                        led: "5FA941006A",
                        matrix_led: "5FA941006B"
                    }
                }
            }
        },

        // Seat Ateca (KH) (2016-)
        ateca_kh: {
            name: "Ateca (KH)",
            baujahre: "2016-",
            typen: ["Standard", "FR", "Xcellence", "Cupra"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["575823031A", "575823031B"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["575821105A", "575821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["575821106A", "575821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["575807221A", "575807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["575807421A", "575807421AGRU"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["576941005A", "576941005B"],
                    varianten: {
                        led: "576941005A",
                        full_led: "576941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["576941006A", "576941006B"],
                    varianten: {
                        led: "576941006A",
                        full_led: "576941006B"
                    }
                }
            }
        },

        // Seat Arona (KJ7) (2017-)
        arona_kj7: {
            name: "Arona (KJ7)",
            baujahre: "2017-",
            typen: ["Standard", "FR", "Xcellence"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["6F9823031A", "6F9823031B"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["6F9821105A", "6F9821105B"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["6F9821106A", "6F9821106B"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["6F9807221A", "6F9807221AGRU"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["6F9807421A", "6F9807421AGRU"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["6F9941005A", "6F9941005B"],
                    varianten: {
                        halogen: "6F9941005A",
                        led: "6F9941005B"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["6F9941006A", "6F9941006B"],
                    varianten: {
                        halogen: "6F9941006A",
                        led: "6F9941006B"
                    }
                }
            }
        }
    }
};

// ============================================
// TOYOTA
// ============================================
ERSATZTEILE_DB.marken.toyota = {
    name: "Toyota",
    kurzname: "Toyota",
    modelle: {

        // Toyota Yaris XP210 (2020-)
        yaris_xp210: {
            name: "Yaris (XP210)",
            baujahre: "2020-",
            typen: ["Standard", "Hybrid", "GR Sport"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["53301-K0030", "53301-K0031"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["53812-K0030", "53812-K0031"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["53811-K0030", "53811-K0031"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["52119-K0946", "52119-K0947"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["52159-K0946", "52159-K0947"]
                },
                kuehlergrill: {
                    name: "Kühlergrill",
                    kategorie: "kuehlergrill",
                    position: "v",
                    oe_nummern: ["53101-K0170", "53101-K0171"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["81170-K0050", "81170-K0051"],
                    varianten: {
                        halogen: "81170-K0050",
                        led: "81170-K0051"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["81130-K0050", "81130-K0051"],
                    varianten: {
                        halogen: "81130-K0050",
                        led: "81130-K0051"
                    }
                }
            }
        },

        // Toyota Corolla E210 (2018-)
        corolla_e210: {
            name: "Corolla (E210)",
            baujahre: "2018-",
            typen: ["Schrägheck", "Touring Sports", "Limousine", "GR Sport"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["53301-12A30", "53301-12A31"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["53812-12A40", "53812-12A41"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["53811-12A40", "53811-12A41"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["52119-12D80", "52119-12D81"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["52159-12D60", "52159-12D61"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["81170-12M80", "81170-12M81"],
                    varianten: {
                        led: "81170-12M80",
                        bi_led: "81170-12M81"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["81130-12M80", "81130-12M81"],
                    varianten: {
                        led: "81130-12M80",
                        bi_led: "81130-12M81"
                    }
                }
            }
        },

        // Toyota RAV4 XA50 (2018-)
        rav4_xa50: {
            name: "RAV4 (XA50)",
            baujahre: "2018-",
            typen: ["Standard", "Hybrid", "Plug-in Hybrid", "Adventure"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["53301-42150", "53301-42151"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["53812-42240", "53812-42241"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["53811-42240", "53811-42241"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["52119-42410", "52119-42411"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["52159-42220", "52159-42221"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["81170-42720", "81170-42721"],
                    varianten: {
                        led: "81170-42720",
                        triple_beam: "81170-42721"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["81130-42720", "81130-42721"],
                    varianten: {
                        led: "81130-42720",
                        triple_beam: "81130-42721"
                    }
                }
            }
        },

        // Toyota C-HR AX10/AX50 (2016-)
        c_hr_ax: {
            name: "C-HR (AX10/AX50)",
            baujahre: "2016-",
            typen: ["Standard", "Hybrid", "GR Sport"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["53301-F4030", "53301-F4031"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["53812-F4030", "53812-F4031"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["53811-F4030", "53811-F4031"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["52119-F4050", "52119-F4051"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["52159-F4040", "52159-F4041"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["81170-F4020", "81170-F4021"],
                    varianten: {
                        led: "81170-F4020",
                        bi_led: "81170-F4021"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["81130-F4020", "81130-F4021"],
                    varianten: {
                        led: "81130-F4020",
                        bi_led: "81130-F4021"
                    }
                }
            }
        }
    }
};

// ============================================
// HYUNDAI
// ============================================
ERSATZTEILE_DB.marken.hyundai = {
    name: "Hyundai",
    kurzname: "Hyundai",
    modelle: {

        // Hyundai i20 GB (2020-)
        i20_gb: {
            name: "i20 (GB)",
            baujahre: "2020-",
            typen: ["Standard", "N Line", "N"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-Q0000", "66400-Q0010"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-Q0000", "66311-Q0010"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-Q0000", "66321-Q0010"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-Q0000", "86511-Q0010"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-Q0000", "86611-Q0010"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-Q0000", "92101-Q0010"],
                    varianten: {
                        halogen: "92101-Q0000",
                        led: "92101-Q0010"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-Q0000", "92102-Q0010"],
                    varianten: {
                        halogen: "92102-Q0000",
                        led: "92102-Q0010"
                    }
                }
            }
        },

        // Hyundai i30 PD (2017-)
        i30_pd: {
            name: "i30 (PD)",
            baujahre: "2017-",
            typen: ["5-Türer", "Kombi", "Fastback", "N Line", "N"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-G4000", "66400-G4100"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-G4000", "66311-G4100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-G4000", "66321-G4100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-G4000", "86511-G4100", "86511-G4200"],
                    varianten: {
                        standard: "86511-G4000",
                        n_line: "86511-G4100",
                        n: "86511-G4200"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-G4000", "86611-G4100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-G4000", "92101-G4100"],
                    varianten: {
                        halogen: "92101-G4000",
                        led: "92101-G4100"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-G4000", "92102-G4100"],
                    varianten: {
                        halogen: "92102-G4000",
                        led: "92102-G4100"
                    }
                }
            }
        },

        // Hyundai Tucson NX4 (2020-)
        tucson_nx4: {
            name: "Tucson (NX4)",
            baujahre: "2020-",
            typen: ["Standard", "Hybrid", "Plug-in Hybrid", "N Line"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-N9000", "66400-N9100"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-N9000", "66311-N9100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-N9000", "66321-N9100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-N9000", "86511-N9100"],
                    hinweis: "Parametric Hidden Lights Design"
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-N9000", "86611-N9100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links (versteckt)",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-N9000", "92101-N9100"],
                    hinweis: "Parametric Hidden Lights"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts (versteckt)",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-N9000", "92102-N9100"],
                    hinweis: "Parametric Hidden Lights"
                }
            }
        },

        // Hyundai Kona OS (2017-)
        kona_os: {
            name: "Kona (OS)",
            baujahre: "2017-",
            typen: ["Standard", "Hybrid", "Elektro", "N Line", "N"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-J9000", "66400-J9100"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-J9000", "66311-J9100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-J9000", "66321-J9100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-J9000", "86511-J9100"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-J9000", "86611-J9100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-J9000", "92101-J9100"],
                    varianten: {
                        halogen: "92101-J9000",
                        led: "92101-J9100"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-J9000", "92102-J9100"],
                    varianten: {
                        halogen: "92102-J9000",
                        led: "92102-J9100"
                    }
                }
            }
        }
    }
};

// ============================================
// KIA
// ============================================
ERSATZTEILE_DB.marken.kia = {
    name: "Kia",
    kurzname: "Kia",
    modelle: {

        // Kia Rio YB (2017-)
        rio_yb: {
            name: "Rio (YB)",
            baujahre: "2017-",
            typen: ["Standard", "GT-Line"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-H8000", "66400-H8100"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-H8000", "66311-H8100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-H8000", "66321-H8100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-H8000", "86511-H8100"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-H8000", "86611-H8100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-H8000", "92101-H8100"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-H8000", "92102-H8100"]
                }
            }
        },

        // Kia Ceed CD (2018-)
        ceed_cd: {
            name: "Ceed (CD)",
            baujahre: "2018-",
            typen: ["5-Türer", "Sportswagon", "ProCeed", "GT-Line", "GT"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-J7000", "66400-J7100"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-J7000", "66311-J7100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-J7000", "66321-J7100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-J7000", "86511-J7100", "86511-J7200"],
                    varianten: {
                        standard: "86511-J7000",
                        gt_line: "86511-J7100",
                        gt: "86511-J7200"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-J7000", "86611-J7100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-J7000", "92101-J7100"],
                    varianten: {
                        halogen: "92101-J7000",
                        led: "92101-J7100"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-J7000", "92102-J7100"],
                    varianten: {
                        halogen: "92102-J7000",
                        led: "92102-J7100"
                    }
                }
            }
        },

        // Kia Sportage NQ5 (2021-)
        sportage_nq5: {
            name: "Sportage (NQ5)",
            baujahre: "2021-",
            typen: ["Standard", "Hybrid", "Plug-in Hybrid", "GT-Line"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-P1000", "66400-P1100"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-P1000", "66311-P1100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-P1000", "66321-P1100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-P1000", "86511-P1100"],
                    hinweis: "Tiger-Nose Design"
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-P1000", "86611-P1100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-P1000", "92101-P1100"],
                    varianten: {
                        led: "92101-P1000",
                        led_premium: "92101-P1100"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-P1000", "92102-P1100"],
                    varianten: {
                        led: "92102-P1000",
                        led_premium: "92102-P1100"
                    }
                }
            }
        },

        // Kia Niro DE (2022-)
        niro_de: {
            name: "Niro (DE)",
            baujahre: "2022-",
            typen: ["Hybrid", "Plug-in Hybrid", "EV"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["66400-AT000", "66400-AT100"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["66311-AT000", "66311-AT100"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["66321-AT000", "66321-AT100"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["86511-AT000", "86511-AT100"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["86611-AT000", "86611-AT100"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["92101-AT000", "92101-AT100"],
                    varianten: {
                        led: "92101-AT000",
                        led_premium: "92101-AT100"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["92102-AT000", "92102-AT100"],
                    varianten: {
                        led: "92102-AT000",
                        led_premium: "92102-AT100"
                    }
                }
            }
        }
    }
};

// ============================================
// RENAULT
// ============================================
ERSATZTEILE_DB.marken.renault = {
    name: "Renault",
    kurzname: "Renault",
    modelle: {

        // Renault Clio V (2019-)
        clio_v: {
            name: "Clio V",
            baujahre: "2019-",
            typen: ["Standard", "RS Line", "E-Tech Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["651000399R", "651000400R"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["631010756R", "631010757R"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["631019096R", "631019097R"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["620227434R", "620227435R"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["850220419R", "850220420R"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["260605839R", "260605840R"],
                    varianten: {
                        halogen: "260605839R",
                        led: "260605840R"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["260100914R", "260100915R"],
                    varianten: {
                        halogen: "260100914R",
                        led: "260100915R"
                    }
                }
            }
        },

        // Renault Megane IV (2015-)
        megane_iv: {
            name: "Mégane IV",
            baujahre: "2015-",
            typen: ["Schrägheck", "Grandtour", "RS", "E-Tech"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["651002779R", "651002780R"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["631011932R", "631011933R"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["631015889R", "631015890R"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["620227122R", "620227123R"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["850227856R", "850227857R"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["260607019R", "260607020R"],
                    varianten: {
                        halogen: "260607019R",
                        led: "260607020R"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["260101962R", "260101963R"],
                    varianten: {
                        halogen: "260101962R",
                        led: "260101963R"
                    }
                }
            }
        },

        // Renault Captur II (2019-)
        captur_ii: {
            name: "Captur II",
            baujahre: "2019-",
            typen: ["Standard", "RS Line", "E-Tech Plug-in Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["651008937R", "651008938R"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["631015451R", "631015452R"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["631019789R", "631019790R"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["620229478R", "620229479R"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["850225411R", "850225412R"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["260608124R", "260608125R"],
                    varianten: {
                        led: "260608124R",
                        matrix_led: "260608125R"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["260103089R", "260103090R"],
                    varianten: {
                        led: "260103089R",
                        matrix_led: "260103090R"
                    }
                }
            }
        },

        // Renault Kadjar (2015-)
        kadjar: {
            name: "Kadjar",
            baujahre: "2015-",
            typen: ["Standard", "Bose Edition", "Black Edition"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["651006312R", "651006313R"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["631014125R", "631014126R"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["631018062R", "631018063R"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["620220356R", "620220357R"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["850228521R", "850228522R"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["260606978R", "260606979R"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["260101635R", "260101636R"]
                }
            }
        }
    }
};

// ============================================
// PEUGEOT
// ============================================
ERSATZTEILE_DB.marken.peugeot = {
    name: "Peugeot",
    kurzname: "Peugeot",
    modelle: {

        // Peugeot 208 II (2019-)
        peugeot_208_ii: {
            name: "208 II",
            baujahre: "2019-",
            typen: ["Standard", "GT Line", "e-208"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["7901Q4", "7901Q5"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["7841S4", "7841S5"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["7841T4", "7841T5"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9824598780", "9824598880"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9824599780", "9824599880"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9823155780", "9823155880"],
                    varianten: {
                        led: "9823155780",
                        matrix_led: "9823155880"
                    },
                    hinweis: "3-Krallen LED Signatur"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9823155980", "9823156080"],
                    varianten: {
                        led: "9823155980",
                        matrix_led: "9823156080"
                    }
                }
            }
        },

        // Peugeot 308 III (2021-)
        peugeot_308_iii: {
            name: "308 III",
            baujahre: "2021-",
            typen: ["5-Türer", "SW", "GT", "PHEV"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["7901S8", "7901S9"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["7841V8", "7841V9"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["7841W8", "7841W9"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9840689080", "9840689180"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9840690080", "9840690180"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9840655080", "9840655180"],
                    varianten: {
                        led: "9840655080",
                        matrix_led: "9840655180"
                    },
                    hinweis: "Neue 3-Krallen LED Signatur"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9840655280", "9840655380"],
                    varianten: {
                        led: "9840655280",
                        matrix_led: "9840655380"
                    }
                }
            }
        },

        // Peugeot 3008 II (2016-)
        peugeot_3008_ii: {
            name: "3008 II",
            baujahre: "2016-",
            typen: ["Standard", "GT", "GT Line", "Hybrid", "Hybrid4"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["7901L7", "7901L8"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["7841N7", "7841N8"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["7841P7", "7841P8"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9807844480", "9807844580"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9807845480", "9807845580"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9807241480", "9807241580"],
                    varianten: {
                        led: "9807241480",
                        full_led: "9807241580"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9807241680", "9807241780"],
                    varianten: {
                        led: "9807241680",
                        full_led: "9807241780"
                    }
                }
            }
        },

        // Peugeot 5008 II (2017-)
        peugeot_5008_ii: {
            name: "5008 II",
            baujahre: "2017-",
            typen: ["Standard", "GT", "Allure", "Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["7901M4", "7901M5"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["7841Q4", "7841Q5"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["7841R4", "7841R5"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["9811089680", "9811089780"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["9811090680", "9811090780"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["9809743480", "9809743580"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["9809743680", "9809743780"]
                }
            }
        }
    }
};

// ============================================
// FIAT
// ============================================
ERSATZTEILE_DB.marken.fiat = {
    name: "Fiat",
    kurzname: "Fiat",
    modelle: {

        // Fiat 500 (312) (2007-)
        fiat_500_312: {
            name: "500 (312)",
            baujahre: "2007-",
            typen: ["Standard", "Sport", "Lounge", "500e"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["51881254", "51881255"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["51881201", "51881202"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["51881203", "51881204"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["735456739", "735456740"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["735456745", "735456746"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["51881289", "51881290"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["51881291", "51881292"]
                }
            }
        },

        // Fiat Panda (319) (2011-)
        panda_319: {
            name: "Panda (319)",
            baujahre: "2011-",
            typen: ["Standard", "Cross", "City Cross", "Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["51888814", "51888815"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["51888801", "51888802"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["51888803", "51888804"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["735525609", "735525610"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["735525615", "735525616"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["51888845", "51888846"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["51888847", "51888848"]
                }
            }
        },

        // Fiat Tipo (356) (2015-)
        tipo_356: {
            name: "Tipo (356)",
            baujahre: "2015-",
            typen: ["Schrägheck", "Kombi", "Limousine", "Cross"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["52056514", "52056515"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["52056501", "52056502"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["52056503", "52056504"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["735639109", "735639110"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["735639115", "735639116"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["52056545", "52056546"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["52056547", "52056548"]
                }
            }
        },

        // Fiat 500X (334) (2014-)
        fiat_500x_334: {
            name: "500X (334)",
            baujahre: "2014-",
            typen: ["Standard", "Cross", "Sport"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["52016914", "52016915"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["52016901", "52016902"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["52016903", "52016904"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["735610309", "735610310"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["735610315", "735610316"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["52016945", "52016946"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["52016947", "52016948"]
                }
            }
        }
    }
};

// ============================================
// MAZDA
// ============================================
ERSATZTEILE_DB.marken.mazda = {
    name: "Mazda",
    kurzname: "Mazda",
    modelle: {

        // Mazda 2 DJ (2014-)
        mazda2_dj: {
            name: "Mazda2 (DJ)",
            baujahre: "2014-",
            typen: ["Standard", "Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["DA6A-52-31X", "DA6A-52-31XA"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["DA6A-52-211", "DA6A-52-211A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["DA6A-52-111", "DA6A-52-111A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["DA6A-50-031", "DA6A-50-031A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["DA6A-50-221", "DA6A-50-221A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["DA6A-51-041", "DA6A-51-041A"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["DA6A-51-031", "DA6A-51-031A"]
                }
            }
        },

        // Mazda 3 BP (2019-)
        mazda3_bp: {
            name: "Mazda3 (BP)",
            baujahre: "2019-",
            typen: ["Schrägheck", "Limousine", "Skyactiv-X"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["BCKA-52-31X", "BCKA-52-31XA"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["BCKA-52-211", "BCKA-52-211A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["BCKA-52-111", "BCKA-52-111A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["BCKA-50-031", "BCKA-50-031A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["BCKA-50-221", "BCKA-50-221A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["BCKA-51-041", "BCKA-51-041A"],
                    varianten: {
                        led: "BCKA-51-041",
                        matrix_led: "BCKA-51-041A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["BCKA-51-031", "BCKA-51-031A"],
                    varianten: {
                        led: "BCKA-51-031",
                        matrix_led: "BCKA-51-031A"
                    }
                }
            }
        },

        // Mazda CX-3 DK (2015-)
        cx3_dk: {
            name: "CX-3 (DK)",
            baujahre: "2015-",
            typen: ["Standard", "Exclusive-Line"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["DA6C-52-31X", "DA6C-52-31XA"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["DA6C-52-211", "DA6C-52-211A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["DA6C-52-111", "DA6C-52-111A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["DA6C-50-031", "DA6C-50-031A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["DA6C-50-221", "DA6C-50-221A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["DA6C-51-041", "DA6C-51-041A"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["DA6C-51-031", "DA6C-51-031A"]
                }
            }
        },

        // Mazda CX-5 KF (2017-)
        cx5_kf: {
            name: "CX-5 (KF)",
            baujahre: "2017-",
            typen: ["Standard", "Exclusive-Line", "Sports-Line"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["KB7W-52-31X", "KB7W-52-31XA"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["KB7W-52-211", "KB7W-52-211A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["KB7W-52-111", "KB7W-52-111A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["KB7W-50-031", "KB7W-50-031A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["KB7W-50-221", "KB7W-50-221A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["KB7W-51-041", "KB7W-51-041A"],
                    varianten: {
                        led: "KB7W-51-041",
                        adaptive_led: "KB7W-51-041A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["KB7W-51-031", "KB7W-51-031A"],
                    varianten: {
                        led: "KB7W-51-031",
                        adaptive_led: "KB7W-51-031A"
                    }
                }
            }
        }
    }
};

// ============================================
// NISSAN
// ============================================
ERSATZTEILE_DB.marken.nissan = {
    name: "Nissan",
    kurzname: "Nissan",
    modelle: {

        // Nissan Micra K14 (2016-)
        micra_k14: {
            name: "Micra (K14)",
            baujahre: "2016-",
            typen: ["Standard", "N-Sport", "N-Design"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["65100-5FA0A", "65100-5FA1A"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["63101-5FA0A", "63101-5FA1A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["63100-5FA0A", "63100-5FA1A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["62022-5FA0A", "62022-5FA1A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["85022-5FA0A", "85022-5FA1A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["26060-5FA0A", "26060-5FA1A"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["26010-5FA0A", "26010-5FA1A"]
                }
            }
        },

        // Nissan Qashqai J12 (2021-)
        qashqai_j12: {
            name: "Qashqai (J12)",
            baujahre: "2021-",
            typen: ["Standard", "N-Connecta", "Tekna", "e-Power"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["65100-6MA0A", "65100-6MA1A"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["63101-6MA0A", "63101-6MA1A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["63100-6MA0A", "63100-6MA1A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["62022-6MA0A", "62022-6MA1A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["85022-6MA0A", "85022-6MA1A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["26060-6MA0A", "26060-6MA1A"],
                    varianten: {
                        led: "26060-6MA0A",
                        matrix_led: "26060-6MA1A"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["26010-6MA0A", "26010-6MA1A"],
                    varianten: {
                        led: "26010-6MA0A",
                        matrix_led: "26010-6MA1A"
                    }
                }
            }
        },

        // Nissan Juke F16 (2019-)
        juke_f16: {
            name: "Juke (F16)",
            baujahre: "2019-",
            typen: ["Standard", "N-Connecta", "Tekna", "Nismo"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["65100-6PA0A", "65100-6PA1A"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["63101-6PA0A", "63101-6PA1A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["63100-6PA0A", "63100-6PA1A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["62022-6PA0A", "62022-6PA1A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["85022-6PA0A", "85022-6PA1A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["26060-6PA0A", "26060-6PA1A"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["26010-6PA0A", "26010-6PA1A"]
                }
            }
        },

        // Nissan X-Trail T33 (2022-)
        xtrail_t33: {
            name: "X-Trail (T33)",
            baujahre: "2022-",
            typen: ["Standard", "N-Connecta", "Tekna", "e-Power"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["65100-6TA0A", "65100-6TA1A"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["63101-6TA0A", "63101-6TA1A"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["63100-6TA0A", "63100-6TA1A"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["62022-6TA0A", "62022-6TA1A"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["85022-6TA0A", "85022-6TA1A"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["26060-6TA0A", "26060-6TA1A"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["26010-6TA0A", "26010-6TA1A"]
                }
            }
        }
    }
};

// ============================================
// HONDA
// ============================================
ERSATZTEILE_DB.marken.honda = {
    name: "Honda",
    kurzname: "Honda",
    modelle: {

        // Honda Jazz GR (2020-)
        jazz_gr: {
            name: "Jazz (GR)",
            baujahre: "2020-",
            typen: ["Standard", "Crosstar", "e:HEV Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["60100-T5A-A00ZZ", "60100-T5A-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["60261-T5A-A00ZZ", "60261-T5A-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["60211-T5A-A00ZZ", "60211-T5A-A01ZZ"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["04711-T5A-A00ZZ", "04711-T5A-A01ZZ"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["04715-T5A-A00ZZ", "04715-T5A-A01ZZ"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["33150-T5A-A01", "33150-T5A-A02"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["33100-T5A-A01", "33100-T5A-A02"]
                }
            }
        },

        // Honda Civic FC/FK (2017-)
        civic_fc: {
            name: "Civic (FC/FK)",
            baujahre: "2017-",
            typen: ["Schrägheck", "Limousine", "Type R", "e:HEV"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["60100-TGH-A00ZZ", "60100-TGH-A01ZZ"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["60261-TGH-A00ZZ", "60261-TGH-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["60211-TGH-A00ZZ", "60211-TGH-A01ZZ"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["04711-TGH-A00ZZ", "04711-TGH-A01ZZ"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["04715-TGH-A00ZZ", "04715-TGH-A01ZZ"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["33150-TGH-A01", "33150-TGH-A02"],
                    varianten: {
                        led: "33150-TGH-A01",
                        full_led: "33150-TGH-A02"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["33100-TGH-A01", "33100-TGH-A02"],
                    varianten: {
                        led: "33100-TGH-A01",
                        full_led: "33100-TGH-A02"
                    }
                }
            }
        },

        // Honda HR-V RV (2021-)
        hrv_rv: {
            name: "HR-V (RV)",
            baujahre: "2021-",
            typen: ["Standard", "Advance", "e:HEV Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["60100-T7W-A00ZZ", "60100-T7W-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["60261-T7W-A00ZZ", "60261-T7W-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["60211-T7W-A00ZZ", "60211-T7W-A01ZZ"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["04711-T7W-A00ZZ", "04711-T7W-A01ZZ"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["04715-T7W-A00ZZ", "04715-T7W-A01ZZ"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["33150-T7W-A01", "33150-T7W-A02"]
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["33100-T7W-A01", "33100-T7W-A02"]
                }
            }
        },

        // Honda CR-V RW (2017-)
        crv_rw: {
            name: "CR-V (RW)",
            baujahre: "2017-",
            typen: ["Standard", "Elegance", "Executive", "e:HEV Hybrid"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["60100-TLA-A00ZZ", "60100-TLA-A01ZZ"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["60261-TLA-A00ZZ", "60261-TLA-A01ZZ"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["60211-TLA-A00ZZ", "60211-TLA-A01ZZ"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["04711-TLA-A00ZZ", "04711-TLA-A01ZZ"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["04715-TLA-A00ZZ", "04715-TLA-A01ZZ"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["33150-TLA-A01", "33150-TLA-A02"],
                    varianten: {
                        led: "33150-TLA-A01",
                        full_led: "33150-TLA-A02"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["33100-TLA-A01", "33100-TLA-A02"],
                    varianten: {
                        led: "33100-TLA-A01",
                        full_led: "33100-TLA-A02"
                    }
                }
            }
        }
    }
};

// ============================================
// VOLVO
// ============================================
ERSATZTEILE_DB.marken.volvo = {
    name: "Volvo",
    kurzname: "Volvo",
    modelle: {

        // Volvo V40 (2012-2019)
        v40: {
            name: "V40",
            baujahre: "2012-2019",
            typen: ["Standard", "Cross Country", "T5", "D4"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["31278560", "31278561"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["31278550", "31278551"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["31278552", "31278553"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["31323503", "31323504"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["31323510", "31323511"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["31278580", "31278581"],
                    varianten: {
                        halogen: "31278580",
                        led: "31278581"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["31278582", "31278583"],
                    varianten: {
                        halogen: "31278582",
                        led: "31278583"
                    }
                }
            }
        },

        // Volvo V60 II (2018-)
        v60_ii: {
            name: "V60 II",
            baujahre: "2018-",
            typen: ["Standard", "Cross Country", "Polestar Engineered", "Recharge"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["31425380", "31425381"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["31425370", "31425371"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["31425372", "31425373"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["31433603", "31433604"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["31433610", "31433611"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["31425400", "31425401"],
                    hinweis: "Thor's Hammer LED Design"
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["31425402", "31425403"],
                    hinweis: "Thor's Hammer LED Design"
                }
            }
        },

        // Volvo XC40 (2017-)
        xc40: {
            name: "XC40",
            baujahre: "2017-",
            typen: ["Standard", "R-Design", "Inscription", "Recharge"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["31457840", "31457841"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["31457830", "31457831"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["31457832", "31457833"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["31463503", "31463504"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["31463510", "31463511"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["31457860", "31457861"],
                    varianten: {
                        led: "31457860",
                        pixel_led: "31457861"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["31457862", "31457863"],
                    varianten: {
                        led: "31457862",
                        pixel_led: "31457863"
                    }
                }
            }
        },

        // Volvo XC60 II (2017-)
        xc60_ii: {
            name: "XC60 II",
            baujahre: "2017-",
            typen: ["Momentum", "R-Design", "Inscription", "Polestar Engineered", "Recharge"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["31425440", "31425441"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["31425430", "31425431"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["31425432", "31425433"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["31433703", "31433704"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["31433710", "31433711"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["31425460", "31425461"],
                    varianten: {
                        led: "31425460",
                        pixel_led: "31425461"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts (Thor's Hammer)",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["31425462", "31425463"],
                    varianten: {
                        led: "31425462",
                        pixel_led: "31425463"
                    }
                }
            }
        }
    }
};

// ============================================
// MINI
// ============================================
ERSATZTEILE_DB.marken.mini = {
    name: "MINI",
    kurzname: "Mini",
    modelle: {

        // Mini Cooper F56 (2014-)
        cooper_f56: {
            name: "Cooper (F56)",
            baujahre: "2014-",
            typen: ["One", "Cooper", "Cooper S", "John Cooper Works"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007388701", "41007388702"],
                    material: "Stahl"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357388711", "41357388712"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357388713", "41357388714"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117388720", "51117388721"],
                    varianten: {
                        standard: "51117388720",
                        jcw: "51117388721"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127388730", "51127388731"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117388741", "63117388742"],
                    varianten: {
                        halogen: "63117388741",
                        led: "63117388742"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117388743", "63117388744"],
                    varianten: {
                        halogen: "63117388743",
                        led: "63117388744"
                    }
                }
            }
        },

        // Mini Clubman F54 (2015-)
        clubman_f54: {
            name: "Clubman (F54)",
            baujahre: "2015-",
            typen: ["One", "Cooper", "Cooper S", "Cooper SD", "John Cooper Works"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007425801", "41007425802"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357425811", "41357425812"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357425813", "41357425814"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117425820", "51117425821"]
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127425830", "51127425831"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117425841", "63117425842"],
                    varianten: {
                        led: "63117425841",
                        adaptive_led: "63117425842"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117425843", "63117425844"],
                    varianten: {
                        led: "63117425843",
                        adaptive_led: "63117425844"
                    }
                }
            }
        },

        // Mini Countryman F60 (2017-)
        countryman_f60: {
            name: "Countryman (F60)",
            baujahre: "2017-",
            typen: ["One", "Cooper", "Cooper S", "Cooper SE", "John Cooper Works"],
            teile: {
                motorhaube: {
                    name: "Motorhaube",
                    kategorie: "motorhaube",
                    oe_nummern: ["41007429901", "41007429902"],
                    material: "Aluminium"
                },
                kotfluegel_vl: {
                    name: "Kotflügel vorne links",
                    kategorie: "kotfluegel",
                    position: "vl",
                    oe_nummern: ["41357429911", "41357429912"],
                    material: "Stahl"
                },
                kotfluegel_vr: {
                    name: "Kotflügel vorne rechts",
                    kategorie: "kotfluegel",
                    position: "vr",
                    oe_nummern: ["41357429913", "41357429914"],
                    material: "Stahl"
                },
                stossfaenger_vorne: {
                    name: "Stoßfänger vorne",
                    kategorie: "stossfaenger",
                    position: "v",
                    oe_nummern: ["51117429920", "51117429921"],
                    varianten: {
                        standard: "51117429920",
                        all4: "51117429921"
                    }
                },
                stossfaenger_hinten: {
                    name: "Stoßfänger hinten",
                    kategorie: "stossfaenger",
                    position: "h",
                    oe_nummern: ["51127429930", "51127429931"]
                },
                scheinwerfer_vl: {
                    name: "Scheinwerfer vorne links",
                    kategorie: "beleuchtung",
                    position: "vl",
                    oe_nummern: ["63117429941", "63117429942"],
                    varianten: {
                        led: "63117429941",
                        adaptive_led: "63117429942"
                    }
                },
                scheinwerfer_vr: {
                    name: "Scheinwerfer vorne rechts",
                    kategorie: "beleuchtung",
                    position: "vr",
                    oe_nummern: ["63117429943", "63117429944"],
                    varianten: {
                        led: "63117429943",
                        adaptive_led: "63117429944"
                    }
                }
            }
        }
    }
};

// ============================================
// HILFSFUNKTIONEN FÜR DIE SUCHE
// ============================================

/**
 * Sucht Ersatzteile nach OE-Nummer
 * @param {string} oeNummer - Die OE-Nummer (kann partial sein)
 * @returns {Array} - Liste der gefundenen Teile
 */
ERSATZTEILE_DB.sucheNachOeNummer = function(oeNummer) {
    const ergebnisse = [];
    const suchbegriff = oeNummer.toUpperCase().replace(/[\s\-]/g, '');

    for (const [markenKey, marke] of Object.entries(this.marken)) {
        for (const [modellKey, modell] of Object.entries(marke.modelle)) {
            for (const [teilKey, teil] of Object.entries(modell.teile)) {
                for (const oe of teil.oe_nummern) {
                    if (oe.toUpperCase().replace(/[\s\-]/g, '').includes(suchbegriff)) {
                        ergebnisse.push({
                            marke: marke.name,
                            modell: modell.name,
                            baujahre: modell.baujahre,
                            teil: teil.name,
                            kategorie: teil.kategorie,
                            position: teil.position,
                            oe_nummer: oe,
                            alle_oe_nummern: teil.oe_nummern,
                            varianten: teil.varianten,
                            material: teil.material,
                            hinweis: teil.hinweis
                        });
                        break; // Nur ein Treffer pro Teil
                    }
                }
            }
        }
    }

    return ergebnisse;
};

/**
 * Sucht Ersatzteile nach Name
 * @param {string} suchbegriff - Der Suchbegriff
 * @returns {Array} - Liste der gefundenen Teile
 */
ERSATZTEILE_DB.sucheNachName = function(suchbegriff) {
    const ergebnisse = [];
    const suche = suchbegriff.toLowerCase();

    for (const [markenKey, marke] of Object.entries(this.marken)) {
        for (const [modellKey, modell] of Object.entries(marke.modelle)) {
            for (const [teilKey, teil] of Object.entries(modell.teile)) {
                if (teil.name.toLowerCase().includes(suche)) {
                    ergebnisse.push({
                        marke: marke.name,
                        modell: modell.name,
                        baujahre: modell.baujahre,
                        teil: teil.name,
                        kategorie: teil.kategorie,
                        position: teil.position,
                        oe_nummern: teil.oe_nummern,
                        varianten: teil.varianten,
                        material: teil.material,
                        hinweis: teil.hinweis
                    });
                }
            }
        }
    }

    return ergebnisse;
};

/**
 * Gibt alle Teile für ein bestimmtes Fahrzeug zurück
 * @param {string} marke - Markenname
 * @param {string} modell - Modellname
 * @returns {Array} - Liste aller Teile
 */
ERSATZTEILE_DB.getTeileNachFahrzeug = function(marke, modell) {
    const ergebnisse = [];
    const suchMarke = marke.toLowerCase();
    const suchModell = modell.toLowerCase();

    for (const [markenKey, markeObj] of Object.entries(this.marken)) {
        if (markeObj.name.toLowerCase().includes(suchMarke) ||
            markeObj.kurzname.toLowerCase().includes(suchMarke)) {

            for (const [modellKey, modellObj] of Object.entries(markeObj.modelle)) {
                if (modellObj.name.toLowerCase().includes(suchModell)) {

                    for (const [teilKey, teil] of Object.entries(modellObj.teile)) {
                        ergebnisse.push({
                            marke: markeObj.name,
                            modell: modellObj.name,
                            baujahre: modellObj.baujahre,
                            typen: modellObj.typen,
                            teil: teil.name,
                            kategorie: teil.kategorie,
                            position: teil.position,
                            oe_nummern: teil.oe_nummern,
                            varianten: teil.varianten,
                            material: teil.material,
                            hinweis: teil.hinweis
                        });
                    }
                }
            }
        }
    }

    return ergebnisse;
};

/**
 * Gibt Statistiken zur Datenbank zurück
 * @returns {Object} - Statistiken
 */
ERSATZTEILE_DB.getStatistiken = function() {
    let markenAnzahl = 0;
    let modelleAnzahl = 0;
    let teileAnzahl = 0;
    let oeNummernAnzahl = 0;

    for (const marke of Object.values(this.marken)) {
        markenAnzahl++;
        for (const modell of Object.values(marke.modelle)) {
            modelleAnzahl++;
            for (const teil of Object.values(modell.teile)) {
                teileAnzahl++;
                oeNummernAnzahl += teil.oe_nummern.length;
            }
        }
    }

    return {
        marken: markenAnzahl,
        modelle: modelleAnzahl,
        teile: teileAnzahl,
        oeNummern: oeNummernAnzahl
    };
};

// Export für Node.js / Modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ERSATZTEILE_DB;
}

// Globaler Export für Browser
if (typeof window !== 'undefined') {
    window.ERSATZTEILE_DB = ERSATZTEILE_DB;
}

// Statistiken ausgeben
const stats = ERSATZTEILE_DB.getStatistiken();
console.log('✅ Ersatzteile-Datenbank geladen:',
    stats.marken, 'Marken,',
    stats.modelle, 'Modelle,',
    stats.teile, 'Teile,',
    stats.oeNummern, 'OE-Nummern'
);
