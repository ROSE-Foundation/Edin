import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { FeedbackAdminController } from './feedback-admin.controller.js';
import { FeedbackService } from './feedback.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';

const mockFeedbackService = {
  adminAssignReviewer: vi.fn(),
  getFeedbackMetrics: vi.fn(),
  getOverdueReviews: vi.fn(),
  reassignFeedback: vi.fn(),
  getEligibleReviewers: vi.fn(),
};

const mockSettingsService = {
  getSetting: vi.fn(),
  getSettingValue: vi.fn(),
  updateSetting: vi.fn(),
};

describe('FeedbackAdminController', () => {
  let controller: FeedbackAdminController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [FeedbackAdminController],
      providers: [
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: SettingsService, useValue: mockSettingsService },
        CaslAbilityFactory,
      ],
    }).compile();

    controller = module.get(FeedbackAdminController);
  });

  describe('POST /admin/feedback/assign', () => {
    it('creates assignment (admin only)', async () => {
      mockFeedbackService.adminAssignReviewer.mockResolvedValue({
        peerFeedbackId: 'pf-1',
        reviewerId: 'reviewer-1',
      });

      const user = {
        id: 'admin-1',
        githubId: 1,
        name: 'Admin',
        email: 'admin@test.com',
        avatarUrl: null,
        role: 'ADMIN',
      };
      const body = {
        contributionId: '550e8400-e29b-41d4-a716-446655440000',
        reviewerId: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = await controller.adminAssign(user, body);

      expect(result.data).toEqual({
        peerFeedbackId: 'pf-1',
        reviewerId: 'reviewer-1',
      });
      expect(mockFeedbackService.adminAssignReviewer).toHaveBeenCalledWith(
        body.contributionId,
        body.reviewerId,
        'admin-1',
        expect.any(String),
      );
    });
  });

  const adminUser = {
    id: 'admin-1',
    githubId: 1,
    name: 'Admin',
    email: 'admin@test.com',
    avatarUrl: null,
    role: 'ADMIN',
  };

  describe('GET /admin/feedback/metrics', () => {
    it('returns metrics with SLA from settings', async () => {
      mockSettingsService.getSettingValue.mockResolvedValue(48);
      mockFeedbackService.getFeedbackMetrics.mockResolvedValue({
        pendingCount: 5,
        avgTurnaroundHours: 24.5,
        completionRate: 85.0,
        overdueCount: 2,
        rubricCoverageRate: 90.0,
        totalAssigned: 20,
        totalCompleted: 17,
      });

      const result = await controller.getMetrics();
      expect(result.data).toEqual({
        metrics: expect.objectContaining({ pendingCount: 5 }),
        slaHours: 48,
      });
      expect(mockSettingsService.getSettingValue).toHaveBeenCalledWith('feedback.sla.hours', 48);
    });
  });

  describe('GET /admin/feedback/overdue', () => {
    it('returns paginated overdue reviews', async () => {
      mockSettingsService.getSettingValue.mockResolvedValue(48);
      mockFeedbackService.getOverdueReviews.mockResolvedValue({
        items: [],
        pagination: { cursor: null, hasMore: false, total: 0 },
      });

      const result = await controller.getOverdueReviews({});
      expect(result.data).toEqual([]);
    });
  });

  describe('POST /admin/feedback/:id/reassign', () => {
    it('validates body and calls service', async () => {
      mockFeedbackService.reassignFeedback.mockResolvedValue({
        oldFeedbackId: 'fb-1',
        newPeerFeedbackId: 'fb-2',
        newReviewerId: '550e8400-e29b-41d4-a716-446655440002',
      });

      const result = await controller.reassignFeedback(adminUser, 'fb-1', {
        newReviewerId: '550e8400-e29b-41d4-a716-446655440002',
        reason: 'Reviewer is on vacation and cannot complete the review',
      });

      expect(result.data.newPeerFeedbackId).toBe('fb-2');
      expect(mockFeedbackService.reassignFeedback).toHaveBeenCalled();
    });

    it('rejects invalid body', async () => {
      await expect(
        controller.reassignFeedback(adminUser, 'fb-1', { reason: 'short' }),
      ).rejects.toThrow();
    });
  });

  describe('GET /admin/feedback/settings/sla', () => {
    it('returns current SLA', async () => {
      mockSettingsService.getSettingValue.mockResolvedValue(72);

      const result = await controller.getSla();
      expect(result.data.hours).toBe(72);
    });
  });

  describe('PUT /admin/feedback/settings/sla', () => {
    it('updates SLA and returns new value', async () => {
      mockSettingsService.getSettingValue.mockResolvedValue(48);
      mockSettingsService.updateSetting.mockResolvedValue({});

      const result = await controller.updateSla(adminUser, { hours: 72 });
      expect(result.data.hours).toBe(72);
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'feedback.sla.hours',
        72,
        'admin-1',
        expect.any(String),
      );
    });
  });

  describe('GET /admin/feedback/:id/eligible-reviewers', () => {
    it('returns candidates', async () => {
      mockFeedbackService.getEligibleReviewers.mockResolvedValue([
        { id: 'c-1', name: 'Alice', avatarUrl: null, domain: 'Technology', pendingReviewCount: 1 },
      ]);

      const result = await controller.getEligibleReviewers('fb-1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });
  });

  describe('guard verification', () => {
    it('controller class uses JwtAuthGuard and AbilityGuard decorators', () => {
      const guards = Reflect.getMetadata('__guards__', FeedbackAdminController);
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
    });
  });
});
