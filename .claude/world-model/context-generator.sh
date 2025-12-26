#!/bin/bash
# Context Generator
# Generiert relevanten Kontext für die aktuelle Arbeit
# Usage: ./.claude/world-model/context-generator.sh <file> [--full|--quick]

WORLD_MODEL_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$WORLD_MODEL_DIR/../.." && pwd)"

generate_context() {
    local FILE="$1"
    local MODE="${2:-quick}"
    local BASENAME=$(basename "$FILE")

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  KONTEXT FÜR: $BASENAME"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # 1. File Info aus Weltmodell
    echo "📂 FILE INFO"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "$WORLD_MODEL_DIR/query.sh" file "$BASENAME" 2>/dev/null | tail -n +4

    echo ""

    # 2. Patterns für diese Datei
    echo "📋 RELEVANTE PATTERNS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "$WORLD_MODEL_DIR/query.sh" patterns "$BASENAME" 2>/dev/null | tail -n +4

    echo ""

    # 3. Risiko-Analyse
    echo "⚠️  RISIKO-ANALYSE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "$WORLD_MODEL_DIR/query.sh" risk "$BASENAME" 2>/dev/null | tail -n +4

    echo ""

    # 4. Abhängigkeiten
    echo "🔗 ABHÄNGIGKEITEN"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    "$WORLD_MODEL_DIR/query.sh" deps "$BASENAME" 2>/dev/null | tail -n +4

    if [ "$MODE" = "--full" ]; then
        echo ""

        # 5. Predictive Bug Detection
        echo "🔮 BUG PREDICTION"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        python3 "$WORLD_MODEL_DIR/predict-bugs.py" "$BASENAME" 2>/dev/null | tail -n +4

        echo ""

        # 6. Complexity Analysis
        echo "📊 COMPLEXITY ANALYSIS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        "$WORLD_MODEL_DIR/analyze-complexity.sh" "$BASENAME" 2>/dev/null | tail -n +4

        echo ""

        # 7. Git History für diese Datei
        echo "📜 GIT HISTORY (letzte 5 Commits)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cd "$PROJECT_ROOT"
        git log --oneline -5 -- "*$BASENAME" 2>/dev/null || echo "Keine Git-History"

        echo ""

        # 8. Relevante Learnings
        echo "📚 RELEVANTE LEARNINGS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        LEARNINGS_FILE="$WORLD_MODEL_DIR/../learnings.jsonl"
        if [ -f "$LEARNINGS_FILE" ]; then
            grep -i "$BASENAME" "$LEARNINGS_FILE" 2>/dev/null | python3 -c "
import sys
import json
for line in sys.stdin:
    try:
        l = json.loads(line)
        print(f\"  • {l.get('pattern', 'N/A')}\")
        print(f\"    {l.get('context', '')[:60]}\")
        print()
    except:
        pass
" || echo "Keine relevanten Learnings"
        else
            echo "Keine learnings.jsonl"
        fi
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💡 ZUSAMMENFASSUNG"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Generiere Zusammenfassung basierend auf gesammelten Infos
    generate_summary "$BASENAME"
}

generate_summary() {
    local FILE="$1"

    # Lade Hotspot-Info
    HOTSPOTS_FILE="$WORLD_MODEL_DIR/hotspots.json"
    PATTERNS_FILE="$WORLD_MODEL_DIR/patterns-by-file.json"

    python3 << EOF
import json
from pathlib import Path

file = '$FILE'
hotspots_file = Path('$HOTSPOTS_FILE')
patterns_file = Path('$PATTERNS_FILE')

recommendations = []

# Check Hotspots
if hotspots_file.exists():
    with open(hotspots_file) as f:
        hotspots = json.load(f)

    if file in hotspots.get('hotspots', {}):
        hs = hotspots['hotspots'][file]
        risk = hs.get('risk', 'unknown')
        if risk == 'critical':
            recommendations.append("🔴 CRITICAL Datei - Besondere Vorsicht!")
        elif risk == 'high':
            recommendations.append("🟠 HIGH Risk Datei - Tests schreiben")

        for pattern in hs.get('preventionPatterns', [])[:3]:
            recommendations.append(f"✅ {pattern}")

# Check Patterns
if patterns_file.exists():
    with open(patterns_file) as f:
        patterns = json.load(f)

    file_patterns = patterns.get('file_pattern_map', {}).get(file, [])
    if 'multi-tenant' in file_patterns:
        recommendations.append("🔥 Multi-Tenant: window.getCollection() verwenden!")
    if 'serviceTyp-readonly' in file_patterns:
        recommendations.append("⚠️  serviceTyp ist READ-ONLY!")
    if 'listener-registry' in file_patterns:
        recommendations.append("📝 listenerRegistry für onSnapshot verwenden")

# Ausgabe
if recommendations:
    print("Empfehlungen für diese Datei:")
    for rec in recommendations[:5]:
        print(f"  {rec}")
else:
    print("Keine speziellen Empfehlungen.")
    print("Standard-Checks durchführen:")
    print("  • npm run test:all vor Push")
    print("  • Multi-Tenant Pattern prüfen")
EOF
}

generate_task_context() {
    local TASK="$1"

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  TASK KONTEXT: $TASK"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # Suche relevante Dateien basierend auf Task-Keywords
    echo "📂 Möglicherweise relevante Dateien:"
    cd "$PROJECT_ROOT"

    # Extrahiere Keywords
    KEYWORDS=$(echo "$TASK" | tr ' ' '\n' | grep -E '^[a-zA-Z]{3,}$' | tr '\n' '|' | sed 's/|$//')

    if [ -n "$KEYWORDS" ]; then
        grep -rlE "$KEYWORDS" --include="*.html" --include="*.js" 2>/dev/null | grep -v node_modules | grep -v ".claude" | head -10
    fi

    echo ""

    # Suche in Learnings
    echo "📚 Relevante Learnings:"
    LEARNINGS_FILE="$WORLD_MODEL_DIR/../learnings.jsonl"
    if [ -f "$LEARNINGS_FILE" ]; then
        for keyword in $(echo "$TASK" | tr ' ' '\n' | grep -E '^[a-zA-Z]{3,}$'); do
            grep -i "$keyword" "$LEARNINGS_FILE" 2>/dev/null | head -2
        done | sort -u | python3 -c "
import sys
import json
seen = set()
for line in sys.stdin:
    try:
        l = json.loads(line)
        pattern = l.get('pattern', '')
        if pattern not in seen:
            seen.add(pattern)
            print(f\"  • {pattern}\")
    except:
        pass
" | head -5
    fi

    echo ""

    # Hotspots für diesen Task
    echo "⚠️  Zu beachtende Hotspots:"
    "$WORLD_MODEL_DIR/query.sh" hotspot 2>/dev/null | grep -E "^🔴|^🟠" | head -5
}

# Main
case "$1" in
    --help|-h)
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║           CONTEXT GENERATOR                                   ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Usage:"
        echo "  $0 <file> [--full|--quick]   Kontext für Datei generieren"
        echo "  $0 --task \"<description>\"    Kontext für Task generieren"
        echo ""
        echo "Options:"
        echo "  --quick   Nur wichtigste Infos (default)"
        echo "  --full    Alle Analysen inkl. Bug Prediction"
        echo ""
        echo "Examples:"
        echo "  $0 kanban.html"
        echo "  $0 kanban.html --full"
        echo "  $0 --task \"Fix bug in drag and drop\""
        ;;
    --task)
        generate_task_context "$2"
        ;;
    "")
        echo "Usage: $0 <file> [--full|--quick]"
        echo "       $0 --task \"<description>\""
        echo ""
        echo "Verwende --help für mehr Infos."
        ;;
    *)
        # Finde Datei
        FILE="$1"
        MODE="${2:-quick}"

        if [ -f "$PROJECT_ROOT/$FILE" ]; then
            generate_context "$FILE" "$MODE"
        else
            # Suche nach Datei
            FOUND=$(find "$PROJECT_ROOT" -name "$FILE" -type f 2>/dev/null | grep -v node_modules | head -1)
            if [ -n "$FOUND" ]; then
                generate_context "$FILE" "$MODE"
            else
                echo "❌ Datei nicht gefunden: $FILE"
                echo ""
                echo "Verfügbare Dateien:"
                find "$PROJECT_ROOT" -name "*.html" -type f 2>/dev/null | grep -v node_modules | grep -v ".claude" | head -10
            fi
        fi
        ;;
esac
