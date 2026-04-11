import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service.js';
import { GitHubApiService, GitHubApiError } from './github-api.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  monitoredRepository: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: any) => unknown) => callback(mockPrisma)),
};

const mockEventEmitter = { emit: vi.fn() };

const mockGitHubApiService = {
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  verifyRepository: vi.fn(),
};

const mockConfigService = {
  get: vi.fn<(key: string) => string | undefined>(() => undefined),
};

const mockQueue = {
  add: vi.fn(),
};

describe('IngestionService', () => {
  let service: IngestionService;

  const mockRepo = {
    id: 'repo-uuid-1',
    owner: 'edin-foundation',
    repo: 'edin-core',
    fullName: 'edin-foundation/edin-core',
    webhookId: 12345,
    webhookSecret: 'test-secret-hex',
    status: 'ACTIVE',
    statusMessage: null,
    visibility: 'PUBLIC',
    addedById: 'admin-uuid-1',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: pre-flight verify succeeds as a public repo. Individual tests
    // override this to exercise private-repo + failure branches.
    mockGitHubApiService.verifyRepository.mockResolvedValue({
      ok: true,
      visibility: 'public',
    });

    const module = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: GitHubApiService, useValue: mockGitHubApiService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getQueueToken('github-ingestion'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(IngestionService);
  });

  // ─── addRepository ─────────────────────────────────────────────────────

  describe('addRepository', () => {
    it('should create public repository and register webhook successfully', async () => {
      const input = { owner: 'edin-foundation', repo: 'edin-core' };
      mockPrisma.monitoredRepository.create.mockResolvedValue({
        ...mockRepo,
        status: 'PENDING',
        webhookId: null,
        visibility: 'PUBLIC',
      });
      mockGitHubApiService.createWebhook.mockResolvedValue({ webhookId: 12345 });
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...mockRepo,
        addedBy: { name: 'Alice Admin' },
      });

      const result = await service.addRepository(input, 'admin-uuid-1', 'test-corr');

      expect(mockGitHubApiService.verifyRepository).toHaveBeenCalledWith(
        'edin-foundation',
        'edin-core',
        'test-corr',
      );
      expect(mockPrisma.monitoredRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ visibility: 'PUBLIC' }),
        }),
      );
      expect(result.fullName).toBe('edin-foundation/edin-core');
      expect(result.status).toBe('ACTIVE');
      expect(result.visibility).toBe('PUBLIC');
      expect(result.addedByName).toBe('Alice Admin');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'ingestion.repository.added',
        expect.objectContaining({ fullName: 'edin-foundation/edin-core' }),
      );
    });

    it('should create private repository when bot has access', async () => {
      const input = { owner: 'acme', repo: 'secret-core' };
      mockGitHubApiService.verifyRepository.mockResolvedValue({
        ok: true,
        visibility: 'private',
      });
      const privateRepo = {
        ...mockRepo,
        id: 'repo-uuid-private',
        owner: 'acme',
        repo: 'secret-core',
        fullName: 'acme/secret-core',
        visibility: 'PRIVATE',
      };
      mockPrisma.monitoredRepository.create.mockResolvedValue({
        ...privateRepo,
        status: 'PENDING',
        webhookId: null,
      });
      mockGitHubApiService.createWebhook.mockResolvedValue({ webhookId: 77777 });
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...privateRepo,
        webhookId: 77777,
        addedBy: { name: 'Alice Admin' },
      });

      const result = await service.addRepository(input, 'admin-uuid-1');

      expect(mockPrisma.monitoredRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ visibility: 'PRIVATE' }),
        }),
      );
      expect(result.visibility).toBe('PRIVATE');
      expect(result.status).toBe('ACTIVE');
    });

    it('should reject with REPOSITORY_NOT_FOUND_OR_NO_ACCESS and not persist on private-repo-without-access', async () => {
      const input = { owner: 'acme', repo: 'secret-core' };
      mockGitHubApiService.verifyRepository.mockResolvedValue({
        ok: false,
        reason: 'not_found_or_no_access',
        message: 'Repository not found, or the EDIN bot account does not have access.',
      });

      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'REPOSITORY_NOT_FOUND_OR_NO_ACCESS',
      });

      expect(mockPrisma.monitoredRepository.create).not.toHaveBeenCalled();
      expect(mockGitHubApiService.createWebhook).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should name the bot in the error message when GITHUB_BOT_USERNAME is set', async () => {
      const input = { owner: 'acme', repo: 'secret-core' };
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'GITHUB_BOT_USERNAME' ? 'edin-bot' : undefined,
      );
      mockGitHubApiService.verifyRepository.mockResolvedValue({
        ok: false,
        reason: 'not_found_or_no_access',
        message: 'Repository not found, or the EDIN bot account does not have access.',
      });

      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'REPOSITORY_NOT_FOUND_OR_NO_ACCESS',
        message: expect.stringContaining('@edin-bot'),
      });

      // Reset the mock to its default so subsequent tests aren't affected.
      mockConfigService.get.mockImplementation(() => undefined);
    });

    it('should reject with GITHUB_TOKEN_MISSING_OR_INSUFFICIENT_SCOPE when token is absent or unauthorized', async () => {
      const input = { owner: 'edin-foundation', repo: 'edin-core' };
      mockGitHubApiService.verifyRepository.mockResolvedValue({
        ok: false,
        reason: 'token_missing_or_insufficient_scope',
        message: 'GITHUB_APP_TOKEN is not configured.',
      });

      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'GITHUB_TOKEN_MISSING_OR_INSUFFICIENT_SCOPE',
      });

      expect(mockPrisma.monitoredRepository.create).not.toHaveBeenCalled();
    });

    it('should reject with GITHUB_RATE_LIMITED on rate limit during verify', async () => {
      const input = { owner: 'edin-foundation', repo: 'edin-core' };
      mockGitHubApiService.verifyRepository.mockResolvedValue({
        ok: false,
        reason: 'rate_limited',
        message: 'GitHub API rate limit exceeded. Please retry later.',
      });

      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'GITHUB_RATE_LIMITED',
      });

      expect(mockPrisma.monitoredRepository.create).not.toHaveBeenCalled();
    });

    it('should throw REPOSITORY_ALREADY_MONITORED on duplicate', async () => {
      const input = { owner: 'edin-foundation', repo: 'edin-core' };
      const error = { code: 'P2002', meta: { target: ['owner', 'repo'] } };
      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toThrow(DomainException);
      await expect(service.addRepository(input, 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'REPOSITORY_ALREADY_MONITORED',
      });
    });

    it('should save with PENDING status when webhook creation fails after pre-flight succeeds', async () => {
      const input = { owner: 'edin-foundation', repo: 'edin-core' };
      mockPrisma.$transaction.mockImplementation((callback: (tx: any) => unknown) =>
        callback(mockPrisma),
      );
      mockPrisma.monitoredRepository.create.mockResolvedValue({
        ...mockRepo,
        id: 'repo-uuid-2',
        status: 'PENDING',
        webhookId: null,
      });
      mockGitHubApiService.createWebhook.mockRejectedValue(
        new GitHubApiError('Insufficient permissions'),
      );
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...mockRepo,
        id: 'repo-uuid-2',
        status: 'PENDING',
        statusMessage: 'Insufficient permissions',
        addedBy: { name: 'Alice Admin' },
      });

      const result = await service.addRepository(input, 'admin-uuid-1');

      expect(result.status).toBe('PENDING');
      expect(result.statusMessage).toBe('Insufficient permissions');
      expect(result.addedByName).toBe('Alice Admin');
    });
  });

  // ─── removeRepository ──────────────────────────────────────────────────

  describe('removeRepository', () => {
    it('should remove repository and deregister webhook', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepo);
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...mockRepo,
        status: 'REMOVING',
      });
      mockGitHubApiService.deleteWebhook.mockResolvedValue(undefined);
      mockPrisma.monitoredRepository.delete.mockResolvedValue(mockRepo);

      await service.removeRepository('repo-uuid-1', 'admin-uuid-1', 'test-corr');

      expect(mockGitHubApiService.deleteWebhook).toHaveBeenCalledWith(
        'edin-foundation',
        'edin-core',
        12345,
        'test-corr',
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ingestion.repository.removed' }),
        expect.anything(),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'ingestion.repository.removed',
        expect.objectContaining({ fullName: 'edin-foundation/edin-core' }),
      );
    });

    it('should throw REPOSITORY_NOT_FOUND when repository does not exist', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.removeRepository('non-existent-id', 'admin-uuid-1'),
      ).rejects.toMatchObject({
        errorCode: 'REPOSITORY_NOT_FOUND',
      });
    });

    it('should restore status when webhook deregistration fails', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepo);
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...mockRepo,
        status: 'REMOVING',
      });
      mockGitHubApiService.deleteWebhook.mockRejectedValue(new GitHubApiError('GitHub API error'));

      await expect(service.removeRepository('repo-uuid-1', 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'WEBHOOK_DEREGISTRATION_FAILED',
      });

      // Should have called update twice: first to REMOVING, then to restore ACTIVE
      expect(mockPrisma.monitoredRepository.update).toHaveBeenCalledTimes(2);
    });
  });

  // ─── listRepositories ──────────────────────────────────────────────────

  describe('listRepositories', () => {
    it('should return paginated repository list with addedByName', async () => {
      mockPrisma.monitoredRepository.findMany.mockResolvedValue([
        { ...mockRepo, addedBy: { name: 'Alice Admin' } },
      ]);
      mockPrisma.monitoredRepository.count.mockResolvedValue(1);

      const result = await service.listRepositories({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('edin-foundation/edin-core');
      expect(result.items[0].addedByName).toBe('Alice Admin');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle cursor-based pagination', async () => {
      const repos = Array.from({ length: 3 }, (_, i) => ({
        ...mockRepo,
        id: `repo-uuid-${i}`,
        fullName: `org/repo-${i}`,
      }));
      mockPrisma.monitoredRepository.findMany.mockResolvedValue(repos);
      mockPrisma.monitoredRepository.count.mockResolvedValue(5);

      const result = await service.listRepositories({ limit: 2, cursor: 'some-cursor' });

      expect(result.pagination.hasMore).toBe(true);
      expect(result.items).toHaveLength(2);
    });
  });

  // ─── getRepository ─────────────────────────────────────────────────────

  describe('getRepository', () => {
    it('should return repository by id with addedByName', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue({
        ...mockRepo,
        addedBy: { name: 'Alice Admin' },
      });

      const result = await service.getRepository('repo-uuid-1');

      expect(result.id).toBe('repo-uuid-1');
      expect(result.fullName).toBe('edin-foundation/edin-core');
      expect(result.addedByName).toBe('Alice Admin');
    });

    it('should throw REPOSITORY_NOT_FOUND when not found', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(null);

      await expect(service.getRepository('non-existent')).rejects.toMatchObject({
        errorCode: 'REPOSITORY_NOT_FOUND',
      });
    });
  });

  // ─── retryWebhook ─────────────────────────────────────────────────────

  describe('retryWebhook', () => {
    it('should retry webhook for ERROR status repository', async () => {
      const errorRepo = { ...mockRepo, status: 'ERROR', statusMessage: 'Previous failure' };
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(errorRepo);
      mockGitHubApiService.createWebhook.mockResolvedValue({ webhookId: 99999 });
      mockPrisma.monitoredRepository.update.mockResolvedValue({
        ...errorRepo,
        status: 'ACTIVE',
        webhookId: 99999,
        statusMessage: null,
        addedBy: { name: 'Alice Admin' },
      });

      const result = await service.retryWebhook('repo-uuid-1', 'admin-uuid-1');

      expect(result.status).toBe('ACTIVE');
      expect(result.webhookId).toBe(99999);
      expect(result.addedByName).toBe('Alice Admin');
    });

    it('should throw when retrying non-error repository', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepo);

      await expect(service.retryWebhook('repo-uuid-1', 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'VALIDATION_ERROR',
      });
    });

    it('should throw WEBHOOK_REGISTRATION_FAILED on retry failure', async () => {
      const errorRepo = { ...mockRepo, status: 'ERROR' };
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(errorRepo);
      mockGitHubApiService.createWebhook.mockRejectedValue(new GitHubApiError('Still failing'));
      mockPrisma.monitoredRepository.update.mockResolvedValue(errorRepo);

      await expect(service.retryWebhook('repo-uuid-1', 'admin-uuid-1')).rejects.toMatchObject({
        errorCode: 'WEBHOOK_REGISTRATION_FAILED',
      });
    });
  });

  // ─── dispatchWebhookEvent ──────────────────────────────────────────────

  describe('dispatchWebhookEvent', () => {
    it('should add job to queue', async () => {
      mockQueue.add.mockResolvedValue({});

      await service.dispatchWebhookEvent('push', 'org/repo', { commits: [] }, 'delivery-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-webhook',
        expect.objectContaining({
          eventType: 'push',
          repositoryFullName: 'org/repo',
          deliveryId: 'delivery-1',
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });
});
