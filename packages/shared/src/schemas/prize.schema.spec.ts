import { describe, it, expect } from 'vitest';
import {
  createChannelSchema,
  updateChannelSchema,
  createPrizeCategorySchema,
  updatePrizeCategorySchema,
  prizeAwardSchema,
} from './prize.schema.js';

describe('prize schemas', () => {
  describe('createChannelSchema', () => {
    it('accepts valid channel data', () => {
      const result = createChannelSchema.safeParse({
        name: 'Technology',
        description: 'Technology domain channel',
        type: 'DOMAIN',
      });
      expect(result.success).toBe(true);
    });

    it('accepts all channel types', () => {
      for (const type of ['DOMAIN', 'WORKING_GROUP', 'CROSS_DOMAIN', 'CUSTOM']) {
        const result = createChannelSchema.safeParse({
          name: `Channel ${type}`,
          description: 'Test',
          type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects empty name', () => {
      const result = createChannelSchema.safeParse({
        name: '',
        description: 'Test',
        type: 'DOMAIN',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
      const result = createChannelSchema.safeParse({
        name: 'Test',
        description: 'Test',
        type: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional parentChannelId and metadata', () => {
      const result = createChannelSchema.safeParse({
        name: 'Sub-channel',
        description: 'A child channel',
        type: 'CUSTOM',
        parentChannelId: '550e8400-e29b-41d4-a716-446655440000',
        metadata: { key: 'value' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateChannelSchema', () => {
    it('accepts partial updates', () => {
      const result = updateChannelSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('rejects empty update', () => {
      const result = updateChannelSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('createPrizeCategorySchema', () => {
    it('accepts valid AUTOMATED category with discrete threshold', () => {
      const result = createPrizeCategorySchema.safeParse({
        name: 'Cross-Domain Collaboration',
        description: 'Test prize category',
        detectionType: 'AUTOMATED',
        thresholdConfig: {
          cross_domain: { operator: 'discrete_step', min_domains: 2 },
        },
        scalingConfig: {
          temporal_decay: { enabled: true, half_life_days: 180 },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts COMMUNITY_NOMINATED detection type', () => {
      const result = createPrizeCategorySchema.safeParse({
        name: 'Community Recognition',
        description: 'Peer nominated',
        detectionType: 'COMMUNITY_NOMINATED',
        thresholdConfig: {
          community: { operator: 'gte', min_votes: 5 },
        },
        scalingConfig: {},
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty threshold_config', () => {
      const result = createPrizeCategorySchema.safeParse({
        name: 'Bad Category',
        description: 'Missing config',
        detectionType: 'AUTOMATED',
        thresholdConfig: {},
        scalingConfig: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects threshold rule without operator field', () => {
      const result = createPrizeCategorySchema.safeParse({
        name: 'Bad Category',
        description: 'Invalid config',
        detectionType: 'AUTOMATED',
        thresholdConfig: {
          rule: { min_domains: 2 },
        },
        scalingConfig: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePrizeCategorySchema', () => {
    it('accepts partial updates', () => {
      const result = updatePrizeCategorySchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('rejects empty update', () => {
      const result = updatePrizeCategorySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('prizeAwardSchema', () => {
    it('accepts valid award data', () => {
      const result = prizeAwardSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        prizeCategoryId: '550e8400-e29b-41d4-a716-446655440001',
        recipientContributorId: '550e8400-e29b-41d4-a716-446655440002',
        contributionId: '550e8400-e29b-41d4-a716-446655440003',
        significanceLevel: 2,
        channelId: '550e8400-e29b-41d4-a716-446655440004',
        chathamHouseLabel: 'a technology specialist',
        narrative: 'Outstanding contribution bridging two domains',
        awardedAt: '2026-03-25T12:00:00.000Z',
        metadata: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects significance level outside 1-3 range', () => {
      const result = prizeAwardSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        prizeCategoryId: '550e8400-e29b-41d4-a716-446655440001',
        recipientContributorId: '550e8400-e29b-41d4-a716-446655440002',
        contributionId: null,
        significanceLevel: 5,
        channelId: '550e8400-e29b-41d4-a716-446655440004',
        chathamHouseLabel: 'a specialist',
        narrative: 'Test',
        awardedAt: '2026-03-25T12:00:00.000Z',
        metadata: null,
      });
      expect(result.success).toBe(false);
    });

    it('accepts null contributionId for community-nominated awards', () => {
      const result = prizeAwardSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        prizeCategoryId: '550e8400-e29b-41d4-a716-446655440001',
        recipientContributorId: '550e8400-e29b-41d4-a716-446655440002',
        contributionId: null,
        significanceLevel: 1,
        channelId: '550e8400-e29b-41d4-a716-446655440004',
        chathamHouseLabel: 'a governance expert',
        narrative: 'Recognized by peers',
        awardedAt: '2026-03-25T12:00:00.000Z',
        metadata: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
