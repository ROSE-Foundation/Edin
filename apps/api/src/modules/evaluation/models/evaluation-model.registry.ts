import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class EvaluationModelRegistry {
  private readonly logger = new Logger(EvaluationModelRegistry.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveModel(type: 'code' | 'documentation') {
    const prefix = type === 'code' ? 'code-evaluator' : 'doc-evaluator';

    const model = await this.prisma.evaluationModel.findFirst({
      where: {
        name: { startsWith: prefix },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!model) {
      this.logger.error('No active evaluation model found', {
        module: 'evaluation',
        type,
        prefix,
      });
      throw new DomainException(
        ERROR_CODES.EVALUATION_MODEL_UNAVAILABLE,
        `No active evaluation model available for type: ${type}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.recordModelUsage(model.id);

    return model;
  }

  recordModelUsage(modelId: string): void {
    this.logger.debug('Evaluation model selected', {
      module: 'evaluation',
      modelId,
    });
  }
}
