import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { NewspaperItemVotingService } from '../newspaper-item-voting.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';

const ITEM_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VOTER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const VOTE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EDITION_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const recentPublishedAt = new Date();
recentPublishedAt.setDate(recentPublishedAt.getDate() - 10); // 10 days ago

const archivedPublishedAt = new Date();
archivedPublishedAt.setDate(archivedPublishedAt.getDate() - 100); // 100 days ago

const mockItem = {
  id: ITEM_ID,
  communityVoteCount: 5,
  edition: {
    id: EDITION_ID,
    status: 'PUBLISHED',
    publishedAt: recentPublishedAt,
  },
};

const mockArchivedItem = {
  ...mockItem,
  edition: {
    id: EDITION_ID,
    status: 'PUBLISHED',
    publishedAt: archivedPublishedAt,
  },
};

let txNewspaperItem: Record<string, ReturnType<typeof vi.fn>>;
let txNewspaperItemVote: Record<string, ReturnType<typeof vi.fn>>;

const mockPrisma = {
  newspaperItemVote: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string, defaultValue: string) => {
    if (key === 'NEWSPAPER_ARCHIVE_RETENTION_DAYS') return '90';
    return defaultValue;
  }),
};

describe('NewspaperItemVotingService', () => {
  let service: NewspaperItemVotingService;

  beforeEach(() => {
    vi.clearAllMocks();

    txNewspaperItem = {
      findUnique: vi.fn(),
      update: vi.fn(),
    };
    txNewspaperItemVote = {
      findUnique: vi.fn(),
      create: vi.fn(),
    };

    mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        newspaperItem: txNewspaperItem,
        newspaperItemVote: txNewspaperItemVote,
      });
    });

    service = new NewspaperItemVotingService(
      mockPrisma as never,
      mockEventEmitter as never,
      mockConfigService as never,
    );
  });

  describe('castVote', () => {
    it('should create a vote and increment communityVoteCount', async () => {
      txNewspaperItem.findUnique
        .mockResolvedValueOnce(mockItem) // first call: load item
        .mockResolvedValueOnce({ communityVoteCount: 6 }); // after increment
      txNewspaperItemVote.findUnique.mockResolvedValue(null); // no existing vote
      txNewspaperItemVote.create.mockResolvedValue({
        id: VOTE_ID,
        newspaperItemId: ITEM_ID,
        voterId: VOTER_ID,
      });
      txNewspaperItem.update.mockResolvedValue(undefined);

      const result = await service.castVote(VOTER_ID, ITEM_ID);

      expect(result.voteId).toBe(VOTE_ID);
      expect(result.newspaperItemId).toBe(ITEM_ID);
      expect(result.currentVoteCount).toBe(6);
      expect(txNewspaperItemVote.create).toHaveBeenCalledWith({
        data: { newspaperItemId: ITEM_ID, voterId: VOTER_ID },
      });
      expect(txNewspaperItem.update).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
        data: { communityVoteCount: { increment: 1 } },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'newspaper.item.vote_cast',
        expect.objectContaining({
          eventType: 'newspaper.item.vote_cast',
          payload: expect.objectContaining({
            voteId: VOTE_ID,
            newspaperItemId: ITEM_ID,
            currentVoteCount: 6,
          }),
        }),
      );
    });

    it('should throw NOT_FOUND for non-existent item', async () => {
      txNewspaperItem.findUnique.mockResolvedValue(null);

      try {
        await service.castVote(VOTER_ID, ITEM_ID);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainException);
        expect((err as DomainException).errorCode).toBe(ERROR_CODES.NEWSPAPER_ITEM_NOT_FOUND);
        expect((err as DomainException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw CONFLICT for duplicate vote', async () => {
      txNewspaperItem.findUnique.mockResolvedValue(mockItem);
      txNewspaperItemVote.findUnique.mockResolvedValue({ id: 'existing-vote' });

      try {
        await service.castVote(VOTER_ID, ITEM_ID);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainException);
        expect((err as DomainException).errorCode).toBe(
          ERROR_CODES.ALREADY_VOTED_ON_NEWSPAPER_ITEM,
        );
        expect((err as DomainException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should throw BAD_REQUEST for archived edition item', async () => {
      txNewspaperItem.findUnique.mockResolvedValue(mockArchivedItem);

      try {
        await service.castVote(VOTER_ID, ITEM_ID);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainException);
        expect((err as DomainException).errorCode).toBe(ERROR_CODES.NEWSPAPER_ITEM_VOTING_DISABLED);
        expect((err as DomainException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('hasVoted', () => {
    it('should return true when vote exists', async () => {
      mockPrisma.newspaperItemVote.findUnique.mockResolvedValue({ id: VOTE_ID });

      const result = await service.hasVoted(VOTER_ID, ITEM_ID);
      expect(result).toBe(true);
    });

    it('should return false when no vote exists', async () => {
      mockPrisma.newspaperItemVote.findUnique.mockResolvedValue(null);

      const result = await service.hasVoted(VOTER_ID, ITEM_ID);
      expect(result).toBe(false);
    });
  });

  describe('getVotedItemIds', () => {
    it('should return set of voted item IDs', async () => {
      const ITEM_2_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      mockPrisma.newspaperItemVote.findMany.mockResolvedValue([
        { newspaperItemId: ITEM_ID },
        { newspaperItemId: ITEM_2_ID },
      ]);

      const result = await service.getVotedItemIds(VOTER_ID, [ITEM_ID, ITEM_2_ID, 'not-voted']);
      expect(result).toEqual(new Set([ITEM_ID, ITEM_2_ID]));
    });

    it('should return empty set for empty input', async () => {
      const result = await service.getVotedItemIds(VOTER_ID, []);
      expect(result).toEqual(new Set());
      expect(mockPrisma.newspaperItemVote.findMany).not.toHaveBeenCalled();
    });
  });
});
