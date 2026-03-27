import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Generates Chatham House-style anonymized attribution labels for contributors.
 * Labels use only broad domain categories (Technology, Finance, Impact, Governance)
 * to prevent deanonymization in small communities.
 *
 * Stateless: computed on demand from Contributor + WorkingGroupMember data.
 * No persistent mapping table between contributor IDs and labels.
 */
@Injectable()
export class ChathamHouseAttributionService {
  private readonly logger = new Logger(ChathamHouseAttributionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates an anonymized role/expertise label for a contributor.
   * Uses working group memberships and contributor domain — never skill areas or PII.
   */
  async generateLabel(contributorId: string): Promise<string> {
    // 1. Get contributor's explicit domain
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { domain: true },
    });

    // 2. Get working group memberships for domain breadth
    const memberships = await this.prisma.workingGroupMember.findMany({
      where: { contributorId },
      include: { workingGroup: { select: { domain: true } } },
    });

    // 3. Collect distinct domains — working groups first, then contributor.domain if not already present
    const domainSet = new Set<string>();
    for (const m of memberships) {
      domainSet.add(m.workingGroup.domain);
    }
    if (contributor?.domain && !domainSet.has(contributor.domain)) {
      domainSet.add(contributor.domain);
    }

    // 4. Format label using only broad domain categories (sorted for deterministic output)
    const domains = [...domainSet].map((d) => d.toLowerCase()).sort();

    if (domains.length === 0) {
      return 'a community contributor';
    }

    if (domains.length === 1) {
      return `a ${domains[0]} expert`;
    }

    if (domains.length === 2) {
      return `a ${domains[0]} and ${domains[1]} specialist`;
    }

    const last = domains.pop()!;
    return `a ${domains.join(', ')}, and ${last} specialist`;
  }

  /**
   * Generates labels for a batch of contributor IDs, deduplicating queries.
   * Used by NewspaperItemService to ensure consistency within a single edition (AC3).
   */
  async generateLabelsForBatch(contributorIds: string[]): Promise<Map<string, string>> {
    const labelMap = new Map<string, string>();
    const uniqueIds = [...new Set(contributorIds)];

    for (const id of uniqueIds) {
      labelMap.set(id, await this.generateLabel(id));
    }

    this.logger.debug('Batch labels generated', {
      module: 'newspaper',
      uniqueContributors: uniqueIds.length,
      totalRequested: contributorIds.length,
    });

    return labelMap;
  }
}
