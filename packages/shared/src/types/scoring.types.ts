// ─── Reward Scoring Types (Story 9-1) ────────────────────────────────────────

export type TemporalHorizon = 'SESSION' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type ScoreTrend = 'RISING' | 'STABLE' | 'DECLINING';

export interface ScoringFormulaVersionDto {
  id: string;
  version: number;
  aiEvalWeight: number;
  peerFeedbackWeight: number;
  complexityWeight: number;
  domainNormWeight: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ContributionScoreDto {
  id: string;
  contributionId: string;
  contributorId: string;
  compositeScore: number;
  aiEvalScore: number;
  peerFeedbackScore: number | null;
  complexityMultiplier: number;
  domainNormFactor: number;
  formulaVersionId: string;
  createdAt: string;
}

export interface ContributionScoreWithProvenanceDto extends ContributionScoreDto {
  formulaVersion: ScoringFormulaVersionDto;
}

export interface TemporalScoreAggregateDto {
  id: string;
  contributorId: string;
  horizon: TemporalHorizon;
  periodStart: string;
  periodEnd: string;
  aggregatedScore: number;
  contributionCount: number;
  trend: ScoreTrend;
  computedAt: string;
}

export interface ContributorScoresSummaryDto {
  latestSessionScore: ContributionScoreWithProvenanceDto | null;
  monthlyAggregate: TemporalScoreAggregateDto | null;
  aggregates: TemporalScoreAggregateDto[];
  recentScores: ContributionScoreWithProvenanceDto[];
}

export interface CreateFormulaVersionInput {
  aiEvalWeight: number;
  peerFeedbackWeight: number;
  complexityWeight: number;
  domainNormWeight: number;
  metadata?: Record<string, unknown>;
}

export interface RewardScoreCalculatedEvent {
  eventType: 'reward.score.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    contributionScoreId: string;
    contributionId: string;
    contributorId: string;
    compositeScore: number;
    domain: string | null;
  };
}

export interface RewardScoreAggregatedEvent {
  eventType: 'reward.score.aggregated';
  timestamp: string;
  correlationId: string;
  payload: {
    contributorId: string;
    horizon: TemporalHorizon;
    aggregatedScore: number;
    contributionCount: number;
    trend: ScoreTrend;
  };
}
