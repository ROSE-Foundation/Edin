import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

@Injectable()
export class WorkingGroupService {
  private readonly logger = new Logger(WorkingGroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(currentContributorId?: string) {
    this.logger.log('Fetching all working groups', { module: 'working-group' });

    const groups = await this.prisma.workingGroup.findMany({
      orderBy: { name: 'asc' },
    });

    if (!currentContributorId) {
      return groups.map((g) => ({ ...g, isMember: false }));
    }

    const memberships = await this.prisma.workingGroupMember.findMany({
      where: { contributorId: currentContributorId },
      select: { workingGroupId: true },
    });

    const memberGroupIds = new Set(memberships.map((m) => m.workingGroupId));

    return groups.map((g) => ({
      ...g,
      isMember: memberGroupIds.has(g.id),
    }));
  }

  async findById(id: string, currentContributorId?: string) {
    this.logger.log('Fetching working group detail', {
      workingGroupId: id,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            contributor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                domain: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const isMember = currentContributorId
      ? workingGroup.members.some((m) => m.contributorId === currentContributorId)
      : false;

    return { ...workingGroup, isMember };
  }

  async joinGroup(workingGroupId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Contributor joining working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingMembership = await this.prisma.workingGroupMember.findUnique({
      where: {
        workingGroupId_contributorId: {
          workingGroupId,
          contributorId,
        },
      },
    });

    if (existingMembership) {
      throw new DomainException(
        ERROR_CODES.ALREADY_MEMBER,
        'You are already a member of this working group',
        HttpStatus.CONFLICT,
      );
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workingGroupMember.create({
        data: {
          workingGroupId,
          contributorId,
        },
      });

      await tx.workingGroup.update({
        where: { id: workingGroupId },
        data: { memberCount: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          actorId: contributorId,
          action: 'working-group.member.joined',
          entityType: 'WorkingGroupMember',
          entityId: created.id,
          details: { workingGroupId, workingGroupName: workingGroup.name },
          correlationId,
        },
      });

      return created;
    });

    this.eventEmitter.emit('working-group.member.joined', {
      eventType: 'working-group.member.joined',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        workingGroupId,
        contributorId,
        workingGroupName: workingGroup.name,
      },
    });

    this.logger.log('Contributor joined working group', {
      workingGroupId,
      contributorId,
      memberId: member.id,
      correlationId,
      module: 'working-group',
    });

    return member;
  }

  async leaveGroup(workingGroupId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Contributor leaving working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const membership = await this.prisma.workingGroupMember.findUnique({
      where: {
        workingGroupId_contributorId: {
          workingGroupId,
          contributorId,
        },
      },
    });

    if (!membership) {
      throw new DomainException(
        ERROR_CODES.NOT_A_MEMBER,
        'You are not a member of this working group',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workingGroupMember.delete({
        where: { id: membership.id },
      });

      await tx.workingGroup.update({
        where: { id: workingGroupId },
        data: { memberCount: { decrement: 1 } },
      });

      await tx.auditLog.create({
        data: {
          actorId: contributorId,
          action: 'working-group.member.left',
          entityType: 'WorkingGroupMember',
          entityId: membership.id,
          details: { workingGroupId, workingGroupName: workingGroup.name },
          correlationId,
        },
      });
    });

    this.eventEmitter.emit('working-group.member.left', {
      eventType: 'working-group.member.left',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        workingGroupId,
        contributorId,
        workingGroupName: workingGroup.name,
      },
    });

    this.logger.log('Contributor left working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });
  }

  async getMembers(workingGroupId: string) {
    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.workingGroupMember.findMany({
      where: { workingGroupId },
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            domain: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async getGroupContributions(workingGroupId: string) {
    const members = await this.prisma.workingGroupMember.findMany({
      where: { workingGroupId },
      select: { contributorId: true },
    });

    const contributorIds = members.map((m) => m.contributorId);

    if (contributorIds.length === 0) {
      return [];
    }

    return this.prisma.contribution.findMany({
      where: { contributorId: { in: contributorIds } },
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        repository: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getActiveTasksForDomain(domain: 'Technology' | 'Fintech' | 'Impact' | 'Governance') {
    return this.prisma.microTask.findMany({
      where: {
        domain,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        estimatedEffort: true,
        submissionFormat: true,
      },
    });
  }
}
