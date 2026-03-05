import { z } from 'zod';
import { buddyOptInSchema } from '@edin/shared';

export { buddyOptInSchema };

export type BuddyOptInDto = z.infer<typeof buddyOptInSchema>;
