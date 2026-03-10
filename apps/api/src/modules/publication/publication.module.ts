import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ArticleController } from './article.controller.js';
import { EditorialController } from './editorial.controller.js';
import { EditorEligibilityController } from './editor-eligibility.controller.js';
import { PublicArticleController } from './public-article.controller.js';
import { ArticleMetricsController } from './article-metrics.controller.js';
import { ArticleService } from './article.service.js';
import { EditorialService } from './editorial.service.js';
import { EditorEligibilityService } from './editor-eligibility.service.js';
import { ArticleMetricsService } from './article-metrics.service.js';
import { ArticleRewardService } from './article-reward.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArticleController,
    EditorialController,
    EditorEligibilityController,
    PublicArticleController,
    ArticleMetricsController,
  ],
  providers: [
    ArticleService,
    EditorialService,
    EditorEligibilityService,
    ArticleMetricsService,
    ArticleRewardService,
  ],
  exports: [
    ArticleService,
    EditorialService,
    EditorEligibilityService,
    ArticleMetricsService,
    ArticleRewardService,
  ],
})
export class PublicationModule {}
