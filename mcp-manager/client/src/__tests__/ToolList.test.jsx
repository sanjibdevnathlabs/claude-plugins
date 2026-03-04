import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ToolList from '../components/ToolList';

describe('ToolList', () => {
  it('shows loading spinner when loading is true', () => {
    render(<ToolList tools={null} loading={true} error={null} />);
    expect(screen.getByText('Discovering tools...')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    render(<ToolList tools={null} loading={false} error="Connection refused" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Connection refused');
  });

  it('shows "No tools found" when tools is null', () => {
    render(<ToolList tools={null} loading={false} error={null} />);
    expect(screen.getByText('No tools found')).toBeInTheDocument();
  });

  it('shows "No tools found" when tools is empty array', () => {
    render(<ToolList tools={[]} loading={false} error={null} />);
    expect(screen.getByText('No tools found')).toBeInTheDocument();
  });

  it('renders tool chips with names', () => {
    const tools = [
      { name: 'read_file', description: 'Read a file' },
      { name: 'write_file', description: 'Write a file' },
      { name: 'list_dir', description: 'List directory' },
    ];
    render(<ToolList tools={tools} loading={false} error={null} />);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('write_file')).toBeInTheDocument();
    expect(screen.getByText('list_dir')).toBeInTheDocument();
  });

  it('renders tool descriptions as title attributes', () => {
    const tools = [{ name: 'search', description: 'Search the codebase' }];
    render(<ToolList tools={tools} loading={false} error={null} />);
    expect(screen.getByText('search')).toHaveAttribute('title', 'Search the codebase');
  });

  it('prioritizes loading state over error', () => {
    render(<ToolList tools={null} loading={true} error="Some error" />);
    expect(screen.getByText('Discovering tools...')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prioritizes error over empty tools', () => {
    render(<ToolList tools={null} loading={false} error="Timeout" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Timeout');
    expect(screen.queryByText('No tools found')).not.toBeInTheDocument();
  });
});
