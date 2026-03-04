import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContextWarning from '../components/ContextWarning';

const USAGE_WARNING = {
  servers: [
    { name: 'big-server', toolCount: 50, estimatedTokens: 20000, error: null },
    { name: 'small-server', toolCount: 5, estimatedTokens: 3000, error: null },
    { name: 'err-server', toolCount: 0, estimatedTokens: 7000, error: 'Connection refused' },
  ],
  totalTokens: 30000,
  threshold: 25000,
  warning: true,
};

describe('ContextWarning', () => {
  it('returns null when contextUsage is null', () => {
    const { container } = render(<ContextWarning contextUsage={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when contextUsage is undefined', () => {
    const { container } = render(<ContextWarning contextUsage={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when warning is false', () => {
    const usage = { ...USAGE_WARNING, warning: false };
    const { container } = render(<ContextWarning contextUsage={usage} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders warning banner with token counts', () => {
    render(<ContextWarning contextUsage={USAGE_WARNING} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Warning: Large MCP tools context/)).toBeInTheDocument();
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
    expect(screen.getByText(/25,000/)).toBeInTheDocument();
  });

  it('details table is hidden by default', () => {
    render(<ContextWarning contextUsage={USAGE_WARNING} />);
    expect(screen.queryByText('Server')).not.toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('clicking Details shows the server table', async () => {
    const user = userEvent.setup();
    render(<ContextWarning contextUsage={USAGE_WARNING} />);

    await user.click(screen.getByText('Details'));

    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(screen.getByText('big-server')).toBeInTheDocument();
    expect(screen.getByText('small-server')).toBeInTheDocument();
    expect(screen.getByText('err-server')).toBeInTheDocument();
  });

  it('table sorts servers by estimatedTokens descending', async () => {
    const user = userEvent.setup();
    render(<ContextWarning contextUsage={USAGE_WARNING} />);
    await user.click(screen.getByText('Details'));

    const rows = screen.getAllByRole('row');
    // row 0 = header, row 1 = big-server (20000), row 2 = err-server (7000), row 3 = small-server (3000), row 4 = total
    expect(rows[1]).toHaveTextContent('big-server');
    expect(rows[2]).toHaveTextContent('err-server');
    expect(rows[3]).toHaveTextContent('small-server');
  });

  it('shows (error) indicator for errored servers', async () => {
    const user = userEvent.setup();
    render(<ContextWarning contextUsage={USAGE_WARNING} />);
    await user.click(screen.getByText('Details'));

    expect(screen.getByText('(error)')).toBeInTheDocument();
  });

  it('shows total row with aggregated counts', async () => {
    const user = userEvent.setup();
    render(<ContextWarning contextUsage={USAGE_WARNING} />);
    await user.click(screen.getByText('Details'));

    expect(screen.getByText('Total')).toBeInTheDocument();
    // total tools = 50 + 5 + 0 = 55
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('clicking Hide collapses the table', async () => {
    const user = userEvent.setup();
    render(<ContextWarning contextUsage={USAGE_WARNING} />);

    await user.click(screen.getByText('Details'));
    expect(screen.getByText('big-server')).toBeInTheDocument();

    await user.click(screen.getByText('Hide'));
    expect(screen.queryByText('big-server')).not.toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
