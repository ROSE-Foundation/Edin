import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { PrizeCategoryService } from './prize-category.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockCategory = {
  id: 'pc-1',
  name: 'Cross-Domain Collaboration',
  description: 'Awarded when a contribution bridges two or more domains',
  channelId: null,
  detectionType: 'AUTOMATED',
  thresholdConfig: {
    cross_domain: {
      operator: 'discrete_step',
      min_domains: 2,
      min_composite_score: 70,
    },
  },
  scalingConfig: {
    temporal_decay: { enabled: true, half_life_days: 180 },
    frequency_cap: { max_awards_per_contributor_per_period: 3, period_days: 90 },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  channel: null,
};

describe('PrizeCategoryService', () => {
  let service: PrizeCategoryService;
  let prisma: {
    prizeCategory: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      prizeCategory: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [PrizeCategoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PrizeCategoryService);
  });

  describe('findAll', () => {
    it('returns only active categories by default', async () => {
      prisma.prizeCategory.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockCategory]);
      expect(prisma.prizeCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { channel: { select: { id: true, name: true, type: true } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('returns category with channel', async () => {
      prisma.prizeCategory.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findById('pc-1');

      expect(result.id).toBe('pc-1');
      expect(result.thresholdConfig).toEqual(mockCategory.thresholdConfig);
    });

    it('throws PRIZE_CATEGORY_NOT_FOUND when not found', async () => {
      prisma.prizeCategory.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('create', () => {
    it('creates a new prize category with discrete threshold config', async () => {
      prisma.prizeCategory.create.mockResolvedValue(mockCategory);

      const result = await service.create({
        name: 'Cross-Domain Collaboration',
        description: 'Awarded when a contribution bridges two or more domains',
        detectionType: 'AUTOMATED',
        thresholdConfig: {
          cross_domain: {
            operator: 'discrete_step',
            min_domains: 2,
            min_composite_score: 70,
          },
        },
        scalingConfig: {
          temporal_decay: { enabled: true, half_life_days: 180 },
          frequency_cap: { max_awards_per_contributor_per_period: 3, period_days: 90 },
        },
      });

      expect(result.id).toBe('pc-1');
      expect(prisma.prizeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Cross-Domain Collaboration',
          detectionType: 'AUTOMATED',
          channelId: null,
          isActive: true,
        }),
      });
    });

    it('throws PRIZE_CATEGORY_ALREADY_EXISTS on duplicate name', async () => {
      const prismaError = new Error('Unique constraint failed');
      Object.assign(prismaError, { code: 'P2002' });
      prisma.prizeCategory.create.mockRejectedValue(prismaError);

      await expect(
        service.create({
          name: 'Breakthrough',
          description: 'Duplicate',
          detectionType: 'AUTOMATED',
          thresholdConfig: { rule: { operator: 'gte' } },
          scalingConfig: {},
        }),
      ).rejects.toThrow(DomainException);
      await expect(
        service.create({
          name: 'Breakthrough',
          description: 'Duplicate',
          detectionType: 'AUTOMATED',
          thresholdConfig: { rule: { operator: 'gte' } },
          scalingConfig: {},
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('update', () => {
    it('updates an existing category', async () => {
      prisma.prizeCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.prizeCategory.update.mockResolvedValue({
        ...mockCategory,
        name: 'Updated Name',
      });

      const result = await service.update('pc-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('deletes an existing category', async () => {
      prisma.prizeCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.prizeCategory.delete.mockResolvedValue(mockCategory);

      await service.delete('pc-1');

      expect(prisma.prizeCategory.delete).toHaveBeenCalledWith({ where: { id: 'pc-1' } });
    });
  });
});
