import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FirstTaskCard } from './first-task-card';

const mockTask = {
  taskTitle: 'Build a REST API endpoint',
  taskDescription: 'Design and implement a single REST API endpoint.',
  estimatedEffort: '2-4 hours',
  domain: 'Technology',
  claimable: false,
};

describe('FirstTaskCard', () => {
  it('renders task info correctly', () => {
    render(<FirstTaskCard task={mockTask} isLoading={false} />);

    expect(screen.getByText('Build a REST API endpoint')).toBeTruthy();
    expect(screen.getByText(/Design and implement/)).toBeTruthy();
    expect(screen.getByText('Technology')).toBeTruthy();
    expect(screen.getByText(/2-4 hours/)).toBeTruthy();
  });

  it('renders disabled claim link to tasks', () => {
    render(<FirstTaskCard task={mockTask} isLoading={false} />);

    const link = screen.getByRole('link', { name: 'Claim this task' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/dashboard/tasks');
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('title')).toContain('Coming soon');
  });

  it('renders loading skeleton', () => {
    const { container } = render(<FirstTaskCard task={null} isLoading={true} />);

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no task', () => {
    render(<FirstTaskCard task={null} isLoading={false} />);

    expect(screen.getByText(/preparing a meaningful starting point/)).toBeTruthy();
  });
});
