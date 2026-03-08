import { z } from 'zod';
import { createTaskSchema } from '@edin/shared';

export { createTaskSchema };

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
