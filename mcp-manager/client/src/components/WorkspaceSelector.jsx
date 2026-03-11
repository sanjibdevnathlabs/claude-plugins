import React, { useState, useRef, useEffect } from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

function shortenPath(path) {
  const home = path.replace(/^\/Users\/[^/]+/, '~');
  const parts = home.split('/');
  if (parts.length > 3) {
    return '.../' + parts.slice(-2).join('/');
  }
  return home;
}

export default function WorkspaceSelector({ workspaces, activeScope, onSelect, serverCounts, globalCount, onDeleteWorkspace }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setConfirmingDelete(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const scopes = ['global', ...workspaces];
  const isHomedirScope = activeScope !== 'global' && serverCounts?._meta?.homedir === activeScope;
  const activeLabel = activeScope === 'global'
    ? 'Global'
    : isHomedirScope
      ? '~ (home)'
      : shortenPath(activeScope);

  // Count: workspace scope shows only its own server count
  const activeWsCount = Array.isArray(serverCounts?.[activeScope]) ? serverCounts[activeScope].length : 0;
  const gc = globalCount || 0;
  const activeCount = activeScope === 'global' ? activeWsCount : activeWsCount;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing[3],
          padding: `6px ${spacing[4]}px`,
          background: color.bg.elevated,
          border: `1px solid ${open ? color.primary.base : color.border.subtle}`,
          borderRadius: radius.md,
          cursor: 'pointer',
          color: color.text.primary,
          fontSize: font.size.caption,
          fontWeight: font.weight.medium,
          fontFamily: 'inherit',
          lineHeight: `${font.lineHeight.caption}px`,
          outline: 'none',
          transition: 'border-color 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: color.text.subtle, fontWeight: font.weight.regular }}>Scope:</span>
        <span>{activeLabel}</span>
        {activeCount > 0 && (
          <span style={{
            fontSize: font.size.xs,
            padding: '0 5px',
            borderRadius: radius.max,
            background: color.primary.muted,
            color: color.primary.base,
            fontWeight: font.weight.semibold,
            lineHeight: '16px',
          }}>
            {activeCount}
          </span>
        )}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{
          marginLeft: spacing[1],
          transition: 'transform 0.15s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }}>
          <path d="M1 1L5 5L9 1" stroke={color.text.subtle} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Menu */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          minWidth: 220,
          background: color.bg.elevated,
          border: `1px solid ${color.border.subtle}`,
          borderRadius: radius.md,
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          padding: `${spacing[1]}px 0`,
        }}>
          {scopes.map(scope => {
            const isActive = scope === activeScope;
            const wsServers = serverCounts?.[scope];
            const wsCount = Array.isArray(wsServers) ? wsServers.length : 0;
            const count = wsCount;
            const isHomedir = serverCounts?._meta?.homedir === scope;
            const label = scope === 'global'
              ? 'Global'
              : isHomedir
                ? '~ (home)'
                : shortenPath(scope);
            const isGlobal = scope === 'global';
            const isConfirming = confirmingDelete === scope;

            return (
              <div
                key={scope}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isActive ? color.primary.subtle : 'transparent',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = color.bg.muted; }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    flex: 1,
                    padding: `6px ${spacing[4]}px`,
                    cursor: 'pointer',
                    fontSize: font.size.caption,
                    fontWeight: isActive ? font.weight.medium : font.weight.regular,
                    color: isActive ? color.primary.base : color.text.secondary,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    lineHeight: `${font.lineHeight.body}px`,
                  }}
                  onClick={() => { onSelect(scope); setOpen(false); setConfirmingDelete(null); }}
                  title={scope === 'global' ? 'Global config: ~/.claude.json (Claude Code)' : `Project config: ${scope}/.mcp.json`}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: font.size.xs,
                      padding: '0 5px',
                      borderRadius: radius.max,
                      background: isActive ? color.primary.muted : color.bg.subtle,
                      color: isActive ? color.primary.base : color.text.subtle,
                      fontWeight: font.weight.semibold,
                      lineHeight: '16px',
                      flexShrink: 0,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
                {!isGlobal && onDeleteWorkspace && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isConfirming ? color.negative.base : color.text.disabled,
                      cursor: 'pointer',
                      fontSize: isConfirming ? font.size.xs : font.size.caption,
                      padding: `${spacing[1]}px ${spacing[3]}px`,
                      marginRight: spacing[2],
                      borderRadius: radius.sm,
                      fontFamily: 'inherit',
                      flexShrink: 0,
                      transition: 'color 0.15s ease',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isConfirming) {
                        onDeleteWorkspace(scope);
                        setConfirmingDelete(null);
                        setOpen(false);
                      } else {
                        setConfirmingDelete(scope);
                      }
                    }}
                    onMouseEnter={e => { if (!isConfirming) e.currentTarget.style.color = color.negative.base; }}
                    onMouseLeave={e => { if (!isConfirming) e.currentTarget.style.color = color.text.disabled; }}
                    title={isConfirming ? 'Click again to confirm removal' : 'Remove workspace from list'}
                    aria-label={isConfirming ? `Confirm removal of ${label}` : `Remove ${label}`}
                  >
                    {isConfirming ? 'Confirm?' : '\u00D7'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
