#!/usr/bin/env python3
"""
Predictive Bug Detection
Vorhersage von potentiellen Bugs basierend auf Code-Mustern und Historie.

Usage:
    python3 .claude/world-model/predict-bugs.py [file]
    python3 .claude/world-model/predict-bugs.py --scan-all
"""

import json
import sys
import re
import os
import fnmatch
from pathlib import Path
from collections import defaultdict

WORLD_MODEL_DIR = Path(__file__).parent
PROJECT_ROOT = WORLD_MODEL_DIR.parent.parent

# ============================================================================
# EXCLUDE-LISTEN - Diese Dateien/Verzeichnisse werden NICHT gescannt
# ============================================================================
EXCLUDE_DIRS = [
    'node_modules',
    '.claude',
    'libs/',
    'functions/',      # Server-Side Code (Node.js) - kein window.getCollection()
    'tests/',          # Test-Code nutzt Admin SDK
    'backups/',        # Alte Backup-Dateien
    '.git-backup',
]

EXCLUDE_FILE_PATTERNS = [
    'migrate-*.html',   # Einmalige Migration Scripts
    '*backup*.html',    # Backup-Dateien
    '* 2.html',         # Duplikate
    '* 2.js',
    '* 3.json',
]

# ============================================================================
# GLOBALE COLLECTIONS - Diese dürfen db.collection() verwenden
# ============================================================================
GLOBAL_COLLECTIONS = [
    'users',
    'settings',
    'partners',
    'partner',           # Singular auch erlaubt
    'partnerAutoLoginTokens',
    'email_logs',
    'audit_logs',
    'systemLogs',
    'openai_usage',
    'whisper_logs',
    'ai_logs',
    'ersatzteile',       # Globale Ersatzteile-Datenbank
    'leihfahrzeugPool',  # Globaler Pool
    'leihfahrzeugAnfragen',  # Globale Anfragen
]

# ============================================================================
# DATEI-SPEZIFISCHE AUSNAHMEN - Diese Dateien haben spezielle Gründe
# ============================================================================
SPECIAL_FILE_EXCEPTIONS = [
    'debug-urlaubsanfragen.js',  # Debug-Script für Entwicklung
    'check_request.js',           # Debug-Script
    'scripts/',                   # Alle Scripts im scripts/ Ordner
]

# ============================================================================
# KOMMENTAR-PATTERNS - Zeilen mit diesen Kommentaren werden ignoriert
# ============================================================================
IGNORE_COMMENT_PATTERNS = [
    r'//\s*GLOBAL\s*collection',     # // GLOBAL collection
    r'//\s*🔧\s*FIX',                 # // 🔧 FIX (bereits gefixt)
    r'//\s*OK:',                       # // OK: ...
    r'//\s*CORRECT',                   # // CORRECT
    r'Fallback',                       # Fallback-Queries für alte Daten
    r'alte\s*Migration',               # Migration-Fallbacks
    r'FALLBACK',                       # FALLBACK comments
]

# Bug-Patterns basierend auf historischen Learnings
BUG_PATTERNS = {
    'multi_tenant_violation': {
        'pattern': r'db\.collection\s*\(',
        'exclude_files': ['firebase-config.js'],
        'severity': 'CRITICAL',
        'message': 'Direkter db.collection() Zugriff - Multi-Tenant Violation!',
        'fix': 'Ersetze durch window.getCollection()',
        'check_global_collections': True,  # Prüfe ob globale Collection
    },
    'missing_await_firebase': {
        'pattern': r'(?<!await\s)window\.firebaseInitialized',
        'severity': 'HIGH',
        'message': 'Fehlendes await vor firebaseInitialized',
        'fix': 'Füge await hinzu: await window.firebaseInitialized',
        'exclude_line_patterns': [
            r'if\s*\(',              # if-Conditions sind OK
            r'while\s*\(',           # while-Loops sind OK
            r'&&',                   # Boolean-Checks sind OK
            r'\|\|',                 # Boolean-Checks sind OK
            r'!window\.firebase',    # Negation-Checks sind OK
            r'//.*firebase',         # Kommentare ignorieren
            r'console\.(log|error|warn)',  # Logs ignorieren
            r'=\s*new\s+Promise',    # Definitionen ignorieren
            r'=\s*(true|false)',     # Assignments ignorieren
            r'Promise\.race',        # Bereits awaited
            r':\s*window\.firebase',  # Object literal property
        ]
    },
    'unsafe_radio_button': {
        'pattern': r'querySelector\([^)]*:checked[^)]*\)\.value',
        'severity': 'HIGH',
        'message': 'Unsicherer Radio-Button Zugriff ohne Null-Check',
        'fix': 'Verwende: querySelector(...)?.value || "default"'
    },
    'deprecated_substr': {
        'pattern': r'\.substr\s*\(',
        'severity': 'MEDIUM',
        'message': 'Deprecated substr() Methode',
        'fix': 'Ersetze durch substring() - Achtung: andere Semantik!'
    },
    'unsafe_array_access': {
        'pattern': r'\[\s*\d+\s*\]\.(?!length)',
        'severity': 'MEDIUM',
        'message': 'Array-Zugriff ohne Bounds-Check',
        'fix': 'Füge Bounds-Check hinzu oder verwende ?.'
    },
    'missing_listener_cleanup': {
        'pattern': r'onSnapshot\s*\([^)]*\)',
        'negative_pattern': r'listenerRegistry',
        'severity': 'MEDIUM',
        'message': 'onSnapshot ohne listenerRegistry - Memory Leak Gefahr',
        'fix': 'Registriere mit window.listenerRegistry?.add(unsubscribe)'
    },
    'async_foreach': {
        'pattern': r'\.forEach\s*\(\s*async',
        'severity': 'HIGH',
        'message': 'async forEach - wartet nicht auf Completion!',
        'fix': 'Verwende for...of oder Promise.all(items.map(...))'
    },
    'hardcoded_werkstatt': {
        'pattern': r'["\']fahrzeuge_\w+["\']|["\']partnerAnfragen_\w+["\']',
        'severity': 'HIGH',
        'message': 'Hardcoded werkstattId in Collection-Name',
        'fix': 'Verwende window.getCollection() für dynamische IDs',
        'exclude_line_patterns': [
            r'localStorage\.',      # localStorage ignorieren
            r'^\s*\*',              # JSDoc Zeilen (beginnen mit *)
            r'//.*Example',         # Beispiel-Kommentare
            r'@returns',            # JSDoc @returns
            r'@param',              # JSDoc @param
            r'//',                  # Alle Kommentare
        ]
    },
    'double_click_vulnerable': {
        'pattern': r'async\s+function\s+\w*(?:submit|save|create|send)\w*\s*\(',
        'negative_pattern': r'disabled\s*=\s*true',
        'severity': 'MEDIUM',
        'message': 'Async Submit-Funktion ohne Double-Click Prevention',
        'fix': 'Füge btn.disabled = true/false hinzu'
    },
    'timestamp_string': {
        'pattern': r'new\s+Date\(\)\.toISOString\(\)',
        'context_pattern': r'(?:Am|At|Date|datum|zeit)',
        'severity': 'MEDIUM',
        'message': 'ISO String statt Firestore Timestamp',
        'fix': 'Verwende firebase.firestore.Timestamp.now()'
    },
    'missing_error_handling': {
        'pattern': r'\.get\(\)\s*\.then\(',
        'negative_pattern': r'\.catch\(',
        'severity': 'LOW',
        'message': 'Firebase Operation ohne Error Handling',
        'fix': 'Füge .catch() oder try/catch hinzu'
    },
    'unsafe_id_comparison': {
        'pattern': r'===\s*\w+Id(?!\s*\))',
        'negative_pattern': r'String\(',
        'severity': 'LOW',
        'message': 'ID-Vergleich möglicherweise nicht type-safe',
        'fix': 'Verwende String(a) === String(b) für sichere Vergleiche'
    }
}

def should_skip_line(line: str, context_lines: list = None) -> bool:
    """Prüfe ob eine Zeile übersprungen werden soll (wegen Kommentar).

    Prüft auch die vorherigen 3 Zeilen für Kontext-Kommentare wie:
    // FALLBACK 2: Globale partnerAnfragen (alte Migration)
    anfrageSnap = await window.db.collection('partnerAnfragen')...
    """
    # Prüfe aktuelle Zeile
    for pattern in IGNORE_COMMENT_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return True

    # Prüfe Kontext (vorherige Zeilen)
    if context_lines:
        for ctx_line in context_lines:
            for pattern in IGNORE_COMMENT_PATTERNS:
                if re.search(pattern, ctx_line, re.IGNORECASE):
                    return True

    return False

def is_global_collection_access(line: str) -> bool:
    """Prüfe ob die Zeile eine globale Collection verwendet."""
    for collection in GLOBAL_COLLECTIONS:
        # Suche nach db.collection('users') oder db.collection("users")
        if re.search(rf'db\.collection\s*\(\s*[\'\"]{collection}[\'\"]', line):
            return True
    return False

def is_variable_collection_access(line: str) -> bool:
    """Prüfe ob die Zeile eine Variable für Collection-Name verwendet.

    z.B. db.collection(collectionName) - dies ist oft korrekt, da die Variable
    bereits den werkstattId Suffix enthält.
    """
    # Suche nach db.collection(variableName) ohne Quotes
    match = re.search(r'db\.collection\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)', line)
    if match:
        var_name = match.group(1)
        # Typische Variablennamen die dynamisch zusammengebaut werden
        dynamic_vars = ['collectionName', 'collection', 'ref', 'colName', 'col']
        if var_name in dynamic_vars or 'Collection' in var_name or 'collection' in var_name:
            return True
    return False

def is_dynamic_werkstatt_collection(line: str) -> bool:
    """Prüfe ob die Zeile dynamisch werkstattId verwendet.

    z.B. db.collection(`partners_${werkstattId}`) - dies ist KORREKT!
    """
    # Template-String mit werkstattId
    if re.search(r'db\.collection\s*\(\s*`[^`]*\$\{.*werkstatt.*\}[^`]*`\s*\)', line, re.IGNORECASE):
        return True
    # String-Concatenation mit werkstattId
    if re.search(r'db\.collection\s*\([^)]*werkstatt', line, re.IGNORECASE):
        return True
    return False

def scan_file(filepath: Path):
    """Scanne eine Datei nach Bug-Patterns."""
    issues = []

    if not filepath.exists():
        return issues

    try:
        content = filepath.read_text(encoding='utf-8')
        lines = content.split('\n')
    except Exception as e:
        return [{'error': str(e)}]

    filename = filepath.name

    for pattern_name, pattern_config in BUG_PATTERNS.items():
        # Prüfe exclude_files
        if 'exclude_files' in pattern_config:
            if filename in pattern_config['exclude_files']:
                continue

        pattern = pattern_config['pattern']
        severity = pattern_config['severity']
        message = pattern_config['message']
        fix = pattern_config['fix']

        # Suche nach Pattern
        for line_num, line in enumerate(lines, 1):
            if re.search(pattern, line):
                # NEU: Hole Kontext (vorherige 3 Zeilen)
                context_start = max(0, line_num - 4)
                context_lines = lines[context_start:line_num - 1]

                # NEU: Prüfe ob Zeile wegen Kommentar übersprungen werden soll
                if should_skip_line(line, context_lines):
                    continue

                # NEU: Prüfe exclude_line_patterns
                if 'exclude_line_patterns' in pattern_config:
                    skip = False
                    for exclude_pattern in pattern_config['exclude_line_patterns']:
                        if re.search(exclude_pattern, line):
                            skip = True
                            break
                    if skip:
                        continue

                # NEU: Prüfe ob globale Collection (für multi_tenant_violation)
                if pattern_config.get('check_global_collections'):
                    if is_global_collection_access(line):
                        continue
                    if is_variable_collection_access(line):
                        continue
                    if is_dynamic_werkstatt_collection(line):
                        continue  # Dynamische werkstattId ist KORREKT

                # Prüfe negative Pattern (wenn vorhanden)
                if 'negative_pattern' in pattern_config:
                    # Prüfe ob negative Pattern in Nähe (±10 Zeilen)
                    context_start = max(0, line_num - 10)
                    context_end = min(len(lines), line_num + 10)
                    context = '\n'.join(lines[context_start:context_end])

                    if re.search(pattern_config['negative_pattern'], context):
                        continue  # Negative Pattern gefunden, kein Issue

                issues.append({
                    'file': str(filepath),
                    'line': line_num,
                    'pattern': pattern_name,
                    'severity': severity,
                    'message': message,
                    'fix': fix,
                    'code': line.strip()[:80]
                })

    return issues

def should_exclude_path(filepath: Path) -> bool:
    """Prüfe ob ein Pfad ausgeschlossen werden soll."""
    filepath_str = str(filepath)
    filename = filepath.name

    # Prüfe Verzeichnisse
    for exclude_dir in EXCLUDE_DIRS:
        if exclude_dir in filepath_str:
            return True

    # Prüfe Dateinamen-Patterns
    for pattern in EXCLUDE_FILE_PATTERNS:
        if fnmatch.fnmatch(filename, pattern):
            return True

    # Prüfe spezielle Datei-Ausnahmen
    for exception in SPECIAL_FILE_EXCEPTIONS:
        if exception in filepath_str or filename == exception:
            return True

    return False

def scan_all_files():
    """Scanne alle relevanten Dateien."""
    all_issues = []
    scanned_count = 0
    skipped_count = 0

    # Finde alle HTML und JS Dateien
    for ext in ['*.html', '*.js']:
        for filepath in PROJECT_ROOT.glob(f'**/{ext}'):
            # NEU: Verwende should_exclude_path()
            if should_exclude_path(filepath):
                skipped_count += 1
                continue

            issues = scan_file(filepath)
            all_issues.extend(issues)
            scanned_count += 1

    # Zeige Statistik
    print(f"📁 Gescannt: {scanned_count} Dateien | ⏭️ Übersprungen: {skipped_count} Dateien")
    print()

    return all_issues

def print_issues(issues, show_all=False):
    """Zeige gefundene Issues."""
    if not issues:
        print("✅ Keine potentiellen Bugs gefunden!")
        return

    # Gruppiere nach Severity
    by_severity = defaultdict(list)
    for issue in issues:
        by_severity[issue.get('severity', 'UNKNOWN')].append(issue)

    severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    severity_emoji = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🟢'
    }

    total = len(issues)
    print(f"\n📊 Gefunden: {total} potentielle Issues\n")

    for severity in severity_order:
        issues_list = by_severity.get(severity, [])
        if not issues_list:
            continue

        emoji = severity_emoji.get(severity, '⚪')
        print(f"{emoji} {severity} ({len(issues_list)} Issues)")
        print("─" * 60)

        # Gruppiere nach Pattern
        by_pattern = defaultdict(list)
        for issue in issues_list:
            by_pattern[issue['pattern']].append(issue)

        for pattern, pattern_issues in by_pattern.items():
            print(f"\n  📌 {pattern} ({len(pattern_issues)}x)")
            print(f"     {pattern_issues[0]['message']}")
            print(f"     💡 Fix: {pattern_issues[0]['fix']}")

            # Zeige Beispiele (max 3 oder alle wenn show_all)
            examples = pattern_issues if show_all else pattern_issues[:3]
            for issue in examples:
                rel_path = Path(issue['file']).relative_to(PROJECT_ROOT)
                print(f"     → {rel_path}:{issue['line']}")
                if show_all:
                    print(f"       {issue['code']}")

            if not show_all and len(pattern_issues) > 3:
                print(f"     ... und {len(pattern_issues) - 3} weitere")

        print()

def predict_for_file(filepath: str):
    """Vorhersage für eine spezifische Datei."""
    # Finde Datei
    if os.path.isabs(filepath):
        target = Path(filepath)
    else:
        target = PROJECT_ROOT / filepath
        if not target.exists():
            # Suche in Projekt
            matches = list(PROJECT_ROOT.glob(f'**/{filepath}'))
            if matches:
                target = matches[0]
            else:
                print(f"❌ Datei nicht gefunden: {filepath}")
                return

    print("╔══════════════════════════════════════════════════════════════╗")
    print(f"║  BUG PREDICTION: {target.name}")
    print("╚══════════════════════════════════════════════════════════════╝")

    issues = scan_file(target)
    print_issues(issues, show_all=True)

    # Zusätzliche Empfehlungen basierend auf Hotspots
    hotspots_file = WORLD_MODEL_DIR / 'hotspots.json'
    if hotspots_file.exists():
        with open(hotspots_file) as f:
            hotspots = json.load(f)

        filename = target.name
        if filename in hotspots.get('hotspots', {}):
            hotspot = hotspots['hotspots'][filename]
            print("\n📋 ZUSÄTZLICHE WARNUNG (aus Hotspots):")
            print(f"   Risk Level: {hotspot.get('risk', 'unknown').upper()}")
            print(f"   Bekannte Bugs: {hotspot.get('bugCount', 0)}")
            print("\n   Häufige Bug-Typen:")
            for bug_type in hotspot.get('commonBugTypes', []):
                print(f"   ❌ {bug_type}")
            print("\n   Prevention Patterns:")
            for pattern in hotspot.get('preventionPatterns', []):
                print(f"   ✅ {pattern}")

def main():
    if len(sys.argv) < 2:
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║           PREDICTIVE BUG DETECTION                           ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print()
        issues = scan_all_files()
        print_issues(issues)
        return

    command = sys.argv[1]

    if command in ['--help', '-h']:
        print(__doc__)
        print()
        print("Options:")
        print("  <file>       Analysiere spezifische Datei")
        print("  --scan-all   Scanne alle Dateien (mit Details)")
        print("  --summary    Nur Zusammenfassung")
        print()
        print("Bug-Patterns die erkannt werden:")
        for name, config in BUG_PATTERNS.items():
            print(f"  • {name}: {config['message']}")
    elif command in ['--scan-all', '-a']:
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║           FULL BUG SCAN                                      ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        issues = scan_all_files()
        print_issues(issues, show_all=True)
    elif command in ['--summary', '-s']:
        issues = scan_all_files()
        by_severity = defaultdict(int)
        for issue in issues:
            by_severity[issue['severity']] += 1

        print("📊 Bug Prediction Summary:")
        for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢'}[sev]
            print(f"   {emoji} {sev}: {by_severity.get(sev, 0)}")
    else:
        predict_for_file(command)

if __name__ == '__main__':
    main()
