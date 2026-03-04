import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import type { Prisma, ContributorDomain } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { CreateApplicationDto } from './dto/create-application.dto.js';

@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createApplication(
    dto: CreateApplicationDto,
    correlationId?: string,
    contributorId?: string,
  ) {
    this.logger.log('Creating application', {
      domain: dto.domain,
      hasContributorContext: Boolean(contributorId),
      correlationId,
    });

    const now = new Date();

    let application;
    try {
      application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            applicantName: dto.applicantName,
            applicantEmail: dto.applicantEmail,
            domain: dto.domain,
            statementOfInterest: dto.statementOfInterest,
            microTaskDomain: dto.domain,
            microTaskResponse: dto.microTaskResponse,
            microTaskSubmissionUrl: dto.microTaskSubmissionUrl || null,
            gdprConsentVersion: '1.0',
            gdprConsentedAt: now,
            status: 'PENDING',
            contributorId: contributorId || null,
          },
        });

        await tx.consentRecord.create({
          data: {
            entityType: 'Application',
            entityId: created.id,
            consentType: 'GDPR_DATA_PROCESSING',
            consentVersion: '1.0',
            accepted: true,
            acceptedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: contributorId || null,
            action: 'admission.application.submitted',
            entityType: 'Application',
            entityId: created.id,
            details: {
              domain: dto.domain,
              hasContributorContext: Boolean(contributorId),
            },
            correlationId,
          },
        });

        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error, 'applications_applicant_email_key')) {
        throw new DomainException(
          ERROR_CODES.APPLICATION_ALREADY_EXISTS,
          'An application already exists for this email address',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }

    this.logger.log('Application created successfully', {
      applicationId: application.id,
      domain: application.domain,
      correlationId,
    });

    this.eventEmitter.emit('admission.application.submitted', {
      applicationId: application.id,
      applicantEmail: application.applicantEmail,
      domain: application.domain,
      correlationId,
    });

    return application;
  }

  async getApplicationById(applicationId: string, correlationId?: string) {
    this.logger.log('Fetching application status', {
      applicationId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return application;
  }

  async getActiveMicroTaskByDomain(domain: string, correlationId?: string) {
    this.logger.log('Fetching micro-task for domain', {
      domain,
      correlationId,
    });

    const microTask = await this.prisma.microTask.findFirst({
      where: {
        domain: domain as ContributorDomain,
        isActive: true,
      },
    });

    if (!microTask) {
      throw new DomainException(
        ERROR_CODES.DOMAIN_MICRO_TASK_NOT_FOUND,
        `No active micro-task found for domain: ${domain}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return microTask;
  }

  private isUniqueConstraintViolation(error: unknown, constraintName?: string): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const prismaError = error as Prisma.PrismaClientKnownRequestError & {
      meta?: { target?: string[] | string };
    };

    if (prismaError.code !== 'P2002') {
      return false;
    }

    if (!constraintName) {
      return true;
    }

    const target = prismaError.meta?.target;
    if (Array.isArray(target)) {
      return target.includes(constraintName) || target.includes('applicant_email');
    }

    if (typeof target === 'string') {
      return target.includes(constraintName) || target.includes('applicant_email');
    }

    return false;
  }
}
