---
name: context
description: Show estimated token usage per MCP server based on tool count. Use this to check MCP token consumption, see how much context each MCP server uses, analyze context window pressure, debug token budget issues, or optimize MCP server context usage.
user_invocable: true
allowed-tools: Bash
---

# MCP Context Usage

Show estimated token consumption per enabled global MCP server.

## How It Works

The `/api/context-usage` endpoint probes each enabled global server's tools and estimates token usage as: **tool count × 600 tokens per tool**. This is a rough estimate of how much context window each server's tool definitions consume. The warning threshold is 25,000 tokens.

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

4. The response contains:
   - `servers`: array of `{ name, toolCount, estimatedTokens, error }` for each enabled global server
   - `totalTokens`: sum of all estimated tokens
   - `threshold`: 25000 (the warning threshold)
   - `warning`: boolean, true if totalTokens exceeds the threshold

5. Display the results in a readable format:
   - Show each server's name, tool count, and estimated tokens
   - Show the total estimated tokens across all servers
   - Flag any servers with errors (probe failures, timeouts)
   - If `warning` is true, highlight that total token usage exceeds the 25,000 token threshold

6. If a server is using too much context, suggest the user can disable it with `/mcp-manager:toggle` or remove it with `/mcp-manager:delete`.
