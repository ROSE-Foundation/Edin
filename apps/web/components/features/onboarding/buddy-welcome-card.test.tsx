import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuddyWelcomeCard } from './buddy-welcome-card';

const mockBuddy = {
  id: 'buddy-uuid-1',
  name: 'Alice Mentor',
  bio: 'Experienced full-stack developer passionate about helping newcomers.',
  avatarUrl: null,
  domain: 'Technology',
};

describe('BuddyWelcomeCard', () => {
  it('renders buddy info correctly', () => {
    render(<BuddyWelcomeCard buddy={mockBuddy} isLoading={false} />);

    expect(screen.getByText('Alice Mentor')).toBeTruthy();
    expect(screen.getByText('Technology')).toBeTruthy();
    expect(screen.getByText(/Experienced full-stack developer/)).toBeTruthy();
    expect(screen.getByText('Your Buddy')).toBeTruthy();
  });

  it('renders loading skeleton', () => {
    const { container } = render(<BuddyWelcomeCard buddy={null} isLoading={true} />);

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no buddy', () => {
    render(<BuddyWelcomeCard buddy={null} isLoading={false} />);

    expect(screen.getByText(/finding the right person/)).toBeTruthy();
  });

  it('renders avatar initial when no avatarUrl', () => {
    render(<BuddyWelcomeCard buddy={mockBuddy} isLoading={false} />);

    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders buddy with avatarUrl', () => {
    const buddyWithAvatar = { ...mockBuddy, avatarUrl: 'https://example.com/alice.jpg' };
    render(<BuddyWelcomeCard buddy={buddyWithAvatar} isLoading={false} />);

    const img = screen.getByAltText("Alice Mentor's photo");
    expect(img).toBeTruthy();
  });
});
