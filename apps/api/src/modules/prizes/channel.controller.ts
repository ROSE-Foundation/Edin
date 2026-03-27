import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES, createChannelSchema, updateChannelSchema } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ChannelService } from './channel.service.js';

@Controller({ path: 'channels', version: '1' })
export class ChannelController {
  private readonly logger = new Logger(ChannelController.name);

  constructor(private readonly channelService: ChannelService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Channel'))
  async findAll(
    @Query('includeInactive') includeInactive: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    // Only admins can see inactive channels
    const showInactive = includeInactive === 'true' && user.role === 'ADMIN';
    const channels = await this.channelService.findAll(showInactive);

    return createSuccessResponse(
      channels.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        parentChannelId: c.parentChannelId,
        metadata: c.metadata,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      req.correlationId || 'unknown',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Channel'))
  async findById(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const channel = await this.channelService.findById(id);

    return createSuccessResponse(
      {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        parentChannelId: channel.parentChannelId,
        metadata: channel.metadata,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
        parentChannel: channel.parentChannel,
        childChannels: channel.childChannels,
      },
      req.correlationId || 'unknown',
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Channel'))
  async create(@Body() body: unknown, @Req() req: Request) {
    const parsed = createChannelSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid channel data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Creating channel', {
      name: parsed.data.name,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const channel = await this.channelService.create(parsed.data);

    return createSuccessResponse(
      {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        parentChannelId: channel.parentChannelId,
        metadata: channel.metadata,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Channel'))
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = updateChannelSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid channel data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Updating channel', {
      channelId: id,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const channel = await this.channelService.update(id, parsed.data);

    return createSuccessResponse(
      {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        parentChannelId: channel.parentChannelId,
        metadata: channel.metadata,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Channel'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    this.logger.log('Deleting channel', {
      channelId: id,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    await this.channelService.delete(id);
  }
}
