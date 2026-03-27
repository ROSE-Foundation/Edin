import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoteThresholdPrizeService } from './vote-threshold-prize.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type { NominationVoteCastEvent } from '@edin/shared';

const makeVoteCastEvent = (
  overrides: Partial<NominationVoteCastEvent['payload']> = {},
): NominationVoteCastEvent => ({
  eventType: 'prize.event.nomination_vote_cast',
  timestamp: new Date().toISOString(),
  correlationId: 'corr-1',
  actorId: 'voter-1',
  payload: {
    voteId: 'vote-1',
    nominationId: 'nom-1',
    voterId: 'voter-1',
    nomineeId: 'nominee-1',
    prizeCategoryName: 'Community Recognition',
    channelName: 'Technology',
    currentVoteCount: 5,
    ...overrides,
  },
});

const mockNomination = {
  id: 'nom-1',
  nominatorId: 'nominator-1',
  nomineeId: 'nominee-1',
  prizeCategoryId: 'cat-community',
  channelId: 'ch-tech',
  rationale: 'Exceptional mentoring and code review contributions across the technology domain',
  status: 'OPEN',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(),
  prizeCategory: { id: 'cat-community', name: 'Community Recognition' },
  channel: { id: 'ch-tech', name: 'Technology' },
};

const mockPrizeCategory = {
  id: 'cat-community',
  name: 'Community Recognition',
  description: 'Awarded through peer nomination and community voting',
  channelId: null,
  detectionType: 'COMMUNITY_NOMINATED',
  thresholdConfig: {
    community: {
      operator: 'gte',
      min_votes: 5,
      tiers: {
        notable: { min_votes: 5 },
        significant: { min_votes: 10 },
        exceptional: { min_votes: 20 },
      },
    },
  },
  scalingConfig: {
    temporal_decay: { enabled: false },
    frequency_cap: { max_awards_per_contributor_per_period: 2, period_days: 90 },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('VoteThresholdPrizeService', () => {
  let service: VoteThresholdPrizeService;
  let mockPrisma: {
    communityNomination: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    prizeCategory: { findFirst: ReturnType<typeof vi.fn> };
    prizeAward: { create: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    workingGroupMember: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockActivityService: { createActivityEvent: ReturnType<typeof vi.fn> };
  let mockChathamHouseService: { generateLabel: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      communityNomination: {
        findUnique: vi.fn().mockResolvedValue(mockNomination),
        update: vi.fn().mockResolvedValue({ ...mockNomination, status: 'AWARDED' }),
      },
      prizeCategory: { findFirst: vi.fn().mockResolvedValue(mockPrizeCategory) },
      prizeAward: {
        create: vi.fn().mockResolvedValue({ id: 'award-1' }),
        count: vi.fn().mockResolvedValue(0),
      },
      contributor: { findUnique: vi.fn().mockResolvedValue({ domain: 'Technology' }) },
      workingGroupMember: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { workingGroup: { domain: 'Technology' } },
            { workingGroup: { domain: 'Finance' } },
          ]),
      },
      $transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          communityNomination: {
            update: mockPrisma.communityNomination.update,
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          prizeAward: { create: mockPrisma.prizeAward.create },
        });
      }),
    };
    mockEventEmitter = { emit: vi.fn() };
    mockActivityService = { createActivityEvent: vi.fn().mockResolvedValue({ id: 'event-1' }) };
    mockChathamHouseService = {
      generateLabel: vi.fn().mockResolvedValue('a finance and technology specialist'),
    };

    const module = await Test.createTestingModule({
      providers: [
        VoteThresholdPrizeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: ChathamHouseAttributionService, useValue: mockChathamHouseService },
      ],
    }).compile();

    service = module.get(VoteThresholdPrizeService);
  });

  describe('handleNominationVoteCast', () => {
    it('awards Community Recognition prize when vote count reaches threshold (happy path — 5 votes)', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prizeCategoryId: 'cat-community',
            recipientContributorId: 'nominee-1',
            contributionId: null,
            significanceLevel: 1,
            channelId: 'ch-tech',
            chathamHouseLabel: expect.any(String),
            narrative: expect.stringContaining('endorsed by 5 peers'),
          }),
        }),
      );
    });

    it('uses contributionId: null on prize award (community-nominated, not contribution-based)', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contributionId: null,
          }),
        }),
      );
    });

    it('determines significance level tier 1 (Notable) at 5 votes', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ significanceLevel: 1 }),
        }),
      );
    });

    it('determines significance level tier 1 (Notable) at 9 votes', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 9 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ significanceLevel: 1 }),
        }),
      );
    });

    it('determines significance level tier 2 (Significant) at 10 votes', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 10 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ significanceLevel: 2 }),
        }),
      );
    });

    it('determines significance level tier 3 (Exceptional) at 20 votes', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 20 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ significanceLevel: 3 }),
        }),
      );
    });

    it('does NOT award when vote count below threshold (4 votes)', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 4 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does NOT award when nomination status is AWARDED (idempotency)', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValue({
        ...mockNomination,
        status: 'AWARDED',
      });

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('does NOT award when nomination status is EXPIRED', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValue({
        ...mockNomination,
        status: 'EXPIRED',
      });

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('does NOT award when nomination status is WITHDRAWN', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValue({
        ...mockNomination,
        status: 'WITHDRAWN',
      });

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('frequency cap — no award when cap exceeded (2 awards per 90 days)', async () => {
      mockPrisma.prizeAward.count.mockResolvedValue(2);

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('updates nomination status to AWARDED in same transaction as prize creation', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Uses conditional updateMany (status: 'OPEN') to prevent TOCTOU race condition
      const txCb = mockPrisma.$transaction.mock.calls[0][0] as (tx: unknown) => Promise<unknown>;
      const txProxy = {
        communityNomination: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        prizeAward: { create: mockPrisma.prizeAward.create },
      };
      await txCb(txProxy);
      expect(txProxy.communityNomination.updateMany).toHaveBeenCalledWith({
        where: { id: 'nom-1', status: 'OPEN' },
        data: { status: 'AWARDED' },
      });
    });

    it('does NOT create prize when concurrent handler already awarded the nomination', async () => {
      // Simulate concurrent handler: updateMany returns count: 0
      mockPrisma.$transaction = vi
        .fn()
        .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({
            communityNomination: {
              updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
            prizeAward: { create: mockPrisma.prizeAward.create },
          }),
        );

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('emits PRIZE_AWARDED activity event with correct metadata', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PRIZE_AWARDED',
          title: expect.stringContaining('Community Recognition Prize Awarded'),
          contributorId: 'nominee-1',
          entityId: 'award-1',
          metadata: expect.objectContaining({
            prizeCategoryId: 'cat-community',
            prizeCategoryName: 'Community Recognition',
            prizeAwardId: 'award-1',
            contributionId: null,
          }),
        }),
      );
    });

    it('emits prize.event.awarded downstream event for notification', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.awarded',
        expect.objectContaining({
          eventType: 'prize.event.awarded',
          correlationId: 'corr-1',
          payload: expect.objectContaining({
            prizeAwardId: 'award-1',
            prizeCategoryId: 'cat-community',
            prizeCategoryName: 'Community Recognition',
            recipientContributorId: 'nominee-1',
            contributionId: null,
          }),
        }),
      );
    });

    it('generates correct Chatham House label for 2-domain nominee', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a finance and technology specialist',
          }),
        }),
      );
    });

    it('generates correct Chatham House label for 3-domain nominee', async () => {
      mockChathamHouseService.generateLabel.mockResolvedValue(
        'a finance, impact, and technology specialist',
      );

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a finance, impact, and technology specialist',
          }),
        }),
      );
    });

    it('generates fallback Chatham House label when no memberships found', async () => {
      mockChathamHouseService.generateLabel.mockResolvedValue('a community contributor');

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a community contributor',
          }),
        }),
      );
    });

    it('generates narrative from nomination rationale', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            narrative: expect.stringContaining('Exceptional mentoring'),
          }),
        }),
      );
    });

    it('handles missing prize category gracefully (logs warning, no crash)', async () => {
      mockPrisma.prizeCategory.findFirst.mockResolvedValue(null);

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('handles missing nomination gracefully (logs warning, no crash)', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValue(null);

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('reads fresh threshold from prize category on each event (AC4 — new config applies immediately)', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      // Verify prize category is queried fresh (not cached)
      expect(mockPrisma.prizeCategory.findFirst).toHaveBeenCalledWith({
        where: { name: 'Community Recognition', isActive: true },
      });

      // Call again — should query again
      await service.handleNominationVoteCast(event);
      expect(mockPrisma.prizeCategory.findFirst).toHaveBeenCalledTimes(2);
    });

    it('does not award when threshold is raised above current vote count', async () => {
      mockPrisma.prizeCategory.findFirst.mockResolvedValue({
        ...mockPrizeCategory,
        thresholdConfig: {
          community: { operator: 'gte', min_votes: 10 },
        },
      });

      const event = makeVoteCastEvent({ currentVoteCount: 5 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('includes nominationId and voteCount in prize award metadata', async () => {
      const event = makeVoteCastEvent({ currentVoteCount: 7 });
      await service.handleNominationVoteCast(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              nominationId: 'nom-1',
              voteCount: 7,
              correlationId: 'corr-1',
            }),
          }),
        }),
      );
    });
  });
});
