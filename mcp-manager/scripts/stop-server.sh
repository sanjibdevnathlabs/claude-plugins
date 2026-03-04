#!/bin/bash
# Unregister session and stop server if last session

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load config: .env.default first, then .env overrides, then real env wins
set -a
[ -f "$PLUGIN_ROOT/.env.default" ] && . "$PLUGIN_ROOT/.env.default"
[ -f "$PLUGIN_ROOT/.env" ] && . "$PLUGIN_ROOT/.env"
set +a

PORT="${MCP_MANAGER_PORT:-4111}"
PID_FILE="${MCP_MANAGER_PID_FILE:-$HOME/.mcp-manager.pid}"
HEALTH_TIMEOUT="${MCP_MANAGER_HEALTH_TIMEOUT:-2}"

# Read hook input from stdin
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null)

# Unregister session (best-effort)
if [ -n "$SESSION_ID" ]; then
  curl -s --max-time "$HEALTH_TIMEOUT" -X DELETE "http://localhost:${PORT}/api/sessions/${SESSION_ID}" >/dev/null 2>&1
fi

# Check remaining sessions
COUNT=$(curl -s --max-time "$HEALTH_TIMEOUT" "http://localhost:${PORT}/api/sessions/count" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',1))" 2>/dev/null)

# Stop server if no remaining sessions
if [ "$COUNT" = "0" ]; then
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null
    rm -f "$PID_FILE"
  fi
fi
