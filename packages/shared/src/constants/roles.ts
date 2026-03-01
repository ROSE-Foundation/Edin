export const ROLES = {
  PUBLIC: 'PUBLIC',
  APPLICANT: 'APPLICANT',
  CONTRIBUTOR: 'CONTRIBUTOR',
  EDITOR: 'EDITOR',
  FOUNDING_CONTRIBUTOR: 'FOUNDING_CONTRIBUTOR',
  WORKING_GROUP_LEAD: 'WORKING_GROUP_LEAD',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role hierarchy from least to most privileged.
 * Used for ordering and comparison, not for permission checks (use CASL for that).
 */
export const ROLE_HIERARCHY: readonly Role[] = [
  ROLES.PUBLIC,
  ROLES.APPLICANT,
  ROLES.CONTRIBUTOR,
  ROLES.EDITOR,
  ROLES.FOUNDING_CONTRIBUTOR,
  ROLES.WORKING_GROUP_LEAD,
  ROLES.ADMIN,
] as const;
