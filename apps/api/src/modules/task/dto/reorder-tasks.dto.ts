import { z } from 'zod';
import { reorderTasksSchema } from '@edin/shared';

export { reorderTasksSchema };
export type ReorderTasksDto = z.infer<typeof reorderTasksSchema>;
