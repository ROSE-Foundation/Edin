import { z } from 'zod';

export const authTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

export const contributorProfileResponseSchema = z.object({
  id: z.string().uuid(),
  githubId: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
});

export type ContributorProfileResponse = z.infer<typeof contributorProfileResponseSchema>;
