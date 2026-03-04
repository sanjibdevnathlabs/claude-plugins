import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGIN_ROOT = join(__dirname, '..');

function parseEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Expand $HOME
      value = value.replace(/\$HOME/g, homedir());
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

// Load .env.default first, then .env overrides
const defaults = parseEnvFile(join(PLUGIN_ROOT, '.env.default'));
const overrides = parseEnvFile(join(PLUGIN_ROOT, '.env'));
const merged = { ...defaults, ...overrides };

// Only set vars that aren't already in process.env (real env wins)
for (const [key, value] of Object.entries(merged)) {
  if (!(key in process.env)) {
    process.env[key] = value;
  }
}

// Export typed config for convenience
export const config = {
  port:                 parseInt(process.env.MCP_MANAGER_PORT, 10) || 4111,
  logFile:              process.env.MCP_MANAGER_LOG_FILE || join(homedir(), '.mcp-manager.log'),
  pidFile:              process.env.MCP_MANAGER_PID_FILE || join(homedir(), '.mcp-manager.pid'),
  stateFile:            process.env.MCP_MANAGER_STATE_FILE || join(homedir(), '.mcp-manager-state.json'),
  watchdogIntervalMs:   parseInt(process.env.MCP_MANAGER_WATCHDOG_INTERVAL_MS, 10) || 5000,
  graceChecks:          parseInt(process.env.MCP_MANAGER_GRACE_CHECKS, 10) || 2,
  toolCacheTtlMs:       parseInt(process.env.MCP_MANAGER_TOOL_CACHE_TTL_MS, 10) || 300000,
  healthTimeout:        parseInt(process.env.MCP_MANAGER_HEALTH_TIMEOUT, 10) || 2,
  startupWait:          parseInt(process.env.MCP_MANAGER_STARTUP_WAIT, 10) || 5,
  pollIntervalMs:       parseInt(process.env.MCP_MANAGER_POLL_INTERVAL_MS, 10) || 5000,
  probeTimeoutMs:       parseInt(process.env.MCP_MANAGER_PROBE_TIMEOUT_MS, 10) || 15000,
};
