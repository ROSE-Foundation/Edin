import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationSseService } from './notification-sse.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

const mockUser = {
  id: 'user-1',
  githubId: 100,
  name: 'Test User',
  email: null,
  avatarUrl: null,
  role: 'CONTRIBUTOR',
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: {
    getNotifications: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    getUnreadCounts: ReturnType<typeof vi.fn>;
  };
  let notificationSseService: {
    createStream: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    notificationService = {
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      getUnreadCounts: vi.fn(),
    };

    notificationSseService = {
      createStream: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationSseService, useValue: notificationSseService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(NotificationController);
  });

  describe('GET /notifications', () => {
    it('returns paginated notifications for current user', async () => {
      const notifications = [
        {
          id: 'n-1',
          contributorId: 'user-1',
          type: 'ANNOUNCEMENT_POSTED',
          title: 'New announcement',
          description: 'Welcome!',
          entityId: 'ann-1',
          category: 'working-groups',
          read: false,
          createdAt: '2026-03-08T10:00:00.000Z',
          readAt: null,
        },
      ];

      notificationService.getNotifications.mockResolvedValue({
        items: notifications,
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.getNotifications(
        mockUser as never,
        { limit: '20' } as Record<string, unknown>,
      );

      expect(result.data).toEqual(notifications);
      expect(notificationService.getNotifications).toHaveBeenCalledWith('user-1', {
        limit: 20,
      });
    });

    it('passes category filter to service', async () => {
      notificationService.getNotifications.mockResolvedValue({
        items: [],
        pagination: { cursor: null, hasMore: false, total: 0 },
      });

      await controller.getNotifications(
        mockUser as never,
        { limit: '20', category: 'working-groups' } as Record<string, unknown>,
      );

      expect(notificationService.getNotifications).toHaveBeenCalledWith('user-1', {
        limit: 20,
        category: 'working-groups',
      });
    });

    it('throws validation error for invalid query params', async () => {
      await expect(
        controller.getNotifications(mockUser as never, { limit: '0' } as Record<string, unknown>),
      ).rejects.toThrow(DomainException);
    });

    it('throws validation error for invalid category', async () => {
      await expect(
        controller.getNotifications(
          mockUser as never,
          { category: 'invalid-category' } as Record<string, unknown>,
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const readAt = new Date().toISOString();
      notificationService.markAsRead.mockResolvedValue({
        read: true,
        readAt,
      });

      const result = await controller.markAsRead(mockUser as never, 'n-1');

      expect(result.data).toEqual({ read: true, readAt });
      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-1', 'user-1');
    });

    it('throws NOT_FOUND when notification does not exist', async () => {
      notificationService.markAsRead.mockResolvedValue(null);

      await expect(controller.markAsRead(mockUser as never, 'n-999')).rejects.toThrow(
        DomainException,
      );

      try {
        await controller.markAsRead(mockUser as never, 'n-999');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      notificationService.markAllAsRead.mockResolvedValue({ count: 5 });

      const result = await controller.markAllAsRead(
        mockUser as never,
        {} as Record<string, unknown>,
      );

      expect(result.data).toEqual({ count: 5 });
      expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-1', undefined);
    });

    it('marks all notifications as read with category filter', async () => {
      notificationService.markAllAsRead.mockResolvedValue({ count: 2 });

      const result = await controller.markAllAsRead(
        mockUser as never,
        { category: 'working-groups' } as Record<string, unknown>,
      );

      expect(result.data).toEqual({ count: 2 });
      expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-1', 'working-groups');
    });

    it('throws validation error for invalid category', async () => {
      await expect(
        controller.markAllAsRead(
          mockUser as never,
          { category: 'not-valid' } as Record<string, unknown>,
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('GET /notifications/unread-counts', () => {
    it('returns per-category unread counts', async () => {
      const counts = { 'working-groups': 3, evaluations: 1 };
      notificationService.getUnreadCounts.mockResolvedValue(counts);

      const result = await controller.getUnreadCounts(mockUser as never);

      expect(result.data).toEqual(counts);
      expect(notificationService.getUnreadCounts).toHaveBeenCalledWith('user-1');
    });

    it('returns empty counts when no unread notifications', async () => {
      notificationService.getUnreadCounts.mockResolvedValue({});

      const result = await controller.getUnreadCounts(mockUser as never);

      expect(result.data).toEqual({});
    });
  });

  describe('SSE /notifications/stream', () => {
    it('returns Observable from SSE service', () => {
      const subject = new Subject<MessageEvent>();
      notificationSseService.createStream.mockReturnValue(subject.asObservable());

      const result = controller.stream(mockUser as never);

      expect(result).toBeDefined();
      expect(notificationSseService.createStream).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Guard verification', () => {
    it('has JwtAuthGuard and AbilityGuard applied at class level', () => {
      const guards = Reflect.getMetadata('__guards__', NotificationController);
      expect(guards).toBeDefined();
      expect(guards).toContainEqual(JwtAuthGuard);
      expect(guards).toContainEqual(AbilityGuard);
    });
  });
});
