import { Controller, Get } from '@nestjs/common';
import { ShowcaseService } from './showcase.service.js';

@Controller({ path: 'showcase', version: '1' })
export class ShowcaseController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Get('metrics')
  async getPlatformMetrics() {
    return this.showcaseService.getPlatformMetrics();
  }

  @Get('reward-methodology')
  getRewardMethodology() {
    return this.showcaseService.getRewardMethodology();
  }
}
