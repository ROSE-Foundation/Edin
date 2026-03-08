import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TaskStatus } from '@edin/shared';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import type { ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import type { ReorderTasksDto } from './dto/reorder-tasks.dto.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['CLAIMED'],
  CLAIMED: ['IN_PROGRESS', 'AVAILABLE'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['EVALUATED'],
  EVALUATED: [],
};

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private isPrivilegedRole(role: CurrentUserPayload['role']) {
    return role === 'ADMIN' || role === 'WORKING_GROUP_LEAD';
  }

  async findAll(filters: ListTasksQueryDto) {
    const { cursor, limit, domain, difficulty, status } = filters;

    this.logger.log('Listing tasks', {
      module: 'task',
      filters: { domain, difficulty, status, cursor, limit },
    });

    const where: Record<string, unknown> = {
      status: status ?? { not: 'RETIRED' as const },
    };
    if (domain) where.domain = domain;
    if (difficulty) where.difficulty = difficulty;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.task.count({ where }),
    ]);

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, total, cursor: nextCursor, hasMore };
  }

  async findById(id: string) {
    this.logger.log('Fetching task detail', { taskId: id, module: 'task' });

    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND);
    }

    return task;
  }

  async findMyTasks(contributorId: string, filters: Pick<ListTasksQueryDto, 'cursor' | 'limit'>) {
    const { cursor, limit } = filters;

    this.logger.log('Fetching contributor tasks', {
      contributorId,
      module: 'task',
    });

    const where = { claimedById: contributorId };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { claimedAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, total, cursor: nextCursor, hasMore };
  }

  async create(dto: CreateTaskDto, creatorId: string, correlationId?: string) {
    this.logger.log('Creating task', {
      title: dto.title,
      domain: dto.domain,
      creatorId,
      correlationId,
      module: 'task',
    });

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        createdById: creatorId,
      },
    });

    this.eventEmitter.emit('task.created', {
      eventType: 'task.created',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: creatorId,
      payload: {
        taskId: task.id,
        title: task.title,
        domain: task.domain,
        difficulty: task.difficulty,
      },
    });

    this.logger.log('Task created', {
      taskId: task.id,
      correlationId,
      module: 'task',
    });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, correlationId?: string) {
    this.logger.log('Updating task', { taskId: id, correlationId, module: 'task' });

    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.task.update({
      where: { id },
      data: dto,
    });
  }

  async claimTask(taskId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Claiming task', {
      taskId,
      contributorId,
      correlationId,
      module: 'task',
    });

    const task = await this.prisma.$transaction(async (tx) => {
      const claimedAt = new Date();
      const result = await tx.task.updateMany({
        where: {
          id: taskId,
          status: 'AVAILABLE',
          claimedById: null,
        },
        data: {
          status: 'CLAIMED',
          claimedById: contributorId,
          claimedAt,
          completedAt: null,
        },
      });

      if (result.count === 1) {
        const claimedTask = await tx.task.findUnique({ where: { id: taskId } });

        if (!claimedTask) {
          throw new DomainException(
            ERROR_CODES.TASK_NOT_FOUND,
            'Task not found',
            HttpStatus.NOT_FOUND,
          );
        }

        return claimedTask;
      }

      const existing = await tx.task.findUnique({ where: { id: taskId } });

      if (!existing) {
        throw new DomainException(
          ERROR_CODES.TASK_NOT_FOUND,
          'Task not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (existing.claimedById) {
        throw new DomainException(
          ERROR_CODES.TASK_ALREADY_CLAIMED,
          'Task is already claimed',
          HttpStatus.CONFLICT,
        );
      }

      throw new DomainException(
        ERROR_CODES.TASK_NOT_CLAIMABLE,
        'Task is not available for claiming',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });

    this.eventEmitter.emit('task.claimed', {
      eventType: 'task.claimed',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        taskId: task.id,
        contributorId,
        taskTitle: task.title,
      },
    });

    this.logger.log('Task claimed', {
      taskId,
      contributorId,
      correlationId,
      module: 'task',
    });

    return task;
  }

  async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    user: CurrentUserPayload,
    correlationId?: string,
  ) {
    this.logger.log('Updating task status', {
      taskId,
      newStatus,
      contributorId: user.id,
      correlationId,
      module: 'task',
    });

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      throw new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND);
    }

    if (!this.isPrivilegedRole(user.role) && task.claimedById && task.claimedById !== user.id) {
      throw new DomainException(
        ERROR_CODES.TASK_NOT_OWNED,
        'You can only update tasks you have claimed',
        HttpStatus.FORBIDDEN,
      );
    }

    const validTransitions = VALID_TRANSITIONS[task.status] ?? [];
    if (!validTransitions.includes(newStatus)) {
      throw new DomainException(
        ERROR_CODES.INVALID_TASK_TRANSITION,
        `Invalid status transition from ${task.status} to ${newStatus}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const previousStatus = task.status;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus as never,
        ...(newStatus === 'CLAIMED' && !task.claimedById
          ? { claimedById: user.id, claimedAt: new Date(), completedAt: null }
          : {}),
        ...(newStatus === 'AVAILABLE'
          ? { claimedById: null, claimedAt: null, completedAt: null }
          : {}),
        ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    this.eventEmitter.emit('task.status-changed', {
      eventType: 'task.status-changed',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: user.id,
      payload: {
        taskId,
        previousStatus,
        newStatus,
        contributorId: user.id,
      },
    });

    this.logger.log('Task status updated', {
      taskId,
      previousStatus,
      newStatus,
      correlationId,
      module: 'task',
    });

    return updated;
  }

  async retireTask(id: string, correlationId?: string) {
    this.logger.log('Retiring task', { taskId: id, correlationId, module: 'task' });

    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new DomainException(ERROR_CODES.TASK_NOT_FOUND, 'Task not found', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'RETIRED' },
    });

    this.eventEmitter.emit('task.retired', {
      eventType: 'task.retired',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: task.createdById,
      payload: {
        taskId: task.id,
        title: task.title,
      },
    });

    this.logger.log('Task retired', {
      taskId: id,
      correlationId,
      module: 'task',
    });

    return updated;
  }

  async reorderTasks(
    domain: CreateTaskDto['domain'],
    taskOrders: ReorderTasksDto['tasks'],
    user: CurrentUserPayload,
    correlationId?: string,
  ) {
    this.logger.log('Reordering tasks', {
      domain,
      taskCount: taskOrders.length,
      correlationId,
      module: 'task',
    });

    if (user.role === 'WORKING_GROUP_LEAD') {
      const managedGroup = await this.prisma.workingGroup.findFirst({
        where: {
          domain,
          leadContributorId: user.id,
        },
        select: { id: true },
      });

      if (!managedGroup) {
        throw new DomainException(
          ERROR_CODES.FORBIDDEN,
          'You can only reorder tasks for your assigned working group domain',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { taskId, sortOrder } of taskOrders) {
        const task = await tx.task.findUnique({ where: { id: taskId } });

        if (!task) {
          throw new DomainException(
            ERROR_CODES.TASK_NOT_FOUND,
            `Task ${taskId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }

        if (task.domain !== domain) {
          throw new DomainException(
            ERROR_CODES.FORBIDDEN,
            'You can only reorder tasks within the selected domain',
            HttpStatus.FORBIDDEN,
          );
        }

        await tx.task.update({
          where: { id: taskId },
          data: { sortOrder },
        });
      }
    });

    this.eventEmitter.emit('task.reordered', {
      eventType: 'task.reordered',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: user.id,
      payload: {
        domain,
        tasks: taskOrders,
      },
    });

    this.logger.log('Tasks reordered', {
      domain,
      correlationId,
      module: 'task',
    });
  }
}
