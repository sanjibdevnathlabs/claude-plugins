import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkspaceSelector from '../components/WorkspaceSelector';

// --- FT-11: Home directory "~ (home)" label ---
describe('FT-11: Home directory "~ (home)" label', () => {
  it('shows "~ (home)" as the active label when activeScope matches _meta.homedir', () => {
    const homedir = '/Users/dev';
    render(
      <WorkspaceSelector
        workspaces={[homedir]}
        activeScope={homedir}
        onSelect={vi.fn()}
        serverCounts={{
          global: [{ name: 'g1' }],
          [homedir]: [{ name: 'h1' }],
          _meta: { homedir },
        }}
        globalCount={1}
        onDeleteWorkspace={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('~ (home)');
  });

  it('shows shortened path when activeScope does NOT match homedir', () => {
    const workspace = '/Users/dev/projects/my-app';
    render(
      <WorkspaceSelector
        workspaces={[workspace]}
        activeScope={workspace}
        onSelect={vi.fn()}
        serverCounts={{
          global: [],
          [workspace]: [{ name: 'w1' }],
          _meta: { homedir: '/Users/dev' },
        }}
        globalCount={0}
        onDeleteWorkspace={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).not.toHaveTextContent('~ (home)');
    expect(trigger).toHaveTextContent('my-app');
  });
});

// --- Delete button tests ---
describe('Workspace delete button', () => {
  it('shows delete button for non-global scopes in dropdown', async () => {
    const user = userEvent.setup();
    const workspace = '/Users/dev/my-project';
    render(
      <WorkspaceSelector
        workspaces={[workspace]}
        activeScope="global"
        onSelect={vi.fn()}
        serverCounts={{
          global: [{ name: 'g1' }],
          [workspace]: [{ name: 'w1' }],
          _meta: { homedir: '/Users/dev' },
        }}
        globalCount={1}
        onDeleteWorkspace={vi.fn()}
      />
    );

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // Should have delete button for workspace but not for global
    const removeButtons = screen.getAllByLabelText(/Remove/);
    expect(removeButtons.length).toBe(1);
    expect(removeButtons[0]).toHaveAttribute('aria-label', expect.stringContaining('my-project'));
  });

  it('two-click confirmation flow works', async () => {
    const user = userEvent.setup();
    const workspace = '/Users/dev/my-project';
    const onDelete = vi.fn();
    render(
      <WorkspaceSelector
        workspaces={[workspace]}
        activeScope="global"
        onSelect={vi.fn()}
        serverCounts={{
          global: [],
          [workspace]: [],
          _meta: { homedir: '/Users/dev' },
        }}
        globalCount={0}
        onDeleteWorkspace={onDelete}
      />
    );

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // First click — shows "Confirm?"
    const removeBtn = screen.getByLabelText(/Remove/);
    await user.click(removeBtn);
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // Second click — executes delete
    const confirmBtn = screen.getByText('Confirm?');
    await user.click(confirmBtn);
    expect(onDelete).toHaveBeenCalledWith(workspace);
  });
});
