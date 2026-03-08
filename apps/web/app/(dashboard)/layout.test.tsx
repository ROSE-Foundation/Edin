import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardLayout from './layout';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard/working-groups',
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it('renders dashboard sidebar navigation with working groups link', () => {
    render(
      <DashboardLayout>
        <div>Child Content</div>
      </DashboardLayout>,
    );

    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Working Groups' })).toHaveAttribute(
      'href',
      '/dashboard/working-groups',
    );
    expect(screen.getByRole('link', { name: 'Working Groups' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
