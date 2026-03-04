#!/bin/bash
# Start MCP Manager server (if not running) and register workspace

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load config: .env.default first, then .env overrides, then real env wins
set -a
[ -f "$PLUGIN_ROOT/.env.default" ] && . "$PLUGIN_ROOT/.env.default"
[ -f "$PLUGIN_ROOT/.env" ] && . "$PLUGIN_ROOT/.env"
set +a

PORT="${MCP_MANAGER_PORT:-4111}"
PID_FILE="${MCP_MANAGER_PID_FILE:-$HOME/.mcp-manager.pid}"
LOG_FILE="${MCP_MANAGER_LOG_FILE:-$HOME/.mcp-manager.log}"
HEALTH_TIMEOUT="${MCP_MANAGER_HEALTH_TIMEOUT:-2}"
STARTUP_WAIT="${MCP_MANAGER_STARTUP_WAIT:-5}"

# Read hook input from stdin
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null)
CWD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null)

# Check if server is already running
is_running() {
  curl -s --max-time "$HEALTH_TIMEOUT" "http://localhost:${PORT}/api/health" >/dev/null 2>&1
}

# Start server if not running
if ! is_running; then
  # Clean stale PID
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill -0 "$OLD_PID" 2>/dev/null || rm -f "$PID_FILE"
  fi

  # Start server
  cd "$PLUGIN_ROOT"
  nohup node server/index.js > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  # Wait for server to be ready
  WAIT_ITERS=$(( STARTUP_WAIT * 2 ))
  for i in $(seq 1 $WAIT_ITERS); do
    if is_running; then
      break
    fi
    sleep 0.5
  done
fi

# Register session with the Claude CLI PID so the server can track liveness.
# $PPID is the Claude Code process that spawned this hook.
if [ -n "$SESSION_ID" ]; then
  JSON_BODY=$(python3 -c "import json,sys; print(json.dumps({'session_id': sys.argv[1], 'cwd': sys.argv[2], 'pid': int(sys.argv[3])}))" "$SESSION_ID" "$CWD" "$PPID")
  curl -s --max-time "$HEALTH_TIMEOUT" -X POST "http://localhost:${PORT}/api/sessions" \
    -H "Content-Type: application/json" \
    -d "$JSON_BODY" >/dev/null 2>&1
fi

# Output welcome message
cat <<HOOK_EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "MCP Manager dashboard running at http://localhost:${PORT}"
  }
}
HOOK_EOF
