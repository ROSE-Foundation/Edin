import { z } from 'zod';

export const authConfigSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('30d'),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
