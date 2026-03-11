import type { Metadata } from 'next';
import { RoseHero } from '../../../components/features/rose/rose-hero';
import { RoseDetails } from '../../../components/features/rose/rose-details';

const META_TITLE = 'About Rose — A New Financial Infrastructure for a Fairer Economy';
const META_DESCRIPTION =
  'Rose is a non-profit financial infrastructure project by the IOUR Foundation, reinventing the global financial system through intrinsic time, fractal markets, and atomic settlement.';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
    openGraph: {
      title: META_TITLE,
      description: META_DESCRIPTION,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: META_TITLE,
      description: META_DESCRIPTION,
    },
  };
}

export default function RosePage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RoseHero />
      <RoseDetails />
    </main>
  );
}
