import { Controller, Get, Param, Logger, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '@edin/shared';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Controller({ path: 'public/track-record', version: '1' })
export class TrackRecordPublicController {
  private readonly logger = new Logger(TrackRecordPublicController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('contributor/:id')
  async getContributorTrackRecord(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const correlationId = randomUUID();

    // Verify contributor exists
    const contributor = await this.prisma.contributor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Chatham House–consistent: return milestone names and dates only
    // No internal scoring data, no outcome details, no evaluation metrics
    const milestones = await this.prisma.trackRecordMilestone.findMany({
      where: { contributorId: id },
      select: {
        id: true,
        milestoneType: true,
        thresholdName: true,
        crossedAt: true,
      },
      orderBy: { crossedAt: 'desc' },
    });

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

    this.logger.debug('Public track record served', {
      module: 'evaluation',
      contributorId: id,
      milestoneCount: milestones.length,
      correlationId,
    });

    return createSuccessResponse(
      {
        contributorId: id,
        milestones: milestones.map((m) => ({
          id: m.id,
          milestoneType: m.milestoneType,
          thresholdName: m.thresholdName,
          crossedAt: m.crossedAt.toISOString(),
        })),
      },
      correlationId,
    );
  }
}
