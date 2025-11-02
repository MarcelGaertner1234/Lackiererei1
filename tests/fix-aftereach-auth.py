#!/usr/bin/env python3
"""
RUN #70: Fix afterEach() Authentication Issue

Problem: afterEach() cleanup läuft OHNE Authentifizierung nach page.goto()
Lösung: Füge loginAsTestAdmin() zu afterEach() hinzu NACH waitForFirebaseReady()

Dateien zum Updaten:
- 01-vehicle-intake.spec.js
- 02-partner-flow.spec.js
- 03-kanban-drag-drop.spec.js (braucht auch beforeAll!)
- 04-edge-cases.spec.js
- 05-transaction-failure.spec.js (braucht auch beforeAll!)
- 06-cascade-delete-race.spec.js (braucht auch beforeAll!)
- 07-service-consistency-v32.spec.js (braucht auch beforeAll!)
"""

import os
import re

# Test-Dateien zum Updaten
test_files = [
    '01-vehicle-intake.spec.js',
    '02-partner-flow.spec.js',
    '03-kanban-drag-drop.spec.js',
    '04-edge-cases.spec.js',
    '05-transaction-failure.spec.js',
    '06-cascade-delete-race.spec.js',
    '07-service-consistency-v32.spec.js'
]

# Basis-Pfad
base_path = '/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App/tests'

def add_auth_to_aftereach(file_path):
    """Füge loginAsTestAdmin() zu afterEach() Hooks hinzu"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Strategie: Finde alle test.afterEach Blöcke und prüfe ob loginAsTestAdmin fehlt
    # Falls ja, füge es NACH waitForFirebaseReady ein

    lines = content.split('\n')
    result_lines = []
    in_aftereach = False
    aftereach_block = []
    brace_count = 0

    for i, line in enumerate(lines):
        if 'test.afterEach(async ({ page }) => {' in line:
            in_aftereach = True
            aftereach_block = [line]
            brace_count = 1
        elif in_aftereach:
            aftereach_block.append(line)

            # Zähle geschweifte Klammern um Ende zu finden
            brace_count += line.count('{')
            brace_count -= line.count('}')

            if brace_count == 0 and '});' in line:
                # Ende des afterEach Blocks
                in_aftereach = False

                # Prüfe ob loginAsTestAdmin fehlt
                block_text = '\n'.join(aftereach_block)

                if 'loginAsTestAdmin' not in block_text:
                    # Finde waitForFirebaseReady Zeile und füge danach ein
                    modified_block = []
                    for block_line in aftereach_block:
                        modified_block.append(block_line)

                        if 'await waitForFirebaseReady(page);' in block_line:
                            # Füge Authentifizierungs-Zeile DANACH ein
                            indent = ' ' * 4  # afterEach body hat 4 Leerzeichen Einrückung
                            modified_block.append(f'{indent}await loginAsTestAdmin(page);')

                    result_lines.extend(modified_block)
                else:
                    # Hat bereits Auth, behalte wie es ist
                    result_lines.extend(aftereach_block)

                aftereach_block = []
        else:
            result_lines.append(line)

    modified_content = '\n'.join(result_lines)

    # Schreibe nur zurück wenn sich was geändert hat
    if modified_content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        return True

    return False

def add_beforeall_if_missing(file_path):
    """Füge beforeAll() Authentifizierungs-Hook hinzu falls fehlend"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Prüfe ob bereits beforeAll mit loginAsTestAdmin vorhanden
    if 'test.beforeAll' in content and 'loginAsTestAdmin' in content:
        return False  # Hat es bereits

    # Finde test.describe Block und füge beforeAll VOR erstem test.beforeEach oder test() ein
    lines = content.split('\n')
    result_lines = []
    inserted = False

    for i, line in enumerate(lines):
        # Suche nach erstem test.beforeEach oder test( oder test.afterEach innerhalb test.describe
        if not inserted and ('test.beforeEach(' in line or 'test(' in line or 'test.afterEach(' in line):
            # Füge beforeAll VOR dieser Zeile ein
            indent = ' ' * 2  # Innerhalb test.describe
            result_lines.append('')
            result_lines.append(f'{indent}// RUN #70: Login als Test-Admin VOR allen Tests (ermöglicht Firestore-Zugriff)')
            result_lines.append(f'{indent}test.beforeAll(async ({{ page }}) => {{')
            result_lines.append(f'{indent}  await page.goto(\'/annahme.html\');')
            result_lines.append(f'{indent}  await waitForFirebaseReady(page);')
            result_lines.append(f'{indent}  await loginAsTestAdmin(page);')
            result_lines.append(f'{indent}  console.log(\'✅ RUN #70: Test-Suite als Admin authentifiziert\');')
            result_lines.append(f'{indent}}});')
            result_lines.append('')
            inserted = True

        result_lines.append(line)

    if inserted:
        modified_content = '\n'.join(result_lines)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        return True

    return False

# Haupt-Ausführung
print('🔧 RUN #70: Fixe afterEach() Authentifizierungs-Problem\n')

files_modified = []
files_skipped = []

for test_file in test_files:
    file_path = os.path.join(base_path, test_file)

    if not os.path.exists(file_path):
        print(f'⚠️  Datei nicht gefunden: {test_file}')
        continue

    print(f'📄 Verarbeite: {test_file}')

    # Schritt 1: Füge beforeAll() hinzu falls fehlend
    beforeall_added = add_beforeall_if_missing(file_path)
    if beforeall_added:
        print(f'   ✅ beforeAll() Hook hinzugefügt')
    else:
        print(f'   ✓  beforeAll() bereits vorhanden')

    # Schritt 2: Füge Auth zu afterEach() hinzu
    aftereach_modified = add_auth_to_aftereach(file_path)
    if aftereach_modified:
        print(f'   ✅ loginAsTestAdmin() zu afterEach() hinzugefügt')
        files_modified.append(test_file)
    else:
        print(f'   ✓  afterEach() hat bereits Auth oder keine Änderungen nötig')
        files_skipped.append(test_file)

    print()

print('\n' + '='*80)
print('ZUSAMMENFASSUNG')
print('='*80)
print(f'✅ Dateien geändert: {len(files_modified)}')
for f in files_modified:
    print(f'   - {f}')

if files_skipped:
    print(f'\n✓  Dateien übersprungen (keine Änderungen): {len(files_skipped)}')
    for f in files_skipped:
        print(f'   - {f}')

print('\n🎯 Nächster Schritt: Starte Tests neu mit:')
print('   cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"')
print('   npm test 2>&1 | tee test-output-RUN70.log')
