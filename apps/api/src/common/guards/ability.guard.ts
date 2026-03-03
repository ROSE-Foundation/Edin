import { Injectable, CanActivate, ExecutionContext, Logger, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { CaslAbilityFactory } from '../../modules/auth/casl/ability.factory.js';
import {
  CHECK_ABILITY_KEY,
  type IPolicyHandler,
  type PolicyHandler,
} from '../decorators/check-ability.decorator.js';
import type { CurrentUserPayload } from '../decorators/current-user.decorator.js';
import { DomainException } from '../exceptions/domain.exception.js';

@Injectable()
export class AbilityGuard implements CanActivate {
  private readonly logger = new Logger(AbilityGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policyHandlers =
      this.reflector.get<PolicyHandler[] | undefined>(CHECK_ABILITY_KEY, context.getHandler()) ??
      [];

    if (policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      this.logger.warn('AbilityGuard: no user on request', {
        correlationId: request.correlationId,
      });
      throw new DomainException(
        ERROR_CODES.AUTHORIZATION_DENIED,
        'Insufficient permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    request.ability = ability;

    const allowed = policyHandlers.every((handler) => this.execPolicyHandler(handler, ability));

    if (!allowed) {
      this.logger.warn('Authorization denied', {
        contributorId: user.id,
        role: user.role,
        correlationId: request.correlationId,
      });
      throw new DomainException(
        ERROR_CODES.AUTHORIZATION_DENIED,
        'Insufficient permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private execPolicyHandler(
    handler: PolicyHandler,
    ability: Parameters<IPolicyHandler['handle']>[0],
  ): boolean {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
