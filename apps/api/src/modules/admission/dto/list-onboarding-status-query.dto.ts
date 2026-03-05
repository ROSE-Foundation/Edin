import { z } from 'zod';
import { listOnboardingStatusQuerySchema } from '@edin/shared';

export { listOnboardingStatusQuerySchema };

export type ListOnboardingStatusQueryDto = z.infer<typeof listOnboardingStatusQuerySchema>;
