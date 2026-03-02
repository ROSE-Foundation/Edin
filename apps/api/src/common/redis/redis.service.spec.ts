import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisService } from './redis.service.js';

// Mock ioredis
const mockRedisClient = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(86400),
  scan: vi.fn().mockResolvedValue(['0', []]),
  quit: vi.fn().mockResolvedValue('OK'),
};

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      constructor() {
        return mockRedisClient;
      }
    },
  };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn().mockReturnValue('redis://localhost:6379'),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('setRefreshToken', () => {
    it('should store a refresh token with TTL', async () => {
      await service.setRefreshToken('contributor-1', 'token-abc', 2592000);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'refresh_token:contributor-1:token-abc',
        expect.stringContaining('"contributorId":"contributor-1"'),
        'EX',
        2592000,
      );
    });

    it('should store token data with createdAt and lastUsedAt', async () => {
      await service.setRefreshToken('contributor-1', 'token-abc', 2592000);

      const storedData = JSON.parse(mockRedisClient.set.mock.calls[0][1]);
      expect(storedData).toHaveProperty('contributorId', 'contributor-1');
      expect(storedData).toHaveProperty('createdAt');
      expect(storedData).toHaveProperty('lastUsedAt');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when token does not exist', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.getRefreshToken('contributor-1', 'token-abc');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('refresh_token:contributor-1:token-abc');
    });

    it('should return token data and update lastUsedAt', async () => {
      const tokenData = {
        contributorId: 'contributor-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastUsedAt: '2026-03-01T00:00:00.000Z',
      };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(tokenData));
      mockRedisClient.ttl.mockResolvedValueOnce(86400);

      const result = await service.getRefreshToken('contributor-1', 'token-abc');

      expect(result).not.toBeNull();
      expect(result!.contributorId).toBe('contributor-1');
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should not update token when TTL is expired', async () => {
      const tokenData = {
        contributorId: 'contributor-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastUsedAt: '2026-03-01T00:00:00.000Z',
      };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(tokenData));
      mockRedisClient.ttl.mockResolvedValueOnce(-1);

      const result = await service.getRefreshToken('contributor-1', 'token-abc');

      expect(result).not.toBeNull();
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('deleteRefreshToken', () => {
    it('should delete a specific refresh token', async () => {
      await service.deleteRefreshToken('contributor-1', 'token-abc');

      expect(mockRedisClient.del).toHaveBeenCalledWith('refresh_token:contributor-1:token-abc');
    });
  });

  describe('deleteAllRefreshTokens', () => {
    it('should delete all tokens for a contributor', async () => {
      mockRedisClient.scan.mockResolvedValueOnce([
        '0',
        ['refresh_token:contributor-1:token-1', 'refresh_token:contributor-1:token-2'],
      ]);

      await service.deleteAllRefreshTokens('contributor-1');

      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'refresh_token:contributor-1:*',
        'COUNT',
        100,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'refresh_token:contributor-1:token-1',
        'refresh_token:contributor-1:token-2',
      );
    });

    it('should handle when no tokens exist', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      await service.deleteAllRefreshTokens('contributor-1');

      expect(mockRedisClient.scan).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle paginated scan results', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['42', ['refresh_token:contributor-1:token-1']])
        .mockResolvedValueOnce(['0', ['refresh_token:contributor-1:token-2']]);

      await service.deleteAllRefreshTokens('contributor-1');

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('lifecycle', () => {
    it('should quit redis connection on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
