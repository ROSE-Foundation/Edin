import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskService } from './task.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockClaimedTask = {
  ...mockTask,
  id: 'task-2',
  status: 'CLAIMED',
  claimedById: 'contributor-1',
  claimedAt: new Date(),
};

const mockContributorUser = {
  id: 'contributor-1',
  githubId: 100,
  name: 'Contributor',
  email: null,
  avatarUrl: null,
  role: 'CONTRIBUTOR' as const,
};

const mockAdminUser = {
  ...mockContributorUser,
  id: 'admin-1',
  role: 'ADMIN' as const,
};

describe('TaskService', () => {
  let service: TaskService;
  let prisma: {
    task: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    workingGroup: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      workingGroup: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(TaskService);
  });

  describe('findAll', () => {
    it('returns tasks with pagination', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('filters by domain', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, domain: 'Fintech' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ domain: 'Fintech' }),
        }),
      );
    });

    it('filters by difficulty', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, difficulty: 'BEGINNER' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ difficulty: 'BEGINNER' }),
        }),
      );
    });

    it('filters by status', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, status: 'CLAIMED' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CLAIMED' }),
        }),
      );
    });

    it('excludes RETIRED by default when no status filter', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'RETIRED' } }),
        }),
      );
    });

    it('handles cursor-based pagination', async () => {
      const tasks = Array.from({ length: 21 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
      }));
      prisma.task.findMany.mockResolvedValue(tasks);
      prisma.task.count.mockResolvedValue(25);

      const result = await service.findAll({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('task-19');
    });

    it('uses cursor when provided', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20, cursor: 'task-5' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'task-5' },
        }),
      );
    });

    it('returns empty results', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      const result = await service.findAll({ limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('handles combined filters', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({
        limit: 20,
        domain: 'Technology',
        difficulty: 'ADVANCED',
        status: 'AVAILABLE',
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            domain: 'Technology',
            difficulty: 'ADVANCED',
            status: 'AVAILABLE',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns task when found', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findById('task-1');

      expect(result).toEqual(mockTask);
    });

    it('throws TASK_NOT_FOUND when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('findMyTasks', () => {
    it('returns tasks claimed by the contributor', async () => {
      prisma.task.findMany.mockResolvedValue([mockClaimedTask]);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.findMyTasks('contributor-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { claimedById: 'contributor-1' },
        }),
      );
    });
  });

  describe('create', () => {
    it('creates task and emits event', async () => {
      const createDto = {
        title: 'New Task',
        description: 'Task description',
        domain: 'Technology' as const,
        difficulty: 'BEGINNER' as const,
        estimatedEffort: '1-2 hours',
      };
      prisma.task.create.mockResolvedValue({ ...mockTask, ...createDto });

      const result = await service.create(createDto, 'creator-1', 'corr-1');

      expect(result.title).toBe('New Task');
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: { ...createDto, createdById: 'creator-1' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({
          eventType: 'task.created',
          actorId: 'creator-1',
          payload: expect.objectContaining({ title: 'New Task' }),
        }),
      );
    });
  });

  describe('claimTask', () => {
    it('claims an available task atomically', async () => {
      prisma.task.updateMany.mockResolvedValue({ count: 1 });
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: 'CLAIMED',
        claimedById: 'contributor-1',
        claimedAt: new Date(),
      });

      const result = await service.claimTask('task-1', 'contributor-1', 'corr-1');

      expect(result.status).toBe('CLAIMED');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'task-1', status: 'AVAILABLE', claimedById: null }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.claimed',
        expect.objectContaining({
          eventType: 'task.claimed',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            taskId: 'task-1',
            contributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('throws TASK_ALREADY_CLAIMED (409) when task is already claimed', async () => {
      prisma.task.updateMany.mockResolvedValue({ count: 0 });
      prisma.task.findUnique.mockResolvedValue(mockClaimedTask);

      await expect(service.claimTask('task-2', 'contributor-2', 'corr-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.claimTask('task-2', 'contributor-2', 'corr-1')).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws TASK_NOT_CLAIMABLE (422) when task is not AVAILABLE', async () => {
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS', claimedById: null };
      prisma.task.updateMany.mockResolvedValue({ count: 0 });
      prisma.task.findUnique.mockResolvedValue(inProgressTask);

      await expect(service.claimTask('task-1', 'contributor-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.claimTask('task-1', 'contributor-1', 'corr-1')).rejects.toMatchObject({
        status: 422,
      });
    });

    it('throws TASK_NOT_FOUND when task does not exist', async () => {
      prisma.task.updateMany.mockResolvedValue({ count: 0 });
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.claimTask('nonexistent', 'contributor-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.claimTask('nonexistent', 'contributor-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('updateStatus', () => {
    it('transitions AVAILABLE to CLAIMED', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({ ...mockTask, status: 'CLAIMED' });

      const result = await service.updateStatus('task-1', 'CLAIMED', mockContributorUser, 'corr-1');

      expect(result.status).toBe('CLAIMED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.status-changed',
        expect.objectContaining({
          eventType: 'task.status-changed',
          payload: expect.objectContaining({
            previousStatus: 'AVAILABLE',
            newStatus: 'CLAIMED',
          }),
        }),
      );
    });

    it('transitions CLAIMED to IN_PROGRESS', async () => {
      prisma.task.findUnique.mockResolvedValue(mockClaimedTask);
      prisma.task.update.mockResolvedValue({ ...mockClaimedTask, status: 'IN_PROGRESS' });

      const result = await service.updateStatus(
        'task-2',
        'IN_PROGRESS',
        mockContributorUser,
        'corr-1',
      );

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('transitions CLAIMED back to AVAILABLE (unclaim)', async () => {
      prisma.task.findUnique.mockResolvedValue(mockClaimedTask);
      prisma.task.update.mockResolvedValue({ ...mockClaimedTask, status: 'AVAILABLE' });

      const result = await service.updateStatus(
        'task-2',
        'AVAILABLE',
        mockContributorUser,
        'corr-1',
      );

      expect(result.status).toBe('AVAILABLE');
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ claimedById: null, claimedAt: null, completedAt: null }),
        }),
      );
    });

    it('transitions IN_PROGRESS to COMPLETED and sets completedAt', async () => {
      const inProgressTask = { ...mockClaimedTask, status: 'IN_PROGRESS' };
      prisma.task.findUnique.mockResolvedValue(inProgressTask);
      prisma.task.update.mockResolvedValue({
        ...inProgressTask,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await service.updateStatus('task-2', 'COMPLETED', mockContributorUser, 'corr-1');

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: expect.any(Date) }),
        }),
      );
    });

    it('transitions COMPLETED to EVALUATED', async () => {
      const completedTask = {
        ...mockTask,
        status: 'COMPLETED',
        claimedById: 'contributor-1',
        claimedAt: new Date(),
      };
      prisma.task.findUnique.mockResolvedValue(completedTask);
      prisma.task.update.mockResolvedValue({ ...completedTask, status: 'EVALUATED' });

      const result = await service.updateStatus('task-1', 'EVALUATED', mockContributorUser);

      expect(result.status).toBe('EVALUATED');
    });

    it('throws INVALID_TASK_TRANSITION (422) for invalid transition AVAILABLE → IN_PROGRESS', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateStatus('task-1', 'IN_PROGRESS', mockContributorUser),
      ).rejects.toThrow(DomainException);
      await expect(
        service.updateStatus('task-1', 'IN_PROGRESS', mockContributorUser),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('throws INVALID_TASK_TRANSITION (422) for invalid transition AVAILABLE → COMPLETED', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateStatus('task-1', 'COMPLETED', mockContributorUser),
      ).rejects.toThrow(DomainException);
    });

    it('throws INVALID_TASK_TRANSITION (422) for EVALUATED → anything', async () => {
      const evaluatedTask = { ...mockTask, status: 'EVALUATED' };
      prisma.task.findUnique.mockResolvedValue(evaluatedTask);

      await expect(
        service.updateStatus('task-1', 'AVAILABLE', mockContributorUser),
      ).rejects.toThrow(DomainException);
    });

    it('throws TASK_NOT_OWNED when another contributor updates the task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockClaimedTask);

      await expect(
        service.updateStatus('task-2', 'IN_PROGRESS', {
          ...mockContributorUser,
          id: 'different-contributor',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('allows admins to update tasks they do not own', async () => {
      prisma.task.findUnique.mockResolvedValue(mockClaimedTask);
      prisma.task.update.mockResolvedValue({ ...mockClaimedTask, status: 'IN_PROGRESS' });

      const result = await service.updateStatus('task-2', 'IN_PROGRESS', mockAdminUser);

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws TASK_NOT_FOUND when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'CLAIMED', mockContributorUser),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('update', () => {
    it('updates task details', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated Title' });

      const result = await service.update('task-1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('throws TASK_NOT_FOUND when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'New' })).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('retireTask', () => {
    it('retires task and emits event', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({ ...mockTask, status: 'RETIRED' });

      const result = await service.retireTask('task-1', 'corr-1');

      expect(result.status).toBe('RETIRED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.retired',
        expect.objectContaining({
          eventType: 'task.retired',
          payload: expect.objectContaining({ taskId: 'task-1' }),
        }),
      );
    });

    it('throws TASK_NOT_FOUND when task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.retireTask('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.retireTask('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('reorderTasks', () => {
    it('reorders tasks in a transaction and emits event', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({ ...mockTask, sortOrder: 1 });

      await service.reorderTasks(
        'Technology',
        [
          { taskId: 'task-1', sortOrder: 1 },
          { taskId: 'task-2', sortOrder: 2 },
        ],
        mockAdminUser,
        'corr-1',
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.reordered',
        expect.objectContaining({
          eventType: 'task.reordered',
          actorId: 'admin-1',
          payload: expect.objectContaining({
            domain: 'Technology',
            tasks: expect.arrayContaining([
              expect.objectContaining({ taskId: 'task-1', sortOrder: 1 }),
            ]),
          }),
        }),
      );
    });

    it('throws TASK_NOT_FOUND when a task in the list does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderTasks(
          'Technology',
          [{ taskId: 'nonexistent', sortOrder: 1 }],
          mockAdminUser,
        ),
      ).rejects.toThrow(DomainException);
      await expect(
        service.reorderTasks(
          'Technology',
          [{ taskId: 'nonexistent', sortOrder: 1 }],
          mockAdminUser,
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('throws FORBIDDEN when a WG lead reorders another domain', async () => {
      prisma.workingGroup.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderTasks('Fintech', [{ taskId: 'task-1', sortOrder: 1 }], {
          ...mockContributorUser,
          role: 'WORKING_GROUP_LEAD',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('throws FORBIDDEN when any task falls outside the selected domain', async () => {
      prisma.workingGroup.findFirst.mockResolvedValue({ id: 'wg-1' });
      prisma.task.findUnique.mockResolvedValue({ ...mockTask, domain: 'Impact' });

      await expect(
        service.reorderTasks('Technology', [{ taskId: 'task-1', sortOrder: 1 }], {
          ...mockContributorUser,
          role: 'WORKING_GROUP_LEAD',
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('findAll with sortOrder', () => {
    it('sorts by sortOrder ASC then createdAt DESC', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll({ limit: 20 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        }),
      );
    });
  });
});
