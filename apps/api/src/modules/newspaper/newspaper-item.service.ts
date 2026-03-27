import { Injectable, Logger } from '@nestjs/common';
import type {
  ActivityEvent as PrismaActivityEvent,
  NewspaperItemSourceType,
} from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChathamHouseAttributionService } from './chatham-house-attribution.service.js';

/** Maps ActivityEventType to NewspaperItemSourceType */
const EVENT_TYPE_TO_SOURCE_TYPE: Record<string, string> = {
  PRIZE_AWARDED: 'PRIZE_AWARDED',
  TRACK_RECORD_MILESTONE_CROSSED: 'TRACK_RECORD_MILESTONE',
  PEER_NOMINATION_RECEIVED: 'PEER_NOMINATION_RECEIVED',
  CROSS_DOMAIN_COLLABORATION_DETECTED: 'CROSS_DOMAIN_COLLABORATION',
  HIGH_SIGNIFICANCE_CONTRIBUTION: 'CONTRIBUTION_EVALUATED',
};

@Injectable()
export class NewspaperItemService {
  private readonly logger = new Logger(NewspaperItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chathamHouseService: ChathamHouseAttributionService,
  ) {}

  /**
   * Generates newspaper items for an edition from qualifying activity events.
   * Items are ranked by composite score: significance_score (primary, discrete tier),
   * channel diversity bonus (secondary, discrete steps 0.0-0.4),
   * community vote bonus (tertiary, discrete steps 0.0-0.15), then event timestamp ASC.
   * Neither bonus promotes items across significance tiers (NP-NFR1).
   */
  async generateItemsForEdition(editionId: string, events: PrismaActivityEvent[]): Promise<void> {
    if (events.length === 0) {
      this.logger.debug('No events to generate items from', {
        module: 'newspaper',
        editionId,
      });
      return;
    }

    // Resolve channel IDs and Chatham House labels for all events
    // Channel resolution must happen before ranking to compute diversity bonus
    const channelMap = await this.resolveChannelIds(events);
    const contributorIds = events.map((e) => e.contributorId);
    const labelMap = await this.chathamHouseService.generateLabelsForBatch(contributorIds);

    // Fetch community vote counts from previous edition's items for matching source events
    const previousVoteCounts = await this.fetchPreviousEditionVoteCounts(events.map((e) => e.id));

    // Build items with significance scores
    const itemsWithScores = events.map((event) => ({
      event,
      significanceScore: this.deriveSignificanceScore(event),
      channelId: channelMap.get(event.id),
    }));

    // Compute channel diversity bonus (NP-NFR1: discrete steps only)
    const channelItemCounts = new Map<string, number>();
    for (const item of itemsWithScores) {
      if (item.channelId) {
        channelItemCounts.set(item.channelId, (channelItemCounts.get(item.channelId) ?? 0) + 1);
      }
    }
    const maxChannelCount = Math.max(...channelItemCounts.values(), 1);

    const scoredItems = itemsWithScores.map((item) => {
      const channelCount = item.channelId ? (channelItemCounts.get(item.channelId) ?? 1) : 1;
      // Diversity bonus: 0.0 for most-represented channel, up to 0.4 for least-represented
      // Uses discrete steps (floor to 0.1 increments) per NP-NFR1
      const diversityRatio = 1 - channelCount / maxChannelCount;
      const diversityBonus = Math.floor(diversityRatio * 4) / 10;

      // Community vote bonus: tertiary signal from previous edition votes
      // Discrete steps per NP-NFR1: max 0.15 (well below diversity bonus, never crosses tiers)
      const previousVotes = previousVoteCounts.get(item.event.id) ?? 0;
      const voteBonus = Math.min(Math.floor(previousVotes / 3), 3) * 0.05;

      return {
        ...item,
        diversityBonus,
        voteBonus,
        // Composite: significance is integer [1-5], so 0.0-0.55 total bonus
        // only breaks ties within same tier — never promotes across tiers
        compositeScore: item.significanceScore + diversityBonus + voteBonus,
      };
    });

    // Sort: composite score DESC, then timestamp ASC within same score
    scoredItems.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) {
        return b.compositeScore - a.compositeScore;
      }
      return a.event.createdAt.getTime() - b.event.createdAt.getTime();
    });

    // Create newspaper items in batch
    const createData = scoredItems.map(({ event, significanceScore, channelId }, index) => {
      const metadata = event.metadata as Record<string, unknown> | null;

      if (!channelId) {
        this.logger.warn('No channel resolved for event, skipping item', {
          module: 'newspaper',
          eventId: event.id,
          eventType: event.eventType,
        });
      }

      return {
        editionId,
        sourceEventType: this.mapSourceEventType(event.eventType),
        sourceEventId: event.id,
        channelId: channelId!,
        headline: this.generateHeadline(event),
        body: this.generateBody(event),
        chathamHouseLabel:
          labelMap.get(event.contributorId) ?? this.extractChathamHouseLabel(metadata),
        significanceScore,
        algorithmicRank: index + 1,
      };
    });

    // Filter out items with no channel
    const validItems = createData.filter((item) => item.channelId != null);

    if (validItems.length > 0) {
      await this.prisma.newspaperItem.createMany({ data: validItems });

      this.logger.log('Newspaper items generated', {
        module: 'newspaper',
        editionId,
        itemCount: validItems.length,
        skipped: createData.length - validItems.length,
      });
    }
  }

  /**
   * Maps an ActivityEventType to a NewspaperItemSourceType enum value.
   */
  mapSourceEventType(eventType: string): NewspaperItemSourceType {
    return (EVENT_TYPE_TO_SOURCE_TYPE[eventType] ?? 'CUSTOM') as NewspaperItemSourceType;
  }

  /**
   * Derives a discrete significance score (1-5) from an activity event.
   */
  deriveSignificanceScore(event: PrismaActivityEvent): number {
    const metadata = event.metadata as Record<string, unknown> | null;

    switch (event.eventType) {
      case 'PRIZE_AWARDED': {
        const significanceLevel = (metadata?.significanceLevel as number) ?? 1;
        // Floor to ensure integer tier — metadata may contain floats (NP-NFR1)
        return Math.min(Math.max(Math.floor(significanceLevel) + 2, 1), 5);
      }
      case 'HIGH_SIGNIFICANCE_CONTRIBUTION':
        return 4;
      case 'CROSS_DOMAIN_COLLABORATION_DETECTED':
        return 3;
      case 'TRACK_RECORD_MILESTONE_CROSSED':
        return 3;
      case 'PEER_NOMINATION_RECEIVED':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Generates a headline for a newspaper item based on event type and metadata.
   */
  generateHeadline(event: PrismaActivityEvent): string {
    const metadata = event.metadata as Record<string, unknown> | null;

    switch (event.eventType) {
      case 'PRIZE_AWARDED': {
        const categoryName = (metadata?.prizeCategoryName as string) ?? 'Prize';
        if (categoryName.toLowerCase().includes('cross-domain')) {
          return 'Cross-domain collaboration recognized';
        }
        if (categoryName.toLowerCase().includes('breakthrough')) {
          const domain = (metadata?.domain as string) ?? event.domain;
          return `Breakthrough contribution in ${domain}`;
        }
        if (categoryName.toLowerCase().includes('community')) {
          return 'Community recognition award earned';
        }
        return `${categoryName} awarded`;
      }
      case 'TRACK_RECORD_MILESTONE_CROSSED': {
        const milestoneName = (metadata?.thresholdName as string) ?? 'Milestone';
        return `${milestoneName} achieved`;
      }
      case 'PEER_NOMINATION_RECEIVED': {
        const prizeName = (metadata?.prizeCategoryName as string) ?? 'recognition';
        return `Community nomination for ${prizeName}`;
      }
      case 'CROSS_DOMAIN_COLLABORATION_DETECTED': {
        const domains = (metadata?.domains as string[]) ?? [];
        if (domains.length >= 2) {
          return `Collaboration bridges ${domains[0]} and ${domains[1]}`;
        }
        return 'Cross-domain collaboration detected';
      }
      case 'HIGH_SIGNIFICANCE_CONTRIBUTION': {
        const domain = (metadata?.domain as string) ?? event.domain;
        return `High-impact contribution in ${domain}`;
      }
      default:
        return event.title;
    }
  }

  /**
   * Generates a body/narrative for a newspaper item.
   */
  generateBody(event: PrismaActivityEvent): string {
    const metadata = event.metadata as Record<string, unknown> | null;

    switch (event.eventType) {
      case 'PRIZE_AWARDED': {
        const narrative = (metadata?.narrative as string) ?? '';
        return (
          narrative || event.description || 'A contributor was recognized for outstanding work.'
        );
      }
      case 'TRACK_RECORD_MILESTONE_CROSSED': {
        const thresholdName = (metadata?.thresholdName as string) ?? 'milestone';
        return `A sustained contributor reached the ${thresholdName} threshold, demonstrating consistent engagement and reliability.`;
      }
      case 'PEER_NOMINATION_RECEIVED': {
        const rationale = (metadata?.rationale as string) ?? '';
        return rationale || 'A peer nomination was submitted recognizing exceptional work.';
      }
      case 'CROSS_DOMAIN_COLLABORATION_DETECTED': {
        const domains = (metadata?.domains as string[]) ?? [];
        return domains.length >= 2
          ? `Work bridging ${domains.join(' and ')} demonstrates cross-domain synthesis.`
          : 'A contribution spanning multiple domains was identified.';
      }
      case 'HIGH_SIGNIFICANCE_CONTRIBUTION': {
        const percentile = (metadata?.percentileRank as number) ?? 95;
        return `A contribution ranked in the ${percentile}th percentile was identified as high-impact.`;
      }
      default:
        return event.description || event.title;
    }
  }

  /**
   * Extracts the Chatham House label from event metadata, or returns a default.
   */
  extractChathamHouseLabel(metadata: Record<string, unknown> | null): string {
    if (metadata?.chathamHouseLabel && typeof metadata.chathamHouseLabel === 'string') {
      return metadata.chathamHouseLabel;
    }
    return 'a community contributor';
  }

  /**
   * Fetches community vote counts from the most recent published edition for
   * source events that match the given event IDs. Returns a map of eventId → voteCount.
   * This implements the tertiary vote signal for next-edition ranking (AC6).
   */
  private async fetchPreviousEditionVoteCounts(
    sourceEventIds: string[],
  ): Promise<Map<string, number>> {
    if (sourceEventIds.length === 0) return new Map();

    const latestEdition = await this.prisma.newspaperEdition.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { editionNumber: 'desc' },
      select: { id: true },
    });

    if (!latestEdition) return new Map();

    const items = await this.prisma.newspaperItem.findMany({
      where: {
        editionId: latestEdition.id,
        sourceEventId: { in: sourceEventIds },
        communityVoteCount: { gt: 0 },
      },
      select: { sourceEventId: true, communityVoteCount: true },
    });

    const voteMap = new Map<string, number>();
    for (const item of items) {
      voteMap.set(item.sourceEventId, item.communityVoteCount);
    }

    if (voteMap.size > 0) {
      this.logger.debug('Previous edition vote counts fetched for ranking', {
        module: 'newspaper',
        itemsWithVotes: voteMap.size,
      });
    }

    return voteMap;
  }

  /**
   * Resolves channel IDs for activity events by looking up domain-to-channel mappings.
   */
  private async resolveChannelIds(events: PrismaActivityEvent[]): Promise<Map<string, string>> {
    const channelMap = new Map<string, string>();

    // Collect all unique domains from events
    const domains = [...new Set(events.map((e) => e.domain))];

    // Query channels matching these domains
    const channels = await this.prisma.channel.findMany({
      where: {
        type: 'DOMAIN',
        name: { in: domains },
        isActive: true,
      },
      select: { id: true, name: true },
    });

    const domainToChannelId = new Map(channels.map((c) => [c.name, c.id]));

    // Also try to get a CROSS_DOMAIN channel as fallback
    const crossDomainChannel = await this.prisma.channel.findFirst({
      where: { type: 'CROSS_DOMAIN', isActive: true },
      select: { id: true },
    });

    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown> | null;

      // Check if metadata has explicit channelId
      if (metadata?.channelId && typeof metadata.channelId === 'string') {
        channelMap.set(event.id, metadata.channelId);
        continue;
      }

      // Map domain to channel
      const channelId = domainToChannelId.get(event.domain);
      if (channelId) {
        channelMap.set(event.id, channelId);
        continue;
      }

      // Fallback for cross-domain events
      if (event.eventType === 'CROSS_DOMAIN_COLLABORATION_DETECTED' && crossDomainChannel) {
        channelMap.set(event.id, crossDomainChannel.id);
        continue;
      }

      // Use first available channel as last resort
      if (channels.length > 0) {
        channelMap.set(event.id, channels[0].id);
      }
    }

    return channelMap;
  }
}
