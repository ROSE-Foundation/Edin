import { z } from 'zod';

export const authTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().positive(),
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().optional(),
});

export const githubCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});
