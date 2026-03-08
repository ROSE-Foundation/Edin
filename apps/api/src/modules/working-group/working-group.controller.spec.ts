import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkingGroupController } from './working-group.controller.js';
import { WorkingGroupService } from './working-group.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

const mockUser = {
  id: 'user-1',
  githubId: 100,
  name: 'Test',
  email: null,
  avatarUrl: null,
  role: 'CONTRIBUTOR',
};

const mockReq = { correlationId: 'corr-1' } as never;

const mockWorkingGroup = {
  id: 'wg-1',
  name: 'Technology',
  description: 'Tech group',
  domain: 'Technology' as const,
  accentColor: '#0D9488',
  memberCount: 5,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('WorkingGroupController', () => {
  let controller: WorkingGroupController;
  let abilityGuard: AbilityGuard;
  let jwtAuthGuard: JwtAuthGuard;
  let service: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    joinGroup: ReturnType<typeof vi.fn>;
    leaveGroup: ReturnType<typeof vi.fn>;
    getGroupContributions: ReturnType<typeof vi.fn>;
    getActiveTasksForDomain: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findById: vi.fn(),
      joinGroup: vi.fn(),
      leaveGroup: vi.fn(),
      getGroupContributions: vi.fn(),
      getActiveTasksForDomain: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [WorkingGroupController],
      providers: [
        { provide: WorkingGroupService, useValue: service },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(WorkingGroupController);
    abilityGuard = module.get(AbilityGuard);
    jwtAuthGuard = module.get(JwtAuthGuard);
  });

  describe('findAll', () => {
    it('returns all working groups in standard response envelope', async () => {
      service.findAll.mockResolvedValue([{ ...mockWorkingGroup, isMember: false }]);

      const result = await controller.findAll(mockUser, mockReq);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('wg-1');
      expect(result.data[0].name).toBe('Technology');
      expect(result.data[0].isMember).toBe(false);
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.correlationId).toBe('corr-1');
    });

    it('serializes dates as ISO strings', async () => {
      service.findAll.mockResolvedValue([{ ...mockWorkingGroup, isMember: false }]);

      const result = await controller.findAll(mockUser, mockReq);

      expect(result.data[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.data[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('passes current user id to service', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(mockUser, mockReq);

      expect(service.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findById', () => {
    it('returns working group detail with members and contributions', async () => {
      service.findById.mockResolvedValue({
        ...mockWorkingGroup,
        isMember: true,
        members: [
          {
            id: 'member-1',
            workingGroupId: 'wg-1',
            contributorId: 'user-1',
            joinedAt: new Date('2026-01-15'),
            contributor: {
              id: 'user-1',
              name: 'Test',
              avatarUrl: null,
              domain: 'Technology',
              role: 'CONTRIBUTOR',
            },
          },
        ],
      });
      service.getGroupContributions.mockResolvedValue([]);
      service.getActiveTasksForDomain.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Build a REST API endpoint',
          description: 'Implement an endpoint',
          estimatedEffort: '2-4 hours',
          submissionFormat: 'GitHub repository link or gist',
        },
      ]);

      const result = await controller.findById('wg-1', mockUser, mockReq);

      expect(result.data.id).toBe('wg-1');
      expect(result.data.isMember).toBe(true);
      expect(result.data.members).toHaveLength(1);
      expect(result.data.recentContributions).toHaveLength(0);
      expect(result.data.activeTasks).toHaveLength(1);
      expect(service.getActiveTasksForDomain).toHaveBeenCalledWith('Technology');
    });

    it('propagates WORKING_GROUP_NOT_FOUND exception', async () => {
      service.findById.mockRejectedValue(
        new DomainException(
          ERROR_CODES.WORKING_GROUP_NOT_FOUND,
          'Working group not found',
          HttpStatus.NOT_FOUND,
        ),
      );

      await expect(controller.findById('nonexistent', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );
      await expect(controller.findById('nonexistent', mockUser, mockReq)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('joinGroup', () => {
    it('returns membership data on successful join', async () => {
      service.joinGroup.mockResolvedValue({
        id: 'member-1',
        workingGroupId: 'wg-1',
        contributorId: 'user-1',
        joinedAt: new Date('2026-03-06'),
      });

      const result = await controller.joinGroup('wg-1', mockUser, mockReq);

      expect(result.data.id).toBe('member-1');
      expect(result.data.workingGroupId).toBe('wg-1');
      expect(result.data.contributorId).toBe('user-1');
      expect(result.meta.correlationId).toBe('corr-1');
    });

    it('propagates ALREADY_MEMBER exception (409)', async () => {
      service.joinGroup.mockRejectedValue(
        new DomainException(ERROR_CODES.ALREADY_MEMBER, 'Already a member', HttpStatus.CONFLICT),
      );

      await expect(controller.joinGroup('wg-1', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );
      await expect(controller.joinGroup('wg-1', mockUser, mockReq)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('leaveGroup', () => {
    it('returns success message on leave', async () => {
      service.leaveGroup.mockResolvedValue(undefined);

      const result = await controller.leaveGroup('wg-1', mockUser, mockReq);

      expect(result.data.message).toBe('Successfully left the working group');
      expect(result.meta.correlationId).toBe('corr-1');
    });

    it('propagates NOT_A_MEMBER exception (404)', async () => {
      service.leaveGroup.mockRejectedValue(
        new DomainException(ERROR_CODES.NOT_A_MEMBER, 'Not a member', HttpStatus.NOT_FOUND),
      );

      await expect(controller.leaveGroup('wg-1', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );
      await expect(controller.leaveGroup('wg-1', mockUser, mockReq)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('authorization', () => {
    it('rejects contributor access through AbilityGuard when delete permission is absent', () => {
      const request = {
        user: {
          id: 'user-1',
          githubId: 100,
          name: 'Test',
          email: null,
          avatarUrl: null,
          role: 'PUBLIC',
        },
        correlationId: 'corr-authz',
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => WorkingGroupController.prototype.leaveGroup,
      } as unknown as ExecutionContext;

      let caughtError: DomainException | undefined;

      try {
        abilityGuard.canActivate(context);
      } catch (error) {
        caughtError = error as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError?.getStatus()).toBe(403);
    });

    it('rejects missing auth through JwtAuthGuard with 401', () => {
      let caughtError: DomainException | undefined;

      try {
        jwtAuthGuard.handleRequest(null, null, undefined);
      } catch (error) {
        caughtError = error as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError?.getStatus()).toBe(401);
    });
  });
});
