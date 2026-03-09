import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AnthropicEvaluationProvider } from './anthropic-evaluation.provider.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

const validResponse = JSON.stringify({
  complexity: { score: 85, explanation: 'Clean control flow' },
  maintainability: { score: 90, explanation: 'Well structured' },
  testCoverage: { score: 70, explanation: 'Tests present' },
  standardsAdherence: { score: 88, explanation: 'Follows conventions' },
  narrative: 'Good code quality demonstrated in this contribution.',
});

const codeInput = {
  contributionId: 'contrib-1',
  contributionType: 'COMMIT',
  repositoryName: 'org/repo',
  files: [
    { filename: 'src/auth.ts', status: 'modified', additions: 10, deletions: 5, patch: '+ code' },
  ],
  commitMessage: 'fix: auth flow',
};

describe('AnthropicEvaluationProvider', () => {
  let provider: AnthropicEvaluationProvider;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              ANTHROPIC_API_KEY: 'test-key',
              EVALUATION_MODEL_ID: 'claude-test-model',
            }),
          ],
        }),
      ],
      providers: [AnthropicEvaluationProvider],
    }).compile();

    provider = module.get(AnthropicEvaluationProvider);
  });

  it('returns promptVersion', () => {
    expect(provider.promptVersion).toBe('code-eval-v1');
  });

  it('calls Anthropic API and returns parsed dimensions', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(85);
    expect(result.dimensions.maintainability.score).toBe(90);
    expect(result.dimensions.testCoverage.score).toBe(70);
    expect(result.dimensions.standardsAdherence.score).toBe(88);
    expect(result.narrative).toBe('Good code quality demonstrated in this contribution.');
    expect(result.rawModelOutput).toBe(validResponse);
  });

  it('clamps scores to 0-100 range', async () => {
    const outOfRange = JSON.stringify({
      complexity: { score: 150, explanation: 'Over' },
      maintainability: { score: -10, explanation: 'Under' },
      testCoverage: { score: 50.7, explanation: 'Rounded' },
      standardsAdherence: { score: 100, explanation: 'Max' },
      narrative: 'Score clamping test.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: outOfRange }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(100);
    expect(result.dimensions.maintainability.score).toBe(0);
    expect(result.dimensions.testCoverage.score).toBe(51);
    expect(result.dimensions.standardsAdherence.score).toBe(100);
  });

  it('throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot evaluate this.' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(provider.evaluateCode(codeInput)).rejects.toThrow(
      'Model response did not contain valid JSON',
    );
  });

  it('throws on missing dimension scores', async () => {
    const incomplete = JSON.stringify({
      complexity: { score: 80, explanation: 'OK' },
      narrative: 'Missing dimensions.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: incomplete }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(provider.evaluateCode(codeInput)).rejects.toThrow(
      'Missing or invalid dimension score: maintainability',
    );
  });

  it('defaults narrative when missing', async () => {
    const noNarrative = JSON.stringify({
      complexity: { score: 80, explanation: 'Good' },
      maintainability: { score: 85, explanation: 'Good' },
      testCoverage: { score: 70, explanation: 'Good' },
      standardsAdherence: { score: 90, explanation: 'Good' },
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: noNarrative }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.narrative).toBe('Evaluation completed.');
  });

  it('extracts JSON from response with surrounding text', async () => {
    const wrappedResponse = `Here is the evaluation:\n${validResponse}\nEnd of evaluation.`;

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: wrappedResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(85);
  });

  it('builds user prompt with PR fields for pull request contributions', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode({
      ...codeInput,
      contributionType: 'PULL_REQUEST',
      commitMessage: undefined,
      pullRequestTitle: 'Fix auth flow',
      pullRequestDescription: 'Resolves auth bug',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('PR Title: Fix auth flow'),
          },
        ],
      }),
    );
  });
});
