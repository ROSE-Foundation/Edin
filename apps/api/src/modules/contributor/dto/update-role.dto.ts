import { z } from 'zod';
import { ROLES } from '@edin/shared';

export const updateRoleSchema = z.object({
  role: z.enum([
    ROLES.PUBLIC,
    ROLES.APPLICANT,
    ROLES.CONTRIBUTOR,
    ROLES.EDITOR,
    ROLES.FOUNDING_CONTRIBUTOR,
    ROLES.WORKING_GROUP_LEAD,
    ROLES.ADMIN,
  ]),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
