import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from './components/Header';
import WorkspaceSelector from './components/WorkspaceSelector';
import ServerCard from './components/ServerCard';
import ContextWarning from './components/ContextWarning';
import AddServerForm from './components/AddServerForm';
import { color, font, spacing, radius } from './blade-tokens';

const styles = {
  app: {
    maxWidth: 860,
    margin: '0 auto',
    padding: `${spacing[7]}px ${spacing[6]}px`,
    minHeight: '100vh',
  },
  empty: {
    textAlign: 'center',
    padding: `${spacing[11]}px ${spacing[6]}px`,
    color: color.text.muted,
    fontSize: font.size.body,
    lineHeight: `${font.lineHeight.body}px`,
  },
  error: {
    background: color.negative.bg,
    border: `1px solid ${color.negative.base}`,
    borderRadius: radius.md,
    padding: `${spacing[4]}px ${spacing[5]}px`,
    color: color.negative.text,
    fontSize: font.size.caption,
    marginBottom: spacing[5],
    lineHeight: `${font.lineHeight.caption}px`,
  },
  loading: {
    textAlign: 'center',
    padding: `${spacing[11]}px ${spacing[6]}px`,
    color: color.text.muted,
    fontSize: font.size.body,
    lineHeight: `${font.lineHeight.body}px`,
  },
  scopeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `6px ${spacing[4]}px`,
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    color: color.text.secondary,
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    fontFamily: 'inherit',
    lineHeight: `${font.lineHeight.caption}px`,
    transition: 'border-color 0.15s ease, color 0.15s ease',
  },
  // --- Tab bar ---
  tabBar: {
    display: 'flex',
    gap: spacing[1],
    marginBottom: spacing[5],
    borderBottom: `1px solid ${color.border.subtle}`,
    paddingBottom: 0,
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]}px ${spacing[4]}px`,
    cursor: 'pointer',
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    fontFamily: 'inherit',
    color: color.text.muted,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
    transition: 'color 0.15s ease, border-color 0.15s ease',
    whiteSpace: 'nowrap',
    lineHeight: `${font.lineHeight.caption}px`,
  },
  tabActive: {
    color: color.primary.base,
    borderBottomColor: color.primary.base,
    fontWeight: font.weight.semibold,
  },
  tabCount: {
    fontSize: font.size.xs,
    padding: '1px 6px',
    borderRadius: radius.max,
    fontWeight: font.weight.semibold,
    lineHeight: '14px',
    minWidth: 18,
    textAlign: 'center',
  },
  tabCountActive: {
    background: color.primary.muted,
    color: color.primary.base,
  },
  tabCountInactive: {
    background: color.bg.subtle,
    color: color.text.subtle,
  },
};

export default function App() {
  const [config, setConfig] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeScope, setActiveScope] = useState(() => {
    try { return sessionStorage.getItem('mcp-manager-scope') || 'global'; }
    catch { return 'global'; }
  });
  const [activeTab, setActiveTab] = useState('global');
  const [contextUsage, setContextUsage] = useState(null);

  const handleScopeChange = useCallback((scope) => {
    setActiveScope(scope);
    setActiveTab('global'); // reset tab on scope change
    try { sessionStorage.setItem('mcp-manager-scope', scope); } catch {}
  }, []);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingServers, setTogglingServers] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const [configRes, wsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/workspaces'),
      ]);
      if (!configRes.ok || !wsRes.ok) {
        throw new Error('Server returned an error');
      }
      const configData = await configRes.json();
      const wsData = await wsRes.json();
      setConfig(configData);
      setWorkspaces(wsData);
      setError(null);
    } catch (err) {
      setError('Failed to connect to MCP Manager server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContextUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/context-usage');
      if (res.ok) {
        const data = await res.json();
        setContextUsage(data);
      }
    } catch {
      // Non-blocking, ignore errors
    }
  }, []);

  const intervalRef = useRef(null);
  const pollMsRef = useRef(5000);

  useEffect(() => {
    let cancelled = false;
    fetchConfig();
    fetchContextUsage();

    const restartInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchConfig, pollMsRef.current);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchConfig();
        restartInterval();
      }
    };

    fetch('/api/client-config')
      .then(r => {
        if (!r.ok) throw new Error(`client-config: ${r.status}`);
        return r.json();
      })
      .then(cfg => {
        if (!cancelled && !document.hidden) {
          pollMsRef.current = cfg.pollIntervalMs || 5000;
          restartInterval();
        }
      })
      .catch(() => {
        if (!cancelled && !document.hidden) {
          restartInterval();
        }
      });

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchConfig, fetchContextUsage]);

  const handleToggle = async (name, scope, currentEnabled) => {
    const key = `${scope}::${name}`;
    if (togglingServers.has(key)) return;
    setTogglingServers(prev => new Set(prev).add(key));
    try {
      const res = await fetch('/api/servers/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scope, enabled: !currentEnabled }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Toggle failed');
      }
      await fetchConfig();
      if (scope === 'global') fetchContextUsage();
    } catch (err) {
      setError(`Failed to toggle ${name}: ${err.message}`);
    } finally {
      setTogglingServers(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handlePluginToggle = async (name, scope, currentEnabled) => {
    const key = `${scope}::${name}`;
    if (togglingServers.has(key)) return;
    setTogglingServers(prev => new Set(prev).add(key));
    try {
      const res = await fetch('/api/plugins/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scope }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Toggle failed');
      }
      await fetchConfig();
    } catch (err) {
      setError(`Failed to toggle plugin server ${name}: ${err.message}`);
    } finally {
      setTogglingServers(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDeleteWorkspace = async (workspacePath) => {
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspacePath)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Delete failed');
      }
      if (activeScope === workspacePath) {
        handleScopeChange('global');
      }
      await fetchConfig();
    } catch (err) {
      setError(`Failed to delete workspace: ${err.message}`);
    }
  };

  const handleDeleteServer = async (name, scope) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scope }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Delete failed');
      }
      await fetchConfig();
      if (scope === 'global') fetchContextUsage();
    } catch (err) {
      setError(`Failed to delete ${name}: ${err.message}`);
    }
  };

  const handleAddServer = async (name, serverConfig) => {
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scope: activeScope, config: serverConfig }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to add server');
    }
    setShowAddForm(false);
    await fetchConfig();
    if (activeScope === 'global') fetchContextUsage();
  };

  // --- Build categorized server lists ---
  const allScopeServers = config?.[activeScope] || config?.global || [];
  const globalServers = config?.global || [];
  const pluginServers = config?._plugins || [];

  // Split scope servers into global vs local (project)
  const globalOnlyServers = allScopeServers.filter(s => s.scope === 'global');
  const localOnlyServers = allScopeServers.filter(s => s.scope !== 'global');

  // Split plugin servers into global (user-scope) vs project-scope
  const pluginGlobalServers = pluginServers.filter(s => s.pluginScope !== 'project');
  const pluginProjectServers = pluginServers.filter(
    s => s.pluginScope === 'project' && s.projectPath === activeScope
  );

  // Build dynamic tabs
  const tabs = useMemo(() => {
    const t = [];
    const isWorkspaceScope = activeScope !== 'global';

    // Global tab is always visible
    t.push({
      id: 'global',
      label: 'Global',
      servers: globalOnlyServers,
      isPlugin: false,
    });

    // Local/Project tab: only when viewing a workspace scope and there are local servers
    if (isWorkspaceScope && localOnlyServers.length > 0) {
      t.push({
        id: 'local',
        label: 'Project',
        servers: localOnlyServers,
        isPlugin: false,
      });
    }

    // Plugin Global tab: globally installed plugins with MCPs
    if (pluginGlobalServers.length > 0) {
      t.push({
        id: 'plugin-global',
        label: isWorkspaceScope ? 'Plugins (Global)' : 'Plugins',
        servers: pluginGlobalServers,
        isPlugin: true,
      });
    }

    // Plugin Project tab: project-scoped plugins with MCPs
    if (isWorkspaceScope && pluginProjectServers.length > 0) {
      t.push({
        id: 'plugin-project',
        label: 'Plugins (Project)',
        servers: pluginProjectServers,
        isPlugin: true,
      });
    }

    return t;
  }, [activeScope, globalOnlyServers, localOnlyServers, pluginGlobalServers, pluginProjectServers]);

  // If the active tab doesn't exist in the current tab set, fall back to 'global'
  const validTab = tabs.find(t => t.id === activeTab) ? activeTab : 'global';
  const currentTab = tabs.find(t => t.id === validTab);
  const currentServers = currentTab?.servers || [];

  // Derive server errors from context usage
  const serverErrors = {};
  if (contextUsage?.servers) {
    for (const s of contextUsage.servers) {
      if (s.error) serverErrors[s.name] = s.error;
    }
  }

  // Total counts across ALL tabs for the header
  const allServers = tabs.flatMap(t => t.servers);
  const totalServers = allServers.length;
  const totalEnabled = allServers.filter(s => s.enabled).length;

  // Active count for scope dropdown: total enabled across all tabs
  const scopeActiveCount = totalEnabled;

  if (loading) {
    return (
      <div style={styles.app}>
        <div style={styles.loading}>Loading MCP servers...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <Header totalServers={totalServers} enabledServers={totalEnabled} />
      {error && <div style={styles.error} role="alert">{error}</div>}
      <div style={styles.scopeRow}>
        <WorkspaceSelector
          workspaces={workspaces}
          activeScope={activeScope}
          onSelect={handleScopeChange}
          serverCounts={config}
          globalCount={globalServers.length}
          pluginServers={pluginServers}
          onDeleteWorkspace={handleDeleteWorkspace}
        />
        <button
          style={styles.addBtn}
          onClick={() => setShowAddForm(true)}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color.primary.base; e.currentTarget.style.color = color.primary.base; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = color.border.subtle; e.currentTarget.style.color = color.text.secondary; }}
          title="Add MCP server"
        >
          + Add
        </button>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {tabs.map(tab => {
          const isActive = tab.id === validTab;
          const enabledCount = tab.servers.filter(s => s.enabled).length;
          const totalCount = tab.servers.length;
          return (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = color.text.secondary;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = color.text.muted;
                }
              }}
            >
              {tab.label}
              <span style={{
                ...styles.tabCount,
                ...(isActive ? styles.tabCountActive : styles.tabCountInactive),
              }}>
                {enabledCount}/{totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {showAddForm && (
        <AddServerForm
          activeScope={activeScope}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddServer}
        />
      )}
      <ContextWarning contextUsage={contextUsage} />
      {currentServers.length === 0 ? (
        <div style={styles.empty}>No MCP servers in this tab</div>
      ) : (
        currentServers.map(server => (
          <ServerCard
            key={`${server.scope}-${server.name}`}
            server={server}
            onToggle={() =>
              currentTab?.isPlugin
                ? handlePluginToggle(server.name, server.scope, server.enabled)
                : handleToggle(server.name, server.scope, server.enabled)
            }
            toggling={togglingServers.has(`${server.scope}::${server.name}`)}
            probeError={serverErrors[server.name] || null}
            onDelete={currentTab?.isPlugin ? undefined : handleDeleteServer}
            showPluginBadge={currentTab?.isPlugin}
          />
        ))
      )}
    </div>
  );
}
