import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../exceptions/domain.exception.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: Error | null, user: T, info: Error | undefined): T {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new DomainException(
          ERROR_CODES.TOKEN_EXPIRED,
          'Access token has expired',
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new DomainException(
        ERROR_CODES.AUTHENTICATION_FAILED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }
}
