---
name: open
description: Opens the MCP Manager dashboard in your browser
user_invocable: true
---

# MCP Manager Dashboard

Open the MCP Manager dashboard in the default browser.

## Instructions

1. Check if the MCP Manager server is running by hitting the health endpoint:
   ```bash
   curl -s http://localhost:4111/api/health
   ```

2. If the server is NOT running, start it:
   ```bash
   cd "$CLAUDE_PLUGIN_ROOT" && nohup node server/index.js > ~/.mcp-manager.log 2>&1 &
   ```

3. Open the dashboard in the browser:
   ```bash
   open http://localhost:4111
   ```

4. Tell the user: "MCP Manager dashboard opened at http://localhost:4111"
