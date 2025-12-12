#!/bin/bash
# Session History Tracker
# Trackt was in jeder Session gemacht wurde
# Usage: ./.claude/world-model/session-tracker.sh [start|end|log|history]

WORLD_MODEL_DIR="$(dirname "$0")"
SESSIONS_DIR="$WORLD_MODEL_DIR/../sessions"
CURRENT_SESSION_FILE="$SESSIONS_DIR/current-session.json"
HISTORY_FILE="$SESSIONS_DIR/session-history.jsonl"

# Erstelle Sessions-Verzeichnis falls nicht vorhanden
mkdir -p "$SESSIONS_DIR"

start_session() {
    SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"
    START_TIME=$(date -Iseconds)

    # Git-Status erfassen
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    UNCOMMITTED_CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    cat > "$CURRENT_SESSION_FILE" << EOF
{
    "sessionId": "$SESSION_ID",
    "startTime": "$START_TIME",
    "gitBranch": "$GIT_BRANCH",
    "gitCommitAtStart": "$GIT_COMMIT",
    "uncommittedChangesAtStart": $UNCOMMITTED_CHANGES,
    "actions": [],
    "filesModified": [],
    "learningsAdded": 0,
    "testsRun": false,
    "status": "active"
}
EOF

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           SESSION GESTARTET                                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📋 Session ID: $SESSION_ID"
    echo "🕐 Start: $START_TIME"
    echo "🌿 Branch: $GIT_BRANCH"
    echo "📝 Commit: $GIT_COMMIT"
    echo "📁 Uncommitted Changes: $UNCOMMITTED_CHANGES"
    echo ""
    echo "Verwende 'session-tracker.sh log <action>' um Aktionen zu loggen"
    echo "Verwende 'session-tracker.sh end' am Ende der Session"
}

log_action() {
    ACTION="$1"
    DETAILS="${2:-}"

    if [ ! -f "$CURRENT_SESSION_FILE" ]; then
        echo "⚠️  Keine aktive Session. Starte mit: session-tracker.sh start"
        return 1
    fi

    TIMESTAMP=$(date -Iseconds)

    # Python verwenden um JSON zu aktualisieren
    python3 << EOF
import json
from datetime import datetime

with open('$CURRENT_SESSION_FILE', 'r') as f:
    session = json.load(f)

session['actions'].append({
    'time': '$TIMESTAMP',
    'action': '$ACTION',
    'details': '$DETAILS'
})

with open('$CURRENT_SESSION_FILE', 'w') as f:
    json.dump(session, f, indent=2)

print(f"✅ Action geloggt: $ACTION")
EOF
}

log_file_modified() {
    FILE="$1"

    if [ ! -f "$CURRENT_SESSION_FILE" ]; then
        return 1
    fi

    python3 << EOF
import json

with open('$CURRENT_SESSION_FILE', 'r') as f:
    session = json.load(f)

if '$FILE' not in session['filesModified']:
    session['filesModified'].append('$FILE')

with open('$CURRENT_SESSION_FILE', 'w') as f:
    json.dump(session, f, indent=2)
EOF
}

end_session() {
    if [ ! -f "$CURRENT_SESSION_FILE" ]; then
        echo "⚠️  Keine aktive Session."
        return 1
    fi

    END_TIME=$(date -Iseconds)
    GIT_COMMIT_END=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    UNCOMMITTED_END=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

    # Berechne geänderte Dateien seit Session-Start
    python3 << EOF
import json
from datetime import datetime

with open('$CURRENT_SESSION_FILE', 'r') as f:
    session = json.load(f)

session['endTime'] = '$END_TIME'
session['gitCommitAtEnd'] = '$GIT_COMMIT_END'
session['uncommittedChangesAtEnd'] = $UNCOMMITTED_END
session['status'] = 'completed'

# Berechne Dauer
start = datetime.fromisoformat(session['startTime'].replace('Z', '+00:00'))
end = datetime.fromisoformat('$END_TIME'.replace('Z', '+00:00'))
duration = end - start
session['durationMinutes'] = int(duration.total_seconds() / 60)

# Speichere Session
with open('$CURRENT_SESSION_FILE', 'w') as f:
    json.dump(session, f, indent=2)

# Füge zur History hinzu
with open('$HISTORY_FILE', 'a') as f:
    f.write(json.dumps(session) + '\n')

print("╔══════════════════════════════════════════════════════════════╗")
print("║           SESSION BEENDET                                     ║")
print("╚══════════════════════════════════════════════════════════════╝")
print()
print(f"📋 Session ID: {session['sessionId']}")
print(f"⏱️  Dauer: {session['durationMinutes']} Minuten")
print(f"📝 Actions: {len(session['actions'])}")
print(f"📁 Files Modified: {len(session['filesModified'])}")
print(f"🌿 Commits: {session['gitCommitAtStart']} → {session['gitCommitAtEnd']}")
print()

if session['actions']:
    print("📋 Actions in dieser Session:")
    for action in session['actions'][-10:]:
        print(f"   • {action['action']}")
EOF

    # Entferne current session file
    rm -f "$CURRENT_SESSION_FILE"
}

show_current() {
    if [ ! -f "$CURRENT_SESSION_FILE" ]; then
        echo "⚠️  Keine aktive Session."
        return 1
    fi

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           AKTUELLE SESSION                                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"

    python3 << EOF
import json
from datetime import datetime

with open('$CURRENT_SESSION_FILE', 'r') as f:
    session = json.load(f)

start = datetime.fromisoformat(session['startTime'].replace('Z', '+00:00'))
now = datetime.now(start.tzinfo)
duration = int((now - start).total_seconds() / 60)

print()
print(f"📋 Session ID: {session['sessionId']}")
print(f"⏱️  Laufzeit: {duration} Minuten")
print(f"🌿 Branch: {session['gitBranch']}")
print(f"📝 Actions: {len(session['actions'])}")
print(f"📁 Files Modified: {len(session['filesModified'])}")
print()

if session['actions']:
    print("Letzte Actions:")
    for action in session['actions'][-5:]:
        print(f"   • {action['action']}")
print()
EOF
}

show_history() {
    if [ ! -f "$HISTORY_FILE" ]; then
        echo "📜 Keine Session-History vorhanden."
        return 0
    fi

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           SESSION HISTORY                                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    python3 << EOF
import json
from datetime import datetime

sessions = []
with open('$HISTORY_FILE', 'r') as f:
    for line in f:
        if line.strip():
            sessions.append(json.loads(line))

# Zeige letzte 10 Sessions
for session in sessions[-10:]:
    start = datetime.fromisoformat(session['startTime'].replace('Z', '+00:00'))
    duration = session.get('durationMinutes', 0)
    actions = len(session.get('actions', []))
    files = len(session.get('filesModified', []))

    print(f"📅 {start.strftime('%Y-%m-%d %H:%M')} | {duration:3}min | {actions:2} actions | {files:2} files")

print()
print(f"Total Sessions: {len(sessions)}")
EOF
}

show_stats() {
    if [ ! -f "$HISTORY_FILE" ]; then
        echo "📜 Keine Session-History vorhanden."
        return 0
    fi

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           SESSION STATISTIKEN                                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    python3 << EOF
import json
from collections import defaultdict

sessions = []
with open('$HISTORY_FILE', 'r') as f:
    for line in f:
        if line.strip():
            sessions.append(json.loads(line))

if not sessions:
    print("Keine Sessions vorhanden.")
    exit()

total_sessions = len(sessions)
total_duration = sum(s.get('durationMinutes', 0) for s in sessions)
total_actions = sum(len(s.get('actions', [])) for s in sessions)

# Häufigste Actions
action_counts = defaultdict(int)
for s in sessions:
    for action in s.get('actions', []):
        action_counts[action['action']] += 1

print(f"📊 Gesamt-Statistiken:")
print(f"   Sessions: {total_sessions}")
print(f"   Gesamtzeit: {total_duration} Minuten ({total_duration/60:.1f} Stunden)")
print(f"   Durchschnitt: {total_duration/total_sessions:.0f} min/Session")
print(f"   Total Actions: {total_actions}")
print()

print(f"🔄 Häufigste Actions:")
for action, count in sorted(action_counts.items(), key=lambda x: -x[1])[:10]:
    print(f"   {count:3}x {action}")
EOF
}

# Main
case "$1" in
    start)
        start_session
        ;;
    end)
        end_session
        ;;
    log)
        log_action "$2" "$3"
        ;;
    file)
        log_file_modified "$2"
        ;;
    current|status)
        show_current
        ;;
    history)
        show_history
        ;;
    stats)
        show_stats
        ;;
    --help|-h|"")
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║           SESSION TRACKER                                     ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  start              Neue Session starten"
        echo "  end                Session beenden und speichern"
        echo "  log <action>       Action loggen"
        echo "  file <filepath>    Datei als modifiziert markieren"
        echo "  current            Aktuelle Session anzeigen"
        echo "  history            Session-History anzeigen"
        echo "  stats              Statistiken anzeigen"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 log 'Fixed bug in kanban.html'"
        echo "  $0 log 'Added feature' 'Multi-service support'"
        echo "  $0 end"
        ;;
    *)
        echo "Unbekannter Befehl: $1"
        echo "Verwende --help für Hilfe."
        ;;
esac
