---
name: delete
description: Remove an MCP server from your Claude Code configuration. Use this to uninstall an MCP server, delete an MCP server, remove a tool server, or clean up unused MCP servers.
user_invocable: true
allowed-tools: Bash
---

# Delete MCP Server

Remove an MCP server from the Claude Code configuration.

## Config File Locations (Claude Code only)

- **Global servers** are stored in `~/.claude.json` (NOT `~/.cursor/mcp.json`).
- **Project servers** are defined in `.mcp.json` at the project root.

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

3. If the user did not specify which server to delete, list available servers first:
   ```bash
   curl -s http://localhost:4111/api/config
   ```
   Then ask the user which server they want to remove.

4. **Confirm with the user before deleting.** This action removes the server configuration permanently.

5. Delete the specified server:
   ```bash
   curl -s -X DELETE http://localhost:4111/api/servers \
     -H "Content-Type: application/json" \
     -d '{"name": "<SERVER_NAME>", "scope": "<SCOPE>"}'
   ```
   - `name`: the MCP server name
   - `scope`: use `"global"` for global servers, or the **full absolute workspace path** (e.g., `"/Users/me/my-project"`) for project servers. Do NOT use the string `"project"`. Check the server's `scope` field from the `/api/config` response.

6. Confirm the deletion was successful. Mention which file was modified:
   - Global: removed from `~/.claude.json`
   - Project: removed from `.mcp.json` in the project root

7. Remind the user to restart their Claude Code session.
