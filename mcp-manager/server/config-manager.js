import { readFile, writeFile, rename, unlink } from 'fs/promises';
import { randomBytes } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';

const CLAUDE_JSON = join(homedir(), '.claude.json');
const INSTALLED_PLUGINS = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

let lockPromise = Promise.resolve();

async function withLock(fn) {
  const prev = lockPromise;
  let release;
  lockPromise = new Promise(resolve => { release = resolve; });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function readClaudeJson() {
  try {
    const raw = await readFile(CLAUDE_JSON, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { mcpServers: {}, _mcpServers_disabled: {} };
    }
    if (err instanceof SyntaxError) {
      console.error('Warning: ~/.claude.json contains invalid JSON, using defaults');
      return { mcpServers: {}, _mcpServers_disabled: {} };
    }
    throw err;
  }
}

async function writeClaudeJson(data) {
  const tmpFile = `${CLAUDE_JSON}.tmp.${randomBytes(4).toString('hex')}`;
  try {
    await writeFile(tmpFile, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    await rename(tmpFile, CLAUDE_JSON);
  } catch (err) {
    try { await unlink(tmpFile); } catch {}
    throw err;
  }
}

async function readMcpJson(workspacePath) {
  const mcpPath = join(workspacePath, '.mcp.json');
  try {
    const raw = await readFile(mcpPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    if (err instanceof SyntaxError) {
      console.error(`Warning: ${mcpPath} contains invalid JSON, skipping`);
      return null;
    }
    throw err;
  }
}

async function writeMcpJson(workspacePath, data) {
  const mcpPath = join(workspacePath, '.mcp.json');
  const tmpFile = `${mcpPath}.tmp.${randomBytes(4).toString('hex')}`;
  try {
    await writeFile(tmpFile, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o644 });
    await rename(tmpFile, mcpPath);
  } catch (err) {
    try { await unlink(tmpFile); } catch {}
    throw err;
  }
}

// Claude Code stores workspace MCP toggle state in .claude/settings.local.json
// (NOT in ~/.claude.json projects). We must read/write there to stay in sync.
async function readLocalSettings(workspacePath) {
  const settingsPath = join(workspacePath, '.claude', 'settings.local.json');
  try {
    const raw = await readFile(settingsPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    if (err instanceof SyntaxError) {
      console.error(`Warning: ${settingsPath} contains invalid JSON, using defaults`);
      return {};
    }
    throw err;
  }
}

async function writeLocalSettings(workspacePath, data) {
  const claudeDir = join(workspacePath, '.claude');
  const settingsPath = join(claudeDir, 'settings.local.json');
  // Ensure .claude/ directory exists
  const { mkdir } = await import('fs/promises');
  await mkdir(claudeDir, { recursive: true });
  const tmpFile = `${settingsPath}.tmp.${randomBytes(4).toString('hex')}`;
  try {
    await writeFile(tmpFile, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o644 });
    await rename(tmpFile, settingsPath);
  } catch (err) {
    try { await unlink(tmpFile); } catch {}
    throw err;
  }
}

function extractGlobalServers(config) {
  const enabled = config.mcpServers || {};
  const disabled = config._mcpServers_disabled || {};
  const servers = [];
  for (const [name, cfg] of Object.entries(enabled)) {
    servers.push({ name, config: cfg, enabled: true, scope: 'global' });
  }
  for (const [name, cfg] of Object.entries(disabled)) {
    servers.push({ name, config: cfg, enabled: false, scope: 'global' });
  }
  return servers.sort((a, b) => a.name.localeCompare(b.name));
}

async function extractWorkspaceServers(workspacePath) {
  const mcpJson = await readMcpJson(workspacePath);
  if (!mcpJson) return [];

  const localSettings = await readLocalSettings(workspacePath);
  const disabledList = localSettings.disabledMcpjsonServers || [];
  const mcpServers = mcpJson.mcpServers || {};
  const servers = [];

  for (const [name, cfg] of Object.entries(mcpServers)) {
    servers.push({
      name,
      config: cfg,
      enabled: !disabledList.includes(name),
      scope: workspacePath,
    });
  }
  return servers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGlobalServers() {
  const config = await readClaudeJson();
  return extractGlobalServers(config);
}

export async function getWorkspaceServers(workspacePath) {
  return extractWorkspaceServers(workspacePath);
}

export async function getAllServers(workspaces) {
  const config = await readClaudeJson();
  const globalServers = extractGlobalServers(config);
  const wsResults = await Promise.all(
    workspaces.map(ws => extractWorkspaceServers(ws))
  );
  const result = { global: globalServers };
  workspaces.forEach((ws, i) => {
    // Merge: local servers first, then globals
    result[ws] = [...wsResults[i], ...globalServers];
  });
  return result;
}

export async function getEnabledServerConfigs() {
  const config = await readClaudeJson();
  const enabled = config.mcpServers || {};
  return Object.entries(enabled).map(([name, cfg]) => ({ name, config: cfg }));
}

export async function toggleServer(name, scope, targetEnabled) {
  return withLock(async () => {
    const config = await readClaudeJson();

    if (scope === 'global') {
      const enabled = config.mcpServers || {};
      const disabled = config._mcpServers_disabled || {};

      const isCurrentlyEnabled = !!enabled[name];
      if (typeof targetEnabled === 'boolean') {
        if (targetEnabled === isCurrentlyEnabled) {
          return { name, enabled: isCurrentlyEnabled };
        }
      }

      if (enabled[name]) {
        disabled[name] = enabled[name];
        delete enabled[name];
      } else if (disabled[name]) {
        enabled[name] = disabled[name];
        delete disabled[name];
      } else {
        throw new Error(`Server "${name}" not found in global config`);
      }

      config.mcpServers = enabled;
      config._mcpServers_disabled = disabled;
      await writeClaudeJson(config);

      return { name, enabled: !!config.mcpServers[name] };
    }

    // Workspace scope — only .mcp.json servers allowed
    const globalEnabled = config.mcpServers || {};
    const globalDisabled = config._mcpServers_disabled || {};
    const isGlobalServer = !!(globalEnabled[name] || globalDisabled[name]);

    if (isGlobalServer) {
      throw new Error(
        `Cannot toggle global server "${name}" at workspace scope. ` +
        `Global servers can only be toggled in the Global scope. ` +
        `Claude Code has no mechanism to disable global servers per-project.`
      );
    }

    // Native .mcp.json server — manage disabledMcpjsonServers in .claude/settings.local.json
    const localSettings = await readLocalSettings(scope);
    if (!localSettings.disabledMcpjsonServers) localSettings.disabledMcpjsonServers = [];

    const idx = localSettings.disabledMcpjsonServers.indexOf(name);
    const isCurrentlyEnabled = idx < 0;

    if (typeof targetEnabled === 'boolean') {
      if (targetEnabled === isCurrentlyEnabled) {
        return { name, enabled: isCurrentlyEnabled };
      }
    }

    if (idx >= 0) {
      localSettings.disabledMcpjsonServers.splice(idx, 1);
    } else {
      localSettings.disabledMcpjsonServers.push(name);
    }

    await writeLocalSettings(scope, localSettings);

    return { name, enabled: !localSettings.disabledMcpjsonServers.includes(name) };
  });
}

export async function addServer(name, scope, serverConfig) {
  return withLock(async () => {
    if (scope === 'global') {
      const config = await readClaudeJson();
      const enabled = config.mcpServers || {};
      const disabled = config._mcpServers_disabled || {};
      if (enabled[name] || disabled[name]) {
        throw new Error(`Server "${name}" already exists in global scope`);
      }
      config.mcpServers = { ...enabled, [name]: serverConfig };
      await writeClaudeJson(config);
    } else {
      let mcpJson = await readMcpJson(scope);
      if (!mcpJson) mcpJson = { mcpServers: {} };
      if (!mcpJson.mcpServers) mcpJson.mcpServers = {};
      if (mcpJson.mcpServers[name]) {
        throw new Error(`Server "${name}" already exists in this project`);
      }
      mcpJson.mcpServers[name] = serverConfig;
      await writeMcpJson(scope, mcpJson);
    }
    return { name, scope, enabled: true };
  });
}

export async function deleteServer(name, scope) {
  return withLock(async () => {
    if (scope === 'global') {
      const config = await readClaudeJson();
      const enabled = config.mcpServers || {};
      const disabled = config._mcpServers_disabled || {};
      if (!enabled[name] && !disabled[name]) {
        throw new Error(`Server "${name}" not found in global scope`);
      }
      delete enabled[name];
      delete disabled[name];
      config.mcpServers = enabled;
      config._mcpServers_disabled = disabled;
      await writeClaudeJson(config);
    } else {
      const mcpJson = await readMcpJson(scope);
      if (!mcpJson?.mcpServers?.[name]) {
        throw new Error(`Server "${name}" not found in this project`);
      }
      delete mcpJson.mcpServers[name];
      await writeMcpJson(scope, mcpJson);

      // Clean up disabledMcpjsonServers reference in .claude/settings.local.json
      const localSettings = await readLocalSettings(scope);
      const disabledList = localSettings.disabledMcpjsonServers;
      if (Array.isArray(disabledList)) {
        const idx = disabledList.indexOf(name);
        if (idx >= 0) {
          disabledList.splice(idx, 1);
          await writeLocalSettings(scope, localSettings);
        }
      }
    }
    return { name, scope, deleted: true };
  });
}

// --- Plugin MCP Server Discovery ---
// Plugins installed via `claude plugin install` can bundle their own MCP servers
// in .mcp.json or mcp.json within their install directory.

async function readInstalledPlugins() {
  try {
    const raw = await readFile(INSTALLED_PLUGINS, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    if (err instanceof SyntaxError) {
      console.error('Warning: installed_plugins.json contains invalid JSON, skipping');
      return null;
    }
    throw err;
  }
}

async function readPluginMcpJson(installPath) {
  // Plugins use .mcp.json or mcp.json (both conventions exist)
  for (const filename of ['.mcp.json', 'mcp.json']) {
    const mcpPath = join(installPath, filename);
    try {
      const raw = await readFile(mcpPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      if (err instanceof SyntaxError) {
        console.error(`Warning: ${mcpPath} contains invalid JSON, skipping`);
        return null;
      }
      throw err;
    }
  }
  return null;
}

export async function getPluginServers() {
  const pluginsData = await readInstalledPlugins();
  if (!pluginsData?.plugins) return [];

  const servers = [];

  for (const [pluginKey, installations] of Object.entries(pluginsData.plugins)) {
    if (!Array.isArray(installations) || installations.length === 0) continue;

    const pluginName = pluginKey.split('@')[0] || pluginKey;

    // Process every installation — a plugin can be installed globally (user)
    // AND for specific projects, each with independent toggle state
    for (const install of installations) {
      if (!install.installPath) continue;

      const mcpJson = await readPluginMcpJson(install.installPath);
      if (!mcpJson?.mcpServers) continue;

      // Read toggle state from this installation's .claude/settings.local.json
      const localSettings = await readLocalSettings(install.installPath);
      const disabledList = localSettings.disabledMcpjsonServers || [];

      // "user" = globally installed, "project" = project-scoped
      const pluginScope = install.scope || 'user';

      for (const [name, cfg] of Object.entries(mcpJson.mcpServers)) {
        servers.push({
          name,
          config: cfg,
          enabled: !disabledList.includes(name),
          scope: install.installPath, // installPath as scope for toggle writes
          pluginName,
          pluginVersion: install.version || null,
          pluginScope,
          projectPath: install.projectPath || null,
        });
      }
    }
  }

  return servers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function togglePluginServer(name, installPath) {
  return withLock(async () => {
    const localSettings = await readLocalSettings(installPath);
    if (!localSettings.disabledMcpjsonServers) localSettings.disabledMcpjsonServers = [];

    const idx = localSettings.disabledMcpjsonServers.indexOf(name);
    if (idx >= 0) {
      localSettings.disabledMcpjsonServers.splice(idx, 1);
    } else {
      localSettings.disabledMcpjsonServers.push(name);
    }

    await writeLocalSettings(installPath, localSettings);
    return { name, enabled: !localSettings.disabledMcpjsonServers.includes(name) };
  });
}

// Exported for testing
export { writeMcpJson };
