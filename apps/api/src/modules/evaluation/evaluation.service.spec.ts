import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { EvaluationService } from './evaluation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  evaluation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockQueue = {
  add: vi.fn(),
};

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              EVALUATION_ENABLED: 'true',
            }),
          ],
        }),
      ],
      providers: [
        EvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: getQueueToken('evaluation-dispatch'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(EvaluationService);
  });

  describe('handleContributionIngested (via handleCommitIngested)', () => {
    const payload = {
      contributionId: 'contrib-1',
      contributionType: 'COMMIT',
      contributorId: 'contributor-1',
      repositoryId: 'repo-1',
      correlationId: 'corr-1',
    };

    it('creates PENDING evaluation and enqueues job', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);
      mockPrisma.evaluation.create.mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributionId: 'contrib-1',
          contributorId: 'contributor-1',
          status: 'PENDING',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'dispatch-evaluation',
        expect.objectContaining({
          contributionId: 'contrib-1',
          contributionType: 'COMMIT',
          contributorId: 'contributor-1',
        }),
        expect.any(Object),
      );
    });

    it('skips non-code contributions', async () => {
      await service.handleCommitIngested({
        ...payload,
        contributionType: 'CODE_REVIEW',
      });

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('is idempotent — skips if evaluation exists', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ id: 'existing-eval' });

      await service.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('skips unattributed contributions', async () => {
      await service.handleCommitIngested({
        ...payload,
        contributorId: null,
      });

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
    });

    it('skips dispatch when EVALUATION_ENABLED is false', async () => {
      const disabledModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                EVALUATION_ENABLED: 'false',
              }),
            ],
          }),
        ],
        providers: [
          EvaluationService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
          { provide: getQueueToken('evaluation-dispatch'), useValue: mockQueue },
        ],
      }).compile();

      const disabledService = disabledModule.get(EvaluationService);

      await disabledService.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getEvaluation', () => {
    it('returns evaluation with contribution', async () => {
      const evaluation = {
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: 'model-1',
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 78.5 },
        dimensionScores: {},
        narrative: 'Good code',
        formulaVersion: 'v1.0.0',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'Fix bug',
          contributionType: 'COMMIT',
          sourceRef: 'abc123',
        },
      };
      mockPrisma.evaluation.findUnique.mockResolvedValue(evaluation);

      const result = await service.getEvaluation('eval-1');

      expect(result.id).toBe('eval-1');
      expect(result.compositeScore).toBe(78.5);
      expect(result.contribution.title).toBe('Fix bug');
    });

    it('throws EVALUATION_NOT_FOUND', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(service.getEvaluation('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('getEvaluationByContribution', () => {
    it('checks Redis cache first', async () => {
      mockRedis.get.mockResolvedValue({
        evaluationId: 'eval-1',
        status: 'COMPLETED',
        compositeScore: 80,
      });
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 80 },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'test',
          contributionType: 'COMMIT',
          sourceRef: 'abc',
        },
      });

      const result = await service.getEvaluationByContribution('contrib-1');

      expect(mockRedis.get).toHaveBeenCalledWith('evaluation:contrib-1');
      expect(result).not.toBeNull();
    });

    it('falls back to DB when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 80 },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'test',
          contributionType: 'COMMIT',
          sourceRef: 'abc',
        },
      });

      const result = await service.getEvaluationByContribution('contrib-1');

      expect(result).not.toBeNull();
    });
  });

  describe('getEvaluationsForContributor', () => {
    it('paginates correctly', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `eval-${i}`,
        contributionId: `contrib-${i}`,
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 70 + i },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: `contrib-${i}`,
          title: `Contribution ${i}`,
          contributionType: 'COMMIT',
          sourceRef: `ref-${i}`,
        },
      }));

      mockPrisma.evaluation.findMany.mockResolvedValue(items);
      mockPrisma.evaluation.count.mockResolvedValue(25);

      const result = await service.getEvaluationsForContributor('contributor-1', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.cursor).not.toBeNull();
    });
  });
});
