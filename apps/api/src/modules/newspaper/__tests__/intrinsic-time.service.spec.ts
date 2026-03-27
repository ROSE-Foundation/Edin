import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntrinsicTimeService, SIGNIFICANT_EVENT_TYPES } from '../intrinsic-time.service.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockEvent(
  overrides: Partial<{
    id: string;
    eventType: string;
    domain: string;
    contributorId: string;
    createdAt: Date;
    metadata: Record<string, unknown> | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'evt-1',
    eventType: overrides.eventType ?? 'PRIZE_AWARDED',
    title: 'Test event',
    description: null,
    contributorId: overrides.contributorId ?? 'contrib-1',
    domain: overrides.domain ?? 'Technology',
    contributionType: null,
    entityId: 'entity-1',
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-03-25T12:00:00Z'),
  };
}

function createMockPrisma() {
  return {
    newspaperEdition: {
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _max: { editionNumber: 0 } }),
      create: vi.fn().mockResolvedValue({
        id: 'edition-1',
        editionNumber: 1,
        status: 'DRAFT',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'edition-1',
        editionNumber: 1,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    activityEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function createMockDeps() {
  const prisma = createMockPrisma();
  const activityService = {
    createActivityEvent: vi.fn().mockResolvedValue({ id: 'ae-1' }),
  };
  const redisService = {
    publish: vi.fn().mockResolvedValue(undefined),
  };
  const newspaperItemService = {
    generateItemsForEdition: vi.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        NEWSPAPER_LOOKBACK_HOURS: '72',
        NEWSPAPER_EVENT_THRESHOLD: '5',
        NEWSPAPER_MAX_INTERVAL_DAYS: '7',
        NEWSPAPER_CHECK_INTERVAL_MS: '900000',
        NEWSPAPER_COMPARISON_WINDOW_DAYS: '30',
      };
      return config[key] ?? defaultValue;
    }),
  };

  return { prisma, activityService, redisService, newspaperItemService, configService };
}

function createService(deps = createMockDeps()) {
  return new IntrinsicTimeService(
    deps.prisma as never,
    deps.activityService as never,
    deps.redisService as never,
    deps.newspaperItemService as never,
    deps.configService as never,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IntrinsicTimeService', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let service: IntrinsicTimeService;

  beforeEach(() => {
    deps = createMockDeps();
    service = createService(deps);
  });

  describe('evaluateAndCreateEdition', () => {
    it('creates an edition when event count meets threshold', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `evt-${i}`,
          createdAt: new Date(`2026-03-25T${10 + i}:00:00Z`),
        }),
      );

      deps.prisma.activityEvent.findMany.mockResolvedValue(events);

      await service.evaluateAndCreateEdition('corr-1');

      expect(deps.prisma.newspaperEdition.create).toHaveBeenCalledTimes(1);
      expect(deps.prisma.newspaperEdition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            eventCount: 5,
          }),
        }),
      );
    });

    it('does NOT create an edition below threshold', async () => {
      // Set a recent last edition so max interval isn't triggered
      deps.prisma.newspaperEdition.findFirst.mockResolvedValue({
        id: 'recent-edition',
        editionNumber: 1,
        temporalSpanEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'PUBLISHED',
      });

      const events = Array.from({ length: 3 }, (_, i) => createMockEvent({ id: `evt-${i}` }));

      deps.prisma.activityEvent.findMany.mockResolvedValue(events);

      await service.evaluateAndCreateEdition('corr-2');

      expect(deps.prisma.newspaperEdition.create).not.toHaveBeenCalled();
    });

    it('creates quiet-period edition after max interval', async () => {
      // Last edition was 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      deps.prisma.newspaperEdition.findFirst.mockResolvedValue({
        id: 'old-edition',
        editionNumber: 1,
        temporalSpanEnd: eightDaysAgo,
        status: 'PUBLISHED',
      });

      // No qualifying events
      deps.prisma.activityEvent.findMany.mockResolvedValue([]);

      await service.evaluateAndCreateEdition('corr-3');

      expect(deps.prisma.newspaperEdition.create).toHaveBeenCalledTimes(1);
    });

    it('skips edition creation when a DRAFT edition already exists', async () => {
      deps.prisma.newspaperEdition.findFirst.mockResolvedValue({
        id: 'draft-edition',
        editionNumber: 2,
        temporalSpanEnd: new Date(),
        status: 'DRAFT',
      });

      await service.evaluateAndCreateEdition('corr-4');

      expect(deps.prisma.newspaperEdition.create).not.toHaveBeenCalled();
      expect(deps.prisma.activityEvent.findMany).not.toHaveBeenCalled();
    });

    it('transitions edition from DRAFT to PUBLISHED', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `evt-${i}`,
          createdAt: new Date(`2026-03-25T${10 + i}:00:00Z`),
        }),
      );

      deps.prisma.activityEvent.findMany.mockResolvedValue(events);

      await service.evaluateAndCreateEdition('corr-5');

      expect(deps.prisma.newspaperEdition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'edition-1' },
          data: expect.objectContaining({
            status: 'PUBLISHED',
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('emits NEWSPAPER_EDITION_PUBLISHED activity event', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `evt-${i}`,
          createdAt: new Date(`2026-03-25T${10 + i}:00:00Z`),
        }),
      );

      deps.prisma.activityEvent.findMany.mockResolvedValue(events);

      await service.evaluateAndCreateEdition('corr-6');

      expect(deps.activityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NEWSPAPER_EDITION_PUBLISHED',
          entityId: 'edition-1',
        }),
      );
    });

    it('publishes to Redis for SSE', async () => {
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({
          id: `evt-${i}`,
          createdAt: new Date(`2026-03-25T${10 + i}:00:00Z`),
        }),
      );

      deps.prisma.activityEvent.findMany.mockResolvedValue(events);

      await service.evaluateAndCreateEdition('corr-7');

      expect(deps.redisService.publish).toHaveBeenCalledWith(
        'newspaper-feed',
        expect.stringContaining('"eventType":"newspaper.edition.published"'),
      );
    });
  });

  describe('computeSignificanceDistribution', () => {
    it('counts events per significance tier', () => {
      const events = [
        createMockEvent({ eventType: 'PRIZE_AWARDED', metadata: { significanceLevel: 3 } }),
        createMockEvent({ eventType: 'PRIZE_AWARDED', metadata: { significanceLevel: 1 } }),
        createMockEvent({ eventType: 'PEER_NOMINATION_RECEIVED' }),
        createMockEvent({ eventType: 'TRACK_RECORD_MILESTONE_CROSSED' }),
        createMockEvent({ eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION' }),
      ];

      const dist = service.computeSignificanceDistribution(events as never[]);

      expect(dist.tier5).toBe(1); // PRIZE_AWARDED with significanceLevel 3 → tier 5
      expect(dist.tier4).toBe(1); // HIGH_SIGNIFICANCE_CONTRIBUTION → tier 4
      expect(dist.tier3).toBeGreaterThanOrEqual(2); // PRIZE_AWARDED(1→3) + TRACK_RECORD_MILESTONE_CROSSED
      expect(dist.tier2).toBe(1); // PEER_NOMINATION_RECEIVED → tier 2
    });
  });

  describe('deriveSignificanceTier', () => {
    it('maps PRIZE_AWARDED with significanceLevel to correct tier', () => {
      const event = createMockEvent({
        eventType: 'PRIZE_AWARDED',
        metadata: { significanceLevel: 2 },
      });
      expect(service.deriveSignificanceTier(event as never)).toBe(4);
    });

    it('maps HIGH_SIGNIFICANCE_CONTRIBUTION to tier 4', () => {
      const event = createMockEvent({ eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION' });
      expect(service.deriveSignificanceTier(event as never)).toBe(4);
    });

    it('maps CROSS_DOMAIN_COLLABORATION_DETECTED to tier 3', () => {
      const event = createMockEvent({ eventType: 'CROSS_DOMAIN_COLLABORATION_DETECTED' });
      expect(service.deriveSignificanceTier(event as never)).toBe(3);
    });

    it('maps TRACK_RECORD_MILESTONE_CROSSED to tier 3', () => {
      const event = createMockEvent({ eventType: 'TRACK_RECORD_MILESTONE_CROSSED' });
      expect(service.deriveSignificanceTier(event as never)).toBe(3);
    });

    it('maps PEER_NOMINATION_RECEIVED to tier 2', () => {
      const event = createMockEvent({ eventType: 'PEER_NOMINATION_RECEIVED' });
      expect(service.deriveSignificanceTier(event as never)).toBe(2);
    });

    it('defaults unknown event types to tier 1', () => {
      const event = createMockEvent({ eventType: 'SOMETHING_ELSE' });
      expect(service.deriveSignificanceTier(event as never)).toBe(1);
    });

    it('clamps significance tiers to 1-5 range', () => {
      // significanceLevel 3 → tier 5 (3+2)
      const high = createMockEvent({
        eventType: 'PRIZE_AWARDED',
        metadata: { significanceLevel: 3 },
      });
      expect(service.deriveSignificanceTier(high as never)).toBe(5);

      // significanceLevel 10 → capped at 5
      const veryHigh = createMockEvent({
        eventType: 'PRIZE_AWARDED',
        metadata: { significanceLevel: 10 },
      });
      expect(service.deriveSignificanceTier(veryHigh as never)).toBe(5);
    });
  });

  describe('formatTemporalSpan', () => {
    it('formats sub-hour spans in minutes', () => {
      const start = new Date('2026-03-25T10:00:00Z');
      const end = new Date('2026-03-25T10:30:00Z');
      const result = service.formatTemporalSpan(0.5, start, end);
      expect(result).toContain('30 minute');
    });

    it('formats spans under 48 hours in hours', () => {
      const start = new Date('2026-03-25T10:00:00Z');
      const end = new Date('2026-03-26T04:00:00Z');
      const result = service.formatTemporalSpan(18, start, end);
      expect(result).toContain('18 hour');
    });

    it('formats multi-day spans with date range', () => {
      const start = new Date('2026-03-22T00:00:00Z');
      const end = new Date('2026-03-25T00:00:00Z');
      const result = service.formatTemporalSpan(72, start, end);
      expect(result).toContain('3 days');
    });
  });

  describe('formatSignificanceSummary', () => {
    it('formats tier counts into readable summary', () => {
      const dist = { tier1: 0, tier2: 1, tier3: 3, tier4: 1, tier5: 0 };
      const result = service.formatSignificanceSummary(dist);
      expect(result).toContain('1 high-impact');
      expect(result).toContain('3 collaborations');
      expect(result).toContain('1 community');
    });

    it('returns "no significant events" for empty distribution', () => {
      const dist = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 };
      const result = service.formatSignificanceSummary(dist);
      expect(result).toBe('no significant events');
    });
  });

  describe('SIGNIFICANT_EVENT_TYPES', () => {
    it('contains exactly the 5 expected event types', () => {
      expect(SIGNIFICANT_EVENT_TYPES).toHaveLength(5);
      expect(SIGNIFICANT_EVENT_TYPES).toContain('PRIZE_AWARDED');
      expect(SIGNIFICANT_EVENT_TYPES).toContain('TRACK_RECORD_MILESTONE_CROSSED');
      expect(SIGNIFICANT_EVENT_TYPES).toContain('PEER_NOMINATION_RECEIVED');
      expect(SIGNIFICANT_EVENT_TYPES).toContain('CROSS_DOMAIN_COLLABORATION_DETECTED');
      expect(SIGNIFICANT_EVENT_TYPES).toContain('HIGH_SIGNIFICANCE_CONTRIBUTION');
    });
  });
});
