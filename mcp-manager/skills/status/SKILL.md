---
name: status
description: Full MCP Manager dashboard status overview including server health, active sessions, and all configured MCP servers. Use this to check MCP Manager health, see active Claude sessions, get a complete MCP overview, or diagnose MCP issues.
user_invocable: true
allowed-tools: Bash
---

# MCP Manager Status

Show a comprehensive status overview of the MCP Manager and all configured servers.

## Config File Locations (Claude Code only)

- **Global servers**: `~/.claude.json` (NOT `~/.cursor/mcp.json`)
- **Project servers**: `.mcp.json` at the project root
- **Project toggle state**: `.claude/settings.local.json` at the project root

## Instructions

1. Check if the MCP Manager server is running:
   ```bash
   curl -s --max-time 2 http://localhost:4111/api/health
   ```

2. If the server is NOT running, report that the MCP Manager is not running and offer to start it:
   ```bash
   cd "$CLAUDE_PLUGIN_ROOT" && nohup node server/index.js > ~/.mcp-manager.log 2>&1 &
   sleep 2
   ```

3. If the server is running, gather all status information in parallel:
   ```bash
   echo "=== Health ===" && curl -s http://localhost:4111/api/health && \
   echo "\n=== Sessions ===" && curl -s http://localhost:4111/api/sessions && \
   echo "\n=== Config ===" && curl -s http://localhost:4111/api/config
   ```

4. Present a comprehensive status report:
   - **Health**: Server status and uptime (from `/api/health` which returns `{ status, uptime }`)
   - **Active Sessions**: Number of connected Claude Code sessions, their working directories and PIDs
   - **MCP Servers**: Summary count of enabled/disabled servers per scope. For each scope, note the config file:
     - `"global"` scope → servers from `~/.claude.json`
     - workspace path scope → servers from `.mcp.json` in that directory
   - **Quick Actions**: Remind user of available skills (`/mcp-manager:list`, `/mcp-manager:toggle`, `/mcp-manager:context`, `/mcp-manager:open`)
