#!/bin/bash
# World Model Auto-Update Script
# Aktualisiert das Weltmodell basierend auf Git-Historie und Code-Analyse
# Usage: ./.claude/world-model/update.sh [--full|--quick|--git-only]

WORLD_MODEL_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$WORLD_MODEL_DIR/../.." && pwd)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           WELTMODELL AUTO-UPDATE                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

MODE="${1:-quick}"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

update_git_stats() {
    echo "📊 Analysiere Git-Historie..."

    # Letzte Commits analysieren
    RECENT_FIXES=$(git log --oneline -50 --all -- "*.html" "*.js" 2>/dev/null | grep -i "fix" | wc -l | tr -d ' ')
    RECENT_FEATURES=$(git log --oneline -50 --all -- "*.html" "*.js" 2>/dev/null | grep -i "feat" | wc -l | tr -d ' ')

    # Dateien mit meisten Änderungen (potentielle Hotspots)
    echo ""
    echo "📈 Meistgeänderte Dateien (letzte 50 Commits):"
    git log --oneline -50 --name-only --all 2>/dev/null | grep -E "\.(html|js)$" | grep -v "node_modules" | sort | uniq -c | sort -rn | head -10

    # Bug-Fixes pro Datei
    echo ""
    echo "🐛 Bug-Fixes pro Datei:"
    git log --oneline -100 --all --name-only 2>/dev/null | grep -B1 -i "fix" | grep -E "\.(html|js)$" | sort | uniq -c | sort -rn | head -10

    echo ""
    echo "Stats: $RECENT_FIXES Fixes, $RECENT_FEATURES Features in letzten 50 Commits"
}

update_complexity_stats() {
    echo ""
    echo "🔍 Analysiere Code-Komplexität..."

    cd "$PROJECT_ROOT"

    # Zeilen pro Datei
    echo ""
    echo "📏 Größte Dateien (Lines of Code):"
    find . -name "*.html" -o -name "*.js" | grep -v node_modules | grep -v ".claude" | xargs wc -l 2>/dev/null | sort -rn | head -15

    # Funktionen zählen (grobe Schätzung)
    echo ""
    echo "⚙️  Dateien mit vielen Funktionen:"
    for file in $(find . -name "*.html" -o -name "*.js" | grep -v node_modules | grep -v ".claude"); do
        if [ -f "$file" ]; then
            func_count=$(grep -c "function\|=>" "$file" 2>/dev/null || echo 0)
            if [ "$func_count" -gt 20 ]; then
                echo "  $func_count functions: $file"
            fi
        fi
    done | sort -rn | head -10

    # Firebase Calls zählen
    echo ""
    echo "🔥 Firebase-Intensive Dateien:"
    for file in $(find . -name "*.html" -o -name "*.js" | grep -v node_modules | grep -v ".claude"); do
        if [ -f "$file" ]; then
            fb_count=$(grep -c "getCollection\|\.collection\|\.doc\|onSnapshot" "$file" 2>/dev/null || echo 0)
            if [ "$fb_count" -gt 5 ]; then
                echo "  $fb_count calls: $file"
            fi
        fi
    done | sort -rn | head -10
}

update_pattern_violations() {
    echo ""
    echo "⚠️  Suche nach Pattern-Verletzungen..."

    cd "$PROJECT_ROOT"

    # Multi-Tenant Violations
    echo ""
    echo "🔴 Mögliche Multi-Tenant Violations (direkter db.collection Zugriff):"
    grep -rn "db\.collection(" --include="*.html" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".claude" | grep -v "firebase-config.js" | head -10

    # Fehlende await
    echo ""
    echo "🟠 Mögliche fehlende awaits (Firebase ohne await):"
    grep -rn "getCollection\|\.get()\|\.set()\|\.update()\|\.delete()" --include="*.html" --include="*.js" 2>/dev/null | grep -v "await" | grep -v "node_modules" | grep -v ".claude" | grep -v "return " | head -10

    # Deprecated Methods
    echo ""
    echo "🟡 Deprecated Methods (substr):"
    grep -rn "\.substr(" --include="*.html" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".claude" | head -5
}

update_learnings_analysis() {
    echo ""
    echo "📚 Analysiere Learnings..."

    LEARNINGS_FILE="$WORLD_MODEL_DIR/../learnings.jsonl"

    if [ -f "$LEARNINGS_FILE" ]; then
        TOTAL_LEARNINGS=$(wc -l < "$LEARNINGS_FILE" | tr -d ' ')
        CRITICAL_COUNT=$(grep -c '"impact":"critical"' "$LEARNINGS_FILE" 2>/dev/null || echo 0)
        HIGH_COUNT=$(grep -c '"impact":"high"' "$LEARNINGS_FILE" 2>/dev/null || echo 0)

        echo "  Total Learnings: $TOTAL_LEARNINGS"
        echo "  Critical: $CRITICAL_COUNT"
        echo "  High: $HIGH_COUNT"

        echo ""
        echo "📊 Learnings nach Kategorie:"
        grep -o '"category":"[^"]*"' "$LEARNINGS_FILE" 2>/dev/null | sort | uniq -c | sort -rn
    else
        echo "  Keine learnings.jsonl gefunden"
    fi
}

generate_update_report() {
    REPORT_FILE="$WORLD_MODEL_DIR/last-update-report.md"

    echo ""
    echo "📝 Generiere Update-Report..."

    cat > "$REPORT_FILE" << EOF
# Weltmodell Update Report

**Generiert:** $(date '+%Y-%m-%d %H:%M:%S')
**Mode:** $MODE

## Git-Statistiken

- Letzte 50 Commits analysiert
- Fixes: $(git log --oneline -50 --all 2>/dev/null | grep -i "fix" | wc -l | tr -d ' ')
- Features: $(git log --oneline -50 --all 2>/dev/null | grep -i "feat" | wc -l | tr -d ' ')

## Empfehlungen

$(generate_recommendations)

---
_Nächstes Update: ./.claude/world-model/update.sh_
EOF

    echo "  Report gespeichert: $REPORT_FILE"
}

generate_recommendations() {
    # Analysiere und generiere Empfehlungen
    cd "$PROJECT_ROOT"

    # Check für häufig geänderte Dateien
    HOT_FILE=$(git log --oneline -50 --name-only --all 2>/dev/null | grep -E "\.(html|js)$" | grep -v "node_modules" | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')

    if [ -n "$HOT_FILE" ]; then
        echo "1. **$HOT_FILE** wird häufig geändert - zusätzliche Tests empfohlen"
    fi

    # Check für Multi-Tenant Violations
    VIOLATIONS=$(grep -rn "db\.collection(" --include="*.html" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".claude" | grep -v "firebase-config.js" | wc -l | tr -d ' ')

    if [ "$VIOLATIONS" -gt 0 ]; then
        echo "2. **$VIOLATIONS potentielle Multi-Tenant Violations** gefunden - Review empfohlen"
    fi

    echo "3. Regelmäßiges Update des Weltmodells empfohlen"
}

# Main
case "$MODE" in
    --full)
        echo "🔄 Full Update (alle Analysen)..."
        update_git_stats
        update_complexity_stats
        update_pattern_violations
        update_learnings_analysis
        generate_update_report
        ;;
    --quick)
        echo "⚡ Quick Update (Git + Learnings)..."
        update_git_stats
        update_learnings_analysis
        ;;
    --git-only)
        echo "📊 Git-Only Update..."
        update_git_stats
        ;;
    --violations)
        echo "⚠️  Pattern Violations Check..."
        update_pattern_violations
        ;;
    --help|-h)
        echo "Usage: $0 [--full|--quick|--git-only|--violations]"
        echo ""
        echo "Modes:"
        echo "  --quick      Git-Stats + Learnings (default)"
        echo "  --full       Alle Analysen + Report"
        echo "  --git-only   Nur Git-Statistiken"
        echo "  --violations Nur Pattern-Violations"
        ;;
    *)
        echo "⚡ Quick Update..."
        update_git_stats
        update_learnings_analysis
        ;;
esac

echo ""
echo "✅ Update abgeschlossen"
echo ""
