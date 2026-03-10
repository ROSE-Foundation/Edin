/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScoringFormulaService } from './scoring-formula.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

describe('ScoringFormulaService', () => {
  let service: ScoringFormulaService;

  let mockPrisma: any;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      scoringFormulaVersion: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      contributionScore: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      peerFeedback: {
        findMany: vi.fn(),
      },
      evaluation: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ScoringFormulaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ScoringFormulaService);
  });

  describe('getActiveFormula', () => {
    it('should return active formula when one exists', async () => {
      const formula = {
        id: 'formula-1',
        version: 1,
        aiEvalWeight: 0.4,
        peerFeedbackWeight: 0.25,
        complexityWeight: 0.2,
        domainNormWeight: 0.15,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        createdBy: 'user-1',
        metadata: null,
        createdAt: new Date('2026-01-01'),
      };

      mockPrisma.scoringFormulaVersion.findFirst.mockResolvedValue(formula);

      const result = await service.getActiveFormula();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('formula-1');
      expect(result?.aiEvalWeight).toBe(0.4);
      expect(result?.effectiveTo).toBeNull();
    });

    it('should return null when no active formula exists', async () => {
      mockPrisma.scoringFormulaVersion.findFirst.mockResolvedValue(null);

      const result = await service.getActiveFormula();

      expect(result).toBeNull();
    });
  });

  describe('createFormulaVersion', () => {
    it('should create a new formula version and deactivate previous', async () => {
      const newFormula = {
        id: 'formula-2',
        version: 2,
        aiEvalWeight: 0.35,
        peerFeedbackWeight: 0.3,
        complexityWeight: 0.2,
        domainNormWeight: 0.15,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdBy: 'admin-1',
        metadata: null,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockPrisma);
      });
      mockPrisma.scoringFormulaVersion.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.scoringFormulaVersion.create.mockResolvedValue(newFormula);

      const result = await service.createFormulaVersion(
        {
          aiEvalWeight: 0.35,
          peerFeedbackWeight: 0.3,
          complexityWeight: 0.2,
          domainNormWeight: 0.15,
        },
        'admin-1',
      );

      expect(result.id).toBe('formula-2');
      expect(result.version).toBe(2);
    });

    it('should reject weights that do not sum to 1.0', async () => {
      await expect(
        service.createFormulaVersion(
          {
            aiEvalWeight: 0.5,
            peerFeedbackWeight: 0.5,
            complexityWeight: 0.5,
            domainNormWeight: 0.5,
          },
          'admin-1',
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getFormulaHistory', () => {
    it('should return paginated formula history', async () => {
      const formulas = [
        {
          id: 'f-2',
          version: 2,
          aiEvalWeight: 0.35,
          peerFeedbackWeight: 0.3,
          complexityWeight: 0.2,
          domainNormWeight: 0.15,
          effectiveFrom: new Date('2026-02-01'),
          effectiveTo: null,
          createdBy: 'admin',
          metadata: null,
          createdAt: new Date('2026-02-01'),
        },
        {
          id: 'f-1',
          version: 1,
          aiEvalWeight: 0.4,
          peerFeedbackWeight: 0.25,
          complexityWeight: 0.2,
          domainNormWeight: 0.15,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: new Date('2026-02-01'),
          createdBy: 'admin',
          metadata: null,
          createdAt: new Date('2026-01-01'),
        },
      ];

      mockPrisma.scoringFormulaVersion.findMany.mockResolvedValue(formulas);

      const result = await service.getFormulaHistory(undefined, 20);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.items[0].version).toBe(2);
    });
  });

  describe('calculateContributionScore', () => {
    it('should calculate composite score using active formula', async () => {
      mockPrisma.contributionScore.findUnique.mockResolvedValue(null);
      mockPrisma.scoringFormulaVersion.findFirst.mockResolvedValue({
        id: 'formula-1',
        version: 1,
        aiEvalWeight: 0.4,
        peerFeedbackWeight: 0.25,
        complexityWeight: 0.2,
        domainNormWeight: 0.15,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdBy: 'admin',
        metadata: null,
        createdAt: new Date(),
      });
      mockPrisma.peerFeedback.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);
      mockPrisma.evaluation.aggregate.mockResolvedValue({ _avg: { compositeScore: null } });

      const createdScore = {
        id: 'score-1',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        compositeScore: 75.5,
        aiEvalScore: 80,
        peerFeedbackScore: null,
        complexityMultiplier: 1.0,
        domainNormFactor: 1.0,
        formulaVersionId: 'formula-1',
        rawInputs: {},
        createdAt: new Date(),
      };

      mockPrisma.contributionScore.create.mockResolvedValue(createdScore);

      const result = await service.calculateContributionScore(
        'contrib-1',
        'user-1',
        80,
        'Technology',
        'corr-1',
      );

      expect(result.contributionId).toBe('contrib-1');
      expect(result.aiEvalScore).toBe(80);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reward.score.calculated',
        expect.objectContaining({
          eventType: 'reward.score.calculated',
        }),
      );
    });

    it('should skip if score already exists', async () => {
      const existingScore = {
        id: 'score-existing',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        compositeScore: 70,
        aiEvalScore: 70,
        peerFeedbackScore: null,
        complexityMultiplier: 1.0,
        domainNormFactor: 1.0,
        formulaVersionId: 'formula-1',
        rawInputs: {},
        createdAt: new Date(),
      };

      mockPrisma.contributionScore.findUnique.mockResolvedValue(existingScore);

      const result = await service.calculateContributionScore(
        'contrib-1',
        'user-1',
        80,
        null,
        'corr-1',
      );

      expect(result.id).toBe('score-existing');
      expect(mockPrisma.contributionScore.create).not.toHaveBeenCalled();
    });

    it('should create default formula when none exists', async () => {
      mockPrisma.contributionScore.findUnique.mockResolvedValue(null);
      mockPrisma.scoringFormulaVersion.findFirst.mockResolvedValue(null);

      const defaultFormula = {
        id: 'formula-default',
        version: 1,
        aiEvalWeight: 0.4,
        peerFeedbackWeight: 0.25,
        complexityWeight: 0.2,
        domainNormWeight: 0.15,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdBy: 'user-1',
        metadata: null,
        createdAt: new Date(),
      };

      mockPrisma.scoringFormulaVersion.create.mockResolvedValue(defaultFormula);
      mockPrisma.peerFeedback.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);
      mockPrisma.evaluation.aggregate.mockResolvedValue({ _avg: { compositeScore: null } });

      mockPrisma.contributionScore.create.mockResolvedValue({
        id: 'score-1',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        compositeScore: 80,
        aiEvalScore: 80,
        peerFeedbackScore: null,
        complexityMultiplier: 1.0,
        domainNormFactor: 1.0,
        formulaVersionId: 'formula-default',
        rawInputs: {},
        createdAt: new Date(),
      });

      await service.calculateContributionScore('contrib-1', 'user-1', 80, null, 'corr-1');

      expect(mockPrisma.scoringFormulaVersion.create).toHaveBeenCalled();
    });
  });

  describe('handleEvaluationCompleted', () => {
    it('should handle evaluation completed event', async () => {
      // Spy on calculateContributionScore
      const calcSpy = vi.spyOn(service, 'calculateContributionScore').mockResolvedValue({
        id: 'score-1',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        compositeScore: 75,
        aiEvalScore: 80,
        peerFeedbackScore: null,
        complexityMultiplier: 1.0,
        domainNormFactor: 1.0,
        formulaVersionId: 'formula-1',
        createdAt: new Date().toISOString(),
      });

      await service.handleEvaluationCompleted({
        eventType: 'evaluation.score.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        actorId: 'system',
        payload: {
          evaluationId: 'eval-1',
          contributionId: 'contrib-1',
          contributorId: 'user-1',
          contributionTitle: 'Test',
          contributionType: 'COMMIT',
          compositeScore: 80,
          domain: 'Technology',
        },
      });

      expect(calcSpy).toHaveBeenCalledWith('contrib-1', 'user-1', 80, 'Technology', 'corr-1');
    });
  });

  describe('getContributorScores', () => {
    it('should return paginated scores with provenance', async () => {
      const scores = [
        {
          id: 'score-1',
          contributionId: 'c-1',
          contributorId: 'user-1',
          compositeScore: 85,
          aiEvalScore: 90,
          peerFeedbackScore: 80,
          complexityMultiplier: 1.2,
          domainNormFactor: 1.0,
          formulaVersionId: 'f-1',
          rawInputs: {},
          createdAt: new Date(),
          formulaVersion: {
            id: 'f-1',
            version: 1,
            aiEvalWeight: 0.4,
            peerFeedbackWeight: 0.25,
            complexityWeight: 0.2,
            domainNormWeight: 0.15,
            effectiveFrom: new Date(),
            effectiveTo: null,
            createdBy: 'admin',
            metadata: null,
            createdAt: new Date(),
          },
        },
      ];

      mockPrisma.contributionScore.findMany.mockResolvedValue(scores);

      const result = await service.getContributorScores('user-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].formulaVersion.version).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
