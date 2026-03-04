import { readFile, writeFile, rename, unlink } from 'fs/promises';
import { randomBytes } from 'crypto';
import { config as env } from './env.js';

const STATE_FILE = env.stateFile;

let state = {
  sessions: {},
  workspaces: [],
};

export async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      sessions: (parsed.sessions && typeof parsed.sessions === 'object' && !Array.isArray(parsed.sessions))
        ? parsed.sessions
        : {},
      workspaces: Array.isArray(parsed.workspaces)
        ? parsed.workspaces
        : [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to load state file (starting fresh):', err.message);
    }
  }
}

let savePromise = Promise.resolve();

async function saveState() {
  const prev = savePromise;
  let release;
  savePromise = new Promise(resolve => { release = resolve; });
  await prev;
  try {
    const tmpFile = `${STATE_FILE}.tmp.${randomBytes(4).toString('hex')}`;
    try {
      await writeFile(tmpFile, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
      await rename(tmpFile, STATE_FILE);
    } catch (err) {
      try { await unlink(tmpFile); } catch {}
      throw err;
    }
  } finally {
    release();
  }
}

export function registerSession(sessionId, cwd, pid) {
  state.sessions[sessionId] = {
    cwd,
    pid: pid || null,
    startedAt: new Date().toISOString(),
  };

  if (cwd && !state.workspaces.includes(cwd)) {
    state.workspaces.push(cwd);
  }

  saveState().catch(err => console.error('Failed to save state:', err.message));
}

export function unregisterSession(sessionId) {
  const session = state.sessions[sessionId];
  delete state.sessions[sessionId];

  // Check if workspace still has active sessions
  if (session?.cwd) {
    const hasOtherSessions = Object.values(state.sessions).some(
      s => s.cwd === session.cwd
    );
    if (!hasOtherSessions) {
      // Keep workspace registered for a grace period (don't remove immediately)
      // It will be cleaned up if no sessions reconnect
    }
  }

  saveState().catch(err => console.error('Failed to save state:', err.message));
  return session;
}

export function getSessionCount() {
  return Object.keys(state.sessions).length;
}

export function getWorkspaces() {
  return [...state.workspaces];
}

export function getSessions() {
  return { ...state.sessions };
}

export function getSessionPids() {
  return Object.values(state.sessions)
    .map(s => s.pid)
    .filter(Boolean);
}

export function removeWorkspace(workspacePath) {
  const idx = state.workspaces.indexOf(workspacePath);
  if (idx < 0) return false;
  state.workspaces.splice(idx, 1);
  saveState().catch(err => console.error('Failed to save state:', err.message));
  return true;
}
