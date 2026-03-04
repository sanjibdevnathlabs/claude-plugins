import React from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[7],
    paddingBottom: spacing[6],
    borderBottom: `1px solid ${color.border.subtle}`,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    background: color.primary.base,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: '#fff',
    flexShrink: 0,
  },
  title: {
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    letterSpacing: '-0.02em',
    lineHeight: `${font.lineHeight.xl}px`,
  },
  subtitle: {
    fontSize: font.size.caption,
    color: color.text.muted,
    marginTop: spacing[1],
    lineHeight: `${font.lineHeight.caption}px`,
  },
  stats: {
    display: 'flex',
    gap: spacing[5],
    alignItems: 'center',
  },
  stat: {
    textAlign: 'right',
  },
  statValue: {
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: font.size.sm,
    color: color.text.muted,
    marginTop: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: font.weight.medium,
  },
  divider: {
    width: 1,
    height: spacing[8],
    background: color.border.subtle,
  },
};

export default function Header({ totalServers, enabledServers }) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <div style={styles.icon}>M</div>
        <div>
          <div style={styles.title}>MCP Manager</div>
          <div style={styles.subtitle}>Model Context Protocol Server Dashboard</div>
        </div>
      </div>
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{enabledServers}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <div style={styles.statValue}>{totalServers}</div>
          <div style={styles.statLabel}>Total</div>
        </div>
      </div>
    </div>
  );
}
