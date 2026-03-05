---
name: context
description: Show token budget and context window usage per MCP server. Use this to check MCP token consumption, see how much context each MCP server uses, analyze context window pressure, debug token budget issues, or optimize MCP server context usage.
user_invocable: true
allowed-tools: Bash
---

# MCP Context Usage

Show how much of the token/context budget each MCP server is consuming.

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

3. Fetch the context usage data:
   ```bash
   curl -s http://localhost:4111/api/context-usage
   ```

4. Display the results in a readable format:
   - Show each MCP server's token usage (tool definitions, resources, etc.)
   - Show the total context consumed by all MCP servers combined
   - Highlight any servers consuming a disproportionate amount of context
   - If available, show the percentage of the total context window used

5. If a server is using too much context, suggest the user can disable it with `/mcp-manager:toggle` or remove it with `/mcp-manager:delete`.
