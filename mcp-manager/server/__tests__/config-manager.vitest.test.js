import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// We need to mock homedir before importing the module so CLAUDE_JSON points to our tmp dir
let tmpDir;
let configManager;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'mcp-mgr-vitest-'));
  // Reset module registry so CLAUDE_JSON picks up the mocked homedir
  vi.resetModules();
  vi.doMock('os', () => ({ homedir: () => tmpDir }));
  configManager = await import('../config-manager.js');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tmpDir, { recursive: true, force: true });
});

async function writeClaudeJson(data) {
  const path = join(tmpDir, '.claude.json');
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function readClaudeJsonRaw() {
  return JSON.parse(await readFile(join(tmpDir, '.claude.json'), 'utf8'));
}

async function makeWorkspace(name) {
  const wsDir = join(tmpDir, name);
  await mkdir(wsDir, { recursive: true });
  return wsDir;
}

// =====================================
// getGlobalServers / extractGlobalServers
// =====================================
describe('getGlobalServers', () => {
  it('returns enabled and disabled servers sorted by name', async () => {
    await writeClaudeJson({
      mcpServers: { beta: { command: 'b' }, alpha: { command: 'a' } },
      _mcpServers_disabled: { gamma: { command: 'g' } },
    });

    const servers = await configManager.getGlobalServers();
    expect(servers).toHaveLength(3);
    expect(servers[0]).toMatchObject({ name: 'alpha', enabled: true, scope: 'global' });
    expect(servers[1]).toMatchObject({ name: 'beta', enabled: true, scope: 'global' });
    expect(servers[2]).toMatchObject({ name: 'gamma', enabled: false, scope: 'global' });
  });

  it('returns empty array when no servers exist', async () => {
    await writeClaudeJson({});
    const servers = await configManager.getGlobalServers();
    expect(servers).toEqual([]);
  });

  it('handles missing .claude.json gracefully', async () => {
    const servers = await configManager.getGlobalServers();
    expect(servers).toEqual([]);
  });
});

// =====================================
// getWorkspaceServers / extractWorkspaceServers
// =====================================
describe('getWorkspaceServers', () => {
  it('returns servers from .mcp.json with enabled=true by default', async () => {
    const ws = await makeWorkspace('ws1');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'cmd' } },
    }));

    const servers = await configManager.getWorkspaceServers(ws);
    expect(servers).toHaveLength(1);
    expect(servers[0]).toMatchObject({ name: 'local', enabled: true, scope: ws });
  });

  it('returns empty array when .mcp.json does not exist', async () => {
    const ws = await makeWorkspace('ws-empty');
    const servers = await configManager.getWorkspaceServers(ws);
    expect(servers).toEqual([]);
  });

  it('marks servers disabled via settings.local.json', async () => {
    const ws = await makeWorkspace('ws-disabled');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { srv: { command: 'x' } },
    }));
    await mkdir(join(ws, '.claude'), { recursive: true });
    await writeFile(join(ws, '.claude', 'settings.local.json'), JSON.stringify({
      disabledMcpjsonServers: ['srv'],
    }));

    const servers = await configManager.getWorkspaceServers(ws);
    expect(servers[0]).toMatchObject({ name: 'srv', enabled: false });
  });

  it('handles invalid .mcp.json gracefully', async () => {
    const ws = await makeWorkspace('ws-bad');
    await writeFile(join(ws, '.mcp.json'), 'not json{{{');
    const servers = await configManager.getWorkspaceServers(ws);
    expect(servers).toEqual([]);
  });
});

// =====================================
// getAllServers — merging globals into workspaces
// =====================================
describe('getAllServers', () => {
  it('includes globals in each workspace result (local first, then globals)', async () => {
    await writeClaudeJson({
      mcpServers: { gserver: { command: 'g' } },
    });
    const ws = await makeWorkspace('ws-merge');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { lserver: { command: 'l' } },
    }));

    const result = await configManager.getAllServers([ws]);
    expect(result.global).toHaveLength(1);
    expect(result.global[0].name).toBe('gserver');

    // Workspace should have local first, then global
    expect(result[ws]).toHaveLength(2);
    expect(result[ws][0].name).toBe('lserver');
    expect(result[ws][0].scope).toBe(ws);
    expect(result[ws][1].name).toBe('gserver');
    expect(result[ws][1].scope).toBe('global');
  });

  it('returns only globals for workspace with no .mcp.json', async () => {
    await writeClaudeJson({
      mcpServers: { g: { command: 'g' } },
    });
    const ws = await makeWorkspace('ws-no-mcp');

    const result = await configManager.getAllServers([ws]);
    expect(result[ws]).toHaveLength(1);
    expect(result[ws][0].scope).toBe('global');
  });
});

// =====================================
// getEnabledServerConfigs
// =====================================
describe('getEnabledServerConfigs', () => {
  it('returns only enabled servers', async () => {
    await writeClaudeJson({
      mcpServers: { a: { command: 'a' }, b: { command: 'b' } },
      _mcpServers_disabled: { c: { command: 'c' } },
    });

    const configs = await configManager.getEnabledServerConfigs();
    expect(configs).toHaveLength(2);
    expect(configs.map(c => c.name).sort()).toEqual(['a', 'b']);
    for (const entry of configs) {
      expect(entry).toHaveProperty('config');
    }
  });
});

// =====================================
// toggleServer — global
// =====================================
describe('toggleServer — global', () => {
  it('disables an enabled global server', async () => {
    await writeClaudeJson({
      mcpServers: { srv: { command: 'n' } },
      _mcpServers_disabled: {},
    });

    const result = await configManager.toggleServer('srv', 'global');
    expect(result.enabled).toBe(false);

    const data = await readClaudeJsonRaw();
    expect(data.mcpServers.srv).toBeUndefined();
    expect(data._mcpServers_disabled.srv).toBeDefined();
  });

  it('enables a disabled global server', async () => {
    await writeClaudeJson({
      mcpServers: {},
      _mcpServers_disabled: { srv: { command: 'n' } },
    });

    const result = await configManager.toggleServer('srv', 'global');
    expect(result.enabled).toBe(true);

    const data = await readClaudeJsonRaw();
    expect(data.mcpServers.srv).toBeDefined();
    expect(data._mcpServers_disabled.srv).toBeUndefined();
  });

  it('no-ops when targetEnabled matches current state', async () => {
    await writeClaudeJson({
      mcpServers: { srv: { command: 'n' } },
      _mcpServers_disabled: {},
    });

    const result = await configManager.toggleServer('srv', 'global', true);
    expect(result.enabled).toBe(true);

    // Should not have moved
    const data = await readClaudeJsonRaw();
    expect(data.mcpServers.srv).toBeDefined();
  });

  it('throws for nonexistent server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    await expect(configManager.toggleServer('nope', 'global')).rejects.toThrow(/not found/);
  });
});

// =====================================
// toggleServer — workspace
// =====================================
describe('toggleServer — workspace', () => {
  it('disables a workspace server via settings.local.json', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-toggle');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));

    const result = await configManager.toggleServer('local', ws);
    expect(result.enabled).toBe(false);

    const settings = JSON.parse(await readFile(join(ws, '.claude', 'settings.local.json'), 'utf8'));
    expect(settings.disabledMcpjsonServers).toContain('local');
  });

  it('re-enables a disabled workspace server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-reenable');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));
    await mkdir(join(ws, '.claude'), { recursive: true });
    await writeFile(join(ws, '.claude', 'settings.local.json'), JSON.stringify({
      disabledMcpjsonServers: ['local'],
    }));

    const result = await configManager.toggleServer('local', ws);
    expect(result.enabled).toBe(true);

    const settings = JSON.parse(await readFile(join(ws, '.claude', 'settings.local.json'), 'utf8'));
    expect(settings.disabledMcpjsonServers).not.toContain('local');
  });

  it('no-ops when targetEnabled matches current state', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-noop');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));

    const result = await configManager.toggleServer('local', ws, true);
    expect(result.enabled).toBe(true);
  });

  it('rejects toggling a global server at workspace scope', async () => {
    await writeClaudeJson({
      mcpServers: { gserver: { command: 'g' } },
      _mcpServers_disabled: {},
    });
    const ws = await makeWorkspace('ws-reject');

    await expect(configManager.toggleServer('gserver', ws)).rejects.toThrow(/Cannot toggle global/);
  });
});

// =====================================
// addServer
// =====================================
describe('addServer', () => {
  it('adds a new global server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });

    const result = await configManager.addServer('new', 'global', { command: 'node' });
    expect(result).toMatchObject({ name: 'new', scope: 'global', enabled: true });

    const data = await readClaudeJsonRaw();
    expect(data.mcpServers.new).toEqual({ command: 'node' });
  });

  it('rejects duplicate global server', async () => {
    await writeClaudeJson({ mcpServers: { dup: { command: 'n' } }, _mcpServers_disabled: {} });
    await expect(configManager.addServer('dup', 'global', { command: 'n' })).rejects.toThrow(/already exists/);
  });

  it('rejects duplicate in disabled global servers', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: { dup: { command: 'n' } } });
    await expect(configManager.addServer('dup', 'global', { command: 'n' })).rejects.toThrow(/already exists/);
  });

  it('adds a new workspace server to .mcp.json', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-add');

    const result = await configManager.addServer('new', ws, { command: 'go' });
    expect(result).toMatchObject({ name: 'new', scope: ws, enabled: true });

    const mcpJson = JSON.parse(await readFile(join(ws, '.mcp.json'), 'utf8'));
    expect(mcpJson.mcpServers.new).toEqual({ command: 'go' });
  });

  it('creates .mcp.json if it does not exist', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-create-mcp');

    await configManager.addServer('fresh', ws, { command: 'x' });

    const mcpJson = JSON.parse(await readFile(join(ws, '.mcp.json'), 'utf8'));
    expect(mcpJson.mcpServers.fresh).toBeDefined();
  });

  it('rejects duplicate workspace server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-add-dup');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({ mcpServers: { dup: { command: 'x' } } }));

    await expect(configManager.addServer('dup', ws, { command: 'y' })).rejects.toThrow(/already exists/);
  });
});

// =====================================
// deleteServer
// =====================================
describe('deleteServer', () => {
  it('deletes an enabled global server', async () => {
    await writeClaudeJson({
      mcpServers: { del: { command: 'n' } },
      _mcpServers_disabled: {},
    });

    const result = await configManager.deleteServer('del', 'global');
    expect(result).toMatchObject({ name: 'del', scope: 'global', deleted: true });

    const data = await readClaudeJsonRaw();
    expect(data.mcpServers.del).toBeUndefined();
  });

  it('deletes a disabled global server', async () => {
    await writeClaudeJson({
      mcpServers: {},
      _mcpServers_disabled: { del: { command: 'n' } },
    });

    await configManager.deleteServer('del', 'global');

    const data = await readClaudeJsonRaw();
    expect(data._mcpServers_disabled.del).toBeUndefined();
  });

  it('throws for nonexistent global server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    await expect(configManager.deleteServer('nope', 'global')).rejects.toThrow(/not found/);
  });

  it('deletes a workspace server and cleans settings', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-del');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));
    await mkdir(join(ws, '.claude'), { recursive: true });
    await writeFile(join(ws, '.claude', 'settings.local.json'), JSON.stringify({
      disabledMcpjsonServers: ['local'],
    }));

    const result = await configManager.deleteServer('local', ws);
    expect(result).toMatchObject({ name: 'local', deleted: true });

    const mcpJson = JSON.parse(await readFile(join(ws, '.mcp.json'), 'utf8'));
    expect(mcpJson.mcpServers.local).toBeUndefined();

    const settings = JSON.parse(await readFile(join(ws, '.claude', 'settings.local.json'), 'utf8'));
    expect(settings.disabledMcpjsonServers).not.toContain('local');
  });

  it('throws for nonexistent workspace server', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-del-404');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({ mcpServers: {} }));

    await expect(configManager.deleteServer('nope', ws)).rejects.toThrow(/not found/);
  });

  it('throws when workspace has no .mcp.json', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-no-file');

    await expect(configManager.deleteServer('x', ws)).rejects.toThrow(/not found/);
  });
});

// =====================================
// writeMcpJson
// =====================================
describe('writeMcpJson', () => {
  it('writes atomically with 0o644 permissions', async () => {
    const ws = await makeWorkspace('write-test');
    const data = { mcpServers: { atomic: { command: 'test' } } };

    await configManager.writeMcpJson(ws, data);

    const mcpPath = join(ws, '.mcp.json');
    const content = JSON.parse(await readFile(mcpPath, 'utf8'));
    expect(content).toEqual(data);

    const fileStat = await stat(mcpPath);
    const mode = fileStat.mode & 0o777;
    expect(mode).toBe(0o644);
  });

  it('file ends with newline', async () => {
    const ws = await makeWorkspace('write-nl');
    await configManager.writeMcpJson(ws, { mcpServers: {} });

    const raw = await readFile(join(ws, '.mcp.json'), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });
});

// =====================================
// Error handling edge cases
// =====================================
describe('Error handling', () => {
  it('handles invalid JSON in .claude.json gracefully', async () => {
    await writeFile(join(tmpDir, '.claude.json'), 'not-valid-json{{{', 'utf8');
    const servers = await configManager.getGlobalServers();
    expect(servers).toEqual([]);
  });

  it('handles invalid JSON in settings.local.json gracefully', async () => {
    const ws = await makeWorkspace('ws-bad-settings');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { srv: { command: 'x' } },
    }));
    await mkdir(join(ws, '.claude'), { recursive: true });
    await writeFile(join(ws, '.claude', 'settings.local.json'), '{{bad}}', 'utf8');

    // Should default to empty settings (server treated as enabled)
    const servers = await configManager.getWorkspaceServers(ws);
    expect(servers[0]).toMatchObject({ name: 'srv', enabled: true });
  });

  it('deleteServer workspace cleans up even when not in disabled list', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-del-clean');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));
    // settings.local.json exists but doesn't have disabledMcpjsonServers
    await mkdir(join(ws, '.claude'), { recursive: true });
    await writeFile(join(ws, '.claude', 'settings.local.json'), JSON.stringify({}));

    const result = await configManager.deleteServer('local', ws);
    expect(result.deleted).toBe(true);
  });

  it('deleteServer workspace handles no settings.local.json', async () => {
    await writeClaudeJson({ mcpServers: {}, _mcpServers_disabled: {} });
    const ws = await makeWorkspace('ws-del-nosettings');
    await writeFile(join(ws, '.mcp.json'), JSON.stringify({
      mcpServers: { local: { command: 'x' } },
    }));
    // No .claude/settings.local.json at all

    const result = await configManager.deleteServer('local', ws);
    expect(result.deleted).toBe(true);
  });
});

// =====================================
// Concurrent lock safety
// =====================================
describe('Concurrent operations', () => {
  it('handles concurrent toggles without corruption', async () => {
    await writeClaudeJson({
      mcpServers: { a: { command: 'a' }, b: { command: 'b' } },
      _mcpServers_disabled: {},
    });

    // Toggle both concurrently
    const [r1, r2] = await Promise.all([
      configManager.toggleServer('a', 'global'),
      configManager.toggleServer('b', 'global'),
    ]);

    expect(r1.enabled).toBe(false);
    expect(r2.enabled).toBe(false);

    const data = await readClaudeJsonRaw();
    expect(data._mcpServers_disabled.a).toBeDefined();
    expect(data._mcpServers_disabled.b).toBeDefined();
  });
});
