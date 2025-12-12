#!/bin/bash
# World Model Query Script
# Usage: ./.claude/world-model/query.sh <command> [args]

WORLD_MODEL_DIR="$(dirname "$0")"

show_help() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           CODEBASE WELTMODELL - Query Interface              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  file <filename>     - Zeige Info über eine Datei"
    echo "  patterns <filename> - Zeige Patterns für eine Datei"
    echo "  hotspot             - Zeige Bug-Hotspots (riskante Dateien)"
    echo "  deps <filename>     - Zeige Abhängigkeiten einer Datei"
    echo "  collection <name>   - Zeige welche Dateien eine Collection nutzen"
    echo "  summary             - Zeige Codebase-Zusammenfassung"
    echo "  risk <filename>     - Zeige Risiko-Level einer Datei"
    echo ""
    echo "Examples:"
    echo "  $0 file kanban.html"
    echo "  $0 patterns annahme.html"
    echo "  $0 hotspot"
    echo "  $0 collection fahrzeuge"
}

query_file() {
    local filename="$1"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  FILE INFO: $filename"
    echo "╚══════════════════════════════════════════════════════════════╝"

    # Suche in file-map.json
    python3 -c "
import json
with open('$WORLD_MODEL_DIR/file-map.json') as f:
    data = json.load(f)

filename = '$filename'
found = False

for category, content in data.items():
    if category.startswith('_'):
        continue
    if isinstance(content, dict) and 'files' in content:
        files = content['files']
        if filename in files:
            print(f'Category: {category}')
            print(f'Description: {content.get(\"description\", \"N/A\")}')
            info = files[filename]
            if isinstance(info, dict):
                for key, value in info.items():
                    print(f'  {key}: {value}')
            found = True
            break

if not found:
    print(f'Datei {filename} nicht im Weltmodell gefunden.')
    print('Tipp: Prüfe ob Pfad korrekt ist (z.B. partner-app/meine-anfragen.html)')
" 2>/dev/null || echo "Python3 nicht verfügbar - JSON kann nicht geparst werden"
}

query_patterns() {
    local filename="$1"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  PATTERNS FÜR: $filename"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json
with open('$WORLD_MODEL_DIR/patterns-by-file.json') as f:
    data = json.load(f)

filename = '$filename'
patterns_info = data.get('patterns', {})
file_patterns = data.get('file_pattern_map', {}).get(filename, [])

if not file_patterns:
    # Versuche Wildcard-Match
    for key in data.get('file_pattern_map', {}).keys():
        if '*' in key:
            import fnmatch
            if fnmatch.fnmatch(filename, key):
                file_patterns = data['file_pattern_map'][key]
                break

if file_patterns:
    print(f'Patterns für {filename}:')
    print('─' * 50)
    for pattern_name in file_patterns:
        pattern = patterns_info.get(pattern_name, {})
        print(f'  • {pattern_name}')
        print(f'    {pattern.get(\"description\", \"\")}')
        if 'codePattern' in pattern:
            print(f'    Code: {pattern[\"codePattern\"]}')
        print()
else:
    print(f'Keine Patterns für {filename} definiert.')
    print('')
    print('Quick Lookup (allgemein):')
    for key, patterns in data.get('quick_lookup', {}).items():
        if key != 'description':
            print(f'  {key}: {patterns}')
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

query_hotspots() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              BUG-HOTSPOTS (Riskante Dateien)                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json
with open('$WORLD_MODEL_DIR/hotspots.json') as f:
    data = json.load(f)

hotspots = data.get('hotspots', {})

# Sortiere nach Risk
risk_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
sorted_hotspots = sorted(hotspots.items(), key=lambda x: risk_order.get(x[1].get('risk', 'low'), 4))

for filename, info in sorted_hotspots:
    risk = info.get('risk', 'unknown')
    bug_count = info.get('bugCount', 0)
    lines = info.get('lines', '?')

    risk_emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}.get(risk, '⚪')

    print(f'{risk_emoji} {filename}')
    print(f'   Risk: {risk.upper()} | Bugs: {bug_count} | Lines: {lines}')

    common_bugs = info.get('commonBugTypes', [])[:2]
    if common_bugs:
        print(f'   Häufige Bugs: {common_bugs[0]}')
    print()
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

query_deps() {
    local filename="$1"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ABHÄNGIGKEITEN: $filename"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json
with open('$WORLD_MODEL_DIR/dependencies.json') as f:
    data = json.load(f)

filename = '$filename'
page_deps = data.get('page_dependencies', {}).get(filename, {})

if page_deps:
    print(f'Imports:')
    for imp in page_deps.get('imports', []):
        print(f'  • {imp}')

    print(f'\\nCollections:')
    for col in page_deps.get('collections_used', []):
        print(f'  • {col}')

    if page_deps.get('realtime_listeners'):
        print(f'\\n⚠️  Hat Realtime Listeners - listenerRegistry beachten!')

    if 'note' in page_deps:
        print(f'\\n📝 Note: {page_deps[\"note\"]}')
else:
    print(f'Keine Abhängigkeits-Info für {filename}')

# Cascade Effects
cascade = data.get('cascade_effects', {}).get(filename, [])
if cascade:
    print(f'\\n⚡ Cascade Effects (betrifft):')
    for c in cascade[:5]:
        print(f'  • {c}')
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

query_collection() {
    local collection="$1"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  COLLECTION USAGE: $collection"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json
with open('$WORLD_MODEL_DIR/dependencies.json') as f:
    data = json.load(f)

collection = '$collection'
usage = data.get('collection_usage', {}).get(collection, {})

if usage:
    print(f'Read by:')
    for f in usage.get('read', []):
        print(f'  • {f}')

    print(f'\\nWrite by:')
    for f in usage.get('write', []):
        print(f'  • {f}')

    if usage.get('realtime'):
        print(f'\\nRealtime Listeners:')
        for f in usage.get('realtime', []):
            print(f'  • {f}')

    patterns = usage.get('criticalPatterns', [])
    if patterns:
        print(f'\\n⚠️  Critical Patterns: {patterns}')

    if 'note' in usage:
        print(f'\\n📝 Note: {usage[\"note\"]}')
else:
    print(f'Collection {collection} nicht gefunden.')
    print('\\nVerfügbare Collections:')
    for col in data.get('collection_usage', {}).keys():
        print(f'  • {col}')
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

query_summary() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              CODEBASE ZUSAMMENFASSUNG                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json

with open('$WORLD_MODEL_DIR/file-map.json') as f:
    file_map = json.load(f)

with open('$WORLD_MODEL_DIR/hotspots.json') as f:
    hotspots = json.load(f)

meta = file_map.get('_meta', {})
print(f'Total Files: {meta.get(\"totalFiles\", \"?\")}')
print(f'Total Lines: {meta.get(\"totalLines\", \"?\")}')
print(f'Last Updated: {meta.get(\"lastUpdated\", \"?\")}')
print()

print('Categories:')
for cat, content in file_map.items():
    if cat.startswith('_'):
        continue
    if isinstance(content, dict):
        desc = content.get('description', '')
        file_count = len(content.get('files', {}))
        print(f'  • {cat}: {desc} ({file_count} files)')
print()

# Top Hotspots
print('Top 3 Bug-Hotspots:')
hs = hotspots.get('hotspots', {})
risk_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
sorted_hs = sorted(hs.items(), key=lambda x: risk_order.get(x[1].get('risk', 'low'), 4))[:3]
for name, info in sorted_hs:
    print(f'  🔴 {name} ({info.get(\"risk\", \"?\")})')
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

query_risk() {
    local filename="$1"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  RISIKO-ANALYSE: $filename"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 -c "
import json
with open('$WORLD_MODEL_DIR/hotspots.json') as f:
    data = json.load(f)

filename = '$filename'
hotspot = data.get('hotspots', {}).get(filename, {})

if hotspot:
    risk = hotspot.get('risk', 'unknown')
    risk_emoji = {'critical': '🔴 CRITICAL', 'high': '🟠 HIGH', 'medium': '🟡 MEDIUM', 'low': '🟢 LOW'}.get(risk, '⚪ UNKNOWN')

    print(f'Risk Level: {risk_emoji}')
    print(f'Bug Count: {hotspot.get(\"bugCount\", 0)}')
    print(f'Lines: {hotspot.get(\"lines\", \"?\")}')
    print()

    print('Common Bug Types:')
    for bug in hotspot.get('commonBugTypes', []):
        print(f'  ❌ {bug}')
    print()

    print('Prevention Patterns:')
    for pattern in hotspot.get('preventionPatterns', []):
        print(f'  ✅ {pattern}')
    print()

    recent = hotspot.get('recentFixes', [])
    if recent:
        print('Recent Fixes:')
        for fix in recent[:3]:
            print(f'  • {fix}')
else:
    # Check safe files
    safe = data.get('safe_files', {}).get('files', [])
    if filename in safe:
        print('🟢 SAFE FILE - Geringes Bug-Risiko')
        print(f'Grund: {data.get(\"safe_files\", {}).get(\"reason\", \"\")}')
    else:
        print(f'Keine Risiko-Info für {filename}')
        print('Möglicherweise neue Datei oder nicht analysiert.')
" 2>/dev/null || echo "Python3 nicht verfügbar"
}

# Main
case "$1" in
    file)
        query_file "$2"
        ;;
    patterns)
        query_patterns "$2"
        ;;
    hotspot|hotspots)
        query_hotspots
        ;;
    deps|dependencies)
        query_deps "$2"
        ;;
    collection)
        query_collection "$2"
        ;;
    summary)
        query_summary
        ;;
    risk)
        query_risk "$2"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "Unbekannter Befehl: $1"
        show_help
        exit 1
        ;;
esac
