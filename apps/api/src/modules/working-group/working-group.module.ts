import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { WorkingGroupController } from './working-group.controller.js';
import { WorkingGroupService } from './working-group.service.js';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [WorkingGroupController],
  providers: [WorkingGroupService],
  exports: [WorkingGroupService],
})
export class WorkingGroupModule {}
