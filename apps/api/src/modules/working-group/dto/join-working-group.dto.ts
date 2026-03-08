import { z } from 'zod';
import { joinWorkingGroupSchema } from '@edin/shared';

export { joinWorkingGroupSchema };

export type JoinWorkingGroupDto = z.infer<typeof joinWorkingGroupSchema>;
