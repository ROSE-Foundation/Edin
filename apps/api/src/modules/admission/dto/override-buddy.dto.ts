import { z } from 'zod';
import { overrideBuddySchema } from '@edin/shared';

export { overrideBuddySchema };

export type OverrideBuddyDto = z.infer<typeof overrideBuddySchema>;
