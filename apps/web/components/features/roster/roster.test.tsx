import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicContributorProfile } from '@edin/shared';
import { ContributorRosterCard } from './contributor-roster-card';
import { ContributorRosterGrid } from './contributor-roster-grid';
import { RosterFilters } from './roster-filters';
import { RosterPagination } from './roster-pagination';
import { RosterSkeleton } from './roster-skeleton';

const mockContributor: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice Developer',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
  bio: 'Backend developer passionate about clean architecture and testing.',
  domain: 'Technology',
  skillAreas: ['TypeScript', 'NestJS'],
  role: 'CONTRIBUTOR',
  createdAt: '2025-06-15T10:00:00Z',
};

const mockContributor2: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Bob Investor',
  avatarUrl: null,
  bio: 'Fintech specialist building equitable economic systems.',
  domain: 'Fintech',
  skillAreas: ['Python'],
  role: 'FOUNDING_CONTRIBUTOR',
  createdAt: '2025-07-01T10:00:00Z',
};

const mockContributor3: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Carol Researcher',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12347',
  bio: 'Impact measurement and sustainability metrics.',
  domain: 'Impact',
  skillAreas: ['Research'],
  role: 'CONTRIBUTOR',
  createdAt: '2025-08-01T10:00:00Z',
};

describe('ContributorRosterCard', () => {
  it('renders avatar, name, and bio excerpt', () => {
    render(<ContributorRosterCard contributor={mockContributor} />);

    expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    expect(
      screen.getByText('Backend developer passionate about clean architecture and testing.'),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Alice Developer')).toBeInTheDocument();
  });

  it('renders domain badge with correct color for Technology', () => {
    render(<ContributorRosterCard contributor={mockContributor} />);

    const badge = screen.getByText('Technology');
    expect(badge).toHaveClass('bg-domain-technology');
    expect(badge).toHaveClass('text-white');
  });

  it('renders domain badge with correct color for Fintech', () => {
    render(<ContributorRosterCard contributor={mockContributor2} />);

    const badge = screen.getByText('Fintech');
    expect(badge).toHaveClass('bg-domain-fintech');
    expect(badge).toHaveClass('text-black');
  });

  it('renders domain badge with correct color for Impact', () => {
    render(<ContributorRosterCard contributor={mockContributor3} />);

    const badge = screen.getByText('Impact');
    expect(badge).toHaveClass('bg-domain-impact');
    expect(badge).toHaveClass('text-black');
  });

  it('renders domain badge with correct color for Governance', () => {
    render(<ContributorRosterCard contributor={{ ...mockContributor, domain: 'Governance' }} />);

    const badge = screen.getByText('Governance');
    expect(badge).toHaveClass('bg-domain-governance');
    expect(badge).toHaveClass('text-white');
  });

  it('renders role designation badge', () => {
    render(<ContributorRosterCard contributor={mockContributor} />);

    expect(screen.getByText('Contributor')).toBeInTheDocument();
  });

  it('renders Founding Contributor role badge', () => {
    render(<ContributorRosterCard contributor={mockContributor2} />);

    expect(screen.getByText('Founding Contributor')).toBeInTheDocument();
  });

  it('links to contributor profile page', () => {
    render(<ContributorRosterCard contributor={mockContributor} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/contributors/${mockContributor.id}`);
  });

  it('renders placeholder avatar when avatarUrl is null', () => {
    render(<ContributorRosterCard contributor={mockContributor2} />);

    const initial = screen.getByText('B');
    expect(initial).toBeInTheDocument();
    expect(initial.parentElement).toHaveClass('bg-domain-fintech');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has accessible link label', () => {
    render(<ContributorRosterCard contributor={mockContributor} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', "View Alice Developer's profile");
  });
});

describe('ContributorRosterGrid', () => {
  it('renders correct number of cards', () => {
    render(
      <ContributorRosterGrid
        contributors={[mockContributor, mockContributor2, mockContributor3]}
        isFiltered={false}
      />,
    );

    expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    expect(screen.getByText('Bob Investor')).toBeInTheDocument();
    expect(screen.getByText('Carol Researcher')).toBeInTheDocument();
  });

  it('shows filtered empty state message', () => {
    render(<ContributorRosterGrid contributors={[]} isFiltered={true} />);

    expect(screen.getByText('No contributors found matching your criteria.')).toBeInTheDocument();
  });

  it('shows global empty state message when not filtered', () => {
    render(<ContributorRosterGrid contributors={[]} isFiltered={false} />);

    expect(screen.getByText('The community is growing. Check back soon.')).toBeInTheDocument();
  });
});

describe('RosterFilters', () => {
  it('renders All + 4 domain filter buttons', () => {
    render(
      <RosterFilters
        activeDomain={null}
        searchValue=""
        onDomainChange={() => {}}
        onSearchChange={() => {}}
      />,
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(
      <RosterFilters
        activeDomain={null}
        searchValue=""
        onDomainChange={() => {}}
        onSearchChange={() => {}}
      />,
    );

    expect(screen.getByPlaceholderText('Search contributors by name...')).toBeInTheDocument();
  });

  it('calls onDomainChange when filter button is clicked', () => {
    const onDomainChange = vi.fn();
    render(
      <RosterFilters
        activeDomain={null}
        searchValue=""
        onDomainChange={onDomainChange}
        onSearchChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Technology'));
    expect(onDomainChange).toHaveBeenCalledWith('Technology');
  });

  it('calls onDomainChange with null when All is clicked', () => {
    const onDomainChange = vi.fn();
    render(
      <RosterFilters
        activeDomain="Technology"
        searchValue=""
        onDomainChange={onDomainChange}
        onSearchChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('All'));
    expect(onDomainChange).toHaveBeenCalledWith(null);
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = vi.fn();
    render(
      <RosterFilters
        activeDomain={null}
        searchValue=""
        onDomainChange={() => {}}
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search contributors by name...'), {
      target: { value: 'alice' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('alice');
  });

  it('marks active domain button with aria-pressed', () => {
    render(
      <RosterFilters
        activeDomain="Technology"
        searchValue=""
        onDomainChange={() => {}}
        onSearchChange={() => {}}
      />,
    );

    expect(screen.getByText('Technology')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Fintech')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('RosterPagination', () => {
  it('shows count and "Load more" button', () => {
    render(
      <RosterPagination
        total={50}
        loadedCount={20}
        hasMore={true}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
      />,
    );

    expect(screen.getByText('Showing 20 of 50 contributors')).toBeInTheDocument();
    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('hides "Load more" button when hasMore is false', () => {
    render(
      <RosterPagination
        total={5}
        loadedCount={5}
        hasMore={false}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
      />,
    );

    expect(screen.getByText('Showing 5 of 5 contributors')).toBeInTheDocument();
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('shows loading state on button while fetching', () => {
    render(
      <RosterPagination
        total={50}
        loadedCount={20}
        hasMore={true}
        isFetchingNextPage={true}
        onLoadMore={() => {}}
      />,
    );

    const button = screen.getByText('Loading...');
    expect(button).toBeDisabled();
  });

  it('calls onLoadMore when Load more is clicked', () => {
    const onLoadMore = vi.fn();
    render(
      <RosterPagination
        total={50}
        loadedCount={20}
        hasMore={true}
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByText('Load more'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('returns null when no items and no more', () => {
    const { container } = render(
      <RosterPagination
        total={0}
        loadedCount={0}
        hasMore={false}
        isFetchingNextPage={false}
        onLoadMore={() => {}}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});

describe('RosterSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<RosterSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading contributor roster')).toBeInTheDocument();
  });
});
