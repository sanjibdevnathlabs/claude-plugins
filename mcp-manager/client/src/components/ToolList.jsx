import React from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    padding: `${spacing[4]}px 0 ${spacing[2]}px`,
  },
  chip: {
    fontSize: font.size.sm,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    borderRadius: radius.sm,
    background: color.bg.elevated,
    color: color.text.muted,
    border: `1px solid ${color.border.subtle}`,
    fontFamily: font.family.code,
    letterSpacing: '-0.01em',
    lineHeight: `${font.lineHeight.sm}px`,
  },
  loading: {
    fontSize: font.size.caption,
    color: color.text.subtle,
    padding: `${spacing[4]}px 0`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    lineHeight: `${font.lineHeight.caption}px`,
  },
  error: {
    fontSize: font.size.caption,
    color: color.negative.base,
    padding: `${spacing[4]}px 0`,
    lineHeight: `${font.lineHeight.caption}px`,
  },
  spinner: {
    width: 12,
    height: 12,
    border: `2px solid ${color.border.default}`,
    borderTopColor: color.primary.base,
    borderRadius: '50%',
    animation: 'blade-spin 0.6s linear infinite',
  },
};

export default function ToolList({ tools, loading, error }) {
  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        Discovering tools...
      </div>
    );
  }

  if (error) {
    return <div style={styles.error} role="alert">{error}</div>;
  }

  if (!tools || tools.length === 0) {
    return <div style={styles.loading}>No tools found</div>;
  }

  return (
    <div style={styles.container}>
      {tools.map(tool => (
        <span key={tool.name} style={styles.chip} title={tool.description}>
          {tool.name}
        </span>
      ))}
    </div>
  );
}
