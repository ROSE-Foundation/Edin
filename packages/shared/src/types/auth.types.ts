import type { z } from 'zod';
import type {
  authTokenResponseSchema,
  refreshTokenRequestSchema,
  githubCallbackQuerySchema,
} from '../schemas/auth.schema.js';

export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type GithubCallbackQuery = z.infer<typeof githubCallbackQuerySchema>;
