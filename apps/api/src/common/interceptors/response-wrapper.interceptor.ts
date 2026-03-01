import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';
import { createSuccessResponse } from '../types/api-response.type.js';

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.correlationId || 'unknown';

    return next.handle().pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data;
        }

        return createSuccessResponse(data, correlationId);
      }),
    );
  }
}
