import type { Metadata } from 'next';
import { PROGRESSIVE_DECENTRALIZATION_ROADMAP } from '@edin/shared';
import { GovernanceHero } from '../../../components/features/governance/governance-hero';
import { GovernanceExplainer } from '../../../components/features/governance/governance-explainer';
import { RoadmapTimeline } from '../../../components/features/governance/roadmap-timeline';
import { GovernanceGlossary } from '../../../components/features/governance/governance-glossary';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Progressive Decentralization Roadmap — Edin',
    description:
      'Understand how Edin progressively transfers governance authority from the founding team to the community through specific milestones and transparent timelines.',
    openGraph: {
      title: 'Progressive Decentralization Roadmap — Edin',
      description:
        'Understand how Edin progressively transfers governance authority from the founding team to the community.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Progressive Decentralization Roadmap — Edin',
      description:
        'Understand how Edin progressively transfers governance authority from the founding team to the community.',
    },
  };
}

export default function GovernancePage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <GovernanceHero />
      <GovernanceExplainer overview={PROGRESSIVE_DECENTRALIZATION_ROADMAP.overview} />
      <RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />
      <GovernanceGlossary terms={PROGRESSIVE_DECENTRALIZATION_ROADMAP.glossary} />
    </main>
  );
}
