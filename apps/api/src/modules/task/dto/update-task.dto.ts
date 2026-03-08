import { z } from 'zod';
import { updateTaskSchema, updateTaskStatusSchema } from '@edin/shared';

export { updateTaskSchema, updateTaskStatusSchema };

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusDto = z.infer<typeof updateTaskStatusSchema>;
