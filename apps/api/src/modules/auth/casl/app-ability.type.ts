import type { PureAbility } from '@casl/ability';
import type { PrismaQuery } from '@casl/prisma';
import type { Action } from './action.enum.js';
import type { AppSubjects } from './subjects.js';

export type AppAbility = PureAbility<[Action, AppSubjects | 'all'], PrismaQuery>;
