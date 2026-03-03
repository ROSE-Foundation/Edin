import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { AbilityGuard } from './ability.guard.js';
import { CaslAbilityFactory } from '../../modules/auth/casl/ability.factory.js';
import { DomainException } from '../exceptions/domain.exception.js';
import { Action } from '../../modules/auth/casl/action.enum.js';
import type { AppAbility } from '../../modules/auth/casl/app-ability.type.js';

describe('AbilityGuard', () => {
  let guard: AbilityGuard;
  let reflector: Reflector;
  let caslAbilityFactory: CaslAbilityFactory;

  const mockUser = {
    id: 'user-uuid-1',
    githubId: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    role: 'CONTRIBUTOR',
  };

  const createMockContext = (user?: typeof mockUser): ExecutionContext => {
    const mockRequest = {
      user,
      correlationId: 'test-correlation-id',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AbilityGuard,
        {
          provide: Reflector,
          useValue: {
            get: vi.fn(),
          },
        },
        CaslAbilityFactory,
      ],
    }).compile();

    guard = module.get(AbilityGuard);
    reflector = module.get(Reflector);
    caslAbilityFactory = module.get(CaslAbilityFactory);
  });

  it('returns true when no policy handlers are defined', () => {
    vi.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when empty policy handlers array', () => {
    vi.spyOn(reflector, 'get').mockReturnValue([]);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when policy handler passes', () => {
    const handler = (ability: AppAbility) => ability.can(Action.Read, 'Contributor');
    vi.spyOn(reflector, 'get').mockReturnValue([handler]);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws DomainException with AUTHORIZATION_DENIED when policy fails', () => {
    const handler = (ability: AppAbility) => ability.can(Action.Manage, 'all');
    vi.spyOn(reflector, 'get').mockReturnValue([handler]);
    const context = createMockContext(mockUser);

    expect(() => guard.canActivate(context)).toThrow(DomainException);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect((e as DomainException).errorCode).toBe('AUTHORIZATION_DENIED');
      expect((e as DomainException).getStatus()).toBe(403);
    }
  });

  it('throws DomainException when no user on request', () => {
    const handler = (ability: AppAbility) => ability.can(Action.Read, 'Contributor');
    vi.spyOn(reflector, 'get').mockReturnValue([handler]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(DomainException);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect((e as DomainException).errorCode).toBe('AUTHORIZATION_DENIED');
      expect((e as DomainException).getStatus()).toBe(403);
    }
  });

  it('attaches ability to request when policy passes', () => {
    const handler = (ability: AppAbility) => ability.can(Action.Read, 'Contributor');
    vi.spyOn(reflector, 'get').mockReturnValue([handler]);
    const mockRequest: Record<string, unknown> = {
      user: mockUser,
      correlationId: 'test-correlation-id',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    guard.canActivate(context);
    expect(mockRequest.ability).toBeDefined();
  });

  it('supports class-based policy handlers', () => {
    const classHandler = {
      handle: (ability: AppAbility) => ability.can(Action.Read, 'Contributor'),
    };
    vi.spyOn(reflector, 'get').mockReturnValue([classHandler]);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('requires all policy handlers to pass', () => {
    const passingHandler = (ability: AppAbility) => ability.can(Action.Read, 'Contributor');
    const failingHandler = (ability: AppAbility) => ability.can(Action.Manage, 'all');
    vi.spyOn(reflector, 'get').mockReturnValue([passingHandler, failingHandler]);
    const context = createMockContext(mockUser);

    expect(() => guard.canActivate(context)).toThrow(DomainException);
  });

  it('uses CaslAbilityFactory to create ability', () => {
    const spy = vi.spyOn(caslAbilityFactory, 'createForUser');
    const handler = (ability: AppAbility) => ability.can(Action.Read, 'Contributor');
    vi.spyOn(reflector, 'get').mockReturnValue([handler]);
    const context = createMockContext(mockUser);

    guard.canActivate(context);
    expect(spy).toHaveBeenCalledWith(mockUser);
  });
});
