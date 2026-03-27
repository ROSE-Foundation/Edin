import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PrizeAwardService {
  private readonly logger = new Logger(PrizeAwardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByContributor(contributorId: string, options?: { limit?: number; offset?: number }) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    this.logger.log('Fetching prize awards for contributor', {
      contributorId,
      limit,
      offset,
      module: 'prizes',
    });

    return this.prisma.prizeAward.findMany({
      where: { recipientContributorId: contributorId },
      include: {
        prizeCategory: { select: { id: true, name: true, detectionType: true } },
        channel: { select: { id: true, name: true, type: true } },
      },
      orderBy: { awardedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findPublicByContributor(contributorId: string) {
    this.logger.log('Fetching public prize awards for contributor', {
      contributorId,
      module: 'prizes',
    });

    return this.prisma.prizeAward.findMany({
      where: { recipientContributorId: contributorId },
      select: {
        id: true,
        significanceLevel: true,
        chathamHouseLabel: true,
        narrative: true,
        awardedAt: true,
        prizeCategory: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true } },
      },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async countByContributor(contributorId: string): Promise<number> {
    return this.prisma.prizeAward.count({
      where: { recipientContributorId: contributorId },
    });
  }

  async contributorExists(contributorId: string): Promise<boolean> {
    const count = await this.prisma.contributor.count({
      where: { id: contributorId },
    });
    return count > 0;
  }

  async getAdminOverview() {
    this.logger.log('Fetching admin prize overview', { module: 'prizes' });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalByCategory, totalByChannel, recentAwards, last30DaysCount] = await Promise.all([
      this.prisma.prizeAward.groupBy({
        by: ['prizeCategoryId'],
        _count: { id: true },
      }),
      this.prisma.prizeAward.groupBy({
        by: ['channelId'],
        _count: { id: true },
      }),
      this.prisma.prizeAward.findMany({
        take: 20,
        orderBy: { awardedAt: 'desc' },
        include: {
          prizeCategory: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true } },
        },
      }),
      this.prisma.prizeAward.count({
        where: { awardedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Enrich groupBy results with names
    const categoryIds = totalByCategory.map((g) => g.prizeCategoryId);
    const channelIds = totalByChannel.map((g) => g.channelId);

    const [categories, channels] = await Promise.all([
      categoryIds.length > 0
        ? this.prisma.prizeCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [],
      channelIds.length > 0
        ? this.prisma.channel.findMany({
            where: { id: { in: channelIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const channelMap = new Map(channels.map((c) => [c.id, c.name]));

    return {
      totalByCategory: totalByCategory.map((g) => ({
        prizeCategoryId: g.prizeCategoryId,
        prizeCategoryName: categoryMap.get(g.prizeCategoryId) ?? 'Unknown',
        count: g._count.id,
      })),
      totalByChannel: totalByChannel.map((g) => ({
        channelId: g.channelId,
        channelName: channelMap.get(g.channelId) ?? 'Unknown',
        count: g._count.id,
      })),
      recentAwards: recentAwards.map((a) => ({
        id: a.id,
        contributorId: a.recipientContributorId,
        contributorName: a.recipient?.name ?? 'Unknown',
        prizeCategoryName: a.prizeCategory?.name ?? 'Unknown',
        channelName: a.channel?.name ?? 'Unknown',
        significanceLevel: a.significanceLevel,
        narrative: a.narrative,
        awardedAt: a.awardedAt.toISOString(),
      })),
      last30DaysCount,
    };
  }
}
