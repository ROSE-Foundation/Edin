import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { TaskService } from './task.service.js';
import { createTaskSchema } from './dto/create-task.dto.js';
import { updateTaskSchema, updateTaskStatusSchema } from './dto/update-task.dto.js';
import { listTasksQuerySchema } from './dto/list-tasks-query.dto.js';
import { reorderTasksSchema } from './dto/reorder-tasks.dto.js';

function formatTask(task: {
  id: string;
  title: string;
  description: string;
  domain: string;
  difficulty: string;
  estimatedEffort: string;
  status: string;
  sortOrder: number;
  claimedById: string | null;
  claimedAt: Date | null;
  completedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    domain: task.domain,
    difficulty: task.difficulty,
    estimatedEffort: task.estimatedEffort,
    status: task.status,
    sortOrder: task.sortOrder,
    claimedById: task.claimedById,
    claimedAt: task.claimedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdById: task.createdById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

@Controller({ path: 'tasks', version: '1' })
export class TaskController {
  private readonly logger = new Logger(TaskController.name);

  constructor(private readonly taskService: TaskService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Task'))
  async findAll(@Query() query: unknown, @Req() req: Request) {
    const parsed = listTasksQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.taskService.findAll(parsed.data);

    return createSuccessResponse(result.items.map(formatTask), req.correlationId || 'unknown', {
      cursor: result.cursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Task'))
  async findMyTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: unknown,
    @Req() req: Request,
  ) {
    const parsed = listTasksQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.taskService.findMyTasks(user.id, {
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(result.items.map(formatTask), req.correlationId || 'unknown', {
      cursor: result.cursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'Task'))
  async reorderTasks(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = reorderTasksSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid reorder data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Reordering tasks', {
      domain: parsed.data.domain,
      taskCount: parsed.data.tasks.length,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'task',
    });

    await this.taskService.reorderTasks(
      parsed.data.domain,
      parsed.data.tasks,
      user,
      req.correlationId,
    );

    return createSuccessResponse(
      { message: 'Tasks reordered successfully' },
      req.correlationId || 'unknown',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Task'))
  async findById(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const task = await this.taskService.findById(id);

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }

  @Post()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'Task'))
  async create(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid task data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Creating task', {
      title: parsed.data.title,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'task',
    });

    const task = await this.taskService.create(parsed.data, user.id, req.correlationId);

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'Task'))
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid task data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const task = await this.taskService.update(id, parsed.data, req.correlationId);

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }

  @Patch(':id/claim')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'Task'))
  async claimTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    this.logger.log('Contributor claiming task', {
      taskId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'task',
    });

    const task = await this.taskService.claimTask(id, user.id, req.correlationId);

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'Task'))
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = updateTaskStatusSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid status data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const task = await this.taskService.updateStatus(
      id,
      parsed.data.status,
      user,
      req.correlationId,
    );

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }

  @Patch(':id/retire')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Delete, 'Task'))
  async retireTask(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    this.logger.log('Retiring task', {
      taskId: id,
      correlationId: req.correlationId,
      module: 'task',
    });

    const task = await this.taskService.retireTask(id, req.correlationId);

    return createSuccessResponse(formatTask(task), req.correlationId || 'unknown');
  }
}
