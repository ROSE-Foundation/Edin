import { z } from 'zod';

const notificationCategoryEnum = z.enum([
  'evaluations',
  'feedback',
  'working-groups',
  'tasks',
  'publications',
]);

export const notificationQueryDto = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: notificationCategoryEnum.optional(),
});

export const markAllReadQueryDto = z.object({
  category: notificationCategoryEnum.optional(),
});

export type NotificationQueryDto = z.infer<typeof notificationQueryDto>;
export type MarkAllReadQueryDto = z.infer<typeof markAllReadQueryDto>;
