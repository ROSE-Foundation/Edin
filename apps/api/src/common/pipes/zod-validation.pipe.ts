import { PipeTransform, Injectable, HttpStatus } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { DomainException } from '../exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    return result.data as unknown;
  }
}
