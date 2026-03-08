import { z } from 'zod';
import { createAnnouncementSchema } from '@edin/shared';

export { createAnnouncementSchema };
export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
