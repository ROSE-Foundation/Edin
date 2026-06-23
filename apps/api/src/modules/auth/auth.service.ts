import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus } from '@nestjs/common';
import { randomUUID, randomBytes, createHash } from 'crypto';
import argon2 from 'argon2';
import { ERROR_CODES } from '@edin/shared';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import type { GithubProfile } from './strategies/github.strategy.js';
import type { GoogleProfile } from './strategies/google.strategy.js';

interface AuthContributor {
  id: string;
  role: string;
  githubId: number | null;
  googleId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

interface TokenPair {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenId: string;
}

/** Password-setup token lifetime: 7 days. */
const SETUP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Explicit argon2id parameters (OWASP minimum) — pinned for determinism. */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Constant argon2id hash verified against when no usable account is found, so
 * login does equal work on every path (defeats timing-based user enumeration).
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$VRI0rSQTCy60mLpiADJR4Q$XxjM7kd2jTpeDrfVhhOJxAlCJGxpmV9Dbfn5phKWKts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.refreshTokenTtlSeconds = this.parseExpirationToSeconds(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRATION', '30d'),
    );
  }

  async validateGithubUser(
    profile: GithubProfile,
    correlationId?: string,
  ): Promise<{ contributor: AuthContributor; isNewUser: boolean }> {
    const existing = await this.prisma.contributor.findUnique({
      where: { githubId: profile.githubId },
    });

    const isNewUser = !existing;

    const contributor = await this.prisma.contributor.upsert({
      where: { githubId: profile.githubId },
      create: {
        githubId: profile.githubId,
        githubUsername: profile.username,
        name: profile.displayName,
        email: profile.email?.toLowerCase() ?? null,
        avatarUrl: profile.avatarUrl,
        role: 'APPLICANT',
      },
      update: {
        githubUsername: profile.username,
        name: profile.displayName,
        email: profile.email?.toLowerCase() ?? null,
        avatarUrl: profile.avatarUrl,
      },
    });

    if (isNewUser) {
      await this.createAuditLog(
        'CREATED',
        'contributor',
        contributor.id,
        { source: 'github_oauth', githubId: profile.githubId },
        correlationId,
      );
      this.logger.log('New contributor created via GitHub OAuth', {
        contributorId: contributor.id,
        isNewUser: true,
        correlationId,
      });
    } else {
      this.logger.log('Existing contributor logged in via GitHub OAuth', {
        contributorId: contributor.id,
        isNewUser: false,
        correlationId,
      });
    }

    return {
      contributor: this.toAuthContributor(contributor),
      isNewUser,
    };
  }

  async validateGoogleUser(
    profile: GoogleProfile,
    correlationId?: string,
  ): Promise<{ contributor: AuthContributor; isNewUser: boolean }> {
    const byGoogleId = await this.prisma.contributor.findUnique({
      where: { googleId: profile.googleId },
    });

    if (byGoogleId) {
      const updated = await this.prisma.contributor.update({
        where: { id: byGoogleId.id },
        data: {
          name: profile.displayName,
          email: profile.email?.toLowerCase() ?? null,
          avatarUrl: profile.avatarUrl,
        },
      });
      this.logger.log('Existing contributor logged in via Google OAuth', {
        contributorId: updated.id,
        isNewUser: false,
        correlationId,
      });
      return { contributor: this.toAuthContributor(updated), isNewUser: false };
    }

    if (profile.email && profile.emailVerified) {
      const byEmail = await this.prisma.contributor.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
          this.logger.warn('Google account link conflict — email belongs to a different googleId', {
            contributorId: byEmail.id,
            correlationId,
          });
          throw new DomainException(
            ERROR_CODES.ACCOUNT_LINK_CONFLICT,
            'Email already linked to a different Google account',
            HttpStatus.CONFLICT,
          );
        }

        const linked = await this.prisma.contributor.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.googleId,
            name: profile.displayName,
            avatarUrl: profile.avatarUrl,
          },
        });

        await this.createAuditLog(
          'UPDATED',
          'contributor',
          linked.id,
          {
            source: 'google_oauth_link',
            previouslyHadGithubId: byEmail.githubId !== null,
          },
          correlationId,
          linked.id,
        );

        this.logger.log('Linked Google account to existing contributor', {
          contributorId: linked.id,
          isNewUser: false,
          correlationId,
        });

        return { contributor: this.toAuthContributor(linked), isNewUser: false };
      }
    }

    try {
      const created = await this.prisma.contributor.create({
        data: {
          googleId: profile.googleId,
          email: profile.email?.toLowerCase() ?? null,
          name: profile.displayName,
          avatarUrl: profile.avatarUrl,
          role: 'APPLICANT',
        },
      });

      await this.createAuditLog(
        'CREATED',
        'contributor',
        created.id,
        { source: 'google_oauth', googleId: profile.googleId },
        correlationId,
      );

      this.logger.log('New contributor created via Google OAuth', {
        contributorId: created.id,
        isNewUser: true,
        correlationId,
      });

      return { contributor: this.toAuthContributor(created), isNewUser: true };
    } catch (err) {
      // Unique-email collision on create — happens when a Google sign-in's email matches
      // an existing contributor but `email_verified` was false (so we did not link above).
      // Surface as ACCOUNT_LINK_CONFLICT so the controller redirects to /sign-in?error=email_verification_required.
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002') {
        this.logger.warn(
          'Google sign-in blocked: unverified email collides with existing contributor',
          {
            correlationId,
          },
        );
        throw new DomainException(
          ERROR_CODES.ACCOUNT_LINK_CONFLICT,
          'Verified email required to link to existing account',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  private toAuthContributor(contributor: {
    id: string;
    role: string;
    githubId: number | null;
    googleId: string | null;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  }): AuthContributor {
    return {
      id: contributor.id,
      role: contributor.role,
      githubId: contributor.githubId,
      googleId: contributor.googleId,
      name: contributor.name,
      email: contributor.email,
      avatarUrl: contributor.avatarUrl,
    };
  }

  async generateTokens(contributor: { id: string; role: string }): Promise<TokenPair> {
    const payload = { sub: contributor.id, role: contributor.role };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshTokenId = randomUUID();

    await this.redisService.setRefreshToken(
      contributor.id,
      refreshTokenId,
      this.refreshTokenTtlSeconds,
    );

    return {
      accessToken,
      expiresIn: this.parseExpirationToSeconds(
        this.configService.get<string>('JWT_EXPIRATION', '24h'),
      ),
      refreshToken: `${contributor.id}:${refreshTokenId}`,
      refreshTokenId,
    };
  }

  /**
   * Authenticates with email + password and issues a token pair. Returns a
   * single generic error for any failure (unknown email, no password set,
   * inactive, or wrong password) so the response never reveals which.
   */
  async loginWithPassword(
    email: string,
    password: string,
    correlationId?: string,
  ): Promise<TokenPair> {
    const normalizedEmail = email.trim().toLowerCase();
    const contributor = await this.prisma.contributor.findUnique({
      where: { email: normalizedEmail },
    });

    // Always run a verify (against a dummy hash when no usable account exists)
    // so every path costs the same — no timing-based user enumeration. Any
    // argon2 error (e.g. corrupt stored hash) is treated as a failed login.
    const hashToVerify =
      contributor?.isActive && contributor.passwordHash
        ? contributor.passwordHash
        : DUMMY_PASSWORD_HASH;

    let passwordValid = false;
    try {
      passwordValid = await argon2.verify(hashToVerify, password);
    } catch {
      passwordValid = false;
    }

    if (!contributor || !contributor.isActive || !contributor.passwordHash || !passwordValid) {
      this.logger.warn('Password login failed', { correlationId });
      throw new DomainException(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.logger.log('Password login succeeded', {
      contributorId: contributor.id,
      correlationId,
    });

    return this.generateTokens({ id: contributor.id, role: contributor.role });
  }

  /**
   * Creates a one-time password-setup token for a contributor and returns the
   * RAW token (only its SHA-256 hash is persisted). The caller is responsible
   * for delivering the raw token (e.g. via an email link).
   */
  async createPasswordSetupToken(contributorId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // Issuing a fresh token invalidates any prior unused ones for this
    // contributor, keeping at most one live setup link at a time.
    await this.prisma.$transaction([
      this.prisma.passwordSetupToken.updateMany({
        where: { contributorId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordSetupToken.create({
        data: {
          contributorId,
          tokenHash,
          expiresAt: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
        },
      }),
    ]);

    return rawToken;
  }

  /**
   * Sets a contributor's password from a valid, unexpired, unused setup token,
   * then marks the token used. Throws PASSWORD_SETUP_TOKEN_INVALID otherwise.
   */
  async setPassword(token: string, password: string, correlationId?: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordSetupToken.findUnique({
      where: { tokenHash },
      include: { contributor: { select: { isActive: true } } },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      !record.contributor?.isActive
    ) {
      throw new DomainException(
        ERROR_CODES.PASSWORD_SETUP_TOKEN_INVALID,
        'This password setup link is invalid or has expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

    await this.prisma.$transaction(async (tx) => {
      // Atomically claim the token (usedAt: null guard) to prevent concurrent
      // double-spend of the same link; only the winner sets the password.
      const consumed = await tx.passwordSetupToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw new DomainException(
          ERROR_CODES.PASSWORD_SETUP_TOKEN_INVALID,
          'This password setup link is invalid or has expired',
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx.contributor.update({
        where: { id: record.contributorId },
        data: { passwordHash },
      });
    });

    this.logger.log('Password set via setup token', {
      contributorId: record.contributorId,
      correlationId,
    });
  }

  async refreshTokens(oldRefreshToken: string, correlationId?: string): Promise<TokenPair> {
    const parts = oldRefreshToken.split(':');
    if (parts.length < 2) {
      throw new DomainException(
        ERROR_CODES.REFRESH_TOKEN_INVALID,
        'Invalid refresh token format',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Refresh token format is contributorId:tokenId.
    // We split from the right to safely recover tokenId.
    const tokenId = parts[parts.length - 1];
    const contributorId = parts.slice(0, parts.length - 1).join(':');

    const tokenData = await this.redisService.getRefreshToken(contributorId, tokenId);

    if (!tokenData) {
      this.logger.warn('Refresh token not found or expired', {
        contributorId,
        correlationId,
      });
      throw new DomainException(
        ERROR_CODES.REFRESH_TOKEN_INVALID,
        'Refresh token is invalid or expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Invalidate old token (rotation)
    await this.redisService.deleteRefreshToken(contributorId, tokenId);

    // Verify contributor still exists and is active
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor || !contributor.isActive) {
      throw new DomainException(
        ERROR_CODES.TOKEN_INVALID,
        'Contributor not found or inactive',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.logger.debug('Token refreshed successfully', {
      contributorId,
      correlationId,
    });

    return this.generateTokens({ id: contributor.id, role: contributor.role });
  }

  async logout(contributorId: string, correlationId?: string): Promise<void> {
    await this.redisService.deleteAllRefreshTokens(contributorId);

    this.logger.log('Contributor logged out', {
      contributorId,
      correlationId,
    });
  }

  async createAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    details?: Prisma.InputJsonValue,
    correlationId?: string,
    actorId?: string,
  ): Promise<void> {
    await this.auditService.log({
      actorId: actorId ?? null,
      action,
      entityType,
      entityId,
      details: details ?? undefined,
      correlationId: correlationId ?? undefined,
    });
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
