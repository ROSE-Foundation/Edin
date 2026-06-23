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

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be 128 characters or less'),
});

export type SetPasswordDto = z.infer<typeof setPasswordSchema>;
