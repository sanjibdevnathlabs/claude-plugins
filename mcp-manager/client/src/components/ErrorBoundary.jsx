import React from 'react';
import { color, font, spacing, radius } from '../blade-tokens';

const styles = {
  container: {
    maxWidth: 500,
    margin: '80px auto',
    padding: `${spacing[7]}px ${spacing[6]}px`,
    textAlign: 'center',
  },
  title: {
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    marginBottom: spacing[4],
  },
  message: {
    fontSize: font.size.body,
    color: color.text.muted,
    marginBottom: spacing[6],
    lineHeight: `${font.lineHeight.body}px`,
  },
  details: {
    fontSize: font.size.caption,
    color: color.negative.base,
    background: color.negative.bg,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[6],
    textAlign: 'left',
    fontFamily: font.family.code,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 120,
    overflow: 'auto',
  },
  button: {
    padding: `${spacing[3]}px ${spacing[5]}px`,
    background: color.primary.base,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: font.size.body,
    fontWeight: font.weight.medium,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MCP Manager error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.message}>
            The MCP Manager dashboard encountered an error. Try reloading the page.
          </div>
          {this.state.error && (
            <div style={styles.details}>{this.state.error.message}</div>
          )}
          <button
            style={styles.button}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
