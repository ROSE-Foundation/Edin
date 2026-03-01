import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '@edin/shared';
import type { ApiErrorResponse } from '@edin/shared';
import { DomainException } from '../exceptions/domain.exception.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: Array<{ field?: string; message: string; code?: string }> | undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.errorCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const r = exResponse as Record<string, unknown>;
        message = (r['message'] as string) || message;
        code = (r['code'] as string) || code;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { correlationId, error: exception, path: request.url },
        `Unhandled exception: ${message}`,
      );
    } else {
      this.logger.warn(
        { correlationId, statusCode: status, path: request.url },
        `Client error: ${message}`,
      );
    }

    const errorResponse: ApiErrorResponse = {
      error: {
        code,
        message,
        status,
        correlationId,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
    };

    response.status(status).json(errorResponse);
  }
}
