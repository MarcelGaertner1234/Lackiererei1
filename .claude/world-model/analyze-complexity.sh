#!/bin/bash
# Code Complexity Analyzer
# Berechnet Komplexitäts-Metriken für jede Datei
# Usage: ./.claude/world-model/analyze-complexity.sh [file]

WORLD_MODEL_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$WORLD_MODEL_DIR/../.." && pwd)"

analyze_file() {
    local file="$1"
    local basename=$(basename "$file")

    if [ ! -f "$file" ]; then
        echo "Datei nicht gefunden: $file"
        return 1
    fi

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  COMPLEXITY ANALYSIS: $basename"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # Basis-Metriken
    LINES=$(wc -l < "$file" | tr -d ' ')
    CHARS=$(wc -c < "$file" | tr -d ' ')

    # Code-Metriken
    FUNCTIONS=$(grep -c "function\s\|=>\|async\s" "$file" 2>/dev/null || echo 0)
    IF_STATEMENTS=$(grep -c "if\s*(" "$file" 2>/dev/null || echo 0)
    LOOPS=$(grep -c "for\s*(\|while\s*(\|\.forEach\|\.map\|\.filter" "$file" 2>/dev/null || echo 0)
    TRY_CATCH=$(grep -c "try\s*{" "$file" 2>/dev/null || echo 0)

    # Firebase-Metriken
    FB_READS=$(grep -c "\.get(\|\.doc(\|onSnapshot" "$file" 2>/dev/null || echo 0)
    FB_WRITES=$(grep -c "\.set(\|\.update(\|\.add(\|\.delete(" "$file" 2>/dev/null || echo 0)
    COLLECTIONS=$(grep -c "getCollection\|\.collection(" "$file" 2>/dev/null || echo 0)

    # DOM-Metriken
    DOM_QUERIES=$(grep -c "querySelector\|getElementById\|getElementsBy" "$file" 2>/dev/null || echo 0)
    EVENT_LISTENERS=$(grep -c "addEventListener\|onclick\|onchange\|onsubmit" "$file" 2>/dev/null || echo 0)

    # Risiko-Indikatoren
    NESTED_CALLBACKS=$(grep -c "function.*function\|=>.*=>" "$file" 2>/dev/null || echo 0)
    LONG_LINES=$(awk 'length > 120' "$file" 2>/dev/null | wc -l | tr -d ' ')

    echo "📏 Basis-Metriken:"
    echo "   Lines of Code: $LINES"
    echo "   Characters: $CHARS"
    echo ""

    echo "⚙️  Code-Struktur:"
    echo "   Functions: $FUNCTIONS"
    echo "   If-Statements: $IF_STATEMENTS"
    echo "   Loops: $LOOPS"
    echo "   Try-Catch Blocks: $TRY_CATCH"
    echo ""

    echo "🔥 Firebase-Operationen:"
    echo "   Read Operations: $FB_READS"
    echo "   Write Operations: $FB_WRITES"
    echo "   Collection Accesses: $COLLECTIONS"
    echo ""

    echo "🖥️  DOM-Interaktionen:"
    echo "   DOM Queries: $DOM_QUERIES"
    echo "   Event Listeners: $EVENT_LISTENERS"
    echo ""

    # Komplexitäts-Score berechnen
    # Formel: Gewichtete Summe verschiedener Faktoren
    COMPLEXITY_SCORE=$((
        (LINES / 100) +
        (FUNCTIONS * 2) +
        (IF_STATEMENTS) +
        (LOOPS * 2) +
        (FB_READS + FB_WRITES) * 3 +
        (DOM_QUERIES) +
        (NESTED_CALLBACKS * 5) +
        (LONG_LINES)
    ))

    # Risiko-Level bestimmen
    if [ "$COMPLEXITY_SCORE" -gt 200 ]; then
        RISK_LEVEL="🔴 CRITICAL"
        RISK_COLOR="\033[0;31m"
    elif [ "$COMPLEXITY_SCORE" -gt 100 ]; then
        RISK_LEVEL="🟠 HIGH"
        RISK_COLOR="\033[0;33m"
    elif [ "$COMPLEXITY_SCORE" -gt 50 ]; then
        RISK_LEVEL="🟡 MEDIUM"
        RISK_COLOR="\033[1;33m"
    else
        RISK_LEVEL="🟢 LOW"
        RISK_COLOR="\033[0;32m"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 COMPLEXITY SCORE: $COMPLEXITY_SCORE"
    echo "⚠️  RISK LEVEL: $RISK_LEVEL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Warnungen
    echo "⚠️  Warnungen:"
    [ "$LINES" -gt 5000 ] && echo "   • Datei sehr groß ($LINES Zeilen) - Refactoring erwägen"
    [ "$FUNCTIONS" -gt 50 ] && echo "   • Viele Funktionen ($FUNCTIONS) - Modularisierung erwägen"
    [ "$FB_WRITES" -gt 10 ] && echo "   • Viele Firebase Writes ($FB_WRITES) - Batch Operations erwägen"
    [ "$NESTED_CALLBACKS" -gt 5 ] && echo "   • Nested Callbacks ($NESTED_CALLBACKS) - async/await verwenden"
    [ "$LONG_LINES" -gt 10 ] && echo "   • Lange Zeilen ($LONG_LINES) - Formatierung prüfen"
    [ "$DOM_QUERIES" -gt 30 ] && echo "   • Viele DOM Queries ($DOM_QUERIES) - Caching erwägen"

    echo ""

    # Empfehlungen basierend auf Metriken
    echo "💡 Empfehlungen:"
    if [ "$FB_READS" -gt 5 ] || [ "$FB_WRITES" -gt 5 ]; then
        echo "   • Multi-Tenant Pattern prüfen (window.getCollection)"
        echo "   • Listener-Registry für onSnapshot verwenden"
    fi
    if [ "$DOM_QUERIES" -gt 10 ]; then
        echo "   • Optional chaining (?.) für null-safety"
    fi
    if [ "$FUNCTIONS" -gt 30 ]; then
        echo "   • Funktionen in separate Module auslagern"
    fi
    echo ""
}

analyze_all() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           COMPLEXITY RANKING - Alle Dateien                  ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    cd "$PROJECT_ROOT"

    # Temporäre Datei für Ergebnisse
    TEMP_FILE=$(mktemp)

    for file in $(find . -name "*.html" -o -name "*.js" | grep -v node_modules | grep -v ".claude" | grep -v "libs/"); do
        if [ -f "$file" ]; then
            LINES=$(wc -l < "$file" | tr -d ' ')
            FUNCTIONS=$(grep -c "function\s\|=>" "$file" 2>/dev/null || echo 0)
            FB_OPS=$(($(grep -c "getCollection\|\.collection\|\.get(\|\.set(" "$file" 2>/dev/null || echo 0)))

            # Einfacher Complexity Score
            SCORE=$(( (LINES / 100) + (FUNCTIONS * 2) + (FB_OPS * 3) ))

            echo "$SCORE|$file|$LINES|$FUNCTIONS|$FB_OPS" >> "$TEMP_FILE"
        fi
    done

    # Sortiert ausgeben
    echo "Score | Datei | Lines | Functions | Firebase Ops"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    sort -t'|' -k1 -rn "$TEMP_FILE" | head -20 | while IFS='|' read score file lines funcs fb; do
        if [ "$score" -gt 200 ]; then
            echo "🔴 $score | $file | $lines | $funcs | $fb"
        elif [ "$score" -gt 100 ]; then
            echo "🟠 $score | $file | $lines | $funcs | $fb"
        elif [ "$score" -gt 50 ]; then
            echo "🟡 $score | $file | $lines | $funcs | $fb"
        else
            echo "🟢 $score | $file | $lines | $funcs | $fb"
        fi
    done

    rm "$TEMP_FILE"
    echo ""
}

# Main
case "$1" in
    --all)
        analyze_all
        ;;
    --help|-h)
        echo "Usage: $0 [file] [--all]"
        echo ""
        echo "Options:"
        echo "  <file>    Analysiere spezifische Datei"
        echo "  --all     Ranking aller Dateien nach Komplexität"
        echo ""
        echo "Examples:"
        echo "  $0 kanban.html"
        echo "  $0 --all"
        ;;
    "")
        analyze_all
        ;;
    *)
        # Finde Datei
        if [ -f "$1" ]; then
            analyze_file "$1"
        elif [ -f "$PROJECT_ROOT/$1" ]; then
            analyze_file "$PROJECT_ROOT/$1"
        else
            # Suche nach Datei
            FOUND=$(find "$PROJECT_ROOT" -name "$1" -type f | grep -v node_modules | head -1)
            if [ -n "$FOUND" ]; then
                analyze_file "$FOUND"
            else
                echo "Datei nicht gefunden: $1"
                exit 1
            fi
        fi
        ;;
esac
