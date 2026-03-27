import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommunityNominationService } from './community-nomination.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';

const NOMINATOR_ID = 'nominator-1';
const NOMINEE_ID = 'nominee-1';
const PRIZE_CATEGORY_ID = 'cat-community';
const CHANNEL_ID = 'ch-tech';

const mockNominee = { id: NOMINEE_ID, name: 'Jane Doe', domain: 'Technology' };
const mockPrizeCategory = {
  id: PRIZE_CATEGORY_ID,
  name: 'Community Recognition',
  detectionType: 'COMMUNITY_NOMINATED',
};
const mockChannel = { id: CHANNEL_ID, name: 'Technology' };

const validDto = {
  nomineeId: NOMINEE_ID,
  prizeCategoryId: PRIZE_CATEGORY_ID,
  channelId: CHANNEL_ID,
  rationale:
    'This contributor has made outstanding contributions to the codebase and mentored several new members.',
};

describe('CommunityNominationService', () => {
  let service: CommunityNominationService;
  let mockPrisma: {
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    prizeCategory: { findFirst: ReturnType<typeof vi.fn> };
    channel: { findFirst: ReturnType<typeof vi.fn> };
    communityNomination: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockActivityService: { createActivityEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const defaultCreatedNomination = {
      id: 'nomination-1',
      nominatorId: NOMINATOR_ID,
      nomineeId: NOMINEE_ID,
      prizeCategoryId: PRIZE_CATEGORY_ID,
      channelId: CHANNEL_ID,
      rationale: validDto.rationale,
      status: 'OPEN',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      prizeCategory: mockPrizeCategory,
      channel: mockChannel,
      nominee: mockNominee,
    };

    mockPrisma = {
      contributor: { findUnique: vi.fn().mockResolvedValue(mockNominee) },
      prizeCategory: { findFirst: vi.fn().mockResolvedValue(mockPrizeCategory) },
      channel: { findFirst: vi.fn().mockResolvedValue(mockChannel) },
      communityNomination: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(defaultCreatedNomination),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: 'nomination-1', status: 'WITHDRAWN' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      // $transaction executes the callback with the mockPrisma itself as the transactional client
      $transaction: vi
        .fn()
        .mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) =>
          cb(mockPrisma),
        ),
    };
    mockEventEmitter = { emit: vi.fn() };
    mockActivityService = { createActivityEvent: vi.fn().mockResolvedValue({ id: 'event-1' }) };

    const module = await Test.createTestingModule({
      providers: [
        CommunityNominationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get(CommunityNominationService);
  });

  describe('create', () => {
    it('creates a nomination successfully', async () => {
      const result = await service.create(NOMINATOR_ID, validDto);

      expect(result.id).toBe('nomination-1');
      expect(result.status).toBe('OPEN');
      expect(result.prizeCategoryName).toBe('Community Recognition');
      expect(result.channelName).toBe('Technology');
      expect(mockPrisma.communityNomination.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nominatorId: NOMINATOR_ID,
            nomineeId: NOMINEE_ID,
            prizeCategoryId: PRIZE_CATEGORY_ID,
            channelId: CHANNEL_ID,
            rationale: validDto.rationale,
            status: 'OPEN',
          }),
        }),
      );
    });

    it('rejects self-nomination', async () => {
      await expect(service.create(NOMINEE_ID, validDto)).rejects.toThrow(
        'You cannot nominate yourself',
      );
    });

    it('rejects nomination when nominee not found', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(NOMINATOR_ID, validDto)).rejects.toThrow('Nominee not found');
    });

    it('rejects nomination with non-COMMUNITY_NOMINATED category', async () => {
      mockPrisma.prizeCategory.findFirst.mockResolvedValueOnce({
        ...mockPrizeCategory,
        detectionType: 'AUTOMATED',
      });

      await expect(service.create(NOMINATOR_ID, validDto)).rejects.toThrow(
        'Only community-nominated prize categories are allowed',
      );
    });

    it('rejects duplicate nomination within cooldown period', async () => {
      mockPrisma.communityNomination.findFirst.mockResolvedValueOnce({
        id: 'existing-nomination',
        status: 'OPEN',
      });

      await expect(service.create(NOMINATOR_ID, validDto)).rejects.toThrow(
        'You have already nominated this peer',
      );
    });

    it('emits PEER_NOMINATION_RECEIVED activity event', async () => {
      await service.create(NOMINATOR_ID, validDto);

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PEER_NOMINATION_RECEIVED',
          contributorId: NOMINEE_ID,
          entityId: 'nomination-1',
        }),
      );
    });

    it('emits peer_nomination_received event for notification', async () => {
      await service.create(NOMINATOR_ID, validDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.peer_nomination_received',
        expect.objectContaining({
          eventType: 'prize.event.peer_nomination_received',
          payload: expect.objectContaining({
            nominationId: 'nomination-1',
            nomineeId: NOMINEE_ID,
            prizeCategoryName: 'Community Recognition',
            channelName: 'Technology',
          }),
        }),
      );
    });
  });

  describe('findActive', () => {
    it('returns OPEN nominations without nominator identity', async () => {
      const mockNomination = {
        id: 'nom-1',
        nomineeId: NOMINEE_ID,
        prizeCategoryId: PRIZE_CATEGORY_ID,
        channelId: CHANNEL_ID,
        rationale: 'Great work',
        status: 'OPEN',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nominee: mockNominee,
        prizeCategory: mockPrizeCategory,
        channel: mockChannel,
        _count: {},
      };
      mockPrisma.communityNomination.findMany.mockResolvedValueOnce([mockNomination]);

      const result = await service.findActive();

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty('nominatorId');
      expect(result.items[0].nomineeName).toBe('Jane Doe');
    });
  });

  describe('withdraw', () => {
    it('allows nominator to withdraw their own nomination', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce({
        id: 'nomination-1',
        nominatorId: NOMINATOR_ID,
        status: 'OPEN',
      });

      const result = await service.withdraw('nomination-1', NOMINATOR_ID);

      expect(result.status).toBe('WITHDRAWN');
      expect(mockPrisma.communityNomination.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nomination-1' },
          data: { status: 'WITHDRAWN' },
        }),
      );
    });

    it('rejects withdrawal by non-nominator', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce({
        id: 'nomination-1',
        nominatorId: NOMINATOR_ID,
        status: 'OPEN',
      });

      await expect(service.withdraw('nomination-1', 'someone-else')).rejects.toThrow(
        'Only the nominator can withdraw',
      );
    });

    it('rejects withdrawal of non-OPEN nomination', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce({
        id: 'nomination-1',
        nominatorId: NOMINATOR_ID,
        status: 'AWARDED',
      });

      await expect(service.withdraw('nomination-1', NOMINATOR_ID)).rejects.toThrow(
        'Cannot withdraw a nomination with status AWARDED',
      );
    });
  });

  describe('expireStaleNominations', () => {
    it('marks expired nominations', async () => {
      mockPrisma.communityNomination.updateMany.mockResolvedValueOnce({ count: 3 });

      const count = await service.expireStaleNominations();

      expect(count).toBe(3);
      expect(mockPrisma.communityNomination.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'OPEN',
            expiresAt: { lte: expect.any(Date) },
          },
          data: { status: 'EXPIRED' },
        }),
      );
    });
  });
});
