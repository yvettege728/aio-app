import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { personaPrompt } from '../../src/agent/persona';
import type { FollowUpRequest, FollowUpResult, ModelAdapter } from './ModelAdapter';

const followUpSchema = z.object({
  message: z.string().min(1).max(240),
});

type ParsedResponse = {
  output_parsed?: z.infer<typeof followUpSchema> | null;
  output?: unknown[];
};

type ResponsesClient = {
  responses: {
    parse(input: unknown): Promise<ParsedResponse>;
  };
};

export class OpenAIModelOutputError extends Error {
  constructor(message = 'The model did not return a usable structured response.') {
    super(message);
    this.name = 'OpenAIModelOutputError';
  }
}

export class OpenAIModelAdapter implements ModelAdapter {
  private readonly client: ResponsesClient;
  private readonly model: string;

  constructor(
    client?: ResponsesClient,
    model = process.env.OPENAI_MODEL ?? 'gpt-5.6-terra',
  ) {
    this.client = client ?? (new OpenAI() as unknown as ResponsesClient);
    this.model = model;
  }

  async generateFollowUp(request: FollowUpRequest): Promise<FollowUpResult> {
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      input: [
        { role: 'system', content: personaPrompt },
        ...request.turns.map((turn) => ({ role: turn.role, content: turn.text })),
      ],
      text: {
        format: zodTextFormat(followUpSchema, 'aio_follow_up'),
      },
    });

    if (!response.output_parsed) {
      throw new OpenAIModelOutputError();
    }

    return { message: response.output_parsed.message };
  }
}
