import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { AdmissionController, BuddyOptInController } from './admission.controller.js';
import { AdmissionService } from './admission.service.js';
import { AdmissionEmailListener } from './admission-email.listener.js';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [AdmissionController, BuddyOptInController],
  providers: [AdmissionService, AdmissionEmailListener],
  exports: [AdmissionService],
})
export class AdmissionModule {}
