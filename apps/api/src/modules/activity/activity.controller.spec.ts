import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { Observable } from 'rxjs';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { ActivitySseService } from './activity-sse.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';

const mockActivityService = {
  getFeed: vi.fn(),
  getPublicFeed: vi.fn(),
};

const mockActivitySseService = {
  createStream: vi.fn(),
};

const mockCaslAbilityFactory = {
  createForUser: vi.fn().mockReturnValue({
    can: vi.fn().mockReturnValue(true),
  }),
};

describe('ActivityController', () => {
  let controller: ActivityController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        { provide: ActivityService, useValue: mockActivityService },
        { provide: ActivitySseService, useValue: mockActivitySseService },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
      ],
    }).compile();

    controller = module.get(ActivityController);
  });

  describe('GET /activity', () => {
    it('returns paginated activity feed with standard envelope', async () => {
      const feedResult = {
        items: [
          {
            id: 'event-1',
            eventType: 'CONTRIBUTION_NEW',
            title: 'New Commit: Fix auth',
            description: null,
            contributorId: 'contrib-1',
            contributorName: 'Alice',
            contributorAvatarUrl: null,
            domain: 'Technology',
            contributionType: 'COMMIT',
            entityId: 'entity-1',
            metadata: null,
            createdAt: '2026-03-08T10:00:00.000Z',
          },
        ],
        pagination: {
          cursor: null,
          hasMore: false,
          total: 1,
        },
      };

      mockActivityService.getFeed.mockResolvedValue(feedResult);

      const result = await controller.getFeed({ limit: '20' });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('correlationId');
      expect(result.meta).toHaveProperty('pagination');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].eventType).toBe('CONTRIBUTION_NEW');
    });

    it('passes query parameters to service', async () => {
      mockActivityService.getFeed.mockResolvedValue({
        items: [],
        pagination: { cursor: null, hasMore: false, total: 0 },
      });

      await controller.getFeed({ limit: '10', domain: 'Fintech' });

      expect(mockActivityService.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          domain: 'Fintech',
        }),
      );
    });

    it('rejects invalid query parameters with 400', async () => {
      await expect(controller.getFeed({ limit: 'not-a-number' })).rejects.toThrow();
    });
  });

  describe('SSE stream', () => {
    it('returns Observable from SSE service', () => {
      const mockObservable = new Observable();
      mockActivitySseService.createStream.mockReturnValue(mockObservable);

      const result = controller.stream();

      expect(result).toBeInstanceOf(Observable);
      expect(mockActivitySseService.createStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /activity/public', () => {
    it('returns public feed without authentication', async () => {
      const publicResult = {
        items: [
          {
            id: 'event-1',
            eventType: 'CONTRIBUTION_NEW',
            title: 'New Commit: Fix auth',
            description: null,
            contributorName: 'Alice',
            contributorAvatarUrl: null,
            domain: 'Technology',
            contributionType: 'COMMIT',
            entityId: 'entity-1',
            createdAt: '2026-03-08T10:00:00.000Z',
          },
        ],
        pagination: { cursor: null, hasMore: false, total: 1 },
      };

      mockActivityService.getPublicFeed.mockResolvedValue(publicResult);

      const result = await controller.getPublicFeed({ limit: '20' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('contributorId');
    });
  });
});
