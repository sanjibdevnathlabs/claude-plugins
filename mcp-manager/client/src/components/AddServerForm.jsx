import React, { useState, useRef, useEffect } from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: color.bg.surface,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing[5]}px ${spacing[6]}px`,
    borderBottom: `1px solid ${color.border.subtle}`,
  },
  title: {
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    lineHeight: `${font.lineHeight.md}px`,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: color.text.muted,
    cursor: 'pointer',
    fontSize: font.size.lg,
    padding: `${spacing[1]}px ${spacing[2]}px`,
    borderRadius: radius.sm,
    fontFamily: 'inherit',
    lineHeight: 1,
  },
  body: {
    padding: `${spacing[5]}px ${spacing[6]}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[5],
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  },
  label: {
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    color: color.text.secondary,
    lineHeight: `${font.lineHeight.caption}px`,
  },
  input: {
    padding: `${spacing[3]}px ${spacing[4]}px`,
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.md,
    color: color.text.primary,
    fontSize: font.size.body,
    fontFamily: 'inherit',
    lineHeight: `${font.lineHeight.body}px`,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  typeRow: {
    display: 'flex',
    gap: spacing[3],
  },
  typeBtn: {
    flex: 1,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    borderRadius: radius.md,
    cursor: 'pointer',
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    fontFamily: 'inherit',
    textAlign: 'center',
    transition: 'all 0.15s ease',
    lineHeight: `${font.lineHeight.caption}px`,
  },
  typeBtnActive: {
    background: color.primary.muted,
    border: `1px solid ${color.primary.base}`,
    color: color.primary.base,
  },
  typeBtnInactive: {
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    color: color.text.muted,
  },
  envSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
  },
  envHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  envRow: {
    display: 'flex',
    gap: spacing[3],
    alignItems: 'center',
  },
  envInput: {
    flex: 1,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.sm,
    color: color.text.primary,
    fontSize: font.size.caption,
    fontFamily: 'inherit',
    lineHeight: `${font.lineHeight.caption}px`,
    outline: 'none',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: color.text.disabled,
    cursor: 'pointer',
    fontSize: font.size.body,
    padding: `${spacing[1]}px ${spacing[2]}px`,
    borderRadius: radius.sm,
    fontFamily: 'inherit',
    lineHeight: 1,
  },
  addEnvBtn: {
    background: 'none',
    border: `1px dashed ${color.border.subtle}`,
    color: color.text.muted,
    cursor: 'pointer',
    fontSize: font.size.caption,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    fontFamily: 'inherit',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
    padding: `${spacing[4]}px ${spacing[6]}px ${spacing[5]}px`,
    borderTop: `1px solid ${color.border.subtle}`,
  },
  cancelBtn: {
    padding: `${spacing[3]}px ${spacing[5]}px`,
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.md,
    color: color.text.secondary,
    cursor: 'pointer',
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: `${spacing[3]}px ${spacing[5]}px`,
    background: color.primary.base,
    border: 'none',
    borderRadius: radius.md,
    color: '#fff',
    cursor: 'pointer',
    fontSize: font.size.caption,
    fontWeight: font.weight.semibold,
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  error: {
    background: color.negative.bg,
    border: `1px solid ${color.negative.base}`,
    borderRadius: radius.sm,
    padding: `${spacing[3]}px ${spacing[4]}px`,
    color: color.negative.text,
    fontSize: font.size.caption,
    lineHeight: `${font.lineHeight.caption}px`,
  },
  hint: {
    fontSize: font.size.sm,
    color: color.text.disabled,
    lineHeight: `${font.lineHeight.sm}px`,
  },
};

function shortenScope(scope) {
  if (scope === 'global') return 'Global';
  const home = scope.replace(/^\/Users\/[^/]+/, '~');
  const parts = home.split('/');
  return parts[parts.length - 1] || home;
}

export default function AddServerForm({ activeScope, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('http');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [envPairs, setEnvPairs] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const addEnvRow = () => {
    setEnvPairs(prev => [...prev, { key: '', value: '' }]);
  };

  const updateEnvRow = (idx, field, val) => {
    setEnvPairs(prev => prev.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  };

  const removeEnvRow = (idx) => {
    setEnvPairs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Server name is required');
      return;
    }

    let serverConfig;
    if (type === 'http') {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setError('URL is required for HTTP servers');
        return;
      }
      serverConfig = { type: 'http', url: trimmedUrl };
    } else {
      const trimmedCmd = command.trim();
      if (!trimmedCmd) {
        setError('Command is required for STDIO servers');
        return;
      }
      const parsedArgs = args.trim()
        ? args.split(',').map(a => a.trim()).filter(Boolean)
        : [];
      const env = {};
      for (const pair of envPairs) {
        const k = pair.key.trim();
        if (k) env[k] = pair.value;
      }
      serverConfig = { type: 'stdio', command: trimmedCmd, args: parsedArgs };
      if (Object.keys(env).length > 0) serverConfig.env = env;
    }

    setSubmitting(true);
    try {
      await onSubmit(trimmedName, serverConfig);
    } catch (err) {
      setError(err.message || 'Failed to add server');
      setSubmitting(false);
    }
  };

  const scopeLabel = shortenScope(activeScope);

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.title}>Add MCP Server &mdash; {scopeLabel}</div>
          <button style={styles.closeBtn} onClick={onClose} title="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.body}>
            {error && <div style={styles.error}>{error}</div>}

            {/* Server Name */}
            <div style={styles.field}>
              <label style={styles.label}>Server Name</label>
              <input
                ref={nameRef}
                style={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="my-server"
                maxLength={256}
                onFocus={e => { e.currentTarget.style.borderColor = color.primary.base; }}
                onBlur={e => { e.currentTarget.style.borderColor = color.border.subtle; }}
              />
            </div>

            {/* Type Selector */}
            <div style={styles.field}>
              <label style={styles.label}>Type</label>
              <div style={styles.typeRow}>
                <button
                  type="button"
                  style={{ ...styles.typeBtn, ...(type === 'http' ? styles.typeBtnActive : styles.typeBtnInactive) }}
                  onClick={() => setType('http')}
                >
                  HTTP / SSE
                </button>
                <button
                  type="button"
                  style={{ ...styles.typeBtn, ...(type === 'stdio' ? styles.typeBtnActive : styles.typeBtnInactive) }}
                  onClick={() => setType('stdio')}
                >
                  STDIO
                </button>
              </div>
            </div>

            {/* HTTP Fields */}
            {type === 'http' && (
              <div style={styles.field}>
                <label style={styles.label}>URL</label>
                <input
                  style={styles.input}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/mcp"
                  onFocus={e => { e.currentTarget.style.borderColor = color.primary.base; }}
                  onBlur={e => { e.currentTarget.style.borderColor = color.border.subtle; }}
                />
              </div>
            )}

            {/* STDIO Fields */}
            {type === 'stdio' && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Command</label>
                  <input
                    style={styles.input}
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    placeholder="/usr/local/bin/my-server"
                    onFocus={e => { e.currentTarget.style.borderColor = color.primary.base; }}
                    onBlur={e => { e.currentTarget.style.borderColor = color.border.subtle; }}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Arguments</label>
                  <input
                    style={styles.input}
                    value={args}
                    onChange={e => setArgs(e.target.value)}
                    placeholder="--port, 3000, --verbose"
                    onFocus={e => { e.currentTarget.style.borderColor = color.primary.base; }}
                    onBlur={e => { e.currentTarget.style.borderColor = color.border.subtle; }}
                  />
                  <div style={styles.hint}>Comma-separated list of arguments</div>
                </div>

                <div style={styles.field}>
                  <div style={styles.envHeader}>
                    <label style={styles.label}>Environment Variables</label>
                    <button type="button" style={styles.addEnvBtn} onClick={addEnvRow}>+ Add</button>
                  </div>
                  {envPairs.length > 0 && (
                    <div style={styles.envSection}>
                      {envPairs.map((pair, idx) => (
                        <div key={idx} style={styles.envRow}>
                          <input
                            style={styles.envInput}
                            value={pair.key}
                            onChange={e => updateEnvRow(idx, 'key', e.target.value)}
                            placeholder="KEY"
                          />
                          <input
                            style={{ ...styles.envInput, flex: 2 }}
                            value={pair.value}
                            onChange={e => updateEnvRow(idx, 'value', e.target.value)}
                            placeholder="value"
                          />
                          <button
                            type="button"
                            style={styles.removeBtn}
                            onClick={() => removeEnvRow(idx)}
                            title="Remove"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              style={{ ...styles.submitBtn, ...(submitting ? styles.submitBtnDisabled : {}) }}
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
