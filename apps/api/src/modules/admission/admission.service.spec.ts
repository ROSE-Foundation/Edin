import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdmissionService } from './admission.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  application: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  microTask: {
    findFirst: vi.fn(),
  },
  consentRecord: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: any) => unknown) => callback(mockPrisma)),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('AdmissionService', () => {
  let service: AdmissionService;

  const validDto = {
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology' as const,
    statementOfInterest: 'I want to contribute to open source.',
    microTaskResponse: 'Here is my micro-task response with detailed implementation.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsent: true,
  };

  const mockApplication = {
    id: 'app-uuid-1',
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology',
    statementOfInterest: 'I want to contribute to open source.',
    microTaskDomain: 'Technology',
    microTaskResponse: 'Here is my micro-task response with detailed implementation.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsentVersion: '1.0',
    gdprConsentedAt: new Date(),
    status: 'PENDING',
    contributorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AdmissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(AdmissionService);
  });

  describe('createApplication', () => {
    it('creates application with audit log and consent record in transaction', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.createApplication(validDto, 'corr-1');

      expect(result).toEqual(mockApplication);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantName: 'Jane Doe',
          applicantEmail: 'jane@example.com',
          domain: 'Technology',
          microTaskDomain: 'Technology',
          status: 'PENDING',
          gdprConsentVersion: '1.0',
        }),
      });
    });

    it('creates consent record within the transaction', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-2');

      expect(mockPrisma.consentRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'Application',
          entityId: 'app-uuid-1',
          consentType: 'GDPR_DATA_PROCESSING',
          consentVersion: '1.0',
          accepted: true,
        }),
      });
    });

    it('creates audit log entry with correct action and correlationId', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-3');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.application.submitted',
          entityType: 'Application',
          entityId: 'app-uuid-1',
          correlationId: 'corr-3',
          details: {
            domain: 'Technology',
            hasContributorContext: false,
          },
        }),
      });
    });

    it('throws APPLICATION_ALREADY_EXISTS when applicant email already exists', async () => {
      mockPrisma.application.create.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['applications_applicant_email_key'] },
      });

      let caughtError: DomainException | undefined;
      try {
        await service.createApplication(validDto, 'corr-duplicate');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('APPLICATION_ALREADY_EXISTS');
      expect(caughtError!.getStatus()).toBe(409);
    });

    it('emits admission.application.submitted event after creation', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-4');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('admission.application.submitted', {
        applicationId: 'app-uuid-1',
        applicantEmail: 'jane@example.com',
        domain: 'Technology',
        correlationId: 'corr-4',
      });
    });

    it('stores null for microTaskSubmissionUrl when not provided', async () => {
      const dtoWithoutUrl = { ...validDto, microTaskSubmissionUrl: '' };
      mockPrisma.application.create.mockResolvedValueOnce({
        ...mockApplication,
        microTaskSubmissionUrl: null,
      });
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(dtoWithoutUrl, 'corr-5');

      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          microTaskSubmissionUrl: null,
        }),
      });
    });
  });

  describe('getApplicationById', () => {
    it('returns application status when found', async () => {
      const statusResult = {
        id: 'app-uuid-1',
        status: 'PENDING',
        createdAt: new Date(),
      };
      mockPrisma.application.findUnique.mockResolvedValueOnce(statusResult);

      const result = await service.getApplicationById('app-uuid-1', 'corr-6');

      expect(result).toEqual(statusResult);
      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-uuid-1' },
        select: { id: true, status: true, createdAt: true },
      });
    });

    it('throws APPLICATION_NOT_FOUND when application does not exist', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getApplicationById('nonexistent-uuid', 'corr-7');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('APPLICATION_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });

  describe('getActiveMicroTaskByDomain', () => {
    it('returns active micro-task for given domain', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(mockMicroTask);

      const result = await service.getActiveMicroTaskByDomain('Technology', 'corr-8');

      expect(result).toEqual(mockMicroTask);
      expect(mockPrisma.microTask.findFirst).toHaveBeenCalledWith({
        where: { domain: 'Technology', isActive: true },
      });
    });

    it('throws DOMAIN_MICRO_TASK_NOT_FOUND when no active task exists', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getActiveMicroTaskByDomain('Technology', 'corr-9');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('DOMAIN_MICRO_TASK_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });
});
