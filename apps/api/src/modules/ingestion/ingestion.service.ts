import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { GitHubApiService, GitHubApiError, GitHubRateLimitError } from './github-api.service.js';
import type { VerifyRepositoryResult } from './github-api.service.js';
import type { AppConfig } from '../../config/app.config.js';
import type { AddRepositoryDto } from './dto/add-repository.dto.js';
import type { ListRepositoriesQueryDto } from './dto/list-repositories-query.dto.js';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly gitHubApiService: GitHubApiService,
    private readonly configService: ConfigService<AppConfig, true>,
    @InjectQueue('github-ingestion') private readonly githubIngestionQueue: Queue,
  ) {}

  async addRepository(input: AddRepositoryDto, adminId: string, correlationId?: string) {
    this.logger.log('Adding monitored repository', {
      owner: input.owner,
      repo: input.repo,
      adminId,
      correlationId,
    });

    const fullName = `${input.owner}/${input.repo}`;

    // Pre-flight: verify the repository is reachable BEFORE persisting anything.
    // This blocks orphan PENDING rows for repos EDIN cannot see (private repos
    // where the bot account is not a Collaborator, or token/scope issues).
    const verifyResult = await this.gitHubApiService.verifyRepository(
      input.owner,
      input.repo,
      correlationId,
    );

    if (!verifyResult.ok) {
      this.throwVerifyFailure(verifyResult, fullName);
    }

    const visibility = verifyResult.visibility === 'private' ? 'PRIVATE' : 'PUBLIC';
    const webhookSecret = randomBytes(32).toString('hex');

    let repository;
    try {
      repository = await this.prisma.$transaction(async (tx) => {
        const created = await tx.monitoredRepository.create({
          data: {
            owner: input.owner,
            repo: input.repo,
            fullName,
            webhookSecret,
            status: 'PENDING',
            visibility,
            addedById: adminId,
          },
        });

        await this.auditService.log(
          {
            actorId: adminId,
            action: 'ingestion.repository.added',
            entityType: 'MonitoredRepository',
            entityId: created.id,
            details: { owner: input.owner, repo: input.repo, fullName, visibility },
            correlationId,
          },
          tx,
        );

        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error, 'monitored_repositories_owner_repo_key')) {
        throw new DomainException(
          ERROR_CODES.REPOSITORY_ALREADY_MONITORED,
          `Repository ${fullName} is already being monitored`,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    // Attempt webhook registration (outside transaction)
    try {
      const result = await this.gitHubApiService.createWebhook(
        input.owner,
        input.repo,
        webhookSecret,
        correlationId,
      );

      repository = await this.prisma.monitoredRepository.update({
        where: { id: repository.id },
        data: {
          status: 'ACTIVE',
          webhookId: result.webhookId,
          statusMessage: null,
        },
        include: { addedBy: { select: { name: true } } },
      });

      this.logger.log('Repository added and webhook registered', {
        repositoryId: repository.id,
        fullName,
        visibility,
        webhookId: result.webhookId,
        correlationId,
      });
    } catch (error) {
      const message =
        error instanceof GitHubRateLimitError
          ? 'GitHub API rate limit exceeded. Please retry later.'
          : error instanceof GitHubApiError
            ? error.message
            : 'Webhook registration failed';

      repository = await this.prisma.monitoredRepository.update({
        where: { id: repository.id },
        data: {
          status: 'PENDING',
          statusMessage: message,
        },
        include: { addedBy: { select: { name: true } } },
      });

      this.logger.warn('Webhook registration failed, repository saved with PENDING status', {
        repositoryId: repository.id,
        fullName,
        error: message,
        correlationId,
      });
    }

    this.eventEmitter.emit('ingestion.repository.added', {
      repositoryId: repository.id,
      fullName,
      status: repository.status,
      correlationId,
    });

    return this.toResponse(repository);
  }

  /**
   * Translate a failed verifyRepository result into a DomainException with an
   * actionable message. Never returns.
   */
  private throwVerifyFailure(
    result: Extract<VerifyRepositoryResult, { ok: false }>,
    fullName: string,
  ): never {
    const botUsername = this.configService.get('GITHUB_BOT_USERNAME', { infer: true });
    const botLabel = botUsername ? `@${botUsername}` : 'the EDIN bot account';

    switch (result.reason) {
      case 'not_found_or_no_access':
        throw new DomainException(
          ERROR_CODES.REPOSITORY_NOT_FOUND_OR_NO_ACCESS,
          `Repository ${fullName} not found, or EDIN does not have access. ` +
            `If it is private, ask the owner to add ${botLabel} as a Collaborator with Read access, then retry.`,
          HttpStatus.NOT_FOUND,
        );
      case 'token_missing_or_insufficient_scope':
        throw new DomainException(
          ERROR_CODES.GITHUB_TOKEN_MISSING_OR_INSUFFICIENT_SCOPE,
          result.message,
          HttpStatus.BAD_GATEWAY,
        );
      case 'rate_limited':
        throw new DomainException(
          ERROR_CODES.GITHUB_RATE_LIMITED,
          result.message,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      case 'unknown':
      default:
        throw new DomainException(
          ERROR_CODES.GITHUB_API_ERROR,
          result.message,
          HttpStatus.BAD_GATEWAY,
        );
    }
  }

  async removeRepository(repositoryId: string, adminId: string, correlationId?: string) {
    this.logger.log('Removing monitored repository', { repositoryId, adminId, correlationId });

    const repository = await this.prisma.monitoredRepository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new DomainException(
        ERROR_CODES.REPOSITORY_NOT_FOUND,
        'Repository not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Set status to REMOVING optimistically (transactional)
    await this.prisma.$transaction(async (tx) => {
      await tx.monitoredRepository.update({
        where: { id: repositoryId },
        data: { status: 'REMOVING' },
      });
    });

    // Attempt webhook deregistration if webhookId exists
    if (repository.webhookId) {
      try {
        await this.gitHubApiService.deleteWebhook(
          repository.owner,
          repository.repo,
          repository.webhookId,
          correlationId,
        );
      } catch (error) {
        // Restore previous status on failure (transactional)
        await this.prisma.$transaction(async (tx) => {
          await tx.monitoredRepository.update({
            where: { id: repositoryId },
            data: { status: repository.status },
          });
        });

        const message = error instanceof Error ? error.message : 'Webhook deregistration failed';
        throw new DomainException(
          ERROR_CODES.WEBHOOK_DEREGISTRATION_FAILED,
          `Failed to deregister webhook: ${message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    // Delete repository record and create audit log in transaction
    await this.prisma.$transaction(async (tx) => {
      await this.auditService.log(
        {
          actorId: adminId,
          action: 'ingestion.repository.removed',
          entityType: 'MonitoredRepository',
          entityId: repositoryId,
          details: {
            owner: repository.owner,
            repo: repository.repo,
            fullName: repository.fullName,
          },
          correlationId,
        },
        tx,
      );

      await tx.monitoredRepository.delete({
        where: { id: repositoryId },
      });
    });

    this.logger.log('Repository removed successfully', {
      repositoryId,
      fullName: repository.fullName,
      correlationId,
    });

    this.eventEmitter.emit('ingestion.repository.removed', {
      repositoryId,
      fullName: repository.fullName,
      correlationId,
    });
  }

  async listRepositories(query: ListRepositoriesQueryDto, correlationId?: string) {
    this.logger.debug('Listing monitored repositories', { query, correlationId });

    const { cursor, limit } = query;

    const [items, total] = await Promise.all([
      this.prisma.monitoredRepository.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { addedBy: { select: { name: true } } },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      this.prisma.monitoredRepository.count(),
    ]);

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

    return {
      items: results.map((r) => this.toResponse(r)),
      pagination: {
        cursor: nextCursor ?? null,
        hasMore,
        total,
      },
    };
  }

  async getRepository(repositoryId: string, correlationId?: string) {
    this.logger.debug('Getting monitored repository', { repositoryId, correlationId });

    const repository = await this.prisma.monitoredRepository.findUnique({
      where: { id: repositoryId },
      include: { addedBy: { select: { name: true } } },
    });

    if (!repository) {
      throw new DomainException(
        ERROR_CODES.REPOSITORY_NOT_FOUND,
        'Repository not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(repository);
  }

  async retryWebhook(repositoryId: string, adminId: string, correlationId?: string) {
    this.logger.log('Retrying webhook registration', { repositoryId, adminId, correlationId });

    const repository = await this.prisma.monitoredRepository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new DomainException(
        ERROR_CODES.REPOSITORY_NOT_FOUND,
        'Repository not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (repository.status !== 'ERROR' && repository.status !== 'PENDING') {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Can only retry webhook for repositories with ERROR or PENDING status',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.gitHubApiService.createWebhook(
        repository.owner,
        repository.repo,
        repository.webhookSecret,
        correlationId,
      );

      const updated = await this.prisma.$transaction(async (tx) => {
        const repo = await tx.monitoredRepository.update({
          where: { id: repositoryId },
          data: {
            status: 'ACTIVE',
            webhookId: result.webhookId,
            statusMessage: null,
          },
          include: { addedBy: { select: { name: true } } },
        });

        await this.auditService.log(
          {
            actorId: adminId,
            action: 'ingestion.webhook.retried',
            entityType: 'MonitoredRepository',
            entityId: repositoryId,
            details: {
              owner: repository.owner,
              repo: repository.repo,
              fullName: repository.fullName,
              webhookId: result.webhookId,
              outcome: 'success',
            },
            correlationId,
          },
          tx,
        );

        return repo;
      });

      this.logger.log('Webhook retry successful', {
        repositoryId,
        webhookId: result.webhookId,
        correlationId,
      });

      return this.toResponse(updated);
    } catch (error) {
      const message =
        error instanceof GitHubRateLimitError
          ? 'GitHub API rate limit exceeded. Please retry later.'
          : error instanceof GitHubApiError
            ? error.message
            : 'Webhook registration failed';

      await this.prisma.$transaction(async (tx) => {
        await tx.monitoredRepository.update({
          where: { id: repositoryId },
          data: { statusMessage: message },
        });
      });

      this.logger.warn('Webhook retry failed', {
        repositoryId,
        error: message,
        correlationId,
      });

      throw new DomainException(
        ERROR_CODES.WEBHOOK_REGISTRATION_FAILED,
        message,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async validateWebhookSignature(
    payload: Buffer,
    signature: string,
    repositoryFullName: string,
  ): Promise<boolean> {
    const repository = await this.prisma.monitoredRepository.findUnique({
      where: { fullName: repositoryFullName },
    });

    if (!repository) {
      return false;
    }

    const expectedSignature =
      'sha256=' + createHmac('sha256', repository.webhookSecret).update(payload).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  async dispatchWebhookEvent(
    eventType: string,
    repositoryFullName: string,
    payload: Record<string, unknown>,
    deliveryId: string,
  ): Promise<void> {
    await this.githubIngestionQueue.add(
      'process-webhook',
      {
        eventType,
        repositoryFullName,
        payload,
        deliveryId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.debug('Webhook event dispatched to queue', {
      eventType,
      repository: repositoryFullName,
      deliveryId,
    });
  }

  private toResponse(repository: {
    id: string;
    owner: string;
    repo: string;
    fullName: string;
    webhookId: number | null;
    status: string;
    statusMessage: string | null;
    visibility: string;
    addedById: string;
    addedBy?: { name: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: repository.id,
      owner: repository.owner,
      repo: repository.repo,
      fullName: repository.fullName,
      webhookId: repository.webhookId,
      status: repository.status,
      statusMessage: repository.statusMessage,
      visibility: repository.visibility,
      addedById: repository.addedById,
      addedByName: repository.addedBy?.name ?? null,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    };
  }

  private isUniqueConstraintViolation(error: unknown, constraintName: string): boolean {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      if (meta?.target) {
        return meta.target.some((t) => constraintName.includes(t));
      }
    }
    return false;
  }
}
