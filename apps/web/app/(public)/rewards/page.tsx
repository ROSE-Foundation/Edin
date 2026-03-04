import type { Metadata } from 'next';
import { REWARD_METHODOLOGY } from '@edin/shared';
import { RewardsHero } from '../../../components/features/rewards/rewards-hero';
import { ScalingLawExplainer } from '../../../components/features/rewards/scaling-law-explainer';
import { GrowthCurveChart } from '../../../components/features/rewards/growth-curve-chart';
import { FormulaBreakdown } from '../../../components/features/rewards/formula-breakdown';
import { GlossarySection } from '../../../components/features/rewards/glossary-section';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Reward Methodology — Edin',
    description:
      'Understand how Edin rewards sustained engagement through a scaling-law model: contributions compound over time, creating accelerating recognition for dedicated contributors.',
    openGraph: {
      title: 'Reward Methodology — Edin',
      description:
        'Understand how Edin rewards sustained engagement through a scaling-law model that compounds contributions over time.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Reward Methodology — Edin',
      description:
        'Understand how Edin rewards sustained engagement through a scaling-law model that compounds contributions over time.',
    },
  };
}

export default function RewardsPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RewardsHero />
      <ScalingLawExplainer overview={REWARD_METHODOLOGY.overview} />
      <GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />
      <FormulaBreakdown components={REWARD_METHODOLOGY.formulaComponents} />
      <GlossarySection terms={REWARD_METHODOLOGY.glossary} />
    </main>
  );
}
