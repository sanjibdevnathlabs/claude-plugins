# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code **plugin marketplace** repository. Contains open-source plugins distributed via the `claude plugin marketplace` system. Currently ships one plugin: **mcp-manager** (a web dashboard for managing MCP servers).

The repo root is the marketplace (`.claude-plugin/marketplace.json`), and each plugin lives in its own top-level directory (e.g., `mcp-manager/`).

## Build, Test, and Run

All commands run from the `mcp-manager/` directory:

```bash
cd mcp-manager

npm ci                  # Install dependencies (use ci, not install, for reproducible builds)
npm run build           # Build React SPA → dist/
npm run dev             # Dev mode: Express on :4111 + Vite HMR on :5173 (proxies /api → :4111)
npm start               # Production server on :4111 (serves dist/)
npm run preview         # Build + start in one command

# Tests (Vitest)
npm run test            # Frontend tests only (jsdom env)
npm run test:backend    # Backend tests only (node env)
npm run test:all        # Both — this is what CI runs

# Run a single test file
npx vitest run --config client/vitest.config.js client/src/App.test.jsx
npx vitest run --config server/vitest.config.js server/config-manager.test.js
```

CI runs on Node 20 and 22 (`npm ci && npm run build && npm run test:all`).

## Architecture

```
claude-plugins/                     ← Marketplace root
├── .claude-plugin/marketplace.json ← Plugin registry (version must match plugin.json + package.json)
└── mcp-manager/                    ← The plugin
    ├── server/                     ← Express REST API (127.0.0.1:4111)
    │   ├── index.js                ← All endpoints, watchdog, request validation
    │   ├── config-manager.js       ← Read/write ~/.claude.json, .mcp.json, settings.local.json
    │   ├── tool-prober.js          ← MCP SDK client, stdio/http probe, bounded cache (200 entries, 5min TTL)
    │   ├── workspace-registry.js   ← Session tracking, workspace state, persists to ~/.mcp-manager-state.json
    │   └── env.js                  ← Cascading config: .env.default → .env → process.env
    ├── client/src/                 ← React 18 SPA (Vite 6)
    │   ├── App.jsx                 ← Main orchestrator: polling, scope/tab state, all handlers
    │   ├── blade-tokens.js         ← Razorpay Blade design system tokens (dark theme)
    │   └── components/             ← ServerCard, WorkspaceSelector, Header, AddServerForm, ToolList, etc.
    ├── hooks/hooks.json            ← SessionStart + UserPromptSubmit hook definitions
    ├── scripts/                    ← Shell scripts invoked by hooks (start-server.sh, stop-server.sh, mcp-context-hint.sh)
    ├── skills/                     ← 7 slash commands (/mcp-manager:list, :toggle, :add, :delete, :context, :status, :open)
    └── dist/                       ← Built frontend (gitignored, served by Express in production)
```

### Lifecycle

1. Claude Code session starts → `SessionStart` hook runs `start-server.sh`
2. Script boots Express server (if not running), registers session via `POST /api/sessions`
3. Dashboard serves React SPA; frontend polls `/api/config` at configurable interval
4. Watchdog monitors registered PIDs via `process.kill(pid, 0)` — auto-shuts down server when all sessions die

### Config file locations the server reads/writes

| Scope | File | Key |
|-------|------|-----|
| Global enabled | `~/.claude.json` | `mcpServers` |
| Global disabled | `~/.claude.json` | `_mcpServers_disabled` |
| Project servers | `<project>/.mcp.json` | `mcpServers` |
| Project toggle | `<project>/.claude/settings.local.json` | `disabledMcpjsonServers` (array of names) |
| Plugin servers | `~/.claude/plugins/installed_plugins.json` → install paths → `.mcp.json` | Per-plugin |

## Key Conventions

- **ES Modules** everywhere (`"type": "module"`, `import`/`export`)
- **No TypeScript** — plain JS with JSDoc where complex
- **React 18** function components + hooks only (no classes)
- **Inline styles** using Blade design tokens from `blade-tokens.js` — no CSS files, no styled-components, no external UI libs
- **Atomic file writes**: temp file + `rename()` for config files (see `config-manager.js`)
- **Promise-based lock**: `withLock()` for concurrent config writes
- **Security**: API responses strip `env` and `headers` fields; tool prober uses env whitelist for child processes
- **Error caching**: tool prober caches errors at same TTL to prevent retry storms

### Testing conventions

- Vitest with **separate configs**: `client/vitest.config.js` (jsdom) and `server/vitest.config.js` (node)
- React Testing Library + `@testing-library/user-event`
- `vi.useFakeTimers({ shouldAdvanceTime: true })` for polling tests
- `global.fetch = mockFetchResponses({...})` pattern for API mocking
- Backend tests use temp directories with `vi.spyOn(os, 'homedir')`

## Version Bumping

Update version in **all three files** (must stay in sync):
1. `mcp-manager/package.json` → `"version"`
2. `mcp-manager/.claude-plugin/plugin.json` → `"version"`
3. `.claude-plugin/marketplace.json` → `plugins[0].version`

Also check `mcp-manager/package-lock.json` root `"version"` — it can drift.

## Common Pitfalls

- Plugin toggle scope is the **install path** (e.g., `/Users/x/.claude/plugins/cache/...`), not `"global"` or a workspace path
- `disabledMcpjsonServers` is an **array of server names**, not full config objects
- Tool prober only supports `stdio` and `http` transports — `sse` and `streamable-http` return descriptive errors
- The SPA fallback (`app.get('*')`) must come AFTER the API 404 handler in `server/index.js`
- `.claude/` is gitignored inside `mcp-manager/` but the root `.claude/skills/` is committed (developer skill)
