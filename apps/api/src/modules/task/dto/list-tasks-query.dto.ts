import { z } from 'zod';
import { listTasksQuerySchema } from '@edin/shared';

export { listTasksQuerySchema };

export type ListTasksQueryDto = z.infer<typeof listTasksQuerySchema>;
