import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  ScoringFormulaVersionDto,
  ContributionScoreDto,
  ContributionScoreWithProvenanceDto,
  CreateFormulaVersionInput,
  EvaluationCompletedEvent,
  RewardScoreCalculatedEvent,
} from '@edin/shared';

@Injectable()
export class ScoringFormulaService {
  private readonly logger = new Logger(ScoringFormulaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get the currently active scoring formula version (no effectiveTo date).
   */
  async getActiveFormula(): Promise<ScoringFormulaVersionDto | null> {
    const formula = await this.prisma.scoringFormulaVersion.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!formula) return null;

    return this.mapFormulaToDto(formula);
  }

  /**
   * Create a new scoring formula version, deactivating the previous one.
   */
  async createFormulaVersion(
    input: CreateFormulaVersionInput,
    createdBy: string,
  ): Promise<ScoringFormulaVersionDto> {
    const totalWeight =
      input.aiEvalWeight +
      input.peerFeedbackWeight +
      input.complexityWeight +
      input.domainNormWeight;

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new DomainException(
        ERROR_CODES.SCORING_FORMULA_WEIGHTS_INVALID,
        `Formula weights must sum to 1.0, got ${totalWeight}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();

    // Deactivate current formula and create new one in a transaction
    const formula = await this.prisma.$transaction(async (tx) => {
      await tx.scoringFormulaVersion.updateMany({
        where: { effectiveTo: null },
        data: { effectiveTo: now },
      });

      return tx.scoringFormulaVersion.create({
        data: {
          aiEvalWeight: input.aiEvalWeight,
          peerFeedbackWeight: input.peerFeedbackWeight,
          complexityWeight: input.complexityWeight,
          domainNormWeight: input.domainNormWeight,
          effectiveFrom: now,
          createdBy,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
        },
      });
    });

    this.logger.log('New scoring formula version created', {
      module: 'reward',
      formulaId: formula.id,
      version: formula.version,
      createdBy,
    });

    return this.mapFormulaToDto(formula);
  }

  /**
   * Get formula version history for admin audit trail.
   */
  async getFormulaHistory(
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ScoringFormulaVersionDto[]; hasMore: boolean }> {
    const formulas = await this.prisma.scoringFormulaVersion.findMany({
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: limit + 1,
      orderBy: { effectiveFrom: 'desc' },
    });

    const hasMore = formulas.length > limit;
    const items = formulas.slice(0, limit).map((f) => this.mapFormulaToDto(f));

    return { items, hasMore };
  }

  /**
   * Calculate contribution score when an evaluation completes.
   */
  @OnEvent('evaluation.score.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
    try {
      await this.calculateContributionScore(
        event.payload.contributionId,
        event.payload.contributorId,
        event.payload.compositeScore,
        event.payload.domain,
        event.correlationId,
      );
    } catch (error) {
      this.logger.error('Failed to calculate contribution score', {
        module: 'reward',
        contributionId: event.payload.contributionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Core scoring calculation: combines AI eval, peer feedback, complexity, and domain normalization.
   */
  async calculateContributionScore(
    contributionId: string,
    contributorId: string,
    aiEvalCompositeScore: number,
    domain: string | null,
    correlationId: string,
  ): Promise<ContributionScoreDto> {
    // Check for existing score
    const existing = await this.prisma.contributionScore.findUnique({
      where: { contributionId },
    });

    if (existing) {
      this.logger.warn('Contribution score already exists, skipping', {
        module: 'reward',
        contributionId,
      });
      return this.mapScoreToDto(existing);
    }

    // Get active formula
    let formula = await this.prisma.scoringFormulaVersion.findFirst({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Create default formula if none exists
    if (!formula) {
      formula = await this.prisma.scoringFormulaVersion.create({
        data: {
          aiEvalWeight: 0.4,
          peerFeedbackWeight: 0.25,
          complexityWeight: 0.2,
          domainNormWeight: 0.15,
          createdBy: contributorId,
        },
      });
    }

    // Get peer feedback score (average of completed feedback ratings)
    const peerFeedbackScore = await this.getPeerFeedbackScore(contributionId);

    // Get complexity multiplier from evaluation dimension scores
    const complexityMultiplier = await this.getComplexityMultiplier(contributionId);

    // Get domain normalization factor
    const domainNormFactor = await this.getDomainNormFactor(domain);

    // Calculate composite score
    const weights = {
      aiEval: Number(formula.aiEvalWeight),
      peerFeedback: Number(formula.peerFeedbackWeight),
      complexity: Number(formula.complexityWeight),
      domainNorm: Number(formula.domainNormWeight),
    };

    const compositeScore = this.computeCompositeScore(
      aiEvalCompositeScore,
      peerFeedbackScore,
      complexityMultiplier,
      domainNormFactor,
      weights,
    );

    const score = await this.prisma.contributionScore.create({
      data: {
        contributionId,
        contributorId,
        compositeScore,
        aiEvalScore: aiEvalCompositeScore,
        peerFeedbackScore,
        complexityMultiplier,
        domainNormFactor,
        formulaVersionId: formula.id,
        rawInputs: {
          aiEvalCompositeScore,
          peerFeedbackScore,
          complexityMultiplier,
          domainNormFactor,
          weights,
        },
      },
    });

    this.logger.log('Contribution score calculated', {
      module: 'reward',
      contributionId,
      contributorId,
      compositeScore,
      correlationId,
    });

    // Emit score calculated event
    const scoreEvent: RewardScoreCalculatedEvent = {
      eventType: 'reward.score.calculated',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        contributionScoreId: score.id,
        contributionId,
        contributorId,
        compositeScore,
        domain,
      },
    };

    this.eventEmitter.emit('reward.score.calculated', scoreEvent);

    return this.mapScoreToDto(score);
  }

  /**
   * Get a contributor's recent scores with provenance.
   */
  async getContributorScores(
    contributorId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ContributionScoreWithProvenanceDto[]; hasMore: boolean }> {
    const scores = await this.prisma.contributionScore.findMany({
      where: { contributorId },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { formulaVersion: true },
    });

    const hasMore = scores.length > limit;
    const items = scores.slice(0, limit).map((s) => ({
      ...this.mapScoreToDto(s),
      formulaVersion: this.mapFormulaToDto(s.formulaVersion),
    }));

    return { items, hasMore };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private computeCompositeScore(
    aiEvalScore: number,
    peerFeedbackScore: number | null,
    complexityMultiplier: number,
    domainNormFactor: number,
    weights: {
      aiEval: number;
      peerFeedback: number;
      complexity: number;
      domainNorm: number;
    },
  ): number {
    let effectiveWeights = { ...weights };

    // If no peer feedback, redistribute weight proportionally
    if (peerFeedbackScore === null) {
      const redistributableWeight = effectiveWeights.peerFeedback;
      const remaining =
        effectiveWeights.aiEval + effectiveWeights.complexity + effectiveWeights.domainNorm;
      if (remaining > 0) {
        effectiveWeights = {
          aiEval:
            effectiveWeights.aiEval + (effectiveWeights.aiEval / remaining) * redistributableWeight,
          peerFeedback: 0,
          complexity:
            effectiveWeights.complexity +
            (effectiveWeights.complexity / remaining) * redistributableWeight,
          domainNorm:
            effectiveWeights.domainNorm +
            (effectiveWeights.domainNorm / remaining) * redistributableWeight,
        };
      }
    }

    const raw =
      aiEvalScore * effectiveWeights.aiEval +
      (peerFeedbackScore ?? 0) * effectiveWeights.peerFeedback +
      aiEvalScore * effectiveWeights.complexity * complexityMultiplier +
      aiEvalScore * effectiveWeights.domainNorm * domainNormFactor;

    return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
  }

  private async getPeerFeedbackScore(contributionId: string): Promise<number | null> {
    const feedbacks = await this.prisma.peerFeedback.findMany({
      where: { contributionId, status: 'COMPLETED' },
      select: { ratings: true },
    });

    if (feedbacks.length === 0) return null;

    const scores: number[] = [];
    for (const fb of feedbacks) {
      if (fb.ratings && typeof fb.ratings === 'object') {
        const ratings = fb.ratings as Record<string, { score?: number }>;
        const ratingValues = Object.values(ratings)
          .map((r) => r.score)
          .filter((s): s is number => typeof s === 'number');
        if (ratingValues.length > 0) {
          scores.push(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length);
        }
      }
    }

    if (scores.length === 0) return null;

    // Normalize to 0-100 scale (assuming ratings are 1-5)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(((avg - 1) / 4) * 100 * 100) / 100;
  }

  private async getComplexityMultiplier(contributionId: string): Promise<number> {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { contributionId },
      select: { dimensionScores: true },
    });

    if (!evaluation?.dimensionScores) return 1.0;

    const scores = evaluation.dimensionScores as Record<string, { score?: number }>;
    const complexityScore = scores.complexity?.score;

    if (typeof complexityScore !== 'number') return 1.0;

    // Map 0-100 complexity score to 0.5-1.5 multiplier
    return Math.round((0.5 + complexityScore / 100) * 100) / 100;
  }

  private async getDomainNormFactor(domain: string | null): Promise<number> {
    if (!domain) return 1.0;

    // Calculate domain and global averages in parallel
    const [domainAvg, globalAvg] = await Promise.all([
      this.prisma.evaluation.aggregate({
        where: {
          status: 'COMPLETED',
          contributor: { domain: domain as never },
          compositeScore: { not: null },
        },
        _avg: { compositeScore: true },
      }),
      this.prisma.evaluation.aggregate({
        where: { status: 'COMPLETED', compositeScore: { not: null } },
        _avg: { compositeScore: true },
      }),
    ]);

    const domainAvgScore = domainAvg._avg.compositeScore
      ? Number(domainAvg._avg.compositeScore)
      : null;
    const globalAvgScore = globalAvg._avg.compositeScore
      ? Number(globalAvg._avg.compositeScore)
      : null;

    if (!domainAvgScore || !globalAvgScore || globalAvgScore === 0) return 1.0;

    // Normalize so domains with lower averages get a boost
    return Math.round((globalAvgScore / domainAvgScore) * 100) / 100;
  }

  private mapFormulaToDto(formula: {
    id: string;
    version: number;
    aiEvalWeight: unknown;
    peerFeedbackWeight: unknown;
    complexityWeight: unknown;
    domainNormWeight: unknown;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    createdBy: string;
    createdAt: Date;
  }): ScoringFormulaVersionDto {
    return {
      id: formula.id,
      version: formula.version,
      aiEvalWeight: Number(formula.aiEvalWeight),
      peerFeedbackWeight: Number(formula.peerFeedbackWeight),
      complexityWeight: Number(formula.complexityWeight),
      domainNormWeight: Number(formula.domainNormWeight),
      effectiveFrom: formula.effectiveFrom.toISOString(),
      effectiveTo: formula.effectiveTo?.toISOString() ?? null,
      createdBy: formula.createdBy,
      createdAt: formula.createdAt.toISOString(),
    };
  }

  private mapScoreToDto(score: {
    id: string;
    contributionId: string;
    contributorId: string;
    compositeScore: unknown;
    aiEvalScore: unknown;
    peerFeedbackScore: unknown;
    complexityMultiplier: unknown;
    domainNormFactor: unknown;
    formulaVersionId: string;
    createdAt: Date;
  }): ContributionScoreDto {
    return {
      id: score.id,
      contributionId: score.contributionId,
      contributorId: score.contributorId,
      compositeScore: Number(score.compositeScore),
      aiEvalScore: Number(score.aiEvalScore),
      peerFeedbackScore: score.peerFeedbackScore !== null ? Number(score.peerFeedbackScore) : null,
      complexityMultiplier: Number(score.complexityMultiplier),
      domainNormFactor: Number(score.domainNormFactor),
      formulaVersionId: score.formulaVersionId,
      createdAt: score.createdAt.toISOString(),
    };
  }
}
