import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class ContributorService {
  private readonly logger = new Logger(ContributorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateRole(
    contributorId: string,
    dto: UpdateRoleDto,
    actorId: string,
    correlationId?: string,
  ) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (contributor.role === dto.role) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Contributor already has role ${dto.role}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldRole = contributor.role;

    const updated = await this.prisma.contributor.update({
      where: { id: contributorId },
      data: { role: dto.role },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ROLE_CHANGED',
        entityType: 'contributor',
        entityId: contributorId,
        details: { oldRole, newRole: dto.role, actorId },
        correlationId,
      },
    });

    this.logger.log('Contributor role updated', {
      contributorId,
      oldRole,
      newRole: dto.role,
      actorId,
      correlationId,
    });

    return updated;
  }
}
