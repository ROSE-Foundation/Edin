import { z } from 'zod';

export const announcementSchema = z.object({
  id: z.string().uuid(),
  workingGroupId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().max(500),
  createdAt: z.string().datetime(),
  author: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
});

export const createAnnouncementSchema = z.object({
  content: z
    .string()
    .min(1, 'Announcement content is required')
    .max(500, 'Announcement must be 500 characters or less'),
});

export type AnnouncementSchemaDto = z.infer<typeof announcementSchema>;
export type CreateAnnouncementSchemaDto = z.infer<typeof createAnnouncementSchema>;
