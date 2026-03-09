import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { EditorEligibilityService } from './editor-eligibility.service.js';
import {
  editorApplicationSchema,
  reviewEditorApplicationSchema,
  updateEligibilityCriteriaSchema,
  revokeEditorSchema,
  editorApplicationStatusEnum,
  domainEnum,
  ERROR_CODES,
} from '@edin/shared';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { Request } from 'express';

@Controller({ path: 'publication', version: '1' })
@UseGuards(JwtAuthGuard)
export class EditorEligibilityController {
  constructor(private readonly editorEligibilityService: EditorEligibilityService) {}

  // ─── Contributor Endpoints ─────────────────────────────────────────────

  @Get('editor-eligibility')
  async checkAllEligibility(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const checks = await this.editorEligibilityService.checkAllDomainEligibility(userId);
    return createSuccessResponse(checks, req.correlationId ?? '');
  }

  @Get('editor-eligibility/:domain')
  async checkDomainEligibility(
    @Param('domain') domain: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = domainEnum.safeParse(domain);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid domain: ${domain}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const check = await this.editorEligibilityService.checkEligibility(userId, parsed.data);
    return createSuccessResponse(check, req.correlationId ?? '');
  }

  @Post('editor-applications')
  async submitApplication(
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = editorApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid editor application',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const application = await this.editorEligibilityService.submitApplication(
      userId,
      parsed.data.domain,
      parsed.data.applicationStatement,
      req.correlationId ?? '',
    );
    return createSuccessResponse(application, req.correlationId ?? '');
  }

  @Get('editor-applications/mine')
  async getMyApplications(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const apps = await this.editorEligibilityService.getMyApplications(userId);
    return createSuccessResponse(apps, req.correlationId ?? '');
  }

  // ─── Editor Dashboard ────────────────────────────────────────────────────

  @Get('editor-dashboard')
  async getEditorDashboard(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'EDITOR' && userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only editors can access the editorial dashboard',
        HttpStatus.FORBIDDEN,
      );
    }
    const dashboard = await this.editorEligibilityService.getEditorDashboard(userId);
    return createSuccessResponse(dashboard, req.correlationId ?? '');
  }

  @Post('editor-claim/:articleId')
  async claimArticle(
    @Param('articleId') articleId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'EDITOR' && userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only editors can claim articles',
        HttpStatus.FORBIDDEN,
      );
    }
    const article = await this.editorEligibilityService.claimArticle(
      articleId,
      userId,
      req.correlationId ?? '',
    );
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  // ─── Admin Endpoints ─────────────────────────────────────────────────────

  @Get('editor-applications')
  async listApplications(
    @Query('status') status: string | undefined,
    @Query('domain') domain: string | undefined,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can list all applications',
        HttpStatus.FORBIDDEN,
      );
    }
    const validatedStatus = status ? editorApplicationStatusEnum.safeParse(status) : undefined;
    if (status && !validatedStatus?.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid status filter: ${status}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const validatedDomain = domain ? domainEnum.safeParse(domain) : undefined;
    if (domain && !validatedDomain?.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid domain filter: ${domain}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const apps = await this.editorEligibilityService.listApplications({ status, domain });
    return createSuccessResponse(apps, req.correlationId ?? '');
  }

  @Patch('editor-applications/:id/review')
  async reviewApplication(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can review applications',
        HttpStatus.FORBIDDEN,
      );
    }

    const parsed = reviewEditorApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid review data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const application = await this.editorEligibilityService.reviewApplication(
      id,
      userId,
      parsed.data.decision,
      parsed.data.reviewNotes,
      req.correlationId ?? '',
    );
    return createSuccessResponse(application, req.correlationId ?? '');
  }

  @Post('editors/:contributorId/revoke')
  async revokeEditor(
    @Param('contributorId') contributorId: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can revoke editor status',
        HttpStatus.FORBIDDEN,
      );
    }

    const parsed = revokeEditorSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid revoke data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    await this.editorEligibilityService.revokeEditorStatus(
      contributorId,
      userId,
      parsed.data.reason,
      req.correlationId ?? '',
    );
    return createSuccessResponse({ success: true }, req.correlationId ?? '');
  }

  @Get('editor-criteria')
  async listCriteria(
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can view eligibility criteria',
        HttpStatus.FORBIDDEN,
      );
    }
    const criteria = await this.editorEligibilityService.listAllCriteria();
    return createSuccessResponse(criteria, req.correlationId ?? '');
  }

  @Patch('editor-criteria/:domain')
  async updateCriteria(
    @Param('domain') domain: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can update eligibility criteria',
        HttpStatus.FORBIDDEN,
      );
    }

    const domainParsed = domainEnum.safeParse(domain);
    if (!domainParsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid domain: ${domain}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = updateEligibilityCriteriaSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid criteria data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const criteria = await this.editorEligibilityService.updateEligibilityCriteria(
      domainParsed.data,
      parsed.data,
      userId,
    );
    return createSuccessResponse(criteria, req.correlationId ?? '');
  }

  @Get('editors')
  async listActiveEditors(
    @Query('domain') domain: string | undefined,
    @CurrentUser('role') userRole: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (userRole !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can list active editors',
        HttpStatus.FORBIDDEN,
      );
    }
    const editors = await this.editorEligibilityService.listActiveEditors(domain);
    return createSuccessResponse(editors, req.correlationId ?? '');
  }
}
