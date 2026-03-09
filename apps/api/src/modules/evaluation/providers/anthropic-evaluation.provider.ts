import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { EvaluationDimensionKey } from '@edin/shared';
import { MAX_PATCH_LENGTH, MAX_EVALUATION_FILES } from '@edin/shared';
import type {
  EvaluationProvider,
  CodeEvaluationInput,
  CodeEvaluationOutput,
} from './evaluation-provider.interface.js';

const PROMPT_VERSION = 'code-eval-v1';

const SYSTEM_PROMPT = `You are a code quality evaluator for the Edin platform. Evaluate the following code contribution across 4 dimensions. Return a JSON object with scores (0-100) and brief explanations for each dimension.

Evaluation Dimensions:
1. Complexity (0-100): Lower cyclomatic complexity, shallow nesting, clear control flow = higher score
2. Maintainability (0-100): Clear naming, good modularity, separation of concerns = higher score
3. Test Coverage (0-100): Test files present, good assertions, edge cases covered = higher score
4. Standards Adherence (0-100): Consistent style, linting compliance, project conventions = higher score

Also provide a 2-4 sentence narrative summary describing what quality was demonstrated.

Return ONLY valid JSON in this format:
{
  "complexity": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "maintainability": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "testCoverage": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "standardsAdherence": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "narrative": "<2-4 sentence narrative>"
}`;

interface EvaluationResponse {
  complexity: { score: number; explanation: string };
  maintainability: { score: number; explanation: string };
  testCoverage: { score: number; explanation: string };
  standardsAdherence: { score: number; explanation: string };
  narrative: string;
}

@Injectable()
export class AnthropicEvaluationProvider implements EvaluationProvider {
  private readonly logger = new Logger(AnthropicEvaluationProvider.name);
  private readonly client: Anthropic;
  private readonly modelId: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = new Anthropic({ apiKey });
    this.modelId = this.configService.get<string>(
      'EVALUATION_MODEL_ID',
      'claude-sonnet-4-5-20250514',
    );
  }

  get promptVersion(): string {
    return PROMPT_VERSION;
  }

  async evaluateCode(input: CodeEvaluationInput): Promise<CodeEvaluationOutput> {
    const userPrompt = this.buildUserPrompt(input);

    this.logger.log('Calling Anthropic API for code evaluation', {
      module: 'evaluation',
      contributionId: input.contributionId,
      modelId: this.modelId,
      fileCount: input.files.length,
    });

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const rawOutput = textBlock ? textBlock.text : '';

    this.logger.log('Anthropic API response received', {
      module: 'evaluation',
      contributionId: input.contributionId,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    const parsed = this.parseResponse(rawOutput);

    return {
      dimensions: {
        complexity: parsed.complexity,
        maintainability: parsed.maintainability,
        testCoverage: parsed.testCoverage,
        standardsAdherence: parsed.standardsAdherence,
      },
      narrative: parsed.narrative,
      rawModelOutput: rawOutput,
    };
  }

  private buildUserPrompt(input: CodeEvaluationInput): string {
    const parts: string[] = [];

    parts.push(`Repository: ${input.repositoryName}`);
    parts.push(`Contribution Type: ${input.contributionType}`);

    if (input.commitMessage) {
      parts.push(`Commit Message: ${input.commitMessage}`);
    }
    if (input.pullRequestTitle) {
      parts.push(`PR Title: ${input.pullRequestTitle}`);
    }
    if (input.pullRequestDescription) {
      parts.push(`PR Description: ${input.pullRequestDescription}`);
    }

    parts.push(`\nFiles Changed (${input.files.length}):`);

    const filesToEvaluate = input.files.slice(0, MAX_EVALUATION_FILES);

    for (const file of filesToEvaluate) {
      parts.push(`\n--- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`);
      if (file.patch) {
        const truncatedPatch =
          file.patch.length > MAX_PATCH_LENGTH
            ? file.patch.slice(0, MAX_PATCH_LENGTH) + '\n... [truncated]'
            : file.patch;
        parts.push(truncatedPatch);
      }
    }

    if (input.files.length > MAX_EVALUATION_FILES) {
      parts.push(`\n... and ${input.files.length - MAX_EVALUATION_FILES} more files (not shown)`);
    }

    return parts.join('\n');
  }

  private parseResponse(raw: string): EvaluationResponse {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error('Failed to extract JSON from model response', {
        module: 'evaluation',
        rawLength: raw.length,
      });
      throw new Error('Model response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]) as EvaluationResponse;

    const dimensionKeys: EvaluationDimensionKey[] = [
      'complexity',
      'maintainability',
      'testCoverage',
      'standardsAdherence',
    ];
    for (const key of dimensionKeys) {
      if (!parsed[key] || typeof parsed[key].score !== 'number') {
        throw new Error(`Missing or invalid dimension score: ${key}`);
      }
      parsed[key].score = Math.max(0, Math.min(100, Math.round(parsed[key].score)));
    }

    if (!parsed.narrative || typeof parsed.narrative !== 'string') {
      parsed.narrative = 'Evaluation completed.';
    }

    return parsed;
  }
}
