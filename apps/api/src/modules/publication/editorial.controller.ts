import { Controller, Post, Get, Param, Body, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { EditorialService } from './editorial.service.js';
import { editorialFeedbackSchema, resubmitArticleSchema } from '@edin/shared';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

@Controller({ path: 'articles', version: '1' })
@UseGuards(JwtAuthGuard)
export class EditorialController {
  constructor(private readonly editorialService: EditorialService) {}

  @Get(':id/editorial')
  async getEditorialView(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const view = await this.editorialService.getEditorialView(id, userId);
    return createSuccessResponse(view, req.correlationId ?? '');
  }

  @Post(':id/feedback')
  async submitFeedback(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = editorialFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.EDITORIAL_FEEDBACK_INVALID,
        'Invalid editorial feedback',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const feedback = await this.editorialService.submitFeedback(
      id,
      userId,
      parsed.data,
      req.correlationId ?? '',
    );
    return createSuccessResponse(feedback, req.correlationId ?? '');
  }

  @Get(':id/revisions')
  async getAuthorRevisionView(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const view = await this.editorialService.getAuthorRevisionView(id, userId);
    return createSuccessResponse(view, req.correlationId ?? '');
  }

  @Post(':id/resubmit')
  async resubmitArticle(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = resubmitArticleSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_VALIDATION_FAILED,
        'Invalid resubmission data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const article = await this.editorialService.resubmitArticle(
      id,
      userId,
      parsed.data.body,
      req.correlationId ?? '',
    );
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  @Get(':id/versions')
  async getArticleVersions(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const versions = await this.editorialService.getArticleVersions(id, userId);
    return createSuccessResponse(versions, req.correlationId ?? '');
  }

  @Get(':id/versions/:version')
  async getArticleVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const versionData = await this.editorialService.getArticleVersion(id, version, userId);
    return createSuccessResponse(versionData, req.correlationId ?? '');
  }

  @Post(':id/publish')
  async publishArticle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can publish articles',
        HttpStatus.FORBIDDEN,
      );
    }

    const article = await this.editorialService.publishArticle(id, userId, req.correlationId ?? '');
    return createSuccessResponse(article, req.correlationId ?? '');
  }
}
