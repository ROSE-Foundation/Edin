import type { Metadata } from 'next';
import type { PublicContributorProfile } from '@edin/shared';
import { ShowcaseContent } from '../../components/features/showcase/showcase-content';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchFoundingContributors(): Promise<PublicContributorProfile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/contributors/founding`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const body = await response.json();
    return body.data ?? [];
  } catch (error) {
    console.error('Failed to fetch founding contributors for showcase page', error);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Edin — Where Expertise Becomes Publication',
    description:
      'A curated platform where every contribution is evaluated by AI, rewarded through scaling-law economics, and published by the community that built it.',
    openGraph: {
      title: 'Edin — Where Expertise Becomes Publication',
      description:
        'A curated platform where every contribution is evaluated by AI, rewarded through scaling-law economics, and published by the community that built it.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Edin — Where Expertise Becomes Publication',
      description:
        'A curated platform where every contribution is evaluated by AI, rewarded through scaling-law economics, and published by the community that built it.',
    },
  };
}

export default async function ShowcasePage() {
  const contributors = await fetchFoundingContributors();

  return (
    <main className="min-h-screen bg-surface-base">
      <ShowcaseContent initialContributors={contributors} />
    </main>
  );
}
