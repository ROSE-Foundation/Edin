import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NominationVotingService } from './nomination-voting.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';

const VOTER_ID = 'voter-1';
const NOMINATOR_ID = 'nominator-1';
const NOMINEE_ID = 'nominee-1';
const NOMINATION_ID = 'nomination-1';

const mockNomination = {
  id: NOMINATION_ID,
  nominatorId: NOMINATOR_ID,
  nomineeId: NOMINEE_ID,
  status: 'OPEN',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  nominee: { id: NOMINEE_ID, name: 'Jane Doe', domain: 'Technology' },
  prizeCategory: { id: 'cat-1', name: 'Community Recognition' },
  channel: { id: 'ch-1', name: 'Technology' },
};

describe('NominationVotingService', () => {
  let service: NominationVotingService;
  let mockPrisma: {
    communityNomination: { findUnique: ReturnType<typeof vi.fn> };
    nominationVote: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockActivityService: { createActivityEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      communityNomination: {
        findUnique: vi.fn().mockResolvedValue(mockNomination),
      },
      nominationVote: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockResolvedValue({ id: 'vote-1', nominationId: NOMINATION_ID, voterId: VOTER_ID }),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
      },
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
        NominationVotingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get(NominationVotingService);
  });

  describe('castVote', () => {
    it('creates a vote successfully', async () => {
      const result = await service.castVote(VOTER_ID, NOMINATION_ID);

      expect(result.voteId).toBe('vote-1');
      expect(result.nominationId).toBe(NOMINATION_ID);
      expect(result.currentVoteCount).toBe(1);
      expect(mockPrisma.nominationVote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nominationId: NOMINATION_ID, voterId: VOTER_ID },
        }),
      );
    });

    it('emits activity event on successful vote', async () => {
      await service.castVote(VOTER_ID, NOMINATION_ID);

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NOMINATION_VOTE_CAST',
          contributorId: VOTER_ID,
          entityId: NOMINATION_ID,
        }),
      );
    });

    it('emits nomination_vote_cast event via EventEmitter', async () => {
      await service.castVote(VOTER_ID, NOMINATION_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.nomination_vote_cast',
        expect.objectContaining({
          eventType: 'prize.event.nomination_vote_cast',
          payload: expect.objectContaining({
            nominationId: NOMINATION_ID,
            voterId: VOTER_ID,
            currentVoteCount: 1,
          }),
        }),
      );
    });

    it('rejects vote when nomination not found', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce(null);

      await expect(service.castVote(VOTER_ID, NOMINATION_ID)).rejects.toThrow(
        'Nomination not found',
      );
    });

    it('rejects vote on expired nomination', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce({
        ...mockNomination,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.castVote(VOTER_ID, NOMINATION_ID)).rejects.toThrow(
        'This nomination is no longer open for voting',
      );
    });

    it('rejects vote on non-OPEN nomination', async () => {
      mockPrisma.communityNomination.findUnique.mockResolvedValueOnce({
        ...mockNomination,
        status: 'AWARDED',
      });

      await expect(service.castVote(VOTER_ID, NOMINATION_ID)).rejects.toThrow(
        'This nomination is no longer open for voting',
      );
    });

    it('rejects vote by nominator (cannot vote on nomination you submitted)', async () => {
      await expect(service.castVote(NOMINATOR_ID, NOMINATION_ID)).rejects.toThrow(
        'You cannot vote on a nomination you submitted',
      );
    });

    it('rejects vote by nominee (cannot vote on own nomination)', async () => {
      await expect(service.castVote(NOMINEE_ID, NOMINATION_ID)).rejects.toThrow(
        'You cannot vote on your own nomination',
      );
    });

    it('rejects duplicate vote', async () => {
      mockPrisma.nominationVote.findUnique.mockResolvedValueOnce({ id: 'existing-vote' });

      await expect(service.castVote(VOTER_ID, NOMINATION_ID)).rejects.toThrow(
        'You have already voted on this nomination',
      );
    });
  });

  describe('getVoteCount', () => {
    it('returns correct vote count', async () => {
      mockPrisma.nominationVote.count.mockResolvedValueOnce(5);

      const result = await service.getVoteCount(NOMINATION_ID);

      expect(result).toEqual({ nominationId: NOMINATION_ID, voteCount: 5 });
    });

    it('returns zero for nomination with no votes', async () => {
      mockPrisma.nominationVote.count.mockResolvedValueOnce(0);

      const result = await service.getVoteCount(NOMINATION_ID);

      expect(result).toEqual({ nominationId: NOMINATION_ID, voteCount: 0 });
    });
  });

  describe('hasVoted', () => {
    it('returns true when voter has voted', async () => {
      mockPrisma.nominationVote.findUnique.mockResolvedValueOnce({ id: 'vote-1' });

      const result = await service.hasVoted(VOTER_ID, NOMINATION_ID);

      expect(result).toBe(true);
    });

    it('returns false when voter has not voted', async () => {
      mockPrisma.nominationVote.findUnique.mockResolvedValueOnce(null);

      const result = await service.hasVoted(VOTER_ID, NOMINATION_ID);

      expect(result).toBe(false);
    });
  });

  describe('getVotedNominationIds', () => {
    it('returns set of voted nomination IDs', async () => {
      mockPrisma.nominationVote.findMany.mockResolvedValueOnce([
        { nominationId: 'nom-1' },
        { nominationId: 'nom-3' },
      ]);

      const result = await service.getVotedNominationIds(VOTER_ID, ['nom-1', 'nom-2', 'nom-3']);

      expect(result).toEqual(new Set(['nom-1', 'nom-3']));
    });

    it('returns empty set for empty input', async () => {
      const result = await service.getVotedNominationIds(VOTER_ID, []);

      expect(result).toEqual(new Set());
      expect(mockPrisma.nominationVote.findMany).not.toHaveBeenCalled();
    });
  });
});
