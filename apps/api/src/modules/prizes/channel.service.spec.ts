import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ChannelService } from './channel.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockChannel = {
  id: 'ch-1',
  name: 'Technology',
  description: 'Technology domain channel',
  type: 'DOMAIN',
  parentChannelId: null,
  metadata: { working_group_id: 'wg-1' },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ChannelService', () => {
  let service: ChannelService;
  let prisma: {
    channel: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      channel: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [ChannelService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ChannelService);
  });

  describe('findAll', () => {
    it('returns only active channels by default', async () => {
      prisma.channel.findMany.mockResolvedValue([mockChannel]);

      const result = await service.findAll();

      expect(result).toEqual([mockChannel]);
      expect(prisma.channel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('returns all channels when includeInactive is true', async () => {
      prisma.channel.findMany.mockResolvedValue([mockChannel]);

      await service.findAll(true);

      expect(prisma.channel.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('returns channel with parent and children', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        ...mockChannel,
        parentChannel: null,
        childChannels: [],
      });

      const result = await service.findById('ch-1');

      expect(result.id).toBe('ch-1');
      expect(prisma.channel.findUnique).toHaveBeenCalledWith({
        where: { id: 'ch-1' },
        include: {
          parentChannel: { select: { id: true, name: true, type: true } },
          childChannels: { select: { id: true, name: true, type: true } },
        },
      });
    });

    it('throws CHANNEL_NOT_FOUND when channel does not exist', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('create', () => {
    it('creates a new channel', async () => {
      prisma.channel.create.mockResolvedValue(mockChannel);

      const result = await service.create({
        name: 'Technology',
        description: 'Technology domain channel',
        type: 'DOMAIN',
      });

      expect(result.id).toBe('ch-1');
      expect(prisma.channel.create).toHaveBeenCalledWith({
        data: {
          name: 'Technology',
          description: 'Technology domain channel',
          type: 'DOMAIN',
          parentChannelId: null,
          metadata: null,
          isActive: true,
        },
      });
    });

    it('throws CHANNEL_ALREADY_EXISTS on unique constraint violation', async () => {
      const prismaError = new Error('Unique constraint failed');
      Object.assign(prismaError, { code: 'P2002' });
      prisma.channel.create.mockRejectedValue(prismaError);

      await expect(
        service.create({
          name: 'Technology',
          description: 'Duplicate',
          type: 'DOMAIN',
        }),
      ).rejects.toThrow(DomainException);
      await expect(
        service.create({
          name: 'Technology',
          description: 'Duplicate',
          type: 'DOMAIN',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('update', () => {
    it('updates an existing channel', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        ...mockChannel,
        parentChannel: null,
        childChannels: [],
      });
      prisma.channel.update.mockResolvedValue({
        ...mockChannel,
        name: 'Updated',
      });

      const result = await service.update('ch-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('throws CHANNEL_NOT_FOUND when channel does not exist', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(DomainException);
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('delete', () => {
    it('deletes an existing channel', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        ...mockChannel,
        parentChannel: null,
        childChannels: [],
      });
      prisma.channel.delete.mockResolvedValue(mockChannel);

      await service.delete('ch-1');

      expect(prisma.channel.delete).toHaveBeenCalledWith({ where: { id: 'ch-1' } });
    });
  });
});
