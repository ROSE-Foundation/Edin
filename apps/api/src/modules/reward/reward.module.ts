import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ScoringFormulaService } from './scoring-formula.service.js';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import { TemporalAggregationProcessor } from './temporal-aggregation.processor.js';
import { AggregationSchedulerService } from './aggregation-scheduler.service.js';
import { ScoreController } from './score.controller.js';
import { ScoringAdminController } from './scoring-admin.controller.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'reward-aggregation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'reward-aggregation-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [ScoreController, ScoringAdminController],
  providers: [
    ScoringFormulaService,
    TemporalAggregationService,
    TemporalAggregationProcessor,
    AggregationSchedulerService,
  ],
  exports: [ScoringFormulaService, TemporalAggregationService],
})
export class RewardModule {}
