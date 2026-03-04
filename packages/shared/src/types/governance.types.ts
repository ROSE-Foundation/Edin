/**
 * Governance types for progressive decentralization roadmap.
 */

export interface DecentralizationMilestone {
  capability: string;
  description: string;
}

export interface GovernanceKeyMetric {
  label: string;
  value: string;
}

export type PhaseStatus = 'completed' | 'current' | 'planned';

export interface GovernancePhase {
  id: number;
  name: string;
  status: PhaseStatus;
  timelineRange: string;
  summary: string;
  governanceModel: string;
  keyMetrics: GovernanceKeyMetric[];
  milestones: DecentralizationMilestone[];
}

export interface GovernanceGlossaryTerm {
  term: string;
  definition: string;
}

export interface ProgressiveDecentralizationRoadmap {
  overview: string;
  phases: GovernancePhase[];
  glossary: GovernanceGlossaryTerm[];
}
