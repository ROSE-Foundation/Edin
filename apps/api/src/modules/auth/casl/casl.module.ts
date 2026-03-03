import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './ability.factory.js';

@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
