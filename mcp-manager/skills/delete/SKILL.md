---
name: delete
description: Remove an MCP server from your Claude Code configuration. Use this to uninstall an MCP server, delete an MCP server, remove a tool server, or clean up unused MCP servers.
user_invocable: true
allowed-tools: Bash
---

# Delete MCP Server

Remove an MCP server from the Claude Code configuration.

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
   - `scope`: "project" or "global" — check the config if the user doesn't specify

6. Confirm the deletion was successful and remind the user to restart their Claude Code session.
