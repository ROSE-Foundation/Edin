import { Injectable, Logger } from '@nestjs/common';
import { REWARD_METHODOLOGY } from '@edin/shared';
import type { PlatformMetrics, RewardMethodology } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';

const METRICS_CACHE_KEY = 'showcase:platform-metrics';
const METRICS_CACHE_TTL = 900; // 15 minutes

@Injectable()
export class ShowcaseService {
  private readonly logger = new Logger(ShowcaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const cached = await this.redis.get<PlatformMetrics>(METRICS_CACHE_KEY);
    if (cached) {
      this.logger.log('Platform metrics served from cache');
      return cached;
    }

    const startTime = Date.now();

    const [activeCount, totalByDomain, retentionData] = await Promise.all([
      this.prisma.contributor.count({
        where: { isActive: true },
      }),
      this.prisma.contributor.groupBy({
        by: ['domain'],
        where: { isActive: true, domain: { not: null } },
        _count: { id: true },
      }),
      this.computeRetentionRate(),
    ]);

    const activeContributorsWithDomain = totalByDomain.reduce(
      (sum, group) => sum + group._count.id,
      0,
    );

    const domainDistribution = totalByDomain.map((group) => ({
      domain: group.domain as string,
      count: group._count.id,
      percentage:
        activeContributorsWithDomain > 0
          ? Math.round((group._count.id / activeContributorsWithDomain) * 100)
          : 0,
    }));

    const metrics: PlatformMetrics = {
      activeContributors: activeCount,
      contributionVelocity: 0, // Phase 1 placeholder — requires Epic 4
      domainDistribution,
      retentionRate: retentionData,
    };

    await this.redis.set(METRICS_CACHE_KEY, metrics, METRICS_CACHE_TTL);

    const duration = Date.now() - startTime;
    this.logger.log('Platform metrics computed and cached', {
      activeContributors: activeCount,
      domainCount: domainDistribution.length,
      retentionRate: retentionData,
      duration: `${duration}ms`,
    });

    return metrics;
  }

  getRewardMethodology(): RewardMethodology {
    return REWARD_METHODOLOGY;
  }

  private async computeRetentionRate(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [createdBefore30Days, stillActive] = await Promise.all([
      this.prisma.contributor.count({
        where: { createdAt: { lt: thirtyDaysAgo } },
      }),
      this.prisma.contributor.count({
        where: { createdAt: { lt: thirtyDaysAgo }, isActive: true },
      }),
    ]);

    if (createdBefore30Days === 0) {
      return 0;
    }

    return Math.round((stillActive / createdBefore30Days) * 100);
  }
}
