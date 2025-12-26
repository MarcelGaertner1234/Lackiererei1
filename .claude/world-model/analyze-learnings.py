#!/usr/bin/env python3
"""
Learning Analyzer - Pattern-Erkennung aus learnings.jsonl
Analysiert akkumulierte Learnings und erkennt Muster.

Usage:
    python3 .claude/world-model/analyze-learnings.py [--summary|--patterns|--timeline|--recommendations]
"""

import json
import sys
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

LEARNINGS_FILE = Path(__file__).parent.parent / "learnings.jsonl"

def load_learnings():
    """Lade alle Learnings aus der JSONL-Datei."""
    learnings = []
    if not LEARNINGS_FILE.exists():
        print(f"❌ Keine learnings.jsonl gefunden: {LEARNINGS_FILE}")
        return []

    with open(LEARNINGS_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    learnings.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"⚠️  Fehler beim Parsen: {e}")
    return learnings

def analyze_summary(learnings):
    """Zeige Zusammenfassung der Learnings."""
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║           LEARNINGS SUMMARY                                  ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    if not learnings:
        print("Keine Learnings vorhanden.")
        return

    # Basis-Statistiken
    print(f"📊 Total Learnings: {len(learnings)}")
    print()

    # Nach Impact
    impact_counts = defaultdict(int)
    for l in learnings:
        impact_counts[l.get('impact', 'unknown')] += 1

    print("⚡ Nach Impact:")
    for impact in ['critical', 'high', 'medium', 'low']:
        count = impact_counts.get(impact, 0)
        emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}.get(impact, '⚪')
        bar = '█' * count
        print(f"   {emoji} {impact:10} {count:3} {bar}")
    print()

    # Nach Kategorie
    category_counts = defaultdict(int)
    for l in learnings:
        category_counts[l.get('category', 'unknown')] += 1

    print("📁 Nach Kategorie:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        bar = '█' * count
        print(f"   {cat:20} {count:3} {bar}")
    print()

    # Nach Typ
    type_counts = defaultdict(int)
    for l in learnings:
        type_counts[l.get('type', 'unknown')] += 1

    print("📝 Nach Typ:")
    for typ, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"   {typ:15} {count:3}")
    print()

def analyze_patterns(learnings):
    """Erkenne wiederkehrende Muster in Learnings."""
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║           PATTERN DETECTION                                  ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    if not learnings:
        print("Keine Learnings vorhanden.")
        return

    # Dateien mit häufigen Problemen
    file_issues = defaultdict(list)
    for l in learnings:
        files = l.get('files', [])
        if isinstance(files, str):
            files = [files]
        for f in files:
            file_issues[f].append(l)

    print("📂 Dateien mit häufigen Learnings:")
    for f, issues in sorted(file_issues.items(), key=lambda x: -len(x[1]))[:10]:
        critical = sum(1 for i in issues if i.get('impact') == 'critical')
        high = sum(1 for i in issues if i.get('impact') == 'high')
        print(f"   {len(issues):2} issues: {f}")
        if critical > 0:
            print(f"      🔴 {critical} critical")
        if high > 0:
            print(f"      🟠 {high} high")
    print()

    # Keyword-Analyse in Patterns
    keywords = defaultdict(int)
    important_words = ['null', 'undefined', 'async', 'await', 'firebase', 'collection',
                       'listener', 'memory', 'leak', 'crash', 'error', 'validation',
                       'multi-tenant', 'serviceTyp', 'double-click', 'race']

    for l in learnings:
        pattern_text = (l.get('pattern', '') + ' ' + l.get('context', '')).lower()
        for word in important_words:
            if word.lower() in pattern_text:
                keywords[word] += 1

    print("🔑 Häufige Keywords in Learnings:")
    for word, count in sorted(keywords.items(), key=lambda x: -x[1])[:15]:
        bar = '█' * count
        print(f"   {word:15} {count:3} {bar}")
    print()

    # Zeitliche Muster
    print("📅 Zeitliche Verteilung:")
    date_counts = defaultdict(int)
    for l in learnings:
        date_str = l.get('date', '')
        if date_str:
            try:
                date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                date_key = date.strftime('%Y-%m-%d')
                date_counts[date_key] += 1
            except:
                pass

    for date, count in sorted(date_counts.items())[-10:]:
        bar = '█' * count
        print(f"   {date} {count:3} {bar}")
    print()

def analyze_timeline(learnings):
    """Zeige Timeline der Learnings."""
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║           LEARNINGS TIMELINE                                 ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    if not learnings:
        print("Keine Learnings vorhanden.")
        return

    # Sortiere nach Datum
    sorted_learnings = sorted(learnings, key=lambda x: x.get('date', ''), reverse=True)

    for l in sorted_learnings[:20]:
        date_str = l.get('date', 'unknown')
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            date_formatted = date.strftime('%Y-%m-%d %H:%M')
        except:
            date_formatted = date_str[:16]

        impact = l.get('impact', 'unknown')
        emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}.get(impact, '⚪')

        pattern = l.get('pattern', 'No pattern')[:50]
        category = l.get('category', 'unknown')

        print(f"{emoji} {date_formatted} [{category}]")
        print(f"   {pattern}")
        print()

def generate_recommendations(learnings):
    """Generiere Empfehlungen basierend auf Learnings."""
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║           EMPFEHLUNGEN                                       ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    if not learnings:
        print("Keine Learnings vorhanden.")
        return

    recommendations = []

    # Analysiere Patterns
    critical_count = sum(1 for l in learnings if l.get('impact') == 'critical')
    multi_tenant_issues = sum(1 for l in learnings if 'multi-tenant' in l.get('category', '').lower())
    firebase_issues = sum(1 for l in learnings if 'firebase' in l.get('category', '').lower())

    if critical_count > 2:
        recommendations.append({
            'priority': 'HIGH',
            'title': 'Viele kritische Issues',
            'description': f'{critical_count} kritische Learnings dokumentiert. Code-Review empfohlen.',
            'action': 'Führe ein umfassendes Code-Review der betroffenen Dateien durch.'
        })

    if multi_tenant_issues > 1:
        recommendations.append({
            'priority': 'HIGH',
            'title': 'Multi-Tenant Pattern beachten',
            'description': f'{multi_tenant_issues} Multi-Tenant bezogene Learnings.',
            'action': 'Grep nach db.collection( und ersetze durch window.getCollection()'
        })

    if firebase_issues > 2:
        recommendations.append({
            'priority': 'MEDIUM',
            'title': 'Firebase Best Practices',
            'description': f'{firebase_issues} Firebase-bezogene Learnings.',
            'action': 'Prüfe await window.firebaseInitialized und Listener-Registry'
        })

    # Datei-spezifische Empfehlungen
    file_issues = defaultdict(int)
    for l in learnings:
        files = l.get('files', [])
        if isinstance(files, str):
            files = [files]
        for f in files:
            if f != '*' and not f.startswith('.claude'):
                file_issues[f] += 1

    hot_files = [f for f, count in file_issues.items() if count >= 2]
    if hot_files:
        recommendations.append({
            'priority': 'MEDIUM',
            'title': 'Hotspot-Dateien',
            'description': f'{len(hot_files)} Dateien mit mehreren Learnings.',
            'action': f'Fokus auf: {", ".join(hot_files[:3])}'
        })

    # Ausgabe
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            priority_emoji = {'HIGH': '🔴', 'MEDIUM': '🟠', 'LOW': '🟡'}.get(rec['priority'], '⚪')
            print(f"{i}. {priority_emoji} [{rec['priority']}] {rec['title']}")
            print(f"   {rec['description']}")
            print(f"   → {rec['action']}")
            print()
    else:
        print("✅ Keine dringenden Empfehlungen. Weiter so!")
    print()

def main():
    learnings = load_learnings()

    if len(sys.argv) < 2:
        # Default: Summary
        analyze_summary(learnings)
        return

    command = sys.argv[1]

    if command in ['--summary', '-s']:
        analyze_summary(learnings)
    elif command in ['--patterns', '-p']:
        analyze_patterns(learnings)
    elif command in ['--timeline', '-t']:
        analyze_timeline(learnings)
    elif command in ['--recommendations', '-r', '--rec']:
        generate_recommendations(learnings)
    elif command in ['--all', '-a']:
        analyze_summary(learnings)
        print("\n" + "="*60 + "\n")
        analyze_patterns(learnings)
        print("\n" + "="*60 + "\n")
        generate_recommendations(learnings)
    elif command in ['--help', '-h']:
        print(__doc__)
        print()
        print("Options:")
        print("  --summary, -s         Zusammenfassung der Learnings")
        print("  --patterns, -p        Pattern-Erkennung")
        print("  --timeline, -t        Zeitliche Übersicht")
        print("  --recommendations, -r Empfehlungen generieren")
        print("  --all, -a             Alle Analysen")
    else:
        print(f"Unbekannter Befehl: {command}")
        print("Verwende --help für Hilfe.")

if __name__ == '__main__':
    main()
