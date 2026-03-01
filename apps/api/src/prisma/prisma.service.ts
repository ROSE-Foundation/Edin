import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Prisma service shell — full implementation in Story 1.2.
 * PrismaClient will be initialized once schema and migrations are configured.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  onModuleInit() {
    this.logger.log('Prisma service initialized (shell — schema in Story 1.2)');
  }

  onModuleDestroy() {
    this.logger.log('Prisma service disconnected');
  }
}
