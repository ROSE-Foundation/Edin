import type { AppAbility } from '../../modules/auth/casl/app-ability.type.js';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      ability?: AppAbility;
    }
  }
}

export {};
