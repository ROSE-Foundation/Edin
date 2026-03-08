import { z } from 'zod';
import { workingGroupIdParamSchema } from '@edin/shared';

export { workingGroupIdParamSchema };

export type WorkingGroupIdParamDto = z.infer<typeof workingGroupIdParamSchema>;
