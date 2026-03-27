import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { NewspaperModule } from '../newspaper/newspaper.module.js';
import { ChannelController } from './channel.controller.js';
import { ChannelService } from './channel.service.js';
import { PrizeCategoryController } from './prize-category.controller.js';
import { PrizeCategoryService } from './prize-category.service.js';
import { MeaningfulEventService } from './meaningful-event.service.js';
import { CrossDomainPrizeService } from './cross-domain-prize.service.js';
import { BreakthroughPrizeService } from './breakthrough-prize.service.js';
import { PrizeAwardService } from './prize-award.service.js';
import { PrizeAwardController } from './prize-award.controller.js';
import { CommunityNominationService } from './community-nomination.service.js';
import { CommunityNominationController } from './community-nomination.controller.js';
import { NominationVotingService } from './nomination-voting.service.js';
import { NominationVotingController } from './nomination-voting.controller.js';
import { VoteThresholdPrizeService } from './vote-threshold-prize.service.js';

@Module({
  imports: [PrismaModule, CaslModule, ActivityModule, NewspaperModule],
  controllers: [
    ChannelController,
    PrizeCategoryController,
    PrizeAwardController,
    CommunityNominationController,
    NominationVotingController,
  ],
  providers: [
    ChannelService,
    PrizeCategoryService,
    MeaningfulEventService,
    CrossDomainPrizeService,
    BreakthroughPrizeService,
    PrizeAwardService,
    CommunityNominationService,
    NominationVotingService,
    VoteThresholdPrizeService,
  ],
  exports: [
    ChannelService,
    PrizeCategoryService,
    MeaningfulEventService,
    CrossDomainPrizeService,
    BreakthroughPrizeService,
    PrizeAwardService,
    CommunityNominationService,
    NominationVotingService,
    VoteThresholdPrizeService,
  ],
})
export class PrizesModule {}
