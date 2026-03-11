---
name: add
description: Add a new MCP server to your Claude Code configuration. Use this to install an MCP server, configure a new MCP server, set up MCP, register an MCP server, or connect a new tool server.
user_invocable: true
allowed-tools: Bash
---

# Add MCP Server

Add a new MCP server to the Claude Code configuration.

## Config File Locations (Claude Code only)

- **Global scope** writes to `~/.claude.json` under `mcpServers`. This is NOT `~/.cursor/mcp.json`.
- **Project scope** writes to `.mcp.json` at the project root.

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

3. Gather the required information from the user if not already provided:
   - **name**: Server name (e.g., "my-server")
   - **type**: "stdio" or "http"
   - **scope**: `"global"` or the **full absolute workspace path** (e.g., `"/Users/me/my-project"`) for project scope. Do NOT use the string `"project"`. Default to `"global"` unless the user specifies a project.
   - For stdio: **command** and **args** (array of strings)
   - For http: **url**

4. Add the server:
   ```bash
   curl -s -X POST http://localhost:4111/api/servers \
     -H "Content-Type: application/json" \
     -d '{
       "name": "<NAME>",
       "scope": "<SCOPE>",
       "config": {
         "type": "<TYPE>",
         "command": "<COMMAND>",
         "args": ["<ARG1>", "<ARG2>"]
       }
     }'
   ```
   For HTTP type, use `"url"` instead of `"command"` and `"args"`.

5. Confirm the server was added successfully. Mention which file was modified:
   - Global: added to `~/.claude.json`
   - Project: added to `.mcp.json` in the project root

6. Remind the user to restart their Claude Code session to activate it.
