import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
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

const mockTask = {
  id: 'task-1',
  title: 'Build API endpoint',
  description: 'Implement a REST API endpoint',
  domain: 'Technology',
  difficulty: 'INTERMEDIATE',
  estimatedEffort: '2-4 hours',
  status: 'AVAILABLE',
  sortOrder: 0,
  claimedById: null,
  claimedAt: null,
  completedAt: null,
  createdById: 'creator-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('TaskController', () => {
  let controller: TaskController;
  let abilityGuard: AbilityGuard;
  let jwtAuthGuard: JwtAuthGuard;
  let service: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findMyTasks: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    claimTask: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    retireTask: ReturnType<typeof vi.fn>;
    reorderTasks: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findMyTasks: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      claimTask: vi.fn(),
      updateStatus: vi.fn(),
      retireTask: vi.fn(),
      reorderTasks: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: service },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(TaskController);
    abilityGuard = module.get(AbilityGuard);
    jwtAuthGuard = module.get(JwtAuthGuard);
  });

  describe('findAll', () => {
    it('returns tasks in standard response envelope with pagination', async () => {
      service.findAll.mockResolvedValue({
        items: [mockTask],
        total: 1,
        cursor: null,
        hasMore: false,
      });

      const result = await controller.findAll({}, mockReq);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('task-1');
      expect(result.meta.correlationId).toBe('corr-1');
      expect(result.meta.pagination).toEqual({
        cursor: null,
        hasMore: false,
        total: 1,
      });
    });

    it('serializes dates as ISO strings', async () => {
      service.findAll.mockResolvedValue({
        items: [mockTask],
        total: 1,
        cursor: null,
        hasMore: false,
      });

      const result = await controller.findAll({}, mockReq);

      expect(result.data[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.data[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('throws validation error for invalid query params', async () => {
      await expect(controller.findAll({ limit: 'abc' }, mockReq)).rejects.toThrow(DomainException);
    });
  });

  describe('findMyTasks', () => {
    it('returns current user tasks with pagination', async () => {
      service.findMyTasks.mockResolvedValue({
        items: [{ ...mockTask, status: 'CLAIMED', claimedById: 'user-1' }],
        total: 1,
        cursor: null,
        hasMore: false,
      });

      const result = await controller.findMyTasks(mockUser, {}, mockReq);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('CLAIMED');
      expect(service.findMyTasks).toHaveBeenCalledWith('user-1', expect.any(Object));
    });
  });

  describe('findById', () => {
    it('returns task detail in response envelope', async () => {
      service.findById.mockResolvedValue(mockTask);

      const result = await controller.findById('task-1', mockReq);

      expect(result.data.id).toBe('task-1');
      expect(result.meta.correlationId).toBe('corr-1');
    });

    it('propagates TASK_NOT_FOUND exception (404)', async () => {
      service.findById.mockRejectedValue(
        new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.findById('nonexistent', mockReq)).rejects.toThrow(DomainException);
      await expect(controller.findById('nonexistent', mockReq)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('create', () => {
    it('creates task and returns in response envelope', async () => {
      const createBody = {
        title: 'New Task',
        description: 'Description',
        domain: 'Technology',
        difficulty: 'BEGINNER',
        estimatedEffort: '1 hour',
      };
      service.create.mockResolvedValue({ ...mockTask, ...createBody });

      const result = await controller.create(createBody, mockUser, mockReq);

      expect(result.data.title).toBe('New Task');
      expect(service.create).toHaveBeenCalledWith(createBody, 'user-1', 'corr-1');
    });

    it('throws validation error for missing required fields', async () => {
      await expect(controller.create({}, mockUser, mockReq)).rejects.toThrow(DomainException);
    });

    it('throws validation error for empty title', async () => {
      await expect(
        controller.create(
          {
            title: '',
            description: 'Desc',
            domain: 'Technology',
            difficulty: 'BEGINNER',
            estimatedEffort: '1h',
          },
          mockUser,
          mockReq,
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('update', () => {
    it('updates task and returns in response envelope', async () => {
      service.update.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const result = await controller.update('task-1', { title: 'Updated' }, mockReq);

      expect(result.data.title).toBe('Updated');
    });

    it('propagates TASK_NOT_FOUND exception', async () => {
      service.update.mockRejectedValue(
        new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.update('nonexistent', { title: 'X' }, mockReq)).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('claimTask', () => {
    it('claims task and returns in response envelope', async () => {
      service.claimTask.mockResolvedValue({
        ...mockTask,
        status: 'CLAIMED',
        claimedById: 'user-1',
        claimedAt: new Date(),
      });

      const result = await controller.claimTask('task-1', mockUser, mockReq);

      expect(result.data.status).toBe('CLAIMED');
      expect(service.claimTask).toHaveBeenCalledWith('task-1', 'user-1', 'corr-1');
    });

    it('propagates TASK_ALREADY_CLAIMED (409)', async () => {
      service.claimTask.mockRejectedValue(
        new DomainException(
          ERROR_CODES.TASK_ALREADY_CLAIMED,
          'Already claimed',
          HttpStatus.CONFLICT,
        ),
      );

      await expect(controller.claimTask('task-1', mockUser, mockReq)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('propagates TASK_NOT_CLAIMABLE (422)', async () => {
      service.claimTask.mockRejectedValue(
        new DomainException(
          ERROR_CODES.TASK_NOT_CLAIMABLE,
          'Not claimable',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );

      await expect(controller.claimTask('task-1', mockUser, mockReq)).rejects.toMatchObject({
        status: 422,
      });
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns in response envelope', async () => {
      service.updateStatus.mockResolvedValue({ ...mockTask, status: 'CLAIMED' });

      const result = await controller.updateStatus(
        'task-1',
        { status: 'CLAIMED' },
        mockUser,
        mockReq,
      );

      expect(result.data.status).toBe('CLAIMED');
      expect(service.updateStatus).toHaveBeenCalledWith('task-1', 'CLAIMED', mockUser, 'corr-1');
    });

    it('propagates INVALID_TASK_TRANSITION (422)', async () => {
      service.updateStatus.mockRejectedValue(
        new DomainException(
          ERROR_CODES.INVALID_TASK_TRANSITION,
          'Invalid transition',
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );

      await expect(
        controller.updateStatus('task-1', { status: 'COMPLETED' }, mockUser, mockReq),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('throws validation error for invalid status value', async () => {
      await expect(
        controller.updateStatus('task-1', { status: 'INVALID' }, mockUser, mockReq),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('retireTask', () => {
    it('retires task and returns in response envelope', async () => {
      service.retireTask.mockResolvedValue({ ...mockTask, status: 'RETIRED' });

      const result = await controller.retireTask('task-1', mockReq);

      expect(result.data.status).toBe('RETIRED');
    });

    it('propagates TASK_NOT_FOUND (404)', async () => {
      service.retireTask.mockRejectedValue(
        new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.retireTask('nonexistent', mockReq)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('reorderTasks', () => {
    const validTaskId = '00000000-0000-0000-0000-000000000001';

    it('reorders tasks and returns success message', async () => {
      service.reorderTasks.mockResolvedValue(undefined);

      const result = await controller.reorderTasks(
        { domain: 'Technology', tasks: [{ taskId: validTaskId, sortOrder: 1 }] },
        mockUser,
        mockReq,
      );

      expect(result.data.message).toBe('Tasks reordered successfully');
      expect(service.reorderTasks).toHaveBeenCalledWith(
        'Technology',
        [{ taskId: validTaskId, sortOrder: 1 }],
        mockUser,
        'corr-1',
      );
    });

    it('throws validation error for invalid reorder data', async () => {
      await expect(
        controller.reorderTasks({ domain: 'Technology', tasks: [] }, mockUser, mockReq),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('authorization', () => {
    it('rejects PUBLIC role through AbilityGuard for task listing', () => {
      const request = {
        user: { ...mockUser, role: 'PUBLIC' },
        correlationId: 'corr-authz',
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => TaskController.prototype.findAll,
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
