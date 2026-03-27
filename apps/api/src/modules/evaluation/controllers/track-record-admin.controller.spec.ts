import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackRecordAdminController } from './track-record-admin.controller.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { CaslAbilityFactory } from '../../auth/casl/ability.factory.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

describe('TrackRecordAdminController', () => {
  let controller: TrackRecordAdminController;
  let auditService: { log: ReturnType<typeof vi.fn> };

  const mockAdminUser: CurrentUserPayload = {
    id: 'admin-1',
    githubId: 12345,
    role: 'ADMIN',
    email: 'admin@test.com',
  } as CurrentUserPayload;

  const mockThresholdConfig = {
    id: 'config-1',
    milestoneType: 'DURATION',
    thresholdName: '3-month active contributor',
    thresholdRules: {
      conditions: [
        { field: 'engagement_duration_months', operator: '>=', value: 3 },
        { field: 'active_weeks_ratio', operator: '>=', value: 0.6 },
      ],
    },
    outcomeType: 'ROLE_ELIGIBILITY',
    isActive: true,
    createdAt: new Date('2026-03-01'),
  };

  const mockPrisma = {
    trackRecordMilestone: {
      groupBy: vi.fn(),
    },
    trackRecordOutcome: {
      groupBy: vi.fn(),
    },
    trackRecordThresholdConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.trackRecordMilestone.groupBy.mockResolvedValue([
      { milestoneType: 'DURATION', _count: { id: 5 } },
      { milestoneType: 'VOLUME', _count: { id: 2 } },
    ]);
    mockPrisma.trackRecordOutcome.groupBy.mockResolvedValue([
      { outcomeType: 'ROLE_ELIGIBILITY', _count: { id: 4 } },
      { outcomeType: 'INVITATION', _count: { id: 1 } },
    ]);
    mockPrisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfig]);
    mockPrisma.trackRecordThresholdConfig.findUnique.mockResolvedValue(mockThresholdConfig);
    mockPrisma.trackRecordThresholdConfig.update.mockImplementation(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...mockThresholdConfig, ...args.data }),
    );

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TrackRecordAdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: auditService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(TrackRecordAdminController);
  });

  it('returns milestone distribution and outcome distribution', async () => {
    const result = await controller.getOverview();

    expect(result.data.milestoneDistribution).toHaveLength(2);
    expect(result.data.milestoneDistribution[0]).toEqual({
      milestoneType: 'DURATION',
      count: 5,
    });
    expect(result.data.outcomeDistribution).toHaveLength(2);
    expect(result.data.outcomeDistribution[0]).toEqual({
      outcomeType: 'ROLE_ELIGIBILITY',
      count: 4,
    });
  });

  it('returns all threshold configs', async () => {
    const result = await controller.getOverview();

    expect(result.data.thresholdConfigs).toHaveLength(1);
    expect(result.data.thresholdConfigs[0].thresholdName).toBe('3-month active contributor');
    expect(result.data.thresholdConfigs[0].isActive).toBe(true);
  });

  it('updates threshold isActive status', async () => {
    const result = await controller.updateThreshold(
      'config-1',
      { isActive: false },
      mockAdminUser as never,
    );

    expect(result.data.isActive).toBe(false);
    expect(mockPrisma.trackRecordThresholdConfig.update).toHaveBeenCalledWith({
      where: { id: 'config-1' },
      data: { isActive: false },
    });
  });

  it('creates audit log on threshold update', async () => {
    await controller.updateThreshold('config-1', { isActive: false }, mockAdminUser as never);

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'TRACK_RECORD_THRESHOLD_UPDATED',
        entityType: 'TrackRecordThresholdConfig',
        entityId: 'config-1',
        details: expect.objectContaining({
          thresholdName: '3-month active contributor',
          changes: { isActive: false },
        }),
      }),
      expect.anything(),
    );
  });

  it('throws when threshold config not found', async () => {
    mockPrisma.trackRecordThresholdConfig.findUnique.mockResolvedValue(null);

    await expect(
      controller.updateThreshold('nonexistent', { isActive: false }, mockAdminUser as never),
    ).rejects.toThrow();
  });
});
