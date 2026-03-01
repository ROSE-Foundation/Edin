import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: IncomingMessage & { correlationId?: string }, res: ServerResponse) => {
          const headerValue = req.headers['x-correlation-id'];
          const correlationId =
            typeof headerValue === 'string' && headerValue.trim().length > 0
              ? headerValue
              : randomUUID();

          req.correlationId = correlationId;
          res.setHeader('x-correlation-id', correlationId);

          return correlationId;
        },
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        customProps: (req: IncomingMessage & { correlationId?: string }) => ({
          correlationId: req.correlationId,
        }),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          remove: true,
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
