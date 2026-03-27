import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { randomUUID } from 'crypto';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { NewspaperItemVoteCastEvent } from '@edin/shared';

@Injectable()
export class NewspaperItemVotingService {
  private readonly logger = new Logger(NewspaperItemVotingService.name);
  private readonly archiveRetentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.archiveRetentionDays = Number(
      this.configService.get('NEWSPAPER_ARCHIVE_RETENTION_DAYS', '90'),
    );
  }

  async castVote(voterId: string, newspaperItemId: string) {
    const correlationId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Load newspaper item with edition for validation
      const item = await tx.newspaperItem.findUnique({
        where: { id: newspaperItemId },
        include: {
          edition: { select: { id: true, status: true, publishedAt: true } },
        },
      });

      if (!item) {
        throw new DomainException(
          ERROR_CODES.NEWSPAPER_ITEM_NOT_FOUND,
          'Newspaper item not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. Check edition is not archived (published > retentionDays ago)
      if (item.edition.publishedAt) {
        const archiveThreshold = new Date();
        archiveThreshold.setDate(archiveThreshold.getDate() - this.archiveRetentionDays);
        if (item.edition.publishedAt < archiveThreshold) {
          throw new DomainException(
            ERROR_CODES.NEWSPAPER_ITEM_VOTING_DISABLED,
            'Voting is disabled on archived editions',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 3. Check for existing vote
      const existingVote = await tx.newspaperItemVote.findUnique({
        where: {
          newspaperItemId_voterId: { newspaperItemId, voterId },
        },
      });

      if (existingVote) {
        throw new DomainException(
          ERROR_CODES.ALREADY_VOTED_ON_NEWSPAPER_ITEM,
          'You have already voted on this newspaper item',
          HttpStatus.CONFLICT,
        );
      }

      // 4. Create vote and increment count atomically
      const vote = await tx.newspaperItemVote.create({
        data: { newspaperItemId, voterId },
      });

      await tx.newspaperItem.update({
        where: { id: newspaperItemId },
        data: { communityVoteCount: { increment: 1 } },
      });

      const updatedItem = await tx.newspaperItem.findUnique({
        where: { id: newspaperItemId },
        select: { communityVoteCount: true },
      });

      return {
        vote,
        currentVoteCount: updatedItem!.communityVoteCount,
      };
    });

    this.logger.log('Newspaper item vote cast', {
      module: 'newspaper',
      voteId: result.vote.id,
      newspaperItemId,
      voterId,
      voteCount: result.currentVoteCount,
      correlationId,
    });

    // Emit SSE event for real-time update
    const voteCastEvent: NewspaperItemVoteCastEvent = {
      eventType: 'newspaper.item.vote_cast',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: voterId,
      payload: {
        voteId: result.vote.id,
        newspaperItemId,
        voterId,
        currentVoteCount: result.currentVoteCount,
      },
    };

    this.eventEmitter.emit('newspaper.item.vote_cast', voteCastEvent);

    return {
      voteId: result.vote.id,
      newspaperItemId,
      currentVoteCount: result.currentVoteCount,
    };
  }

  async hasVoted(voterId: string, newspaperItemId: string): Promise<boolean> {
    const vote = await this.prisma.newspaperItemVote.findUnique({
      where: {
        newspaperItemId_voterId: { newspaperItemId, voterId },
      },
      select: { id: true },
    });

    return vote !== null;
  }

  async getVotedItemIds(voterId: string, itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set();

    const votes = await this.prisma.newspaperItemVote.findMany({
      where: {
        voterId,
        newspaperItemId: { in: itemIds },
      },
      select: { newspaperItemId: true },
    });

    return new Set(votes.map((v) => v.newspaperItemId));
  }
}
