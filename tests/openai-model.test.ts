import { personaPrompt } from '../src/agent/persona';
import {
  OpenAIModelAdapter,
  OpenAIModelOutputError,
} from '../server/model/OpenAIModelAdapter';

test('sends only the disposable session transcript with structured output', async () => {
  const parse = jest.fn().mockResolvedValue({
    output_parsed: { message: 'What could you hear nearby?' },
    output: [],
  });
  const adapter = new OpenAIModelAdapter(
    { responses: { parse } },
    'test-model',
  );

  const result = await adapter.generateFollowUp({
    locale: 'en',
    stage: 'deepen',
    turns: [
      { role: 'assistant', text: 'Bring one small moment.' },
      { role: 'user', text: 'I waited beside a blue door.' },
    ],
  });

  expect(result).toEqual({ message: 'What could you hear nearby?' });
  expect(parse).toHaveBeenCalledTimes(1);
  const request = parse.mock.calls[0][0];
  expect(request).toMatchObject({
    model: 'test-model',
    store: false,
    input: [
      { role: 'system', content: personaPrompt },
      { role: 'assistant', content: 'Bring one small moment.' },
      { role: 'user', content: 'I waited beside a blue door.' },
    ],
  });
  expect(request).not.toHaveProperty('previous_response_id');
  expect(request.text.format).toBeDefined();
});

test.each([
  [{ output_parsed: null, output: [] }],
  [{ output_parsed: null, output: [{ type: 'message', content: [{ type: 'refusal' }] }] }],
])('throws a typed error when structured output is unavailable', async (response) => {
  const adapter = new OpenAIModelAdapter(
    { responses: { parse: jest.fn().mockResolvedValue(response) } },
    'test-model',
  );

  await expect(
    adapter.generateFollowUp({ locale: 'zh', stage: 'deepen', turns: [] }),
  ).rejects.toBeInstanceOf(OpenAIModelOutputError);
});
