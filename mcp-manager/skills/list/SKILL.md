---
name: list
description: List all configured MCP servers with their enabled/disabled status, grouped by scope (project vs global). Use this to see what MCP servers are available, check which servers are enabled or disabled, manage MCP configuration, or audit MCP server setup.
user_invocable: true
allowed-tools: Bash
---

# List MCP Servers

Show all configured MCP servers grouped by scope, with their enabled/disabled status and connection type.

## Config File Locations (Claude Code only)

- **Global servers** (`scope: "global"`): stored in `~/.claude.json` — NOT `~/.cursor/mcp.json`
- **Project servers** (`scope: "<workspace-path>"`): stored in `.mcp.json` at the project root

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

3. Fetch the full MCP configuration:
   ```bash
   curl -s http://localhost:4111/api/config
   ```

4. Parse and display the response in a readable format:
   - Group servers by scope: `"global"` means `~/.claude.json`, any path means `.mcp.json` in that directory
   - For each server show: name, enabled/disabled status, connection type (stdio/http)
   - Highlight any servers that are currently disabled
   - Show the total count of servers
   - Note: the `scope` field for project servers is the full workspace path (e.g., `/Users/me/project`), not the string "project"

5. If the user wants to toggle or modify a server, suggest using `/mcp-manager:toggle`, `/mcp-manager:add`, or `/mcp-manager:delete`.
