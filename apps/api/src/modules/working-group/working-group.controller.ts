import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { WorkingGroupService } from './working-group.service.js';

@Controller({ path: 'working-groups', version: '1' })
export class WorkingGroupController {
  private readonly logger = new Logger(WorkingGroupController.name);

  constructor(private readonly workingGroupService: WorkingGroupService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'WorkingGroup'))
  async findAll(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const groups = await this.workingGroupService.findAll(user.id);

    return createSuccessResponse(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        domain: g.domain,
        accentColor: g.accentColor,
        memberCount: g.memberCount,
        isMember: g.isMember,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
      req.correlationId || 'unknown',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'WorkingGroup'))
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const group = await this.workingGroupService.findById(id, user.id);

    const contributions = await this.workingGroupService.getGroupContributions(id);
    const activeTasks = await this.workingGroupService.getActiveTasksForDomain(group.domain);

    return createSuccessResponse(
      {
        id: group.id,
        name: group.name,
        description: group.description,
        domain: group.domain,
        accentColor: group.accentColor,
        memberCount: group.memberCount,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        isMember: group.isMember,
        members: group.members.map((m) => ({
          id: m.id,
          workingGroupId: m.workingGroupId,
          contributorId: m.contributorId,
          joinedAt: m.joinedAt.toISOString(),
          contributor: m.contributor,
        })),
        recentContributions: contributions.map((c) => ({
          id: c.id,
          title: c.title,
          contributionType: c.contributionType,
          createdAt: c.createdAt.toISOString(),
          contributor: c.contributor,
          repository: c.repository,
        })),
        activeTasks,
      },
      req.correlationId || 'unknown',
    );
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'WorkingGroup'))
  async joinGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const member = await this.workingGroupService.joinGroup(id, user.id, req.correlationId);

    this.logger.log('Contributor joined working group', {
      workingGroupId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    return createSuccessResponse(
      {
        id: member.id,
        workingGroupId: member.workingGroupId,
        contributorId: member.contributorId,
        joinedAt: member.joinedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Delete(':id/members')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Delete, 'WorkingGroup'))
  async leaveGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.workingGroupService.leaveGroup(id, user.id, req.correlationId);

    this.logger.log('Contributor left working group', {
      workingGroupId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    return createSuccessResponse(
      { message: 'Successfully left the working group' },
      req.correlationId || 'unknown',
    );
  }
}
