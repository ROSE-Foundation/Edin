import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EditorEligibilityService } from './editor-eligibility.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma
const mockPrisma = {
  editorEligibilityCriteria: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  editorApplication: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  evaluation: {
    count: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  article: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  editorialFeedback: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

const baseCriteria = {
  id: 'criteria-1',
  domain: 'Technology',
  minContributionCount: 10,
  minGovernanceWeight: { toNumber: () => 0 },
  maxConcurrentAssignments: 5,
  updatedAt: new Date(),
  updatedById: null,
};

const baseContributor = {
  name: 'Test User',
  avatarUrl: null,
};

describe('EditorEligibilityService', () => {
  let service: EditorEligibilityService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default mock for checkAllDomainEligibility domain discovery
    mockPrisma.editorEligibilityCriteria.findMany.mockResolvedValue([
      { domain: 'Technology' },
      { domain: 'Fintech' },
      { domain: 'Impact' },
      { domain: 'Governance' },
    ]);

    const module = await Test.createTestingModule({
      providers: [
        EditorEligibilityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EditorEligibilityService>(EditorEligibilityService);
  });

  describe('checkEligibility', () => {
    it('should return eligible=true when contribution count meets threshold', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      mockPrisma.editorApplication.findUnique.mockResolvedValue(null);

      const result = await service.checkEligibility('user-1', 'Technology');

      expect(result.eligible).toBe(true);
      expect(result.current.contributionCount).toBe(15);
      expect(result.criteria.minContributionCount).toBe(10);
    });

    it('should return eligible=false when contribution count is below threshold', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(5);
      mockPrisma.editorApplication.findUnique.mockResolvedValue(null);

      const result = await service.checkEligibility('user-1', 'Technology');

      expect(result.eligible).toBe(false);
      expect(result.current.contributionCount).toBe(5);
    });

    it('should return eligible=false when PENDING application exists', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      mockPrisma.editorApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        contributorId: 'user-1',
        domain: 'Technology',
        status: 'PENDING',
        applicationStatement: 'test',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        contributor: baseContributor,
      });

      const result = await service.checkEligibility('user-1', 'Technology');

      expect(result.eligible).toBe(false);
      expect(result.existingApplication).not.toBeNull();
    });

    it('should return eligible=false when APPROVED application exists', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      mockPrisma.editorApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        contributorId: 'user-1',
        domain: 'Technology',
        status: 'APPROVED',
        applicationStatement: 'test',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        contributor: baseContributor,
      });

      const result = await service.checkEligibility('user-1', 'Technology');

      expect(result.eligible).toBe(false);
    });

    it('should return eligible=true when REJECTED application exists (allow reapply)', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      mockPrisma.editorApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        contributorId: 'user-1',
        domain: 'Technology',
        status: 'REJECTED',
        applicationStatement: 'test',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        contributor: baseContributor,
      });

      const result = await service.checkEligibility('user-1', 'Technology');

      expect(result.eligible).toBe(true);
    });

    it('should throw EDITOR_CRITERIA_NOT_FOUND when no criteria exist', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(null);

      await expect(service.checkEligibility('user-1', 'Unknown')).rejects.toThrow(DomainException);
    });
  });

  describe('submitApplication', () => {
    it('should create application when eligible', async () => {
      // Mock eligibility check — findUnique called twice (checkEligibility + submitApplication)
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      // First call from checkEligibility, second from submitApplication duplicate check
      mockPrisma.editorApplication.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const createdApp = {
        id: 'app-new',
        contributorId: 'user-1',
        domain: 'Technology',
        status: 'PENDING',
        applicationStatement: 'I have expertise in...',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contributor: baseContributor,
      };
      mockPrisma.editorApplication.create.mockResolvedValue(createdApp);

      const result = await service.submitApplication(
        'user-1',
        'Technology',
        'I have expertise in...',
        'corr-1',
      );

      expect(result.id).toBe('app-new');
      expect(result.status).toBe('PENDING');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.application-submitted',
        expect.objectContaining({ contributorId: 'user-1', domain: 'Technology' }),
      );
    });

    it('should throw EDITOR_INELIGIBLE when criteria not met', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(3);
      mockPrisma.editorApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.submitApplication('user-1', 'Technology', 'statement', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('should throw EDITOR_APPLICATION_ALREADY_EXISTS when PENDING application exists', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.evaluation.count.mockResolvedValue(15);
      // First call from checkEligibility
      mockPrisma.editorApplication.findUnique.mockResolvedValueOnce(null);
      // Second call from submitApplication
      mockPrisma.editorApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        status: 'PENDING',
      });

      await expect(
        service.submitApplication('user-1', 'Technology', 'statement', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('reviewApplication', () => {
    const pendingApp = {
      id: 'app-1',
      contributorId: 'user-1',
      domain: 'Technology',
      status: 'PENDING',
      applicationStatement: 'test',
      reviewedById: null,
      reviewedAt: null,
      reviewNotes: null,
      revokedAt: null,
      revokeReason: null,
      createdAt: new Date(),
      contributor: { id: 'user-1', name: 'Test User', avatarUrl: null, role: 'CONTRIBUTOR' },
    };

    it('should approve application and upgrade role', async () => {
      mockPrisma.editorApplication.findUnique.mockResolvedValue(pendingApp);

      const updatedApp = {
        ...pendingApp,
        status: 'APPROVED',
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        reviewNotes: 'Good contributor',
        contributor: baseContributor,
      };

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          editorApplication: { update: vi.fn().mockResolvedValue(updatedApp) },
          contributor: { update: vi.fn() },
        });
      });

      const result = await service.reviewApplication(
        'app-1',
        'admin-1',
        'APPROVED',
        'Good contributor',
        'corr-1',
      );

      expect(result.status).toBe('APPROVED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.application-reviewed',
        expect.objectContaining({ decision: 'APPROVED' }),
      );
    });

    it('should reject application without role change', async () => {
      mockPrisma.editorApplication.findUnique.mockResolvedValue(pendingApp);

      const updatedApp = {
        ...pendingApp,
        status: 'REJECTED',
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
        reviewNotes: 'Insufficient experience',
        contributor: baseContributor,
      };

      const contributorUpdateMock = vi.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          editorApplication: { update: vi.fn().mockResolvedValue(updatedApp) },
          contributor: { update: contributorUpdateMock },
        });
      });

      const result = await service.reviewApplication(
        'app-1',
        'admin-1',
        'REJECTED',
        'Insufficient experience',
        'corr-1',
      );

      expect(result.status).toBe('REJECTED');
      expect(contributorUpdateMock).not.toHaveBeenCalled();
    });

    it('should throw when application not found', async () => {
      mockPrisma.editorApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewApplication('app-x', 'admin-1', 'APPROVED', undefined, 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('should throw when application already reviewed', async () => {
      mockPrisma.editorApplication.findUnique.mockResolvedValue({
        ...pendingApp,
        status: 'APPROVED',
      });

      await expect(
        service.reviewApplication('app-1', 'admin-1', 'APPROVED', undefined, 'corr-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('revokeEditorStatus', () => {
    it('should revoke all approved applications and demote role', async () => {
      mockPrisma.editorApplication.findMany.mockResolvedValue([
        { id: 'app-1', domain: 'Technology', contributorId: 'user-1', status: 'APPROVED' },
      ]);

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          editorApplication: { updateMany: vi.fn() },
          contributor: {
            findUnique: vi.fn().mockResolvedValue({ role: 'EDITOR' }),
            update: vi.fn(),
          },
        });
      });

      await service.revokeEditorStatus('user-1', 'admin-1', 'Inactive editor', 'corr-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.role-revoked',
        expect.objectContaining({ contributorId: 'user-1', domain: 'Technology' }),
      );
    });

    it('should throw when contributor is not an active editor', async () => {
      mockPrisma.editorApplication.findMany.mockResolvedValue([]);

      await expect(
        service.revokeEditorStatus('user-1', 'admin-1', 'Inactive editor', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getEditorDashboard', () => {
    it('should return dashboard with active assignments and available articles', async () => {
      mockPrisma.editorApplication.findFirst.mockResolvedValue({
        domain: 'Technology',
      });
      mockPrisma.article.findMany
        .mockResolvedValueOnce([
          // active assignments
          {
            id: 'art-1',
            title: 'Active Article',
            slug: 'active-article',
            abstract: 'Test',
            domain: 'Technology',
            status: 'EDITORIAL_REVIEW',
            version: 1,
            updatedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          // available articles
          {
            id: 'art-2',
            title: 'Available Article',
            slug: 'available-article',
            abstract: 'Test',
            domain: 'Technology',
            status: 'SUBMITTED',
            version: 1,
            updatedAt: new Date(),
          },
        ]);
      mockPrisma.editorialFeedback.count.mockResolvedValue(8);

      const result = await service.getEditorDashboard('editor-1');

      expect(result.activeAssignments).toHaveLength(1);
      expect(result.completedReviews).toBe(8);
      expect(result.availableArticles).toHaveLength(1);
    });
  });

  describe('claimArticle', () => {
    const submittedArticle = {
      id: 'art-1',
      title: 'Test Article',
      slug: 'test-article',
      abstract: 'Test abstract',
      body: 'Test body',
      domain: 'Technology',
      status: 'SUBMITTED',
      version: 1,
      authorId: 'author-1',
      editorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: new Date(),
      publishedAt: null,
    };

    it('should claim article successfully', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(submittedArticle);
      mockPrisma.editorApplication.findFirst.mockResolvedValue({
        status: 'APPROVED',
        domain: 'Technology',
      });
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.article.count.mockResolvedValue(2);
      mockPrisma.article.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.article.findUniqueOrThrow.mockResolvedValue({
        ...submittedArticle,
        editorId: 'editor-1',
        status: 'EDITORIAL_REVIEW',
      });

      const result = await service.claimArticle('art-1', 'editor-1', 'corr-1');

      expect(result.editorId).toBe('editor-1');
      expect(result.status).toBe('EDITORIAL_REVIEW');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.assigned',
        expect.objectContaining({ articleId: 'art-1', editorId: 'editor-1' }),
      );
    });

    it('should throw when article is not available', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        ...submittedArticle,
        status: 'EDITORIAL_REVIEW',
        editorId: 'other-editor',
      });

      await expect(service.claimArticle('art-1', 'editor-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw when editor has no approved application for domain', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(submittedArticle);
      mockPrisma.editorApplication.findFirst.mockResolvedValue(null);

      await expect(service.claimArticle('art-1', 'editor-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw when max assignments reached', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(submittedArticle);
      mockPrisma.editorApplication.findFirst.mockResolvedValue({
        status: 'APPROVED',
        domain: 'Technology',
      });
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      mockPrisma.article.count.mockResolvedValue(5); // At max

      await expect(service.claimArticle('art-1', 'editor-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw when editor tries to claim own article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        ...submittedArticle,
        authorId: 'editor-1',
      });

      await expect(service.claimArticle('art-1', 'editor-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('listActiveEditors', () => {
    it('should return list of active editors with assignment counts', async () => {
      mockPrisma.editorApplication.findMany.mockResolvedValue([
        {
          id: 'app-1',
          contributorId: 'editor-1',
          domain: 'Technology',
          reviewedAt: new Date(),
          createdAt: new Date(),
          contributor: {
            id: 'editor-1',
            name: 'Editor One',
            avatarUrl: null,
            editedArticles: [{ id: 'art-1' }],
            editorialFeedback: [{ id: 'fb-1' }, { id: 'fb-2' }],
          },
        },
      ]);

      const result = await service.listActiveEditors('Technology');

      expect(result).toHaveLength(1);
      expect(result[0].activeAssignmentCount).toBe(1);
      expect(result[0].totalReviews).toBe(2);
    });
  });

  describe('updateEligibilityCriteria', () => {
    it('should update criteria and return updated values', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(baseCriteria);
      const updated = {
        ...baseCriteria,
        minContributionCount: 15,
        maxConcurrentAssignments: 3,
      };
      mockPrisma.editorEligibilityCriteria.update.mockResolvedValue(updated);

      const result = await service.updateEligibilityCriteria(
        'Technology',
        { minContributionCount: 15, maxConcurrentAssignments: 3 },
        'admin-1',
      );

      expect(result.minContributionCount).toBe(15);
      expect(result.maxConcurrentAssignments).toBe(3);
    });

    it('should throw when domain criteria not found', async () => {
      mockPrisma.editorEligibilityCriteria.findUnique.mockResolvedValue(null);

      await expect(
        service.updateEligibilityCriteria('Unknown', { minContributionCount: 5 }, 'admin-1'),
      ).rejects.toThrow(DomainException);
    });
  });
});
