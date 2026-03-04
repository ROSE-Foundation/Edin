/**
 * Platform metrics types for public showcase endpoints.
 */

export interface DomainDistribution {
  domain: string;
  count: number;
  percentage: number;
}

export interface PlatformMetrics {
  activeContributors: number;
  contributionVelocity: number;
  domainDistribution: DomainDistribution[];
  retentionRate: number;
}

export interface ScalingDataPoint {
  month: number;
  label: string;
  multiplier: number;
}

export interface FormulaComponent {
  name: string;
  description: string;
  qualitativeWeight: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface RewardMethodology {
  overview: string;
  scalingCurve: ScalingDataPoint[];
  formulaComponents: FormulaComponent[];
  glossary: GlossaryTerm[];
}
