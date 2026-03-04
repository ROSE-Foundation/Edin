import { z } from 'zod';
import { createApplicationSchema } from '@edin/shared';

export { createApplicationSchema };

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
