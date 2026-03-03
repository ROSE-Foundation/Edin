import type { Metadata } from 'next';
import { DOMAIN_MANIFESTOS } from '@edin/shared';
import { AboutHero } from '../../../components/features/about/about-hero';
import { ManifestoGrid } from '../../../components/features/about/manifesto-grid';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About Edin — Four Pillars of Contribution',
    description:
      "Discover Edin's four domain pillars: Technology, Fintech & Financial Engineering, Impact & Sustainability, and Governance. Each shapes how expertise becomes publication.",
    openGraph: {
      title: 'About Edin — Four Pillars of Contribution',
      description:
        "Discover Edin's four domain pillars: Technology, Fintech & Financial Engineering, Impact & Sustainability, and Governance.",
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'About Edin — Four Pillars of Contribution',
      description:
        "Discover Edin's four domain pillars: Technology, Fintech & Financial Engineering, Impact & Sustainability, and Governance.",
    },
  };
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <AboutHero />
      <ManifestoGrid manifestos={DOMAIN_MANIFESTOS} />
    </main>
  );
}
