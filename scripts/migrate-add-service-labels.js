#!/usr/bin/env node

/**
 * Migration Script: Add serviceLabels to Partner Anfragen
 *
 * This script migrates existing partnerAnfragen documents in Firestore
 * to add the missing `serviceLabels` array field.
 *
 * Usage:
 *   node scripts/migrate-add-service-labels.js [--dry-run] [--werkstatt=mosbach]
 *
 * Options:
 *   --dry-run     Test migration without writing to Firestore
 *   --werkstatt   Specify werkstatt ID (default: mosbach)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const werkstattArg = args.find(arg => arg.startsWith('--werkstatt='));
const werkstattId = werkstattArg ? werkstattArg.split('=')[1] : 'mosbach';

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'auto-lackierzentrum-mosbach'
});

const db = admin.firestore();

// Statistics
const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
};

// Color output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString('de-DE');
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logHeader() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}${colors.cyan}Migration: Add serviceLabels to Partner Anfragen${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`Mode:      ${isDryRun ? colors.yellow + 'DRY RUN' : colors.green + 'LIVE'}${colors.reset}`);
    console.log(`Werkstatt: ${werkstattId}`);
    console.log(`Collection: partnerAnfragen_${werkstattId}`);
    console.log('='.repeat(70) + '\n');
}

async function migrateAnfrage(doc) {
    const anfrage = doc.data();
    const anfrageId = doc.id;

    try {
        // Check if serviceLabels already exists
        if (anfrage.serviceLabels && anfrage.serviceLabels.length > 0) {
            log(`Übersprungen: ${anfrageId} (serviceLabels bereits vorhanden: ${JSON.stringify(anfrage.serviceLabels)})`, 'blue');
            stats.skipped++;
            return;
        }

        // Check if serviceTyp exists
        if (!anfrage.serviceTyp) {
            log(`⚠️ Warning: ${anfrageId} hat kein serviceTyp, verwende 'lackier' als Default`, 'yellow');
            anfrage.serviceTyp = 'lackier';
        }

        // Create serviceLabels array
        const serviceLabels = [anfrage.serviceTyp];

        if (isDryRun) {
            log(`[DRY RUN] Würde migrieren: ${anfrageId} → serviceLabels: ${JSON.stringify(serviceLabels)}`, 'yellow');
            stats.migrated++;
        } else {
            // Write to Firestore
            await doc.ref.update({
                serviceLabels: serviceLabels,
                migrated: admin.firestore.FieldValue.serverTimestamp()
            });
            log(`✅ Migriert: ${anfrageId} → serviceLabels: ${JSON.stringify(serviceLabels)}`, 'green');
            stats.migrated++;
        }
    } catch (error) {
        log(`❌ Fehler bei ${anfrageId}: ${error.message}`, 'red');
        stats.errors++;
    }
}

async function runMigration() {
    logHeader();

    try {
        log('🚀 Migration gestartet...', 'cyan');

        // Get all anfragen for this werkstatt
        const collectionName = `partnerAnfragen_${werkstattId}`;
        const snapshot = await db.collection(collectionName).get();

        stats.total = snapshot.size;
        log(`📊 ${stats.total} Anfragen gefunden in ${collectionName}`, 'cyan');

        if (stats.total === 0) {
            log('⚠️ Keine Anfragen gefunden. Migration abgebrochen.', 'yellow');
            return;
        }

        // Process each anfrage
        let processed = 0;
        for (const doc of snapshot.docs) {
            await migrateAnfrage(doc);
            processed++;

            // Progress update every 10 documents
            if (processed % 10 === 0) {
                log(`Progress: ${processed}/${stats.total} (${Math.round((processed / stats.total) * 100)}%)`, 'blue');
            }
        }

        // Final Summary
        console.log('\n' + '='.repeat(70));
        console.log(`${colors.bright}${colors.green}✅ Migration abgeschlossen!${colors.reset}`);
        console.log('='.repeat(70));
        console.log(`Modus:          ${isDryRun ? 'DRY RUN (keine Änderungen geschrieben)' : 'LIVE MODE (Daten wurden migriert)'}`);
        console.log(`Total Anfragen: ${stats.total}`);
        console.log(`${colors.green}Migriert:       ${stats.migrated}${colors.reset}`);
        console.log(`${colors.blue}Übersprungen:   ${stats.skipped}${colors.reset} (hatten bereits serviceLabels)`);
        console.log(`${colors.red}Fehler:         ${stats.errors}${colors.reset}`);
        console.log('='.repeat(70));

        if (isDryRun) {
            console.log(`\n${colors.yellow}💡 Tipp: Führe das Script ohne --dry-run aus um die Änderungen zu schreiben.${colors.reset}`);
            console.log(`Beispiel: node scripts/migrate-add-service-labels.js --werkstatt=${werkstattId}\n`);
        } else {
            console.log(`\n${colors.green}✅ Migration erfolgreich! Alle Anfragen haben jetzt serviceLabels.${colors.reset}\n`);
        }

    } catch (error) {
        console.error(`\n${colors.red}❌ FEHLER: ${error.message}${colors.reset}\n`);
        console.error(error);
        process.exit(1);
    } finally {
        // Cleanup
        await admin.app().delete();
    }
}

// Run migration
runMigration().catch(error => {
    console.error(`\n${colors.red}❌ CRITICAL ERROR: ${error.message}${colors.reset}\n`);
    console.error(error);
    process.exit(1);
});
