import type { Metadata } from 'next';
import type { PublicContributorProfile, PaginationMeta } from '@edin/shared';
import { RosterContent } from '../../../components/features/roster/roster-content';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RosterApiResponse {
  data: PublicContributorProfile[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination: PaginationMeta;
  };
}

async function fetchInitialRoster(): Promise<{
  contributors: PublicContributorProfile[];
  total: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/contributors?limit=20`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { contributors: [], total: 0 };
    }

    const body: RosterApiResponse = await response.json();
    return {
      contributors: body.data ?? [],
      total: body.meta.pagination?.total ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch contributor roster for SSR', error);
    return { contributors: [], total: 0 };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Contributors — Edin Community',
    description:
      'Browse the Edin contributor roster. Discover experts across Technology, Finance, Impact, and Governance building the future of collaborative publication.',
    openGraph: {
      title: 'Contributors — Edin Community',
      description:
        'Browse the Edin contributor roster. Discover experts across Technology, Finance, Impact, and Governance.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Contributors — Edin Community',
      description:
        'Browse the Edin contributor roster. Discover experts across Technology, Finance, Impact, and Governance.',
    },
  };
}

export default async function ContributorRosterPage() {
  const { contributors, total } = await fetchInitialRoster();

  return (
    <main className="min-h-screen bg-surface-base">
      <section
        className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
        aria-label="Contributor roster"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-text-primary">
            Contributors
          </h1>
          <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-text-secondary">
            Meet the people building Edin. Filter by domain or search by name to find contributors
            across our four pillars of expertise.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <RosterContent initialContributors={contributors} initialTotal={total} />
      </div>
    </main>
  );
}
