import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnouncementBanner } from './announcement-banner';

const announcement = {
  id: 'ann-1',
  workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
  authorId: 'user-1',
  content: 'Welcome to the Technology working group!',
  createdAt: '2026-03-07T10:00:00.000Z',
  author: { id: 'user-1', name: 'Ada Lovelace', avatarUrl: null },
};

describe('AnnouncementBanner', () => {
  it('renders announcement content and author', () => {
    render(<AnnouncementBanner announcement={announcement} accentColor="#3A7D7E" />);

    expect(screen.getByText('Welcome to the Technology working group!')).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Latest announcement' })).toBeInTheDocument();
  });

  it('renders nothing when announcement is null', () => {
    const { container } = render(<AnnouncementBanner announcement={null} accentColor="#3A7D7E" />);

    expect(container.firstChild).toBeNull();
  });

  it('applies accent color as background style', () => {
    render(<AnnouncementBanner announcement={announcement} accentColor="#3A7D7E" />);

    const region = screen.getByRole('region', { name: 'Latest announcement' });
    expect(region).toHaveStyle({ backgroundColor: '#3A7D7E1A' });
  });

  it('renders without background style when no accent color', () => {
    render(<AnnouncementBanner announcement={announcement} />);

    const region = screen.getByRole('region', { name: 'Latest announcement' });
    expect(region).not.toHaveAttribute('style');
  });

  it('shows "Unknown" when author name is missing', () => {
    const noAuthorAnnouncement = {
      ...announcement,
      author: undefined as unknown as typeof announcement.author,
    };
    render(<AnnouncementBanner announcement={noAuthorAnnouncement} accentColor="#3A7D7E" />);

    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });
});
