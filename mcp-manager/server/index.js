import './env.js';
import { config as env } from './env.js';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlinkSync } from 'fs';
import { homedir } from 'os';
import {
  getGlobalServers,
  getWorkspaceServers,
  getAllServers,
  toggleServer,
  getEnabledServerConfigs,
  addServer,
  deleteServer,
  getPluginServers,
  togglePluginServer,
} from './config-manager.js';
import {
  loadState,
  registerSession,
  unregisterSession,
  getSessionCount,
  getWorkspaces,
  getSessions,
  getSessionPids,
  removeWorkspace,
} from './workspace-registry.js';
import { probeServerTools, clearCache } from './tool-prober.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({ origin: [`http://localhost:${env.port}`, `http://127.0.0.1:${env.port}`] }));
app.use(express.json({ limit: '100kb' }));

function sanitizeServers(servers) {
  if (!Array.isArray(servers)) return servers;
  return servers.map(s => {
    const sanitized = { ...s };
    if (sanitized.config) {
      sanitized.config = { ...sanitized.config };
      delete sanitized.config.env;
      delete sanitized.config.headers;
    }
    return sanitized;
  });
}

// Serve built frontend
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --- Client config (exposes safe-to-share settings for the frontend) ---
app.get('/api/client-config', (req, res) => {
  res.json({ pollIntervalMs: env.pollIntervalMs });
});

// --- Config: all servers grouped by workspace ---
app.get('/api/config', async (req, res) => {
  try {
    const workspaces = getWorkspaces();
    const [result, pluginServers] = await Promise.all([
      getAllServers(workspaces),
      getPluginServers(),
    ]);
    // Sanitize each scope's server list
    const sanitized = {};
    for (const [key, servers] of Object.entries(result)) {
      sanitized[key] = sanitizeServers(servers);
    }
    sanitized._plugins = sanitizeServers(pluginServers);
    sanitized._meta = { homedir: homedir() };
    res.json(sanitized);
  } catch (err) {
    console.error('Config read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Config: servers for a specific scope ---
app.get('/api/config/:scope', async (req, res) => {
  try {
    const scope = req.params.scope;
    if (scope === 'global') {
      res.json(sanitizeServers(await getGlobalServers()));
    } else {
      const workspacePath = scope; // Express auto-decodes route params
      const registeredWorkspaces = getWorkspaces();
      if (!registeredWorkspaces.includes(workspacePath)) {
        return res.status(400).json({ error: 'Unknown workspace scope' });
      }
      res.json(sanitizeServers(await getWorkspaceServers(workspacePath)));
    }
  } catch (err) {
    console.error('Config read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Toggle server ---
app.post('/api/servers/toggle', async (req, res) => {
  try {
    const { name, scope, enabled: targetEnabled } = req.body;
    if (!name || typeof name !== 'string' || name.length > 256) {
      return res.status(400).json({ error: 'Invalid or missing name' });
    }
    if (!scope || typeof scope !== 'string' || scope.length > 4096) {
      return res.status(400).json({ error: 'Invalid or missing scope' });
    }
    if (scope !== 'global') {
      const registeredWorkspaces = getWorkspaces();
      if (!registeredWorkspaces.includes(scope)) {
        return res.status(400).json({ error: 'Unknown workspace scope' });
      }
    }
    const result = await toggleServer(name, scope, targetEnabled);
    clearCache(scope, name);
    res.json(result);
  } catch (err) {
    console.error('Toggle error:', err);
    // Surface user-facing errors (invalid .mcp.json, global-at-workspace)
    if (err.message && (err.message.startsWith('Cannot modify') || err.message.startsWith('Cannot toggle global'))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Toggle plugin server ---
app.post('/api/plugins/toggle', async (req, res) => {
  try {
    const { name, scope } = req.body;
    if (!name || typeof name !== 'string' || name.length > 256) {
      return res.status(400).json({ error: 'Invalid or missing name' });
    }
    if (!scope || typeof scope !== 'string' || scope.length > 4096 || !scope.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid or missing scope (plugin install path)' });
    }
    const result = await togglePluginServer(name, scope);
    clearCache(scope, name);
    res.json(result);
  } catch (err) {
    console.error('Plugin toggle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Add server ---
app.post('/api/servers', async (req, res) => {
  try {
    const { name, scope, config: serverConfig } = req.body;
    if (!name || typeof name !== 'string' || name.length === 0 || name.length > 256) {
      return res.status(400).json({ error: 'Invalid or missing server name' });
    }
    if (!scope || typeof scope !== 'string' || scope.length > 4096) {
      return res.status(400).json({ error: 'Invalid or missing scope' });
    }
    if (scope !== 'global') {
      const registeredWorkspaces = getWorkspaces();
      if (!registeredWorkspaces.includes(scope)) {
        return res.status(400).json({ error: 'Unknown workspace scope' });
      }
    }
    if (!serverConfig || typeof serverConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid or missing config' });
    }
    if (serverConfig.type !== 'http' && serverConfig.type !== 'stdio') {
      return res.status(400).json({ error: 'config.type must be "http" or "stdio"' });
    }
    if (serverConfig.type === 'http') {
      if (!serverConfig.url || typeof serverConfig.url !== 'string') {
        return res.status(400).json({ error: 'HTTP servers require a valid url' });
      }
      try { new URL(serverConfig.url); } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }
    if (serverConfig.type === 'stdio') {
      if (!serverConfig.command || typeof serverConfig.command !== 'string' || serverConfig.command.trim().length === 0) {
        return res.status(400).json({ error: 'STDIO servers require a non-empty command' });
      }
    }
    const result = await addServer(name, scope, serverConfig);
    res.json(result);
  } catch (err) {
    console.error('Add server error:', err);
    if (err.message && err.message.startsWith('Server "')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Delete server ---
app.delete('/api/servers', async (req, res) => {
  try {
    const { name, scope } = req.body;
    if (!name || typeof name !== 'string' || name.length > 256) {
      return res.status(400).json({ error: 'Invalid or missing name' });
    }
    if (!scope || typeof scope !== 'string' || scope.length > 4096) {
      return res.status(400).json({ error: 'Invalid or missing scope' });
    }
    if (scope !== 'global') {
      const registeredWorkspaces = getWorkspaces();
      if (!registeredWorkspaces.includes(scope)) {
        return res.status(400).json({ error: 'Unknown workspace scope' });
      }
    }
    const result = await deleteServer(name, scope);
    clearCache(scope, name);
    res.json(result);
  } catch (err) {
    console.error('Delete server error:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Probe server tools ---
app.get('/api/servers/:scope/:name/tools', async (req, res) => {
  try {
    const { scope, name } = req.params;
    const decodedScope = scope; // Express auto-decodes route params

    // Find server config — check global, workspaces, then plugins
    let server;
    if (decodedScope === 'global') {
      const servers = await getGlobalServers();
      server = servers.find(s => s.name === name);
    } else {
      const registeredWorkspaces = getWorkspaces();
      if (registeredWorkspaces.includes(decodedScope)) {
        const servers = await getWorkspaceServers(decodedScope);
        server = servers.find(s => s.name === name);
      } else {
        // Could be a plugin install path
        const pluginServers = await getPluginServers();
        server = pluginServers.find(s => s.scope === decodedScope && s.name === name);
      }
    }

    if (!server) {
      return res.status(404).json({ error: `Server "${name}" not found` });
    }

    const tools = await probeServerTools(name, server.config, decodedScope);
    res.json(tools);
  } catch (err) {
    console.error('Tool probe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Sessions ---
app.post('/api/sessions', (req, res) => {
  const { session_id, cwd, pid } = req.body || {};
  if (!session_id || typeof session_id !== 'string' || session_id.length > 256
      || !/^[a-zA-Z0-9_\-]+$/.test(session_id)) {
    return res.status(400).json({ error: 'Invalid or missing session_id' });
  }
  if (cwd !== undefined && (typeof cwd !== 'string' || cwd.length > 4096 || !cwd.startsWith('/'))) {
    return res.status(400).json({ error: 'Invalid cwd' });
  }
  if (pid !== undefined && (!Number.isInteger(pid) || pid <= 0)) {
    return res.status(400).json({ error: 'Invalid pid' });
  }
  registerSession(session_id, cwd, pid);
  res.json({ ok: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  unregisterSession(req.params.id);
  res.json({ ok: true });
});

app.get('/api/sessions/count', (req, res) => {
  res.json({ count: getSessionCount() });
});

app.get('/api/sessions', (req, res) => {
  res.json(getSessions());
});

// --- Workspaces ---
app.get('/api/workspaces', (req, res) => {
  res.json(getWorkspaces());
});

app.delete('/api/workspaces/:path', (req, res) => {
  const workspacePath = req.params.path;
  const removed = removeWorkspace(workspacePath);
  if (!removed) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  res.json({ ok: true });
});

// --- Context usage ---
const TOKENS_PER_TOOL = 600;
const WARNING_THRESHOLD = 25000;

app.get('/api/context-usage', async (req, res) => {
  try {
    const [enabledConfigs, pluginServers] = await Promise.all([
      getEnabledServerConfigs(),
      getPluginServers(),
    ]);

    // Include enabled plugin servers in context calculation
    const enabledPlugins = pluginServers
      .filter(s => s.enabled)
      .map(s => ({ name: s.name, config: s.config, scope: s.scope, source: 'plugin' }));

    const allConfigs = [
      ...enabledConfigs.map(c => ({ ...c, scope: 'global', source: 'global' })),
      ...enabledPlugins,
    ];

    const results = await Promise.allSettled(
      allConfigs.map(async ({ name, config, scope, source }) => {
        try {
          const tools = await probeServerTools(name, config, scope);
          if (tools && tools.error) {
            return { name, toolCount: 0, estimatedTokens: 0, error: tools.error, source };
          }
          const toolCount = Array.isArray(tools) ? tools.length : 0;
          return { name, toolCount, estimatedTokens: toolCount * TOKENS_PER_TOOL, error: null, source };
        } catch (err) {
          return { name, toolCount: 0, estimatedTokens: 0, error: err.message, source };
        }
      })
    );

    const servers = results.map(r => r.status === 'fulfilled' ? r.value : {
      name: 'unknown', toolCount: 0, estimatedTokens: 0, error: 'Probe failed', source: 'unknown',
    });
    const totalTokens = servers.reduce((sum, s) => sum + s.estimatedTokens, 0);

    res.json({
      servers,
      totalTokens,
      threshold: WARNING_THRESHOLD,
      warning: totalTokens > WARNING_THRESHOLD,
    });
  } catch (err) {
    console.error('Context usage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API 404 handler — catch unmatched API routes before SPA fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// --- Auto-shutdown watchdog ---
// Claude Code has no SessionEnd hook, so the server must self-terminate
// when no registered Claude Code sessions are alive.
// Each session registers its parent Claude PID. The watchdog checks if
// any of those PIDs are still running — no hardcoded paths needed.
let idleChecks = 0;

function isPidAlive(pid) {
  try {
    process.kill(pid, 0); // signal 0 = liveness check, doesn't actually kill
    return true;
  } catch {
    return false;
  }
}

function hasAliveSessions() {
  const sessions = getSessions();
  const sessionEntries = Object.entries(sessions);
  if (sessionEntries.length === 0) return false;

  let anyAlive = false;
  for (const [id, session] of sessionEntries) {
    if (session.pid && !isPidAlive(session.pid)) {
      unregisterSession(id);
    } else if (session.pid) {
      anyAlive = true;
    } else {
      // No PID recorded — cannot verify liveness, assume alive (C-9 contract)
      anyAlive = true;
    }
  }
  return anyAlive;
}

let watchdogInterval;
function startWatchdog() {
  watchdogInterval = setInterval(() => {
    if (hasAliveSessions()) {
      idleChecks = 0;
      return;
    }
    idleChecks++;
    if (idleChecks >= env.graceChecks) {
      console.log('No live Claude Code sessions. Shutting down MCP Manager.');
      try { unlinkSync(env.pidFile); } catch {}
      process.exit(0);
    }
  }, env.watchdogIntervalMs);
}

async function start() {
  await loadState();
  const server = app.listen(env.port, '127.0.0.1', () => {
    console.log(`MCP Manager running at http://localhost:${env.port}`);
    startWatchdog();
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. Is MCP Manager already running?`);
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
}

function cleanup() {
  if (watchdogInterval) clearInterval(watchdogInterval);
  try { unlinkSync(env.pidFile); } catch {}
  process.exit(0);
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
