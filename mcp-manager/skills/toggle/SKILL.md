---
name: toggle
description: Toggle an MCP server on or off (enable/disable). Use this to enable a disabled MCP server, disable an enabled MCP server, turn off an MCP server, turn on an MCP server, or manage MCP server availability.
user_invocable: true
allowed-tools: Bash
---

# Toggle MCP Server

Enable or disable a specific MCP server by name.

## Config File Locations (Claude Code only)

- **Global servers** are stored in `~/.claude.json` under `mcpServers` (enabled) and `_mcpServers_disabled` (disabled). This is NOT `~/.cursor/mcp.json` — that file is for Cursor, not Claude Code.
- **Project servers** are defined in `.mcp.json` at the project root. This file format is shared by Claude Code and Cursor, but MCP Manager only modifies it for Claude Code.
- **Project toggle state** is stored in `.claude/settings.local.json` under `disabledMcpjsonServers`.

## Instructions

1. Check if the MCP Manager server is running:
   ```bash
   curl -s --max-time 2 http://localhost:4111/api/health
   ```

2. If the server is NOT running, start it:
   ```bash
   cd "$CLAUDE_PLUGIN_ROOT" && nohup node server/index.js > ~/.mcp-manager.log 2>&1 &
   sleep 2
   ```

3. If the user did not specify which server to toggle, first list available servers:
   ```bash
   curl -s http://localhost:4111/api/config
   ```
   Then ask the user which server they want to toggle.

4. Toggle the specified server:
   ```bash
   curl -s -X POST http://localhost:4111/api/servers/toggle \
     -H "Content-Type: application/json" \
     -d '{"name": "<SERVER_NAME>", "scope": "<SCOPE>"}'
   ```
   - `name`: the MCP server name (e.g., "github", "slack")
   - `scope`: use `"global"` for global servers, or the **full absolute workspace path** (e.g., `"/Users/me/my-project"`) for project servers. Do NOT use the string `"project"`. Check the server's `scope` field from the `/api/config` response.

5. Report the result to the user, confirming whether the server is now enabled or disabled. Mention which file was modified:
   - Global toggle: `~/.claude.json`
   - Project toggle: `.claude/settings.local.json` in the project root

6. Remind the user they may need to restart their Claude Code session for changes to take effect.
