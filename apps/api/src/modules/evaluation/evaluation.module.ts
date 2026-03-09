import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationDispatchProcessor } from './processors/evaluation-dispatch.processor.js';
import { CodeEvaluationProcessor } from './processors/code-evaluation.processor.js';
import { EvaluationModelRegistry } from './models/evaluation-model.registry.js';
import { AnthropicEvaluationProvider } from './providers/anthropic-evaluation.provider.js';
import { EVALUATION_PROVIDER } from './providers/evaluation-provider.interface.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'evaluation-dispatch',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
    BullModule.registerQueue({
      name: 'code-evaluation',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
  ],
  controllers: [EvaluationController],
  providers: [
    EvaluationService,
    EvaluationDispatchProcessor,
    CodeEvaluationProcessor,
    EvaluationModelRegistry,
    {
      provide: EVALUATION_PROVIDER,
      useClass: AnthropicEvaluationProvider,
    },
  ],
  exports: [EvaluationService],
})
export class EvaluationModule {}
