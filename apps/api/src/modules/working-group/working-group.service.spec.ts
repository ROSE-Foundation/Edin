import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkingGroupService } from './working-group.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockWorkingGroup = {
  id: 'wg-1',
  name: 'Technology',
  description: 'Tech group',
  domain: 'Technology',
  accentColor: '#0D9488',
  memberCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMember = {
  id: 'member-1',
  workingGroupId: 'wg-1',
  contributorId: 'contributor-1',
  joinedAt: new Date(),
};

describe('WorkingGroupService', () => {
  let service: WorkingGroupService;
  let prisma: {
    workingGroup: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workingGroupMember: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    contribution: {
      findMany: ReturnType<typeof vi.fn>;
    };
    microTask: {
      findMany: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      workingGroup: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workingGroupMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      contribution: {
        findMany: vi.fn(),
      },
      microTask: {
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WorkingGroupService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(WorkingGroupService);
  });

  describe('findAll', () => {
    it('returns all working groups with isMember false when no contributor id', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].isMember).toBe(false);
      expect(prisma.workingGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns isMember true for groups the contributor belongs to', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);
      prisma.workingGroupMember.findMany.mockResolvedValue([{ workingGroupId: 'wg-1' }]);

      const result = await service.findAll('contributor-1');

      expect(result[0].isMember).toBe(true);
    });

    it('returns isMember false when contributor has no memberships', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const result = await service.findAll('contributor-1');

      expect(result[0].isMember).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns working group with members and isMember flag', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue({
        ...mockWorkingGroup,
        members: [
          {
            ...mockMember,
            contributor: {
              id: 'contributor-1',
              name: 'Test',
              avatarUrl: null,
              domain: 'Technology',
              role: 'CONTRIBUTOR',
            },
          },
        ],
      });

      const result = await service.findById('wg-1', 'contributor-1');

      expect(result.isMember).toBe(true);
      expect(result.name).toBe('Technology');
    });

    it('returns isMember false when contributor is not a member', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue({
        ...mockWorkingGroup,
        members: [
          {
            ...mockMember,
            contributor: {
              id: 'contributor-1',
              name: 'Test',
              avatarUrl: null,
              domain: 'Technology',
              role: 'CONTRIBUTOR',
            },
          },
        ],
      });

      const result = await service.findById('wg-1', 'other-contributor');

      expect(result.isMember).toBe(false);
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('joinGroup', () => {
    it('creates membership and increments member count', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(null);
      prisma.workingGroupMember.create.mockResolvedValue(mockMember);
      prisma.workingGroup.update.mockResolvedValue({ ...mockWorkingGroup, memberCount: 6 });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.joinGroup('wg-1', 'contributor-1', 'corr-1');

      expect(result).toEqual(mockMember);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.member.joined',
        expect.objectContaining({
          eventType: 'working-group.member.joined',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            contributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('throws ALREADY_MEMBER when contributor already joined', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(mockMember);

      await expect(service.joinGroup('wg-1', 'contributor-1')).rejects.toThrow(DomainException);
      await expect(service.joinGroup('wg-1', 'contributor-1')).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.joinGroup('nonexistent', 'contributor-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.joinGroup('nonexistent', 'contributor-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('leaveGroup', () => {
    it('removes membership and decrements member count', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(mockMember);
      prisma.workingGroupMember.delete.mockResolvedValue(mockMember);
      prisma.workingGroup.update.mockResolvedValue({ ...mockWorkingGroup, memberCount: 4 });
      prisma.auditLog.create.mockResolvedValue({});

      await service.leaveGroup('wg-1', 'contributor-1', 'corr-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.member.left',
        expect.objectContaining({
          eventType: 'working-group.member.left',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            contributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('throws NOT_A_MEMBER when contributor is not a member', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveGroup('wg-1', 'contributor-1')).rejects.toThrow(DomainException);
      await expect(service.leaveGroup('wg-1', 'contributor-1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.leaveGroup('nonexistent', 'contributor-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getMembers', () => {
    it('returns members with contributor details', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findMany.mockResolvedValue([
        {
          ...mockMember,
          contributor: {
            id: 'contributor-1',
            name: 'Test',
            avatarUrl: null,
            domain: 'Technology',
            role: 'CONTRIBUTOR',
          },
        },
      ]);

      const result = await service.getMembers('wg-1');

      expect(result).toHaveLength(1);
      expect(result[0].contributor.name).toBe('Test');
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.getMembers('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('getGroupContributions', () => {
    it('returns recent contributions from group members', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([{ contributorId: 'contributor-1' }]);
      prisma.contribution.findMany.mockResolvedValue([
        {
          id: 'contrib-1',
          title: 'Fix bug',
          contributionType: 'COMMIT',
          createdAt: new Date(),
          contributor: { id: 'contributor-1', name: 'Test', avatarUrl: null },
          repository: { fullName: 'edin/core' },
        },
      ]);

      const result = await service.getGroupContributions('wg-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Fix bug');
    });

    it('returns empty array when no members exist', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const result = await service.getGroupContributions('wg-1');

      expect(result).toEqual([]);
    });
  });

  describe('getActiveTasksForDomain', () => {
    it('returns active domain tasks ordered by newest first', async () => {
      prisma.microTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Build a REST API endpoint',
          description: 'Implement an endpoint',
          estimatedEffort: '2-4 hours',
          submissionFormat: 'GitHub repository link or gist',
        },
      ]);

      const result = await service.getActiveTasksForDomain('Technology');

      expect(result).toEqual([
        expect.objectContaining({
          id: 'task-1',
          title: 'Build a REST API endpoint',
        }),
      ]);
      expect(prisma.microTask.findMany).toHaveBeenCalledWith({
        where: { domain: 'Technology', isActive: true },
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
    });
  });
});
