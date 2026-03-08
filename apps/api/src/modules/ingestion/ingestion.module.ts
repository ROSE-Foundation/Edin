import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { IngestionController } from './ingestion.controller.js';
import { IngestionService } from './ingestion.service.js';
import { GitHubApiService } from './github-api.service.js';
import { WebhookProcessor } from './processors/webhook.processor.js';
import { ContributionAttributionService } from './services/contribution-attribution.service.js';
import { ContributionController } from './contribution.controller.js';
import { ContributionSseController } from './contribution-sse.controller.js';
import { ContributionSseService } from './contribution-sse.service.js';
import { CollaborationDetectionService } from './services/collaboration-detection.service.js';
import { CollaborationController } from './collaboration.controller.js';
import { AdminContributionController } from './admin-contribution.controller.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    BullModule.registerQueue({
      name: 'github-ingestion',
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
      name: 'github-ingestion-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    IngestionController,
    ContributionController,
    ContributionSseController,
    CollaborationController,
    AdminContributionController,
  ],
  providers: [
    IngestionService,
    GitHubApiService,
    WebhookProcessor,
    ContributionAttributionService,
    ContributionSseService,
    CollaborationDetectionService,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}
