import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChathamHouseAttributionService } from '../chatham-house-attribution.service.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    contributor: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    workingGroupMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function createMembership(domain: string) {
  return { workingGroup: { domain } };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ChathamHouseAttributionService', () => {
  let service: ChathamHouseAttributionService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ChathamHouseAttributionService(prisma as never);
  });

  describe('generateLabel', () => {
    it('returns single-domain label for contributor in one working group', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      const label = await service.generateLabel('contrib-1');
      expect(label).toBe('a technology expert');
    });

    it('returns two-domain label for contributor in two working groups', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([
        createMembership('Technology'),
        createMembership('Finance'),
      ]);

      const label = await service.generateLabel('contrib-1');
      // Sorted alphabetically: finance < technology
      expect(label).toBe('a finance and technology specialist');
    });

    it('returns three-domain label with Oxford comma', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([
        createMembership('Technology'),
        createMembership('Finance'),
        createMembership('Impact'),
      ]);

      const label = await service.generateLabel('contrib-1');
      // Sorted alphabetically: finance, impact, technology
      expect(label).toBe('a finance, impact, and technology specialist');
    });

    it('uses contributor.domain when no working group memberships', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Governance' });
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const label = await service.generateLabel('contrib-1');
      expect(label).toBe('a governance expert');
    });

    it('returns fallback when no domain data at all', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: null });
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const label = await service.generateLabel('contrib-1');
      expect(label).toBe('a community contributor');
    });

    it('returns fallback when contributor not found', async () => {
      prisma.contributor.findUnique.mockResolvedValue(null);
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const label = await service.generateLabel('contrib-nonexistent');
      expect(label).toBe('a community contributor');
    });

    it('deduplicates contributor.domain already present in working groups', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      const label = await service.generateLabel('contrib-1');
      // Should be "a technology expert", not "a technology and technology specialist"
      expect(label).toBe('a technology expert');
      expect(label).not.toContain('and');
    });

    it('adds contributor.domain when it differs from working group domains', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Impact' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      const label = await service.generateLabel('contrib-1');
      // Sorted alphabetically: impact < technology
      expect(label).toBe('a impact and technology specialist');
    });

    it('never contains contributor name, username, or email', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      const label = await service.generateLabel('contrib-1');

      // Labels should only contain generic domain terms, not PII
      expect(label).not.toMatch(/[A-Z][a-z]+ [A-Z][a-z]+/); // No full names (e.g., "John Smith")
      expect(label).not.toContain('@'); // No emails
      expect(label).toMatch(/^a [a-z, ]+$/); // Only lowercase domain terms
    });

    it('lowercases all domain names in labels', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([
        createMembership('Technology'),
        createMembership('Finance'),
      ]);

      const label = await service.generateLabel('contrib-1');
      expect(label).toBe('a finance and technology specialist');
      // Verify no uppercase characters after the initial 'a'
      expect(label.slice(2)).toBe(label.slice(2).toLowerCase());
    });
  });

  describe('generateLabelsForBatch', () => {
    it('returns consistent labels for the same contributor', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      const labels = await service.generateLabelsForBatch(['contrib-1', 'contrib-1', 'contrib-1']);

      expect(labels.size).toBe(1);
      expect(labels.get('contrib-1')).toBe('a technology expert');
    });

    it('deduplicates contributor IDs for efficient querying', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      prisma.workingGroupMember.findMany.mockResolvedValue([createMembership('Technology')]);

      await service.generateLabelsForBatch([
        'contrib-1',
        'contrib-1',
        'contrib-2',
        'contrib-1',
        'contrib-2',
      ]);

      // Only 2 unique contributors should be queried
      expect(prisma.contributor.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.workingGroupMember.findMany).toHaveBeenCalledTimes(2);
    });

    it('returns labels for multiple distinct contributors', async () => {
      prisma.contributor.findUnique
        .mockResolvedValueOnce({ domain: 'Technology' })
        .mockResolvedValueOnce({ domain: 'Finance' });
      prisma.workingGroupMember.findMany
        .mockResolvedValueOnce([createMembership('Technology')])
        .mockResolvedValueOnce([createMembership('Finance')]);

      const labels = await service.generateLabelsForBatch(['contrib-1', 'contrib-2']);

      expect(labels.size).toBe(2);
      expect(labels.get('contrib-1')).toBe('a technology expert');
      expect(labels.get('contrib-2')).toBe('a finance expert');
    });

    it('handles empty input', async () => {
      const labels = await service.generateLabelsForBatch([]);
      expect(labels.size).toBe(0);
      expect(prisma.contributor.findUnique).not.toHaveBeenCalled();
    });
  });
});
