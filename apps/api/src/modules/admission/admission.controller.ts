import { Controller, Post, Get, Param, Body, Req, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AdmissionService } from './admission.service.js';
import { createApplicationSchema } from './dto/create-application.dto.js';

@Controller({ path: 'admission', version: '1' })
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  @Post('applications')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async createApplication(@Body() body: unknown, @Req() req: Request) {
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid application data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    if (!parsed.data.gdprConsent) {
      throw new DomainException(
        ERROR_CODES.GDPR_CONSENT_REQUIRED,
        'GDPR consent is required to submit an application',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contributorId =
      req.user && typeof req.user === 'object' && 'id' in req.user
        ? String(req.user.id)
        : undefined;

    return this.admissionService.createApplication(parsed.data, req.correlationId, contributorId);
  }

  @Get('applications/:id')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async getApplicationStatus(@Param('id') id: string, @Req() req: Request) {
    return this.admissionService.getApplicationById(id, req.correlationId);
  }

  @Get('micro-tasks/:domain')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async getMicroTaskByDomain(@Param('domain') domain: string, @Req() req: Request) {
    return this.admissionService.getActiveMicroTaskByDomain(domain, req.correlationId);
  }
}
