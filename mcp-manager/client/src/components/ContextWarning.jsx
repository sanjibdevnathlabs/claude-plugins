import React, { useState } from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

const amber = {
  bg: 'hsla(41, 100%, 33%, 0.09)',
  border: 'hsla(41, 100%, 33%, 0.3)',
  text: 'hsla(41, 100%, 70%, 1)',
  heading: 'hsla(41, 100%, 80%, 1)',
  muted: 'hsla(41, 100%, 50%, 0.7)',
};

const styles = {
  banner: {
    background: amber.bg,
    border: `1px solid ${amber.border}`,
    borderRadius: radius.md,
    padding: `${spacing[4]}px ${spacing[5]}px`,
    marginBottom: spacing[5],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  title: {
    fontSize: font.size.caption,
    fontWeight: font.weight.semibold,
    color: amber.heading,
    lineHeight: `${font.lineHeight.caption}px`,
  },
  detailsBtn: {
    background: 'none',
    border: 'none',
    color: amber.muted,
    fontSize: font.size.xs,
    cursor: 'pointer',
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    fontFamily: 'inherit',
  },
  table: {
    marginTop: spacing[3],
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: font.size.xs,
  },
  th: {
    textAlign: 'left',
    color: amber.muted,
    fontWeight: font.weight.medium,
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderBottom: `1px solid ${amber.border}`,
  },
  td: {
    color: amber.text,
    padding: `${spacing[1]}px ${spacing[3]}px`,
    borderBottom: `1px solid hsla(41, 100%, 33%, 0.1)`,
  },
  totalRow: {
    fontWeight: font.weight.semibold,
  },
  errorText: {
    color: color.negative.base,
    fontStyle: 'italic',
  },
};

export default function ContextWarning({ contextUsage }) {
  const [expanded, setExpanded] = useState(false);

  if (!contextUsage || !contextUsage.warning) return null;

  const sorted = [...contextUsage.servers].sort((a, b) => b.estimatedTokens - a.estimatedTokens);

  return (
    <div style={styles.banner} role="alert">
      <div style={styles.header}>
        <span style={styles.title}>
          Warning: Large MCP tools context (~{contextUsage.totalTokens.toLocaleString()} tokens {'>'} {contextUsage.threshold.toLocaleString()})
        </span>
        <button
          style={styles.detailsBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {expanded && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Server</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Tools</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Est. Tokens</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <tr key={s.name}>
                <td style={styles.td}>
                  {s.name}
                  {s.error && <span style={styles.errorText}> (error)</span>}
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{s.toolCount}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{s.estimatedTokens.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...styles.td, ...styles.totalRow }}>Total</td>
              <td style={{ ...styles.td, ...styles.totalRow, textAlign: 'right' }}>
                {sorted.reduce((sum, s) => sum + s.toolCount, 0)}
              </td>
              <td style={{ ...styles.td, ...styles.totalRow, textAlign: 'right' }}>
                {contextUsage.totalTokens.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
