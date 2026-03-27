import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Schema isolation tests for NP-NFR2: Track Record Evaluation Stream Independence.
 *
 * These tests verify that:
 * 1. The TrackRecordComputeService does not import from evaluation.service or combined-evaluation.service
 * 2. The Prisma schema does not create foreign keys between track_record_* tables and evaluations/contribution_scores
 */
describe('Track Record Stream Independence (NP-NFR2)', () => {
  describe('TrackRecordComputeService import isolation', () => {
    const serviceSource = readFileSync(
      resolve(__dirname, './track-record-compute.service.ts'),
      'utf-8',
    );

    it('should not import from evaluation.service', () => {
      expect(serviceSource).not.toMatch(/from\s+['"].*evaluation\.service/);
    });

    it('should not import from combined-evaluation.service', () => {
      expect(serviceSource).not.toMatch(/from\s+['"].*combined-evaluation\.service/);
    });

    it('should not import from scoring-formula or contribution-score modules', () => {
      expect(serviceSource).not.toMatch(/from\s+['"].*scoring-formula/);
      expect(serviceSource).not.toMatch(/from\s+['"].*contribution-score/);
    });

    it('should not reference EvaluationService class', () => {
      expect(serviceSource).not.toMatch(/EvaluationService/);
    });

    it('should not reference CombinedEvaluationService class', () => {
      expect(serviceSource).not.toMatch(/CombinedEvaluationService/);
    });
  });

  describe('Prisma schema isolation', () => {
    const schemaSource = readFileSync(
      resolve(__dirname, '../../../../prisma/schema.prisma'),
      'utf-8',
    );

    it('TrackRecordEvaluation should not have a relation to Evaluation model', () => {
      // Extract the TrackRecordEvaluation model block
      const modelMatch = schemaSource.match(/model TrackRecordEvaluation \{[\s\S]*?\n\}/);
      expect(modelMatch).not.toBeNull();
      const modelBlock = modelMatch![0];

      // Check for Evaluation as a relation type (word boundary, not as part of field names like evaluationPeriodStart)
      expect(modelBlock).not.toMatch(/\bEvaluation\b(?!Module|Period|Model|Rubric|Review|Service)/);
      expect(modelBlock).not.toMatch(/evaluationId\b/);
      expect(modelBlock).not.toMatch(/"evaluation_id"/);
    });

    it('TrackRecordEvaluation should not reference ContributionScore', () => {
      const modelMatch = schemaSource.match(/model TrackRecordEvaluation \{[\s\S]*?\n\}/);
      const modelBlock = modelMatch![0];

      expect(modelBlock).not.toMatch(/ContributionScore/);
      expect(modelBlock).not.toMatch(/contributionScoreId/);
      expect(modelBlock).not.toMatch(/contribution_score_id/);
    });

    it('TrackRecordEvaluation should not reference ScoringFormulaVersion', () => {
      const modelMatch = schemaSource.match(/model TrackRecordEvaluation \{[\s\S]*?\n\}/);
      const modelBlock = modelMatch![0];

      expect(modelBlock).not.toMatch(/ScoringFormulaVersion/);
      expect(modelBlock).not.toMatch(/formulaVersionId/);
      expect(modelBlock).not.toMatch(/formula_version_id/);
    });

    it('TrackRecordMilestone should not have a relation to Evaluation model', () => {
      const modelMatch = schemaSource.match(/model TrackRecordMilestone \{[\s\S]*?\n\}/);
      expect(modelMatch).not.toBeNull();
      const modelBlock = modelMatch![0];

      expect(modelBlock).not.toMatch(/Evaluation\s/);
      expect(modelBlock).not.toMatch(/evaluationId/);
    });

    it('TrackRecordEvaluation should be in the evaluation schema', () => {
      const modelMatch = schemaSource.match(/model TrackRecordEvaluation \{[\s\S]*?\n\}/);
      const modelBlock = modelMatch![0];

      expect(modelBlock).toContain('@@schema("evaluation")');
    });

    it('TrackRecordMilestone should be in the evaluation schema', () => {
      const modelMatch = schemaSource.match(/model TrackRecordMilestone \{[\s\S]*?\n\}/);
      const modelBlock = modelMatch![0];

      expect(modelBlock).toContain('@@schema("evaluation")');
    });
  });
});
