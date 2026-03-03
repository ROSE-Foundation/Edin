import { SetMetadata } from '@nestjs/common';
import type { AppAbility } from '../../modules/auth/casl/app-ability.type.js';

export interface IPolicyHandler {
  handle(ability: AppAbility): boolean;
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;

export const CHECK_ABILITY_KEY = 'CHECK_ABILITY';
export const CheckAbility = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_ABILITY_KEY, handlers);
