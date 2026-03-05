import { z } from 'zod';
import { listBuddyAssignmentsQuerySchema } from '@edin/shared';

export { listBuddyAssignmentsQuerySchema };

export type ListBuddyAssignmentsQueryDto = z.infer<typeof listBuddyAssignmentsQuerySchema>;
