import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServerCard from '../components/ServerCard';

function makeServer(overrides = {}) {
  return {
    name: 'test-server',
    enabled: true,
    scope: 'global',
    config: { command: 'node', args: ['server.js'] },
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  );
});

// --- Basic rendering ---
describe('Basic rendering', () => {
  it('renders server name', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('test-server')).toBeInTheDocument();
  });

  it('renders first letter as avatar initial', () => {
    render(
      <ServerCard server={makeServer({ name: 'my-mcp' })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders type badge from config.type', () => {
    render(
      <ServerCard server={makeServer({ config: { type: 'http', url: 'https://x.com' } })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('infers stdio type from command', () => {
    render(
      <ServerCard server={makeServer({ config: { command: 'node' } })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('stdio')).toBeInTheDocument();
  });

  it('infers http type from url', () => {
    render(
      <ServerCard server={makeServer({ config: { url: 'https://x.com' } })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('shows unknown type when no type indicators', () => {
    render(
      <ServerCard server={makeServer({ config: {} })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});

// --- Disabled state ---
describe('Disabled server state', () => {
  it('shows "disabled" status text for disabled server', () => {
    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByText('disabled')).toBeInTheDocument();
  });

  it('applies reduced opacity for disabled server', () => {
    const { container } = render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(container.firstChild.style.opacity).toBe('0.55');
  });

  it('toggle knob is positioned left when disabled', () => {
    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});

// --- Scope badge ---
describe('Scope badge', () => {
  it('renders no scope badge when showScopeBadge is not set', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
  });

  it('renders "Global" badge when showScopeBadge=true and scope=global', () => {
    render(
      <ServerCard server={makeServer({ scope: 'global' })} onToggle={vi.fn()} toggling={false} probeError={null} showScopeBadge={true} />
    );
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('does not render scope badge for local server even when showScopeBadge=true', () => {
    render(
      <ServerCard server={makeServer({ scope: '/some/path' })} onToggle={vi.fn()} toggling={false} probeError={null} showScopeBadge={true} />
    );
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
  });

  it('does not render scope badge when showScopeBadge=false', () => {
    render(
      <ServerCard server={makeServer({ scope: 'global' })} onToggle={vi.fn()} toggling={false} probeError={null} showScopeBadge={false} />
    );
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
  });
});

// --- Toggle ---
describe('Toggle button', () => {
  it('disables toggle button and reduces opacity when toggling is true', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={true} probeError={null} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
    expect(toggle.style.opacity).toBe('0.5');
  });

  it('enables toggle button when toggling is false', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeDisabled();
    expect(toggle.style.opacity).toBe('1');
  });

  it('calls onToggle when toggle is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ServerCard server={makeServer()} onToggle={onToggle} toggling={false} probeError={null} />
    );

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows correct title for enabled server', () => {
    render(
      <ServerCard server={makeServer({ enabled: true })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByTitle('Disable test-server')).toBeInTheDocument();
  });

  it('shows correct title for disabled server', () => {
    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.getByTitle('Enable test-server')).toBeInTheDocument();
  });
});

// --- Error badge ---
describe('Error badge', () => {
  it('renders error badge when probeError is set', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError="Connection refused" />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('does not render error badge when probeError is null', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} />
    );
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('error badge has probeError as title', () => {
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError="timeout" />
    );
    expect(screen.getByTitle('timeout')).toBeInTheDocument();
  });
});

// --- Expand/collapse ---
describe('Expand/collapse', () => {
  it('shows collapse indicator when expanded', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    // Initially shows down arrow
    expect(screen.getByText('\u25BE')).toBeInTheDocument();

    // Click to expand (click the card, not the toggle)
    await user.click(screen.getByText('test-server'));

    // Now shows up arrow
    expect(screen.getByText('\u25B4')).toBeInTheDocument();
  });

  it('shows ToolList when expanded', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    await user.click(screen.getByText('test-server'));

    // ToolList renders (tools empty from mock → "No tools found")
    await waitFor(() => {
      expect(screen.getByText('No tools found')).toBeInTheDocument();
    });
  });

  it('does not expand when toggle switch is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    await user.click(screen.getByRole('switch'));
    // Should still show down arrow (not expanded)
    expect(screen.getByText('\u25BE')).toBeInTheDocument();
  });
});

// --- Tool fetching ---
describe('Tool fetching', () => {
  it('auto-fetches tools for enabled servers on mount', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ name: 'tool1', description: 'A tool' }]),
      })
    );

    render(
      <ServerCard server={makeServer({ enabled: true })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );

    await waitFor(() => {
      expect(screen.getByText('1 tools')).toBeInTheDocument();
    });
  });

  it('does not auto-fetch tools for disabled servers', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));

    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} />
    );

    // No fetch should be made for tools (only the initial render)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows "Failed to probe server" on fetch error', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    // Expand to trigger fetch
    await user.click(screen.getByText('test-server'));

    await waitFor(() => {
      expect(screen.getByText('Failed to probe server')).toBeInTheDocument();
    });
  });

  it('sets toolsError when server response contains error field', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ error: 'Server crashed' }),
      })
    );

    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    // Expand to trigger fetch and see ToolList error
    await user.click(screen.getByText('test-server'));

    await waitFor(() => {
      expect(screen.getByText('Server crashed')).toBeInTheDocument();
    });
  });

  it('shows error on non-ok response', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    render(
      <ServerCard server={makeServer({ enabled: false })} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    await user.click(screen.getByText('test-server'));

    await waitFor(() => {
      expect(screen.getByText('Failed to probe server')).toBeInTheDocument();
    });
  });
});

// --- Delete flow ---
describe('Delete flow', () => {
  it('does not show delete button when onDelete is not provided', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} />
    );

    await user.click(screen.getByText('test-server'));
    expect(screen.queryByText('Delete Server')).not.toBeInTheDocument();
  });

  it('shows delete button when expanded and onDelete provided', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={vi.fn()} />
    );

    await user.click(screen.getByText('test-server'));
    expect(screen.getByText('Delete Server')).toBeInTheDocument();
  });

  it('first click shows confirm, second click deletes', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={onDelete} />
    );

    await user.click(screen.getByText('test-server'));

    // First click shows confirm
    await user.click(screen.getByText('Delete Server'));
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // Second click executes delete
    await user.click(screen.getByText('Confirm Delete'));
    expect(onDelete).toHaveBeenCalledWith('test-server', 'global');
  });

  it('passes workspace scope correctly for local server', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ServerCard server={makeServer({ scope: '/my/project' })} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={onDelete} />
    );

    await user.click(screen.getByText('test-server'));
    await user.click(screen.getByText('Delete Server'));
    await user.click(screen.getByText('Confirm Delete'));

    expect(onDelete).toHaveBeenCalledWith('test-server', '/my/project');
  });

  it('resets confirm state on delete error', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error('fail'));
    render(
      <ServerCard server={makeServer()} onToggle={vi.fn()} toggling={false} probeError={null} onDelete={onDelete} />
    );

    await user.click(screen.getByText('test-server'));
    await user.click(screen.getByText('Delete Server'));
    await user.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(screen.getByText('Delete Server')).toBeInTheDocument();
    });
  });
});
