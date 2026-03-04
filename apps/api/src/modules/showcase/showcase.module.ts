import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { ShowcaseController } from './showcase.controller.js';
import { ShowcaseService } from './showcase.service.js';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ShowcaseController],
  providers: [ShowcaseService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}
