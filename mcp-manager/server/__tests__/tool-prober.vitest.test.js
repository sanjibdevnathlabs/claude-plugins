import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveEnvVar, resolveConfig } from '../tool-prober.js';

// =====================================
// resolveEnvVar
// =====================================
describe('resolveEnvVar', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean slate — only keep what we explicitly set in each test
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEST_RES_')) delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEST_RES_')) delete process.env[key];
    }
  });

  it('returns non-string values as-is', () => {
    expect(resolveEnvVar(42, null)).toBe(42);
    expect(resolveEnvVar(null, null)).toBe(null);
    expect(resolveEnvVar(undefined, null)).toBe(undefined);
    expect(resolveEnvVar(true, null)).toBe(true);
  });

  it('returns strings without ${} patterns unchanged', () => {
    expect(resolveEnvVar('hello world', null)).toBe('hello world');
    expect(resolveEnvVar('$NOT_BRACES', null)).toBe('$NOT_BRACES');
    expect(resolveEnvVar('just a normal string', null)).toBe('just a normal string');
    expect(resolveEnvVar('', null)).toBe('');
  });

  it('resolves ${VAR} from process.env', () => {
    process.env.TEST_RES_KEY = 'secret123';
    expect(resolveEnvVar('Bearer ${TEST_RES_KEY}', null)).toBe('Bearer secret123');
  });

  it('resolves ${VAR} from configEnv with priority over process.env', () => {
    process.env.TEST_RES_KEY = 'from-process';
    const configEnv = { TEST_RES_KEY: 'from-config' };
    expect(resolveEnvVar('${TEST_RES_KEY}', configEnv)).toBe('from-config');
  });

  it('falls back to process.env when configEnv does not have the var', () => {
    process.env.TEST_RES_FALLBACK = 'from-process';
    const configEnv = { OTHER_KEY: 'irrelevant' };
    expect(resolveEnvVar('${TEST_RES_FALLBACK}', configEnv)).toBe('from-process');
  });

  it('uses default value when var is undefined everywhere', () => {
    expect(resolveEnvVar('${TEST_RES_MISSING:-fallback}', null)).toBe('fallback');
  });

  it('uses empty default when var is undefined and default is empty', () => {
    expect(resolveEnvVar('${TEST_RES_MISSING:-}', null)).toBe('');
  });

  it('prefers actual value over default', () => {
    process.env.TEST_RES_PRESENT = 'actual';
    expect(resolveEnvVar('${TEST_RES_PRESENT:-fallback}', null)).toBe('actual');
  });

  it('prefers configEnv value over default', () => {
    const configEnv = { TEST_RES_CFG: 'cfg-val' };
    expect(resolveEnvVar('${TEST_RES_CFG:-fallback}', configEnv)).toBe('cfg-val');
  });

  it('leaves unresolvable vars without defaults as-is', () => {
    expect(resolveEnvVar('${TEST_RES_NOWHERE}', null)).toBe('${TEST_RES_NOWHERE}');
  });

  it('resolves multiple vars in one string', () => {
    process.env.TEST_RES_HOST = 'localhost';
    process.env.TEST_RES_PORT = '5432';
    expect(resolveEnvVar('postgresql://${TEST_RES_HOST}:${TEST_RES_PORT}/db', null))
      .toBe('postgresql://localhost:5432/db');
  });

  it('handles mix of resolved and unresolved vars', () => {
    process.env.TEST_RES_KNOWN = 'found';
    expect(resolveEnvVar('${TEST_RES_KNOWN} and ${TEST_RES_UNKNOWN}', null))
      .toBe('found and ${TEST_RES_UNKNOWN}');
  });

  it('handles default value containing colons', () => {
    // ${VAR:-https://example.com} — the default itself contains ':'
    expect(resolveEnvVar('${TEST_RES_MISSING:-https://example.com}', null))
      .toBe('https://example.com');
  });

  it('handles var name with default where var exists in configEnv', () => {
    const configEnv = { TEST_RES_URL: 'https://real.com' };
    expect(resolveEnvVar('${TEST_RES_URL:-https://fallback.com}', configEnv))
      .toBe('https://real.com');
  });

  it('does not expand $VAR without braces', () => {
    process.env.TEST_RES_NOBRACES = 'should-not-appear';
    expect(resolveEnvVar('$TEST_RES_NOBRACES', null)).toBe('$TEST_RES_NOBRACES');
  });

  it('handles configEnv being null', () => {
    process.env.TEST_RES_X = 'val';
    expect(resolveEnvVar('${TEST_RES_X}', null)).toBe('val');
  });

  it('handles configEnv being undefined', () => {
    process.env.TEST_RES_X = 'val';
    expect(resolveEnvVar('${TEST_RES_X}', undefined)).toBe('val');
  });

  it('resolves var that is empty string in process.env', () => {
    process.env.TEST_RES_EMPTY = '';
    expect(resolveEnvVar('${TEST_RES_EMPTY}', null)).toBe('');
  });

  it('resolves var that is empty string in configEnv', () => {
    const configEnv = { TEST_RES_EMPTY: '' };
    expect(resolveEnvVar('prefix-${TEST_RES_EMPTY}-suffix', configEnv)).toBe('prefix--suffix');
  });
});

// =====================================
// resolveConfig
// =====================================
describe('resolveConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEST_RC_')) delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEST_RC_')) delete process.env[key];
    }
  });

  it('returns a new object (does not mutate input)', () => {
    const input = { command: 'node', args: ['server.js'], env: { K: 'V' } };
    const result = resolveConfig(input);
    expect(result).not.toBe(input);
    expect(result.args).not.toBe(input.args);
    expect(result.env).not.toBe(input.env);
    // Original unchanged
    expect(input.env).toEqual({ K: 'V' });
  });

  it('resolves ${VAR} in command', () => {
    process.env.TEST_RC_HOME = '/usr/local';
    const config = { command: '${TEST_RC_HOME}/bin/server' };
    const result = resolveConfig(config);
    expect(result.command).toBe('/usr/local/bin/server');
  });

  it('resolves ${VAR} in args', () => {
    process.env.TEST_RC_API_KEY = 'my-secret';
    const config = {
      command: 'npx',
      args: ['mcp-remote', 'https://api.example.com', '--header', 'Authorization: ${TEST_RC_API_KEY}'],
    };
    const result = resolveConfig(config);
    expect(result.args[3]).toBe('Authorization: my-secret');
    // Other args unchanged
    expect(result.args[0]).toBe('mcp-remote');
    expect(result.args[1]).toBe('https://api.example.com');
  });

  it('resolves ${VAR} in env values from process.env', () => {
    process.env.TEST_RC_SECRET = 'top-secret';
    const config = {
      command: 'server',
      env: { API_KEY: '${TEST_RC_SECRET}', PLAIN: 'literal' },
    };
    const result = resolveConfig(config);
    expect(result.env.API_KEY).toBe('top-secret');
    expect(result.env.PLAIN).toBe('literal');
  });

  it('resolves ${VAR} in url', () => {
    process.env.TEST_RC_BASE = 'https://api.example.com';
    const config = { url: '${TEST_RC_BASE}/mcp/v1' };
    const result = resolveConfig(config);
    expect(result.url).toBe('https://api.example.com/mcp/v1');
  });

  it('resolves ${VAR} in headers values', () => {
    process.env.TEST_RC_TOKEN = 'bearer-token-123';
    const config = {
      url: 'https://api.example.com',
      headers: { Authorization: 'Bearer ${TEST_RC_TOKEN}', 'X-Custom': 'static' },
    };
    const result = resolveConfig(config);
    expect(result.headers.Authorization).toBe('Bearer bearer-token-123');
    expect(result.headers['X-Custom']).toBe('static');
  });

  it('args can reference vars defined in the env block', () => {
    const config = {
      command: 'npx',
      args: ['mcp-remote', '--header', 'Authorization:${AUTH_HEADER}'],
      env: { AUTH_HEADER: 'Bearer my-token' },
    };
    const result = resolveConfig(config);
    expect(result.args[2]).toBe('Authorization:Bearer my-token');
  });

  it('env block vars resolve from process.env only (not self-referencing)', () => {
    process.env.TEST_RC_OUTER = 'outer-val';
    const config = {
      command: 'server',
      env: { INNER: '${TEST_RC_OUTER}', SELF: '${INNER}' },
    };
    const result = resolveConfig(config);
    expect(result.env.INNER).toBe('outer-val');
    // SELF references INNER which is in env block, but env resolution only checks process.env
    // So ${INNER} stays unresolved unless INNER is in process.env
    expect(result.env.SELF).toBe('${INNER}');
  });

  it('handles config with no optional fields', () => {
    const config = { type: 'stdio' };
    const result = resolveConfig(config);
    expect(result.type).toBe('stdio');
    expect(result.env).toEqual({});
  });

  it('handles empty env block', () => {
    const config = { command: 'server', env: {} };
    const result = resolveConfig(config);
    expect(result.env).toEqual({});
  });

  it('handles config with no env block', () => {
    const config = { command: 'server', args: ['--port', '3000'] };
    const result = resolveConfig(config);
    expect(result.env).toEqual({});
    expect(result.args).toEqual(['--port', '3000']);
  });

  it('preserves non-interpolated config fields', () => {
    const config = {
      type: 'stdio',
      command: 'node',
      args: ['index.js'],
      env: {},
      cwd: '/some/path',
      disabled: false,
    };
    const result = resolveConfig(config);
    expect(result.type).toBe('stdio');
    expect(result.cwd).toBe('/some/path');
    expect(result.disabled).toBe(false);
  });

  it('resolves ${VAR:-default} in all fields', () => {
    const config = {
      command: '${TEST_RC_MISSING_CMD:-/usr/bin/node}',
      args: ['${TEST_RC_MISSING_ARG:-default-arg}'],
      url: '${TEST_RC_MISSING_URL:-https://fallback.com}/mcp',
      headers: { Auth: '${TEST_RC_MISSING_HDR:-default-header}' },
      env: { KEY: '${TEST_RC_MISSING_ENV:-default-env}' },
    };
    const result = resolveConfig(config);
    expect(result.command).toBe('/usr/bin/node');
    expect(result.args[0]).toBe('default-arg');
    expect(result.url).toBe('https://fallback.com/mcp');
    expect(result.headers.Auth).toBe('default-header');
    expect(result.env.KEY).toBe('default-env');
  });

  it('handles the DevRev-style config pattern', () => {
    process.env.TEST_RC_DEVREV_KEY = 'devrev-secret-key';
    const config = {
      type: 'stdio',
      command: 'npx',
      args: [
        'mcp-remote',
        'https://api.devrev.ai/mcp/v1',
        '--transport', 'http-only',
        '--header', 'Authorization: ${TEST_RC_DEVREV_KEY}',
      ],
      env: {},
    };
    const result = resolveConfig(config);
    expect(result.args[4]).toBe('--header');
    expect(result.args[5]).toBe('Authorization: devrev-secret-key');
    expect(result.command).toBe('npx');
    expect(result.type).toBe('stdio');
  });

  it('handles mcp-remote env-block auth pattern', () => {
    const config = {
      type: 'stdio',
      command: 'npx',
      args: ['mcp-remote', 'https://api.example.com', '--header', 'Authorization:${AUTH_HEADER}'],
      env: { AUTH_HEADER: 'Bearer secret-token' },
    };
    const result = resolveConfig(config);
    expect(result.args[3]).toBe('Authorization:Bearer secret-token');
    expect(result.env.AUTH_HEADER).toBe('Bearer secret-token');
  });

  it('handles http config with headers containing vars', () => {
    process.env.TEST_RC_EMAIL = 'user@example.com';
    const config = {
      type: 'http',
      url: 'https://api.example.com/mcp',
      headers: { 'X-User-Email': '${TEST_RC_EMAIL}' },
    };
    const result = resolveConfig(config);
    expect(result.headers['X-User-Email']).toBe('user@example.com');
  });

  it('handles multiple vars in a single url', () => {
    process.env.TEST_RC_PROTO = 'https';
    process.env.TEST_RC_HOST = 'api.example.com';
    process.env.TEST_RC_PORT = '8443';
    const config = { url: '${TEST_RC_PROTO}://${TEST_RC_HOST}:${TEST_RC_PORT}/mcp' };
    const result = resolveConfig(config);
    expect(result.url).toBe('https://api.example.com:8443/mcp');
  });
});
