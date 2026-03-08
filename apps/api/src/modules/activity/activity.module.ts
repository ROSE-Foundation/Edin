import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { ActivitySseService } from './activity-sse.service.js';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivitySseService],
  exports: [ActivityService],
})
export class ActivityModule {}
