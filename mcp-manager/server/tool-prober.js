import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { config as env } from './env.js';

/**
 * Resolve ${VAR} and ${VAR:-default} patterns in a string,
 * matching Claude Code's MCP config interpolation behavior.
 * Looks up from configEnv first (the server's env block), then process.env.
 * Unresolvable vars without defaults are left as-is (not an error).
 */
export function resolveEnvVar(str, configEnv) {
  if (typeof str !== 'string' || !str.includes('${')) return str;
  return str.replace(/\$\{([^}]+)\}/g, (match, expr) => {
    const sepIdx = expr.indexOf(':-');
    const varName = sepIdx >= 0 ? expr.slice(0, sepIdx) : expr;
    const defaultVal = sepIdx >= 0 ? expr.slice(sepIdx + 2) : undefined;

    if (configEnv && configEnv[varName] !== undefined) return configEnv[varName];
    if (process.env[varName] !== undefined) return process.env[varName];
    if (defaultVal !== undefined) return defaultVal;
    return match; // leave unresolved
  });
}

/**
 * Resolve env vars across all string fields in a server config.
 * Returns a new config object with resolved values (does not mutate input).
 */
export function resolveConfig(config) {
  const envBlock = config.env || {};

  // Resolve env values first (they may reference process.env vars)
  const resolvedEnv = {};
  for (const [key, val] of Object.entries(envBlock)) {
    resolvedEnv[key] = resolveEnvVar(val, null); // env values resolve from process.env only
  }

  // Now resolve other fields using resolvedEnv + process.env
  const resolved = { ...config };

  if (config.command) {
    resolved.command = resolveEnvVar(config.command, resolvedEnv);
  }
  if (config.args) {
    resolved.args = config.args.map(arg => resolveEnvVar(arg, resolvedEnv));
  }
  if (config.url) {
    resolved.url = resolveEnvVar(config.url, resolvedEnv);
  }
  if (config.headers) {
    resolved.headers = {};
    for (const [key, val] of Object.entries(config.headers)) {
      resolved.headers[key] = resolveEnvVar(val, resolvedEnv);
    }
  }

  resolved.env = resolvedEnv;
  return resolved;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Probe timed out after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

const PROBE_TIMEOUT_MS = env.probeTimeoutMs;

const cache = new Map();
const MAX_CACHE_SIZE = 200;

function getCacheKey(scope, name) {
  return `${scope}::${name}`;
}

export async function probeServerTools(name, serverConfig, scope) {
  const key = getCacheKey(scope || 'unknown', name);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < env.toolCacheTtlMs) {
    return cached.tools;
  }
  if (cached) {
    cache.delete(key); // evict stale entry
  }

  const resolved = resolveConfig(serverConfig);

  let tools;
  try {
    const type = resolved.type
      || (resolved.command ? 'stdio' : undefined)
      || (resolved.url ? 'http' : undefined);

    if (type === 'stdio') {
      tools = await withTimeout(probeStdio(name, resolved), PROBE_TIMEOUT_MS);
    } else if (type === 'http') {
      tools = await withTimeout(probeHttp(name, resolved), PROBE_TIMEOUT_MS);
    } else if (type === 'sse' || resolved.type === 'sse') {
      return { error: 'SSE transport is not yet supported. Use stdio or http.' };
    } else {
      return { error: `Unknown server type: ${type || resolved.type || 'none'}` };
    }

    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(key, { tools, timestamp: Date.now() });
    return tools;
  } catch (err) {
    // Cache errors too so we don't keep retrying failed connections
    const errorResult = { error: err.message };
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(key, { tools: errorResult, timestamp: Date.now() });
    return errorResult;
  }
}

async function probeStdio(name, config) {
  const SAFE_ENV_KEYS = ['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL',
    'LC_CTYPE', 'TERM', 'TMPDIR', 'XDG_RUNTIME_DIR', 'NODE_PATH'];
  const safeEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key] !== undefined) safeEnv[key] = process.env[key];
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: { ...safeEnv, ...(config.env || {}) },
  });

  const client = new Client({ name: 'mcp-manager-prober', version: '1.0.0' });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    return (result.tools || []).map(t => ({
      name: t.name,
      description: t.description || '',
    }));
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

async function probeHttp(name, config) {
  const url = new URL(config.url);
  const headers = config.headers || {};

  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers },
  });

  const client = new Client({ name: 'mcp-manager-prober', version: '1.0.0' });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    return (result.tools || []).map(t => ({
      name: t.name,
      description: t.description || '',
    }));
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}

export function clearCache(scope, name) {
  if (scope && name) {
    cache.delete(getCacheKey(scope, name));
  } else {
    cache.clear();
  }
}
