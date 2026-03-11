# MCP Manager

A web dashboard for managing [Model Context Protocol](https://modelcontextprotocol.io/) servers in Claude Code — toggle servers on/off, view their tools, and manage configs across workspaces.

## Installation

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed (`~/.claude.json` is created automatically by Claude Code; MCP Manager also works without it and will create it on first server add)
- Node.js 20+
- npm

### Option 1: Install as a Claude Code plugin (recommended)

```bash
# 1. Register the marketplace (one-time setup)
claude plugin marketplace add github:sanjibdevnathlabs/claude-plugins

# 2. Install the plugin
claude plugin install mcp-manager
```

That's it. The plugin automatically:
- Registers a `SessionStart` hook that starts the dashboard server whenever you open Claude Code
- Registers 7 skills: `/mcp-manager:list`, `/mcp-manager:toggle`, `/mcp-manager:add`, `/mcp-manager:delete`, `/mcp-manager:context`, `/mcp-manager:status`, `/mcp-manager:open`

### Option 2: Clone and install manually

```bash
git clone https://github.com/sanjibdevnathlabs/claude-plugins.git
cd claude-plugins/mcp-manager
npm install
npm run build
```

Then configure the Claude Code hooks manually (see [Configure Claude Code Hooks](#configure-claude-code-hooks) below).

### Verify it works

1. Start a new Claude Code session (or restart your current one)
2. You should see a context message: "MCP Manager plugin is active at http://localhost:4111."
3. Open http://localhost:4111 in your browser, or type `/mcp-manager:open` inside Claude Code

## Where Are Configs Stored?

MCP Manager is for **Claude Code only**. It does NOT read or write Cursor's config files.

| Scope | Config File | What's Stored |
|-------|------------|---------------|
| **Global** | `~/.claude.json` | All global MCP servers (under `mcpServers` and `_mcpServers_disabled`) |
| **Project** | `<project>/.mcp.json` | Project-specific MCP servers |
| **Project toggle state** | `<project>/.claude/settings.local.json` | Which `.mcp.json` servers are disabled (under `disabledMcpjsonServers`) |

**Common point of confusion:** `.mcp.json` is a shared file format used by both Claude Code and Cursor. MCP Manager reads/writes this file for Claude Code — it has nothing to do with `~/.cursor/mcp.json` (Cursor's global config). If you're looking for Claude Code's global MCP config, it's `~/.claude.json`, not `~/.cursor/mcp.json`.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Claude Code CLI                                │
│  ┌────────────────────────────────────────────┐ │
│  │ SessionStart hook  (scripts/start-server.sh)│ │
│  │  • Starts Express server if not running     │ │
│  │  • Registers session (ID, cwd, PID)         │ │
│  └────────────────────────────────────────────┘ │
└───────────────────┬─────────────────────────────┘
                    │ HTTP
┌───────────────────▼─────────────────────────────┐
│  Express Server (server/index.js)  :4111        │
│  ┌──────────────┐  ┌────────────────────┐       │
│  │ Config Mgr   │  │ Workspace Registry │       │
│  │ config-      │  │ workspace-         │       │
│  │ manager.js   │  │ registry.js        │       │
│  ├──────────────┤  ├────────────────────┤       │
│  │ Reads/writes │  │ Tracks sessions,   │       │
│  │ ~/.claude.json  │ workspaces, PIDs   │       │
│  │ .mcp.json    │  │ in state file      │       │
│  │ .claude/     │  │                    │       │
│  │  settings.   │  │                    │       │
│  │  local.json  │  │                    │       │
│  └──────────────┘  └────────────────────┘       │
│  ┌──────────────┐  ┌────────────────────┐       │
│  │ Tool Prober  │  │ Watchdog           │       │
│  │ tool-        │  │ Auto-shutdown when │       │
│  │ prober.js    │  │ no live sessions   │       │
│  └──────────────┘  └────────────────────┘       │
│  ┌──────────────────────────────────────┐       │
│  │ Static file serving (dist/)          │       │
│  └──────────────────────────────────────┘       │
└───────────────────┬─────────────────────────────┘
                    │ Serves
┌───────────────────▼─────────────────────────────┐
│  React SPA (client/)                            │
│  • Header with server stats                     │
│  • Workspace scope dropdown                     │
│  • Server cards with toggle + tool discovery    │
│  • Blade Design System dark theme               │
│  • Polls /api/config + /api/workspaces           │
│  •   (interval from /api/client-config)          │
│  • Polling pauses when browser tab is hidden     │
│  • Toggle: role="switch", aria-checked, aria-label│
└─────────────────────────────────────────────────┘
```

## Configure Claude Code Hooks (manual install only)

If you installed via `claude plugin add`, hooks are registered automatically — skip this section.

Add the hooks to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "/path/to/mcp-manager/scripts/start-server.sh",
        "timeout": 10
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "/path/to/mcp-manager/scripts/mcp-context-hint.sh",
        "timeout": 3
      }
    ]
  }
}
```

The plugin registers two hooks:

**SessionStart** (`scripts/start-server.sh`):
1. Starts the Express server if not already running
2. Registers the current Claude Code session (session ID, working directory, parent PID)
3. Injects a context message listing available skills

**UserPromptSubmit** (`scripts/mcp-context-hint.sh`):
1. Checks if the user's prompt contains MCP-related keywords
2. If matched, injects a reminder about available MCP Manager skills (zero overhead when not matched)

### Usage

Once configured, the dashboard auto-starts with every Claude Code session. Open it at:

```
http://localhost:4111
```

You can also type `/mcp-manager:open` inside Claude Code to launch it.

### Manual Start/Stop

```bash
# Start
npm start

# Stop
./scripts/stop-server.sh
```

## Configuration

MCP Manager uses a cascading `.env` configuration system:

1. `.env.default` — shipped defaults (do not edit)
2. `.env` — your local overrides (create this file)
3. Real environment variables — highest priority

### Configuration Variables

| Variable | Default | Description |
|---|---|---|
| `MCP_MANAGER_PORT` | `4111` | HTTP server port |
| `MCP_MANAGER_LOG_FILE` | `$HOME/.mcp-manager.log` | Server log file path |
| `MCP_MANAGER_PID_FILE` | `$HOME/.mcp-manager.pid` | PID file for process management |
| `MCP_MANAGER_STATE_FILE` | `$HOME/.mcp-manager-state.json` | Session/workspace state persistence |
| `MCP_MANAGER_WATCHDOG_INTERVAL_MS` | `5000` | How often the watchdog checks for live sessions |
| `MCP_MANAGER_GRACE_CHECKS` | `2` | Consecutive idle checks before auto-shutdown |
| `MCP_MANAGER_TOOL_CACHE_TTL_MS` | `300000` | Tool probe cache duration (5 minutes) |
| `MCP_MANAGER_PROBE_TIMEOUT_MS` | `15000` | Tool probe timeout in milliseconds |
| `MCP_MANAGER_HEALTH_TIMEOUT` | `2` | Health check curl timeout in seconds |
| `MCP_MANAGER_STARTUP_WAIT` | `5` | Max seconds to wait for server readiness |
| `MCP_MANAGER_POLL_INTERVAL_MS` | `5000` | Frontend polling interval |

## API Reference

All endpoints are prefixed with `/api`.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check. Returns `{ status, uptime }` |
| `GET` | `/api/client-config` | Frontend configuration. Returns `{ pollIntervalMs }` |

### Configuration

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/config` | All servers grouped by workspace scope |
| `GET` | `/api/config/:scope` | Servers for a specific scope (`global` or URL-encoded workspace path) |

### Server Management

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/servers/toggle` | Toggle a server on/off. Body: `{ name, scope, enabled? }`. `scope` is `"global"` or a full workspace path. When `enabled` (boolean) is provided, sets the exact state idempotently; when omitted, flips the current state. |
| `POST` | `/api/servers` | Add a new server. Body: `{ name, scope, config }`. `config.type` must be `"stdio"` or `"http"`. Returns 409 if server already exists. |
| `DELETE` | `/api/servers` | Delete a server. Body: `{ name, scope }`. Returns 404 if not found. Also cleans up `disabledMcpjsonServers` for project servers. |
| `GET` | `/api/servers/:scope/:name/tools` | Probe a server's tools via MCP protocol (supports stdio and http transports) |

### Context Usage

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/context-usage` | Estimate token consumption per enabled global server. Returns `{ servers, totalTokens, threshold, warning }`. Token estimate = tool count × 600. |

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Register a session. Body: `{ session_id, cwd, pid }`. Validated: `session_id` (alphanumeric/dash/underscore, max 256), `cwd` (absolute path, max 4096), `pid` (positive integer). |
| `DELETE` | `/api/sessions/:id` | Unregister a session |
| `GET` | `/api/sessions` | List all active sessions |
| `GET` | `/api/sessions/count` | Get active session count |

### Workspaces

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces` | List all known workspace paths |
| `DELETE` | `/api/workspaces/:path` | Remove a workspace from the tracked list |

## Security & Reliability

- **Request body limit**: `express.json` is capped at 100 KB.
- **No leaked credentials**: API responses strip `config.env` and `config.headers` from server entries (may contain secrets or auth tokens).
- **Tool prober env whitelist**: Only safe environment variables (`PATH`, `HOME`, `USER`, `SHELL`, `LANG`, etc.) are forwarded to stdio child processes, preventing secret leakage.
- **Atomic state writes**: Both `~/.claude.json` and `~/.mcp-manager-state.json` are written atomically (write to tmp file, then rename) to avoid corruption on crash.
- **Cache size limit**: The tool prober cache is bounded at 200 entries with FIFO eviction.

## How the Lifecycle Works

1. **Session starts** — Claude Code runs `start-server.sh` via the `SessionStart` hook
2. **Server boots** (if not running) — Express server starts on `127.0.0.1` (localhost only), loads persisted state
3. **Session registers** — Hook sends `POST /api/sessions` with session ID, cwd, and parent PID
4. **Dashboard available** — React SPA served at the configured port
5. **User manages servers** — Toggle, view tools, switch workspace scopes
6. **Session ends** — Claude Code process exits
7. **Watchdog detects** — Periodic PID liveness checks find no alive sessions
8. **Grace period** — After `GRACE_CHECKS` consecutive idle checks (~10s default)
9. **Auto-shutdown** — Server cleans up PID file and exits

The watchdog uses `process.kill(pid, 0)` (signal 0) to check if registered Claude Code PIDs are still alive — no hardcoded paths or file-based detection needed.

## Development

```bash
# Run server + Vite dev server (only Vite client has hot reload;
# server changes require manual restart)
npm run dev

# Build frontend for production
npm run build

# Build and start
npm run preview
```

During development, the Vite dev server runs on port 5173 and proxies `/api` requests to the Express server.

## Tech Stack

- **Server**: Node.js, Express 4, ES Modules
- **Client**: React 18, Vite 6, inline styles
- **MCP SDK**: `@modelcontextprotocol/sdk` for tool probing (stdio + HTTP transports)
- **Design**: Blade Design System tokens, dark theme, Inter font
- **Lifecycle**: Claude Code hooks (SessionStart + UserPromptSubmit), PID-based watchdog auto-shutdown

## Project Structure

```
mcp-manager/
├── .claude-plugin/
│   └── plugin.json          # Claude Code plugin metadata
├── .env.default              # Default configuration
├── client/
│   ├── index.html            # SPA entry point
│   ├── src/
│   │   ├── main.jsx          # React root
│   │   ├── App.jsx           # Main app with polling + server list
│   │   ├── blade-tokens.js   # Design system tokens
│   │   └── components/
│   │       ├── ErrorBoundary.jsx   # React error boundary
│   │       ├── Header.jsx          # Dashboard header with stats
│   │       ├── WorkspaceSelector.jsx  # Scope dropdown
│   │       ├── ServerCard.jsx      # Server card with toggle
│   │       └── ToolList.jsx        # Tool chip list
│   └── vite.config.js        # Vite build config
├── dist/                     # Built frontend (served by Express)
├── docs/                     # Documentation
├── hooks/
│   └── hooks.json            # Plugin hook definitions
├── scripts/
│   ├── start-server.sh       # SessionStart hook: starts server, registers session
│   ├── stop-server.sh        # Manual stop script
│   └── mcp-context-hint.sh   # UserPromptSubmit hook: injects context hint for MCP queries
├── server/
│   ├── index.js              # Express server + watchdog
│   ├── env.js                # Typed configuration loader (incl. probeTimeoutMs)
│   ├── config-manager.js     # Claude config file reader/writer
│   ├── workspace-registry.js # Session + workspace state
│   └── tool-prober.js        # MCP tool discovery
├── skills/
│   ├── add/SKILL.md          # /mcp-manager:add — add a new MCP server
│   ├── context/SKILL.md      # /mcp-manager:context — token usage per server
│   ├── delete/SKILL.md       # /mcp-manager:delete — remove an MCP server
│   ├── list/SKILL.md         # /mcp-manager:list — list all servers
│   ├── open/SKILL.md         # /mcp-manager:open — open dashboard in browser
│   ├── status/SKILL.md       # /mcp-manager:status — full status overview
│   └── toggle/SKILL.md       # /mcp-manager:toggle — enable/disable a server
└── package.json
```

