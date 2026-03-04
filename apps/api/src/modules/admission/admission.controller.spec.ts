import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { VersioningType, HttpStatus } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AdmissionController } from './admission.controller.js';
import { AdmissionService } from './admission.service.js';
import { ResponseWrapperInterceptor } from '../../common/interceptors/response-wrapper.interceptor.js';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter.js';

const mockAdmissionService = {
  createApplication: vi.fn(),
  getApplicationById: vi.fn(),
  getActiveMicroTaskByDomain: vi.fn(),
};

describe('AdmissionController', () => {
  let controller: AdmissionController;

  const validApplicationBody = {
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology',
    statementOfInterest: 'I want to contribute to the Edin community.',
    microTaskResponse: 'Here is my detailed micro-task response.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsent: true,
  };

  const mockApplication = {
    id: 'app-uuid-1',
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology',
    statementOfInterest: 'I want to contribute to the Edin community.',
    microTaskDomain: 'Technology',
    microTaskResponse: 'Here is my detailed micro-task response.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsentVersion: '1.0',
    gdprConsentedAt: new Date().toISOString(),
    status: 'PENDING',
    contributorId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMicroTask = {
    id: 'task-uuid-1',
    domain: 'Technology',
    title: 'Build a REST API endpoint',
    description: 'Design and implement a REST API endpoint.',
    expectedDeliverable: 'A working API endpoint with source code.',
    estimatedEffort: '2-4 hours',
    submissionFormat: 'GitHub repository link or gist',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [AdmissionController],
      providers: [
        {
          provide: AdmissionService,
          useValue: mockAdmissionService,
        },
      ],
    }).compile();

    controller = module.get(AdmissionController);
  });

  describe('POST /api/v1/admission/applications', () => {
    it('creates application with valid data and returns result', async () => {
      mockAdmissionService.createApplication.mockResolvedValueOnce(mockApplication);

      const mockReq = { correlationId: 'corr-1' } as any;
      const result = await controller.createApplication(validApplicationBody, mockReq);

      expect(result).toEqual(mockApplication);
      expect(mockAdmissionService.createApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          applicantName: 'Jane Doe',
          applicantEmail: 'jane@example.com',
          domain: 'Technology',
        }),
        'corr-1',
        undefined,
      );
    });

    it('passes contributor context when authenticated user is present on request', async () => {
      mockAdmissionService.createApplication.mockResolvedValueOnce(mockApplication);

      const mockReq = { correlationId: 'corr-auth', user: { id: 'contributor-1' } } as any;
      await controller.createApplication(validApplicationBody, mockReq);

      expect(mockAdmissionService.createApplication).toHaveBeenCalledWith(
        expect.any(Object),
        'corr-auth',
        'contributor-1',
      );
    });

    it('returns 400 with validation errors for invalid data', async () => {
      const invalidBody = {
        applicantName: '',
        applicantEmail: 'not-an-email',
        domain: 'InvalidDomain',
        statementOfInterest: '',
        microTaskResponse: '',
        gdprConsent: false,
      };

      const mockReq = { correlationId: 'corr-2' } as any;

      await expect(controller.createApplication(invalidBody, mockReq)).rejects.toThrow();
    });

    it('returns 400 when GDPR consent is false', async () => {
      const bodyWithoutConsent = { ...validApplicationBody, gdprConsent: false };
      const mockReq = { correlationId: 'corr-3' } as any;

      await expect(controller.createApplication(bodyWithoutConsent, mockReq)).rejects.toThrow();
    });

    it('returns 400 when required fields are missing', async () => {
      const mockReq = { correlationId: 'corr-4' } as any;

      await expect(controller.createApplication({}, mockReq)).rejects.toThrow();
    });

    it('wraps response in standard envelope via interceptor', async () => {
      mockAdmissionService.createApplication.mockResolvedValueOnce(mockApplication);

      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [AdmissionController],
        providers: [
          {
            provide: AdmissionService,
            useValue: mockAdmissionService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalInterceptors(new ResponseWrapperInterceptor());
      app.useGlobalFilters(new GlobalExceptionFilter());
      await app.init();

      const response = await request(app.getHttpServer())
        .post('/api/v1/admission/applications')
        .send(validApplicationBody)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('correlationId');
      expect(response.body.meta).toHaveProperty('timestamp');

      await app.close();
    });

    it('returns validation error details for invalid email', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [AdmissionController],
        providers: [
          {
            provide: AdmissionService,
            useValue: mockAdmissionService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalFilters(new GlobalExceptionFilter());
      await app.init();

      const response = await request(app.getHttpServer())
        .post('/api/v1/admission/applications')
        .send({ ...validApplicationBody, applicantEmail: 'invalid' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'applicantEmail' })]),
      );

      await app.close();
    });
  });

  describe('GET /api/v1/admission/applications/:id', () => {
    it('returns application status for valid id', async () => {
      const statusResult = {
        id: 'app-uuid-1',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      mockAdmissionService.getApplicationById.mockResolvedValueOnce(statusResult);

      const mockReq = { correlationId: 'corr-5' } as any;
      const result = await controller.getApplicationStatus('app-uuid-1', mockReq);

      expect(result).toEqual(statusResult);
      expect(mockAdmissionService.getApplicationById).toHaveBeenCalledWith('app-uuid-1', 'corr-5');
    });

    it('returns response envelope for status endpoint', async () => {
      mockAdmissionService.getApplicationById.mockResolvedValueOnce({
        id: 'app-uuid-1',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [AdmissionController],
        providers: [
          {
            provide: AdmissionService,
            useValue: mockAdmissionService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalInterceptors(new ResponseWrapperInterceptor());
      app.useGlobalFilters(new GlobalExceptionFilter());
      await app.init();

      const response = await request(app.getHttpServer())
        .get('/api/v1/admission/applications/app-uuid-1')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      await app.close();
    });
  });

  describe('GET /api/v1/admission/micro-tasks/:domain', () => {
    it('returns active micro-task for valid domain', async () => {
      mockAdmissionService.getActiveMicroTaskByDomain.mockResolvedValueOnce(mockMicroTask);

      const mockReq = { correlationId: 'corr-6' } as any;
      const result = await controller.getMicroTaskByDomain('Technology', mockReq);

      expect(result).toEqual(mockMicroTask);
      expect(mockAdmissionService.getActiveMicroTaskByDomain).toHaveBeenCalledWith(
        'Technology',
        'corr-6',
      );
    });

    it('returns response envelope for micro-task endpoint', async () => {
      mockAdmissionService.getActiveMicroTaskByDomain.mockResolvedValueOnce(mockMicroTask);

      const moduleRef = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
        controllers: [AdmissionController],
        providers: [
          {
            provide: AdmissionService,
            useValue: mockAdmissionService,
          },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.useGlobalInterceptors(new ResponseWrapperInterceptor());
      app.useGlobalFilters(new GlobalExceptionFilter());
      await app.init();

      const response = await request(app.getHttpServer())
        .get('/api/v1/admission/micro-tasks/Technology')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      await app.close();
    });
  });
});
