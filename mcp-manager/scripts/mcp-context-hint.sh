#!/bin/bash
# UserPromptSubmit hook: inject MCP Manager context hint for MCP-related queries.
# Reads the user prompt from stdin, checks for MCP-related keywords.
# If matched, outputs additionalContext reminding Claude about the MCP Manager skills.
# If not matched, outputs nothing (zero overhead).

INPUT=$(cat)

# Extract the user's prompt text
PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('prompt', ''))
except:
    print('')
" 2>/dev/null)

# Case-insensitive keyword check
if echo "$PROMPT" | grep -iqE '\bmcp\b|manage.*server|server.*toggle|toggle.*server|disable.*server|enable.*server|add.*server|remove.*server|delete.*server|context.*usage|token.*budget|mcp.?manager'; then
  cat <<'HOOK_EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "The MCP Manager plugin is available for this task. Use the mcp-manager skills: /mcp-manager:list (list servers), /mcp-manager:toggle (enable/disable), /mcp-manager:add (add server), /mcp-manager:delete (remove server), /mcp-manager:context (token usage), /mcp-manager:status (full overview), /mcp-manager:open (web dashboard). Prefer these skills over manual JSON editing or CLI commands."
  }
}
HOOK_EOF
fi
