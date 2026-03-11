import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { VersioningType } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { REWARD_METHODOLOGY } from '@edin/shared';
import { ShowcaseController } from './showcase.controller.js';
import { ShowcaseService } from './showcase.service.js';
import { ResponseWrapperInterceptor } from '../../common/interceptors/response-wrapper.interceptor.js';

const mockShowcaseService = {
  getPlatformMetrics: vi.fn(),
  getRewardMethodology: vi.fn(),
};

describe('ShowcaseController', () => {
  let controller: ShowcaseController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ShowcaseController],
      providers: [
        {
          provide: ShowcaseService,
          useValue: mockShowcaseService,
        },
      ],
    }).compile();

    controller = module.get(ShowcaseController);
  });

  describe('GET /api/v1/showcase/metrics', () => {
    const mockMetrics = {
      activeContributors: 25,
      contributionVelocity: 0,
      domainDistribution: [
        { domain: 'Technology', count: 10, percentage: 40 },
        { domain: 'Finance', count: 8, percentage: 32 },
        { domain: 'Impact', count: 4, percentage: 16 },
        { domain: 'Governance', count: 3, percentage: 12 },
      ],
      retentionRate: 78,
    };

    it('returns 200 with platform metrics data', async () => {
      mockShowcaseService.getPlatformMetrics.mockResolvedValueOnce(mockMetrics);

      const result = await controller.getPlatformMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockShowcaseService.getPlatformMetrics).toHaveBeenCalled();
    });

    it('wraps response in { data, meta } envelope through interceptor', async () => {
      mockShowcaseService.getPlatformMetrics.mockResolvedValueOnce(mockMetrics);

      const moduleRef = await Test.createTestingModule({
        controllers: [ShowcaseController],
        providers: [
          {
            provide: ShowcaseService,
            useValue: mockShowcaseService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalInterceptors(new ResponseWrapperInterceptor());
      await app.init();

      const response = await request(app.getHttpServer())
        .get('/api/v1/showcase/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toEqual(mockMetrics);

      await app.close();
    });

    it('requires no authentication (no JwtAuthGuard)', () => {
      const method = ShowcaseController.prototype.getPlatformMetrics;
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);

      expect(guards).toBeUndefined();
    });
  });

  describe('GET /api/v1/showcase/reward-methodology', () => {
    it('returns 200 with methodology content', () => {
      mockShowcaseService.getRewardMethodology.mockReturnValueOnce(REWARD_METHODOLOGY);

      const result = controller.getRewardMethodology();

      expect(result).toEqual(REWARD_METHODOLOGY);
      expect(result.overview).toBeTruthy();
      expect(result.scalingCurve).toHaveLength(5);
      expect(result.formulaComponents).toHaveLength(4);
      expect(result.glossary).toHaveLength(4);
    });

    it('wraps methodology response in { data, meta } envelope through interceptor', async () => {
      mockShowcaseService.getRewardMethodology.mockReturnValueOnce(REWARD_METHODOLOGY);

      const moduleRef = await Test.createTestingModule({
        controllers: [ShowcaseController],
        providers: [
          {
            provide: ShowcaseService,
            useValue: mockShowcaseService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalInterceptors(new ResponseWrapperInterceptor());
      await app.init();

      const response = await request(app.getHttpServer())
        .get('/api/v1/showcase/reward-methodology')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toEqual(REWARD_METHODOLOGY);

      await app.close();
    });

    it('requires no authentication (no JwtAuthGuard)', () => {
      const method = ShowcaseController.prototype.getRewardMethodology;
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);

      expect(guards).toBeUndefined();
    });
  });
});
