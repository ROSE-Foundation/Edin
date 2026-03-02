import { z } from 'zod';

export const githubConfigSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
});

export type GithubConfig = z.infer<typeof githubConfigSchema>;
