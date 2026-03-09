import type { EvaluationScoringWeights } from '../types/evaluation.types.js';

export const DEFAULT_CODE_WEIGHTS: EvaluationScoringWeights = {
  complexity: 0.2,
  maintainability: 0.35,
  testCoverage: 0.25,
  standardsAdherence: 0.2,
};

export const FORMULA_VERSION = 'v1.0.0';

export const MAX_EVALUATION_FILES = 50;

export const MAX_PATCH_LENGTH = 10000;

export const EVALUATION_CACHE_TTL = 86400;
