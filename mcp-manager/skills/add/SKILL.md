---
name: add
description: Add a new MCP server to your Claude Code configuration. Use this to install an MCP server, configure a new MCP server, set up MCP, register an MCP server, or connect a new tool server.
user_invocable: true
allowed-tools: Bash
---

# Add MCP Server

Add a new MCP server to the Claude Code configuration.

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
   - **scope**: "project" or "global" (default: "project")
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

5. Confirm the server was added successfully and remind the user to restart their Claude Code session to activate it.
