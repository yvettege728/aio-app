import {
  AgentClient,
  AgentSessionError,
  AgentUnavailableError,
} from '../src/app/agentClient';

function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

test('client maps the five agent operations to the HTTP adapter', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(response(200, { ok: true }))
    .mockResolvedValueOnce(response(201, { sessionId: 's1' }))
    .mockResolvedValueOnce(response(200, { stage: 'deepen' }))
    .mockResolvedValueOnce(response(200, { stage: 'end' }))
    .mockResolvedValueOnce(response(204));
  const client = new AgentClient('http://agent.test/', fetcher);

  await client.health();
  await client.start('zh');
  await client.reply('s1', '一扇蓝色的门。');
  await client.keep('s1', '一扇蓝色的门。');
  await client.stop('s1');

  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    'http://agent.test/health',
    'http://agent.test/sessions',
    'http://agent.test/sessions/s1/messages',
    'http://agent.test/sessions/s1/keep',
    'http://agent.test/sessions/s1',
  ]);
  expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'POST' });
  expect(fetcher.mock.calls[4][1]).toMatchObject({ method: 'DELETE' });
});

test.each([404, 409])('client reports %s as a session error', async (status) => {
  const client = new AgentClient('http://agent.test', jest.fn().mockResolvedValue(response(status)));
  await expect(client.reply('gone', 'hello')).rejects.toBeInstanceOf(AgentSessionError);
});

test.each([new Error('offline'), response(503)])('client reports network and server failure as unavailable', async (failure) => {
  const fetcher = failure instanceof Error
    ? jest.fn().mockRejectedValue(failure)
    : jest.fn().mockResolvedValue(failure);
  const client = new AgentClient('http://agent.test', fetcher);
  await expect(client.health()).rejects.toBeInstanceOf(AgentUnavailableError);
});

test('client aborts a request after ten seconds', async () => {
  jest.useFakeTimers();
  const fetcher = jest.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const client = new AgentClient('http://agent.test', fetcher);
  const pending = client.health();
  jest.advanceTimersByTime(10_001);
  await expect(pending).rejects.toBeInstanceOf(AgentUnavailableError);
  jest.useRealTimers();
});
