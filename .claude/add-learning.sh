#!/bin/bash
# Meta-Learning: Neues Learning hinzufügen
# Usage: ./.claude/add-learning.sh "pattern" "context" "category" "files"

PATTERN="$1"
CONTEXT="$2"
CATEGORY="${3:-general}"
FILES="${4:-*}"
IMPACT="${5:-medium}"

if [ -z "$PATTERN" ]; then
    echo "Usage: $0 \"pattern\" \"context\" [category] [files] [impact]"
    echo ""
    echo "Categories: multi-tenant, firebase, testing, gotcha, pattern, fix, feature"
    echo "Impact: critical, high, medium, low"
    echo ""
    echo "Example:"
    echo "  $0 \"Null-check bei Radio Buttons\" \"Crash ohne ?.value\" \"gotcha\" \"annahme.html\" \"high\""
    exit 1
fi

DATE=$(date -Iseconds)
ENTRY="{\"date\":\"$DATE\",\"type\":\"learning\",\"category\":\"$CATEGORY\",\"pattern\":\"$PATTERN\",\"context\":\"$CONTEXT\",\"files\":[\"$FILES\"],\"impact\":\"$IMPACT\",\"learned_by\":\"developer\"}"

echo "$ENTRY" >> "$(dirname "$0")/learnings.jsonl"

echo "Learning hinzugefügt:"
echo "$ENTRY" | python3 -m json.tool 2>/dev/null || echo "$ENTRY"
