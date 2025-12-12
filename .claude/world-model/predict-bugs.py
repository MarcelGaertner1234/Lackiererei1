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
from pathlib import Path
from collections import defaultdict

WORLD_MODEL_DIR = Path(__file__).parent
PROJECT_ROOT = WORLD_MODEL_DIR.parent.parent

# Bug-Patterns basierend auf historischen Learnings
BUG_PATTERNS = {
    'multi_tenant_violation': {
        'pattern': r'db\.collection\s*\(',
        'exclude_files': ['firebase-config.js'],
        'severity': 'CRITICAL',
        'message': 'Direkter db.collection() Zugriff - Multi-Tenant Violation!',
        'fix': 'Ersetze durch window.getCollection()'
    },
    'missing_await_firebase': {
        'pattern': r'(?<!await\s)window\.firebaseInitialized',
        'severity': 'HIGH',
        'message': 'Fehlendes await vor firebaseInitialized',
        'fix': 'Füge await hinzu: await window.firebaseInitialized'
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
        'fix': 'Verwende window.getCollection() für dynamische IDs'
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

def scan_all_files():
    """Scanne alle relevanten Dateien."""
    all_issues = []

    # Finde alle HTML und JS Dateien
    for ext in ['*.html', '*.js']:
        for filepath in PROJECT_ROOT.glob(f'**/{ext}'):
            # Skip node_modules und .claude
            if 'node_modules' in str(filepath) or '.claude' in str(filepath):
                continue
            if 'libs/' in str(filepath):
                continue

            issues = scan_file(filepath)
            all_issues.extend(issues)

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
