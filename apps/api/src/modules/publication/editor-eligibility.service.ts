import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  EligibilityCheckDto,
  EditorApplicationDto,
  EditorEligibilityCriteriaDto,
  EditorDashboardDto,
  ActiveEditorDto,
  ArticleListItemDto,
  ArticleDto,
} from '@edin/shared';

const ROLE_HIERARCHY: Record<string, number> = {
  PUBLIC: 0,
  APPLICANT: 1,
  CONTRIBUTOR: 2,
  EDITOR: 3,
  FOUNDING_CONTRIBUTOR: 4,
  WORKING_GROUP_LEAD: 5,
  ADMIN: 6,
};

@Injectable()
export class EditorEligibilityService {
  private readonly logger = new Logger(EditorEligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Eligibility Checks ──────────────────────────────────────────────────

  async checkEligibility(contributorId: string, domain: string): Promise<EligibilityCheckDto> {
    const criteria = await this.prisma.editorEligibilityCriteria.findUnique({
      where: { domain: domain as never },
    });

    if (!criteria) {
      throw new DomainException(
        ERROR_CODES.EDITOR_CRITERIA_NOT_FOUND,
        `No eligibility criteria found for domain ${domain}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Count completed evaluations for the contributor
    const contributionCount = await this.prisma.evaluation.count({
      where: {
        contributorId,
        status: 'COMPLETED',
      },
    });

    // Governance weight is Phase 2 — return 0 for now
    const governanceWeight = 0;

    // Check for existing application
    const existingApp = await this.prisma.editorApplication.findUnique({
      where: {
        contributorId_domain: { contributorId, domain: domain as never },
      },
      include: {
        contributor: { select: { name: true, avatarUrl: true } },
      },
    });

    const minGovWeight =
      typeof criteria.minGovernanceWeight === 'number'
        ? criteria.minGovernanceWeight
        : (criteria.minGovernanceWeight as { toNumber(): number }).toNumber();

    const eligible =
      contributionCount >= criteria.minContributionCount &&
      governanceWeight >= minGovWeight &&
      (!existingApp || existingApp.status === 'REJECTED' || existingApp.status === 'REVOKED');

    return {
      domain,
      eligible,
      criteria: this.toCriteriaDto(criteria),
      current: {
        contributionCount,
        governanceWeight,
      },
      existingApplication: existingApp ? this.toApplicationDto(existingApp) : null,
    };
  }

  async checkAllDomainEligibility(contributorId: string): Promise<EligibilityCheckDto[]> {
    const allCriteria = await this.prisma.editorEligibilityCriteria.findMany({
      select: { domain: true },
      orderBy: { domain: 'asc' },
    });
    const domains = allCriteria.map((c) => c.domain);
    return Promise.all(domains.map((d) => this.checkEligibility(contributorId, d)));
  }

  // ─── Application Management ──────────────────────────────────────────────

  async submitApplication(
    contributorId: string,
    domain: string,
    applicationStatement: string,
    correlationId: string,
  ): Promise<EditorApplicationDto> {
    // Check eligibility
    const check = await this.checkEligibility(contributorId, domain);
    if (!check.eligible) {
      throw new DomainException(
        ERROR_CODES.EDITOR_INELIGIBLE,
        'You do not meet the eligibility criteria for this domain',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Check for existing active application (PENDING or APPROVED)
    const existing = await this.prisma.editorApplication.findUnique({
      where: {
        contributorId_domain: { contributorId, domain: domain as never },
      },
    });

    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      throw new DomainException(
        ERROR_CODES.EDITOR_APPLICATION_ALREADY_EXISTS,
        'You already have an active application for this domain',
        HttpStatus.CONFLICT,
      );
    }

    // If previous application was REJECTED or REVOKED, delete it to allow re-application
    if (existing) {
      await this.prisma.editorApplication.delete({
        where: { id: existing.id },
      });
    }

    const application = await this.prisma.editorApplication.create({
      data: {
        contributorId,
        domain: domain as never,
        applicationStatement,
      },
      include: {
        contributor: { select: { name: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit('publication.editor.application-submitted', {
      applicationId: application.id,
      contributorId,
      contributorName: application.contributor.name,
      domain,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Editor application submitted', {
      module: 'publication',
      applicationId: application.id,
      contributorId,
      domain,
    });

    return this.toApplicationDto(application);
  }

  async getMyApplications(contributorId: string): Promise<EditorApplicationDto[]> {
    const apps = await this.prisma.editorApplication.findMany({
      where: { contributorId },
      include: {
        contributor: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apps.map((a) => this.toApplicationDto(a));
  }

  async listApplications(filters: {
    status?: string;
    domain?: string;
  }): Promise<EditorApplicationDto[]> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.domain) where.domain = filters.domain;

    const apps = await this.prisma.editorApplication.findMany({
      where,
      include: {
        contributor: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apps.map((a) => this.toApplicationDto(a));
  }

  async reviewApplication(
    applicationId: string,
    adminId: string,
    decision: string,
    reviewNotes: string | undefined,
    correlationId: string,
  ): Promise<EditorApplicationDto> {
    const application = await this.prisma.editorApplication.findUnique({
      where: { id: applicationId },
      include: {
        contributor: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.EDITOR_APPLICATION_NOT_FOUND,
        `Editor application ${applicationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'PENDING') {
      throw new DomainException(
        ERROR_CODES.EDITOR_APPLICATION_ALREADY_REVIEWED,
        'This application has already been reviewed',
        HttpStatus.CONFLICT,
      );
    }

    const contributorRole = application.contributor.role;

    const updated = await this.prisma.$transaction(async (tx) => {
      const app = await tx.editorApplication.update({
        where: { id: applicationId },
        data: {
          status: decision as never,
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes ?? null,
        },
        include: {
          contributor: { select: { name: true, avatarUrl: true } },
        },
      });

      // If approved, upgrade contributor role to EDITOR (if not already higher)
      if (decision === 'APPROVED') {
        const currentLevel = ROLE_HIERARCHY[contributorRole] ?? 0;
        const editorLevel = ROLE_HIERARCHY['EDITOR'];
        if (currentLevel < editorLevel) {
          await tx.contributor.update({
            where: { id: application.contributorId },
            data: { role: 'EDITOR' },
          });
          this.logger.log('Contributor role upgraded to EDITOR', {
            module: 'publication',
            contributorId: application.contributorId,
            previousRole: contributorRole,
          });
        }
      }

      return app;
    });

    this.eventEmitter.emit('publication.editor.application-reviewed', {
      applicationId,
      contributorId: application.contributorId,
      domain: application.domain,
      decision,
      reviewedById: adminId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Editor application reviewed', {
      module: 'publication',
      applicationId,
      decision,
      adminId,
    });

    return this.toApplicationDto(updated);
  }

  // ─── Editor Revocation ───────────────────────────────────────────────────

  async revokeEditorStatus(
    contributorId: string,
    adminId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    // Find all APPROVED applications for this contributor
    const approvedApps = await this.prisma.editorApplication.findMany({
      where: {
        contributorId,
        status: 'APPROVED',
      },
    });

    if (approvedApps.length === 0) {
      throw new DomainException(
        ERROR_CODES.EDITOR_NOT_ACTIVE,
        'Contributor is not an active editor',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Revoke all approved applications
      await tx.editorApplication.updateMany({
        where: {
          contributorId,
          status: 'APPROVED',
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedById: adminId,
          revokeReason: reason,
        },
      });

      // Demote role to CONTRIBUTOR (since all domains revoked)
      const contributor = await tx.contributor.findUnique({
        where: { id: contributorId },
        select: { role: true },
      });
      if (contributor && contributor.role === 'EDITOR') {
        await tx.contributor.update({
          where: { id: contributorId },
          data: { role: 'CONTRIBUTOR' },
        });
      }
    });

    for (const app of approvedApps) {
      this.eventEmitter.emit('publication.editor.role-revoked', {
        contributorId,
        domain: app.domain,
        revokedById: adminId,
        reason,
        timestamp: new Date().toISOString(),
        correlationId,
      });
    }

    this.logger.log('Editor status revoked', {
      module: 'publication',
      contributorId,
      adminId,
      domainsRevoked: approvedApps.map((a) => a.domain),
    });
  }

  // ─── Eligibility Criteria Management ─────────────────────────────────────

  async getEligibilityCriteria(domain: string): Promise<EditorEligibilityCriteriaDto> {
    const criteria = await this.prisma.editorEligibilityCriteria.findUnique({
      where: { domain: domain as never },
    });
    if (!criteria) {
      throw new DomainException(
        ERROR_CODES.EDITOR_CRITERIA_NOT_FOUND,
        `No eligibility criteria found for domain ${domain}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toCriteriaDto(criteria);
  }

  async listAllCriteria(): Promise<EditorEligibilityCriteriaDto[]> {
    const criteria = await this.prisma.editorEligibilityCriteria.findMany({
      orderBy: { domain: 'asc' },
    });
    return criteria.map((c) => this.toCriteriaDto(c));
  }

  async updateEligibilityCriteria(
    domain: string,
    data: {
      minContributionCount?: number;
      minGovernanceWeight?: number;
      maxConcurrentAssignments?: number;
    },
    adminId: string,
  ): Promise<EditorEligibilityCriteriaDto> {
    const existing = await this.prisma.editorEligibilityCriteria.findUnique({
      where: { domain: domain as never },
    });
    if (!existing) {
      throw new DomainException(
        ERROR_CODES.EDITOR_CRITERIA_NOT_FOUND,
        `No eligibility criteria found for domain ${domain}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.editorEligibilityCriteria.update({
      where: { domain: domain as never },
      data: {
        ...data,
        updatedById: adminId,
      },
    });

    this.logger.log('Editor eligibility criteria updated', {
      module: 'publication',
      domain,
      adminId,
      changes: data,
    });

    return this.toCriteriaDto(updated);
  }

  // ─── Active Editors ──────────────────────────────────────────────────────

  async listActiveEditors(domain?: string): Promise<ActiveEditorDto[]> {
    const where: Record<string, unknown> = { status: 'APPROVED' };
    if (domain) where.domain = domain;

    const apps = await this.prisma.editorApplication.findMany({
      where,
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            editedArticles: {
              where: { status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] } },
              select: { id: true },
            },
            editorialFeedback: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });

    return apps.map((app) => ({
      id: app.id,
      contributorId: app.contributorId,
      contributorName: app.contributor.name,
      contributorAvatarUrl: app.contributor.avatarUrl,
      domain: app.domain,
      activeAssignmentCount: app.contributor.editedArticles.length,
      totalReviews: app.contributor.editorialFeedback.length,
      approvedAt: app.reviewedAt?.toISOString() ?? app.createdAt.toISOString(),
    }));
  }

  // ─── Editor Dashboard ────────────────────────────────────────────────────

  async getEditorDashboard(editorId: string): Promise<EditorDashboardDto> {
    // Get editor's domain from approved application
    const approvedApp = await this.prisma.editorApplication.findFirst({
      where: { contributorId: editorId, status: 'APPROVED' },
    });

    const editorDomain = approvedApp?.domain;

    const [activeArticles, completedCount, availableArticles] = await Promise.all([
      // Active assignments
      this.prisma.article.findMany({
        where: {
          editorId,
          status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          abstract: true,
          domain: true,
          status: true,
          version: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Completed reviews count
      this.prisma.editorialFeedback.count({
        where: { editorId },
      }),
      // Available articles to claim (SUBMITTED with no editor, matching editor's domain)
      editorDomain
        ? this.prisma.article.findMany({
            where: {
              status: 'SUBMITTED',
              editorId: null,
              domain: editorDomain as never,
              authorId: { not: editorId },
            },
            select: {
              id: true,
              title: true,
              slug: true,
              abstract: true,
              domain: true,
              status: true,
              version: true,
              updatedAt: true,
            },
            orderBy: { submittedAt: 'asc' },
          })
        : [],
    ]);

    return {
      activeAssignments: activeArticles.map((a) => this.toArticleListItemDto(a)),
      completedReviews: completedCount,
      availableArticles: availableArticles.map((a) => this.toArticleListItemDto(a)),
    };
  }

  // ─── Claim Article ───────────────────────────────────────────────────────

  async claimArticle(
    articleId: string,
    editorId: string,
    correlationId: string,
  ): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.status !== 'SUBMITTED' || article.editorId !== null) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Article is not available for claiming',
        HttpStatus.CONFLICT,
      );
    }

    if (article.authorId === editorId) {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You cannot review your own article',
        HttpStatus.FORBIDDEN,
      );
    }

    // Verify editor has approved application for this domain
    const approvedApp = await this.prisma.editorApplication.findFirst({
      where: {
        contributorId: editorId,
        domain: article.domain,
        status: 'APPROVED',
      },
    });

    if (!approvedApp) {
      throw new DomainException(
        ERROR_CODES.EDITOR_NOT_ACTIVE,
        'You are not an approved editor for this domain',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check max concurrent assignments
    const criteria = await this.prisma.editorEligibilityCriteria.findUnique({
      where: { domain: article.domain },
    });

    const activeCount = await this.prisma.article.count({
      where: {
        editorId,
        status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] },
      },
    });

    if (criteria && activeCount >= criteria.maxConcurrentAssignments) {
      throw new DomainException(
        ERROR_CODES.EDITOR_MAX_ASSIGNMENTS_REACHED,
        `You have reached your maximum concurrent assignment limit (${criteria.maxConcurrentAssignments})`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Atomic update with WHERE clause to prevent race conditions
    const claimResult = await this.prisma.article.updateMany({
      where: { id: articleId, status: 'SUBMITTED', editorId: null },
      data: {
        editorId,
        status: 'EDITORIAL_REVIEW',
      },
    });

    if (claimResult.count === 0) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Article was already claimed by another editor',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.article.findUniqueOrThrow({
      where: { id: articleId },
    });

    this.eventEmitter.emit('publication.editor.assigned', {
      articleId,
      authorId: article.authorId,
      editorId,
      domain: article.domain,
      title: article.title,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Editor claimed article', {
      module: 'publication',
      articleId,
      editorId,
      domain: article.domain,
    });

    return {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      abstract: updated.abstract,
      body: updated.body,
      domain: updated.domain,
      status: updated.status as ArticleDto['status'],
      version: updated.version,
      authorId: updated.authorId,
      editorId: updated.editorId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      submittedAt: updated.submittedAt?.toISOString() ?? null,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private toCriteriaDto(criteria: {
    id: string;
    domain: string;
    minContributionCount: number;
    minGovernanceWeight: { toNumber(): number } | number;
    maxConcurrentAssignments: number;
    updatedAt: Date;
  }): EditorEligibilityCriteriaDto {
    return {
      id: criteria.id,
      domain: criteria.domain,
      minContributionCount: criteria.minContributionCount,
      minGovernanceWeight:
        typeof criteria.minGovernanceWeight === 'number'
          ? criteria.minGovernanceWeight
          : criteria.minGovernanceWeight.toNumber(),
      maxConcurrentAssignments: criteria.maxConcurrentAssignments,
      updatedAt: criteria.updatedAt.toISOString(),
    };
  }

  private toApplicationDto(app: {
    id: string;
    contributorId: string;
    domain: string;
    status: string;
    applicationStatement: string;
    reviewedById: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    revokedAt: Date | null;
    revokeReason: string | null;
    createdAt: Date;
    contributor: { name: string; avatarUrl: string | null };
  }): EditorApplicationDto {
    return {
      id: app.id,
      contributorId: app.contributorId,
      contributorName: app.contributor.name,
      contributorAvatarUrl: app.contributor.avatarUrl,
      domain: app.domain,
      status: app.status as EditorApplicationDto['status'],
      applicationStatement: app.applicationStatement,
      reviewedById: app.reviewedById,
      reviewedAt: app.reviewedAt?.toISOString() ?? null,
      reviewNotes: app.reviewNotes,
      revokedAt: app.revokedAt?.toISOString() ?? null,
      revokeReason: app.revokeReason,
      createdAt: app.createdAt.toISOString(),
    };
  }

  private toArticleListItemDto(article: {
    id: string;
    title: string;
    slug: string;
    abstract: string;
    domain: string;
    status: string;
    version: number;
    updatedAt: Date;
  }): ArticleListItemDto {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      abstract: article.abstract,
      domain: article.domain,
      status: article.status as ArticleListItemDto['status'],
      version: article.version,
      updatedAt: article.updatedAt.toISOString(),
    };
  }
}
