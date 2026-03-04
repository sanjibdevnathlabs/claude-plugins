import React, { useState, useCallback, useEffect } from 'react';
import ToolList from './ToolList';
import { color, font, spacing, radius } from '../blade-tokens';

const styles = {
  card: {
    background: color.bg.surface,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: `${spacing[5]}px ${spacing[6]}px`,
    marginBottom: spacing[3],
    transition: 'border-color 0.15s ease',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.size.body,
    fontWeight: font.weight.bold,
    color: '#fff',
    flexShrink: 0,
    textTransform: 'uppercase',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: font.size.body,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: `${font.lineHeight.body}px`,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  metaText: {
    fontSize: font.size.caption,
    color: color.text.muted,
    lineHeight: `${font.lineHeight.caption}px`,
  },
  typeBadge: {
    fontSize: font.size.xs,
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    background: color.bg.elevated,
    color: color.text.subtle,
    border: `1px solid ${color.border.subtle}`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: font.weight.semibold,
  },
  scopeBadge: {
    fontSize: font.size.xs,
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    background: color.primary.subtle,
    color: color.primary.base,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.05em',
  },
  errorBadge: {
    fontSize: font.size.xs,
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    background: color.negative.bg,
    color: color.negative.base,
    fontWeight: font.weight.semibold,
    letterSpacing: '0.02em',
    cursor: 'help',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    flexShrink: 0,
  },
  toggle: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: radius.max,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    border: 'none',
    padding: 0,
    outline: 'none',
  },
  toggleOn: {
    background: color.primary.base,
  },
  toggleOff: {
    background: color.border.default,
  },
  toggleKnob: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    color: color.text.subtle,
    cursor: 'pointer',
    fontSize: font.size.md,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    borderRadius: radius.md,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  toolSection: {
    borderTop: `1px solid ${color.bg.elevated}`,
    marginTop: spacing[4],
  },
  deleteRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing[4],
    borderTop: `1px solid ${color.bg.elevated}`,
    marginTop: spacing[4],
  },
  deleteBtn: {
    background: 'none',
    border: `1px solid ${color.border.subtle}`,
    color: color.text.muted,
    cursor: 'pointer',
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    padding: `${spacing[2]}px ${spacing[4]}px`,
    borderRadius: radius.md,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    lineHeight: `${font.lineHeight.caption}px`,
  },
  deleteBtnConfirm: {
    background: color.negative.bg,
    borderColor: color.negative.base,
    color: color.negative.base,
    fontWeight: font.weight.semibold,
  },
};

const COLORS = [
  'hsla(218, 89%, 51%, 1)',   // azure
  'hsla(258, 93%, 68%, 1)',   // orchid
  'hsla(317, 60%, 55%, 1)',   // magenta
  'hsla(4, 85%, 44%, 1)',     // crimson
  'hsla(25, 100%, 44%, 1)',   // cider
  'hsla(41, 100%, 33%, 1)',   // topaz
  'hsla(153, 100%, 30%, 1)',  // emerald
  'hsla(180, 45%, 40%, 1)',   // sea
  'hsla(200, 100%, 41%, 1)',  // sapphire
  'hsla(155, 100%, 31%, 1)',  // forest
  'hsla(200, 60%, 30%, 1)',   // cloud
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitial(name) {
  return name.charAt(0).toUpperCase();
}

export default function ServerCard({ server, onToggle, toggling, probeError, onDelete, showScopeBadge }) {
  const [expanded, setExpanded] = useState(false);
  const [tools, setTools] = useState(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTools = useCallback(async () => {
    if (tools || toolsLoading) return;
    setToolsLoading(true);
    setToolsError(null);
    try {
      const scope = encodeURIComponent(server.scope);
      const res = await fetch(`/api/servers/${scope}/${encodeURIComponent(server.name)}/tools`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setToolsError(data.error);
      } else {
        setTools(data);
      }
    } catch (err) {
      setToolsError('Failed to probe server');
    } finally {
      setToolsLoading(false);
    }
  }, [tools, toolsLoading, server]);

  // Auto-fetch tool counts for enabled servers on mount
  useEffect(() => {
    if (server.enabled && !tools && !toolsLoading) {
      fetchTools();
    }
  }, [server.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpand = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded) fetchTools();
  }, [expanded, fetchTools]);

  const handleRowClick = useCallback((e) => {
    // Don't toggle expand when clicking the toggle switch or delete button
    if (e.target.closest('[role="switch"]') || e.target.closest('[data-delete]')) return;
    handleExpand();
  }, [handleExpand]);

  const handleDelete = useCallback(async (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(server.name, server.scope === 'global' ? 'global' : server.scope);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [confirmDelete, onDelete, server]);

  const avatarColor = getColor(server.name);
  const toolCount = tools ? tools.length : null;
  const hasError = !!probeError;

  const dotColor = hasError
    ? color.negative.base
    : server.enabled
      ? color.positive.base
      : color.text.disabled;

  const statusText = hasError
    ? 'error'
    : server.enabled
      ? toolCount !== null
        ? `${toolCount} tools`
        : 'enabled'
      : 'disabled';

  return (
    <div
      style={{
        ...styles.card,
        ...(server.enabled ? {} : styles.cardDisabled),
        cursor: 'pointer',
      }}
      onClick={handleRowClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color.border.default;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = color.border.subtle;
      }}
    >
      <div style={styles.topRow}>
        <div style={styles.left}>
          <div style={{ ...styles.avatar, background: avatarColor }}>
            {getInitial(server.name)}
          </div>
          <div style={styles.info}>
            <div style={styles.name}>{server.name}</div>
            <div style={styles.meta}>
              <div style={{ ...styles.dot, background: dotColor }} />
              <span style={styles.metaText}>{statusText}</span>
              <span style={styles.typeBadge}>{server.config?.type || (server.config?.command ? 'stdio' : server.config?.url ? 'http' : 'unknown')}</span>
              {showScopeBadge && server.scope === 'global' && (
                <span style={styles.scopeBadge}>Global</span>
              )}
              {hasError && (
                <span style={styles.errorBadge} title={probeError}>Error</span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.right}>
          <span
            style={{
              ...styles.expandBtn,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {expanded ? '\u25B4' : '\u25BE'}
          </span>
          <button
            style={{
              ...styles.toggle,
              ...(server.enabled ? styles.toggleOn : styles.toggleOff),
              opacity: toggling ? 0.5 : 1,
              pointerEvents: toggling ? 'none' : 'auto',
            }}
            onClick={onToggle}
            disabled={toggling}
            title={server.enabled ? `Disable ${server.name}` : `Enable ${server.name}`}
            role="switch"
            aria-checked={server.enabled}
            aria-label={`Toggle ${server.name} ${server.enabled ? 'off' : 'on'}`}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px #5b8af0'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div
              style={{
                ...styles.toggleKnob,
                left: server.enabled ? 23 : 3,
              }}
            />
          </button>
        </div>
      </div>
      {expanded && (
        <>
          <div style={styles.toolSection}>
            <ToolList tools={tools} loading={toolsLoading} error={toolsError} />
          </div>
          {onDelete && (
            <div style={styles.deleteRow} data-delete>
              <button
                style={{
                  ...styles.deleteBtn,
                  ...(confirmDelete ? styles.deleteBtnConfirm : {}),
                  opacity: deleting ? 0.5 : 1,
                  pointerEvents: deleting ? 'none' : 'auto',
                }}
                onClick={handleDelete}
                disabled={deleting}
                data-delete
                onMouseEnter={e => {
                  if (!confirmDelete) {
                    e.currentTarget.style.borderColor = color.negative.base;
                    e.currentTarget.style.color = color.negative.base;
                  }
                }}
                onMouseLeave={e => {
                  if (!confirmDelete) {
                    e.currentTarget.style.borderColor = color.border.subtle;
                    e.currentTarget.style.color = color.text.muted;
                    setConfirmDelete(false);
                  }
                }}
              >
                {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete Server'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
