import { z } from 'zod';

export const redisConfigSchema = z.object({
  REDIS_URL: z.string().url(),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;
