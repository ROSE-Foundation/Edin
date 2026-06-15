import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { ArticleService } from '../publication/article.service.js';
import { EditorialService } from '../publication/editorial.service.js';
import { ModerationService } from '../publication/moderation.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  AdminArticleListItemDto,
  AdminArticleTransitionInput,
  AdminTransitionAction,
  ArticleNextActor,
  ArticleStatus,
  EditorialFeedbackInput,
  ModerationStatus,
} from '@edin/shared';

type ActorRef = { id: string; name: string };
type ModerationRef = { status: ModerationStatus; isFlagged: boolean } | null;

/**
 * Pure derivation of who must act next and which god-mode transitions an admin
 * may force, given an article's current state. Exported for unit testing.
 */
export function deriveWorkflow(
  status: ArticleStatus,
  moderation: ModerationRef,
  author: ActorRef,
  editor: ActorRef | null,
): { nextActor: ArticleNextActor; availableActions: AdminTransitionAction[] } {
  switch (status) {
    case 'DRAFT':
      return {
        nextActor: { role: 'AUTHOR', id: author.id, name: author.name },
        availableActions: ['SUBMIT'],
      };
    case 'SUBMITTED':
      if (moderation?.isFlagged && moderation.status === 'FLAGGED') {
        return {
          nextActor: { role: 'ADMIN', id: null, name: null },
          availableActions: [
            'MODERATION_DISMISS',
            'MODERATION_REQUEST_CORRECTIONS',
            'MODERATION_REJECT',
          ],
        };
      }
      // Only allow forcing editor assignment once moderation has actually cleared.
      // While the plagiarism check is still PENDING (or no report exists yet), the
      // system owns the next step — forcing assignment here would bypass the gate.
      if (moderation && (moderation.status === 'CLEAN' || moderation.status === 'DISMISSED')) {
        return {
          nextActor: { role: 'SYSTEM', id: null, name: null },
          availableActions: ['ASSIGN_EDITOR'],
        };
      }
      return {
        nextActor: { role: 'SYSTEM', id: null, name: null },
        availableActions: [],
      };
    case 'EDITORIAL_REVIEW':
      return {
        nextActor: editor
          ? { role: 'EDITOR', id: editor.id, name: editor.name }
          : { role: 'EDITOR', id: null, name: null },
        availableActions: ['APPROVE', 'REQUEST_REVISIONS', 'REJECT'],
      };
    case 'REVISION_REQUESTED':
      return {
        nextActor: { role: 'AUTHOR', id: author.id, name: author.name },
        availableActions: ['RESUBMIT'],
      };
    case 'APPROVED':
      return {
        nextActor: { role: 'ADMIN', id: null, name: null },
        availableActions: ['PUBLISH'],
      };
    case 'PUBLISHED':
      return {
        nextActor: { role: 'NONE', id: null, name: null },
        availableActions: ['UNPUBLISH'],
      };
    case 'ARCHIVED':
    default:
      return {
        nextActor: { role: 'NONE', id: null, name: null },
        availableActions: [],
      };
  }
}

const ARTICLE_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  domain: true,
  status: true,
  version: true,
  submittedAt: true,
  publishedAt: true,
  updatedAt: true,
  body: true,
  authorId: true,
  editorId: true,
  author: { select: { id: true, name: true } },
  editor: { select: { id: true, name: true } },
  moderationReports: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { status: true, isFlagged: true },
  },
} satisfies Prisma.ArticleSelect;

type ArticleRow = Prisma.ArticleGetPayload<{ select: typeof ARTICLE_LIST_SELECT }>;

@Injectable()
export class AdminArticlesService {
  private readonly logger = new Logger(AdminArticlesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly articleService: ArticleService,
    private readonly editorialService: EditorialService,
    private readonly moderationService: ModerationService,
  ) {}

  private decodeCursor(cursor: string): string | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { id?: string };
      return parsed.id ?? null;
    } catch {
      return null;
    }
  }

  private encodeCursor(id: string): string {
    return Buffer.from(JSON.stringify({ id }), 'utf8').toString('base64url');
  }

  private toListItem(row: ArticleRow): AdminArticleListItemDto {
    const moderation = row.moderationReports[0]
      ? {
          status: row.moderationReports[0].status as ModerationStatus,
          isFlagged: row.moderationReports[0].isFlagged,
        }
      : null;
    const editor = row.editor ? { id: row.editor.id, name: row.editor.name } : null;
    const { nextActor, availableActions } = deriveWorkflow(
      row.status as ArticleStatus,
      moderation,
      { id: row.author.id, name: row.author.name },
      editor,
    );

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      domain: row.domain,
      status: row.status as ArticleStatus,
      version: row.version,
      author: { id: row.author.id, name: row.author.name },
      editor,
      moderationStatus: moderation?.status ?? null,
      nextActor,
      availableActions,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(params: {
    status?: string;
    domain?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const where: Prisma.ArticleWhereInput = {};

    if (params.status) {
      where.status = params.status as Prisma.EnumArticleStatusFilter;
    }
    if (params.domain) {
      where.domain = params.domain as Prisma.EnumContributorDomainFilter;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { author: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const cursorId = params.cursor ? this.decodeCursor(params.cursor) : null;

    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        take: limit + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        // id is the tiebreaker so the sort is a total order matching the unique cursor
        // (updatedAt alone is non-unique and would skip/duplicate rows across pages).
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: ARTICLE_LIST_SELECT,
      }),
      this.prisma.article.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && items.length > 0 ? this.encodeCursor(items[items.length - 1].id) : null;

    return {
      data: items.map((row) => this.toListItem(row)),
      pagination: { nextCursor, hasMore, limit },
      total,
    };
  }

  /**
   * Force an article to its next state on behalf of any actor (admin god-mode).
   * Validates the action is legal from the current status, delegates to the
   * existing transition service so side-effects/events stay identical, and
   * records an ADMIN_FORCE_TRANSITION audit entry with the mandatory reason.
   */
  async forceTransition(
    articleId: string,
    adminId: string,
    input: AdminArticleTransitionInput,
    correlationId: string,
  ): Promise<AdminArticleListItemDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: ARTICLE_LIST_SELECT,
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const moderation = article.moderationReports[0]
      ? {
          status: article.moderationReports[0].status as ModerationStatus,
          isFlagged: article.moderationReports[0].isFlagged,
        }
      : null;
    const { availableActions } = deriveWorkflow(
      article.status as ArticleStatus,
      moderation,
      { id: article.author.id, name: article.author.name },
      article.editor ? { id: article.editor.id, name: article.editor.name } : null,
    );

    if (!availableActions.includes(input.action)) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        `Action ${input.action} is not valid for an article in status ${article.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const previousStatus = article.status;
    await this.dispatch(article, adminId, input, correlationId);

    const updated = await this.prisma.article.findUniqueOrThrow({
      where: { id: articleId },
      select: ARTICLE_LIST_SELECT,
    });

    // assignEditor is a silent no-op when no eligible editor exists: it leaves the
    // article in SUBMITTED. Surface that as an error instead of a false "success"
    // (and skip the audit entry, since no transition actually occurred).
    if (input.action === 'ASSIGN_EDITOR' && updated.status === previousStatus) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NO_EDITOR_AVAILABLE,
        'No eligible editor is available to assign to this article',
        HttpStatus.CONFLICT,
      );
    }

    await this.auditService.log({
      actorId: adminId,
      action: 'ADMIN_FORCE_TRANSITION',
      entityType: 'Article',
      entityId: articleId,
      previousState: { status: previousStatus },
      newState: { status: updated.status },
      reason: input.reason,
      details: { action: input.action },
      correlationId,
    });

    this.logger.log('Admin forced article transition', {
      module: 'admin',
      articleId,
      adminId,
      action: input.action,
      previousStatus,
      newStatus: updated.status,
      correlationId,
    });

    return this.toListItem(updated);
  }

  private async dispatch(
    article: ArticleRow,
    adminId: string,
    input: AdminArticleTransitionInput,
    correlationId: string,
  ): Promise<void> {
    const { action, reason } = input;
    switch (action) {
      case 'SUBMIT':
        await this.articleService.submitArticle(article.id, adminId, correlationId, {
          adminOverride: true,
        });
        return;
      case 'ASSIGN_EDITOR':
        await this.editorialService.assignEditor(article.id, correlationId);
        return;
      case 'APPROVE':
      case 'REQUEST_REVISIONS':
      case 'REJECT': {
        const decision =
          action === 'APPROVE' ? 'APPROVE' : action === 'REJECT' ? 'REJECT' : 'REQUEST_REVISIONS';
        const feedback: EditorialFeedbackInput = {
          decision,
          overallAssessment: reason,
          revisionRequests: input.revisionRequests ?? [],
          inlineComments: [],
        };
        await this.editorialService.submitFeedback(article.id, adminId, feedback, correlationId, {
          adminOverride: true,
        });
        return;
      }
      case 'RESUBMIT':
        await this.editorialService.resubmitArticle(
          article.id,
          adminId,
          input.body ?? article.body,
          correlationId,
          { adminOverride: true },
        );
        return;
      case 'PUBLISH':
        await this.editorialService.publishArticle(article.id, adminId, correlationId);
        return;
      case 'UNPUBLISH':
        await this.moderationService.adminUnpublishArticle(
          article.id,
          adminId,
          reason,
          correlationId,
        );
        return;
      case 'MODERATION_DISMISS':
        await this.moderationService.adminDismissFlag(article.id, adminId, reason, correlationId);
        return;
      case 'MODERATION_REQUEST_CORRECTIONS':
        await this.moderationService.adminRequestCorrections(
          article.id,
          adminId,
          reason,
          correlationId,
        );
        return;
      case 'MODERATION_REJECT':
        await this.moderationService.adminRejectArticle(article.id, adminId, reason, correlationId);
        return;
      default: {
        const exhaustive: never = action;
        throw new DomainException(
          ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
          `Unsupported action ${String(exhaustive)}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
