import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@edin/shared';

export class DomainException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly details?: Array<{ field?: string; message: string; code?: string }>;

  constructor(
    errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Array<{ field?: string; message: string; code?: string }>,
  ) {
    super({ code: errorCode, message, details }, status);
    this.errorCode = errorCode;
    this.details = details;
  }
}
