import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { config as env } from './env.js';

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

  let tools;
  try {
    const type = serverConfig.type
      || (serverConfig.command ? 'stdio' : undefined)
      || (serverConfig.url ? 'http' : undefined);

    if (type === 'stdio') {
      tools = await withTimeout(probeStdio(name, serverConfig), PROBE_TIMEOUT_MS);
    } else if (type === 'http') {
      tools = await withTimeout(probeHttp(name, serverConfig), PROBE_TIMEOUT_MS);
    } else if (type === 'sse' || serverConfig.type === 'sse') {
      return { error: 'SSE transport is not yet supported. Use stdio or http.' };
    } else {
      return { error: `Unknown server type: ${type || serverConfig.type || 'none'}` };
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
