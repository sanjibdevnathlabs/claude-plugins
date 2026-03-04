import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddServerForm from '../components/AddServerForm';

describe('AddServerForm', () => {
  const defaults = {
    activeScope: 'global',
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  function renderForm(overrides = {}) {
    const props = { ...defaults, ...overrides, onClose: vi.fn(), onSubmit: vi.fn() };
    if (overrides.onClose) props.onClose = overrides.onClose;
    if (overrides.onSubmit) props.onSubmit = overrides.onSubmit;
    const result = render(<AddServerForm {...props} />);
    return { ...result, props };
  }

  // --- Rendering ---
  it('renders modal with title showing "Global" for global scope', () => {
    renderForm({ activeScope: 'global' });
    expect(screen.getByText(/Add MCP Server/)).toBeInTheDocument();
    expect(screen.getByText(/Global/)).toBeInTheDocument();
  });

  it('renders shortened scope label for workspace path', () => {
    renderForm({ activeScope: '/Users/dev/projects/my-app' });
    expect(screen.getByText(/my-app/)).toBeInTheDocument();
  });

  it('defaults to HTTP type', () => {
    renderForm();
    expect(screen.getByPlaceholderText('https://example.com/mcp')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('/usr/local/bin/my-server')).not.toBeInTheDocument();
  });

  // --- Type switching ---
  it('switches to STDIO fields when STDIO button is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText('STDIO'));

    expect(screen.getByPlaceholderText('/usr/local/bin/my-server')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('--port, 3000, --verbose')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('https://example.com/mcp')).not.toBeInTheDocument();
  });

  it('switches back to HTTP fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText('STDIO'));
    await user.click(screen.getByText('HTTP / SSE'));

    expect(screen.getByPlaceholderText('https://example.com/mcp')).toBeInTheDocument();
  });

  // --- Validation ---
  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('Server name is required')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when URL is empty for HTTP type', async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    await user.type(screen.getByPlaceholderText('my-server'), 'test-server');
    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('URL is required for HTTP servers')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when command is empty for STDIO type', async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    await user.type(screen.getByPlaceholderText('my-server'), 'test-server');
    await user.click(screen.getByText('STDIO'));
    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('Command is required for STDIO servers')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  // --- HTTP Submission ---
  it('submits HTTP server config correctly', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'my-http');
    await user.type(screen.getByPlaceholderText('https://example.com/mcp'), 'https://test.com/api');
    await user.click(screen.getByText('Add Server'));

    expect(onSubmit).toHaveBeenCalledWith('my-http', {
      type: 'http',
      url: 'https://test.com/api',
    });
  });

  // --- STDIO Submission ---
  it('submits STDIO server config with args', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'my-stdio');
    await user.click(screen.getByText('STDIO'));
    await user.type(screen.getByPlaceholderText('/usr/local/bin/my-server'), 'node');
    await user.type(screen.getByPlaceholderText('--port, 3000, --verbose'), '--flag, value');
    await user.click(screen.getByText('Add Server'));

    expect(onSubmit).toHaveBeenCalledWith('my-stdio', {
      type: 'stdio',
      command: 'node',
      args: ['--flag', 'value'],
    });
  });

  it('submits STDIO with empty args as empty array', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'bare');
    await user.click(screen.getByText('STDIO'));
    await user.type(screen.getByPlaceholderText('/usr/local/bin/my-server'), 'python');
    await user.click(screen.getByText('Add Server'));

    expect(onSubmit).toHaveBeenCalledWith('bare', {
      type: 'stdio',
      command: 'python',
      args: [],
    });
  });

  // --- Env vars ---
  it('adds and removes environment variable rows', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByText('STDIO'));

    // Add env row
    const addBtn = screen.getAllByText('+ Add').find(el => el.closest('[style]'));
    // The env "Add" button is inside the env section
    const envAddBtn = screen.getByText('+ Add', { selector: 'button[type="button"]' });
    await user.click(envAddBtn);

    expect(screen.getByPlaceholderText('KEY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('value')).toBeInTheDocument();

    // Remove env row
    await user.click(screen.getByTitle('Remove'));
    expect(screen.queryByPlaceholderText('KEY')).not.toBeInTheDocument();
  });

  it('submits STDIO with env vars', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'env-test');
    await user.click(screen.getByText('STDIO'));
    await user.type(screen.getByPlaceholderText('/usr/local/bin/my-server'), 'node');

    // Add env var
    await user.click(screen.getByText('+ Add', { selector: 'button[type="button"]' }));
    await user.type(screen.getByPlaceholderText('KEY'), 'API_KEY');
    await user.type(screen.getByPlaceholderText('value'), 'secret123');
    await user.click(screen.getByText('Add Server'));

    expect(onSubmit).toHaveBeenCalledWith('env-test', {
      type: 'stdio',
      command: 'node',
      args: [],
      env: { API_KEY: 'secret123' },
    });
  });

  it('skips env vars with empty keys', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'skip-empty');
    await user.click(screen.getByText('STDIO'));
    await user.type(screen.getByPlaceholderText('/usr/local/bin/my-server'), 'cmd');

    // Add env var with empty key
    await user.click(screen.getByText('+ Add', { selector: 'button[type="button"]' }));
    // Don't type in KEY, just value
    await user.type(screen.getByPlaceholderText('value'), 'orphan');
    await user.click(screen.getByText('Add Server'));

    // No env in config since key was empty
    expect(onSubmit).toHaveBeenCalledWith('skip-empty', {
      type: 'stdio',
      command: 'cmd',
      args: [],
    });
  });

  // --- Close behavior ---
  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderForm({ onClose });

    await user.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('cancel button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderForm({ onClose });

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('escape key calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderForm({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking overlay background calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <AddServerForm activeScope="global" onClose={onClose} onSubmit={vi.fn()} />
    );

    // Click the overlay div (outermost fixed-position div)
    const overlay = container.firstChild;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  // --- Submit error handling ---
  it('shows error message when onSubmit throws', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Duplicate name'));
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'dup');
    await user.type(screen.getByPlaceholderText('https://example.com/mcp'), 'https://x.com');
    await user.click(screen.getByText('Add Server'));

    await waitFor(() => {
      expect(screen.getByText('Duplicate name')).toBeInTheDocument();
    });
  });

  it('shows generic error when onSubmit throws without message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error(''));
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'test');
    await user.type(screen.getByPlaceholderText('https://example.com/mcp'), 'https://x.com');
    await user.click(screen.getByText('Add Server'));

    await waitFor(() => {
      expect(screen.getByText('Failed to add server')).toBeInTheDocument();
    });
  });

  // --- Submitting state ---
  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const onSubmit = vi.fn(() => new Promise(r => { resolveSubmit = r; }));
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText('my-server'), 'test');
    await user.type(screen.getByPlaceholderText('https://example.com/mcp'), 'https://x.com');
    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('Adding...')).toBeInTheDocument();
    const btn = screen.getByText('Adding...').closest('button');
    expect(btn).toBeDisabled();

    resolveSubmit();
  });
});
