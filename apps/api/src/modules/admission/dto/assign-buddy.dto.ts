import { z } from 'zod';
import { assignBuddySchema } from '@edin/shared';

export { assignBuddySchema };

export type AssignBuddyDto = z.infer<typeof assignBuddySchema>;
