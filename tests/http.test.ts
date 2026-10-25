import type { AddressInfo } from 'node:net';
import { request } from 'node:http';
import { AgentService } from '../server/AgentService';
import { createHttpServer } from '../server/http';
import { FakeModelAdapter } from '../server/model/FakeModelAdapter';
import { SessionStore } from '../server/SessionStore';

function setup() {
  const service = new AgentService(
    new SessionStore(3_600_000),
    new FakeModelAdapter(['What color was it?', 'What did your hands do?']),
  );
  const server = createHttpServer(service);
  return new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

function call(
  url: string,
  method = 'GET',
  body?: string,
): Promise<{ status: number; json: () => unknown }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode ?? 0,
            json: () => (text ? JSON.parse(text) : undefined),
          });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('HTTP routes expose a complete disposable session', async () => {
  const app = await setup();
  try {
    const health = await call(`${app.baseUrl}/health`);
    expect(health.json()).toEqual({ ok: true });

    const startedResponse = await call(
      `${app.baseUrl}/sessions`,
      'POST',
      JSON.stringify({ locale: 'en' }),
    );
    expect(startedResponse.status).toBe(201);
    const started = startedResponse.json() as { sessionId: string };

    for (const text of ['I saw a blue door.', 'Rain fell.', 'My hands held oranges.']) {
      await call(
        `${app.baseUrl}/sessions/${started.sessionId}/messages`,
        'POST',
        JSON.stringify({ text }),
      );
    }

    const choosingResponse = await call(
      `${app.baseUrl}/sessions/${started.sessionId}/messages`,
      'POST',
      JSON.stringify({ text: 'The market was almost empty.' }),
    );
    const choosing = choosingResponse.json() as { stage: string; candidateLines: string[] };
    expect(choosing.stage).toBe('findLine');

    const keptResponse = await call(
      `${app.baseUrl}/sessions/${started.sessionId}/keep`,
      'POST',
      JSON.stringify({ line: choosing.candidateLines[0] }),
    );
    expect(keptResponse.status).toBe(200);
    expect(keptResponse.json()).toMatchObject({ complete: true, stage: 'end' });
  } finally {
    await app.close();
  }
});

test('HTTP routes bound malformed, missing, invalid-stage, and oversized input', async () => {
  const app = await setup();
  try {
    const malformed = await call(`${app.baseUrl}/sessions`, 'POST', '{private unfinished text');
    expect(malformed.status).toBe(400);

    const missing = await call(
      `${app.baseUrl}/sessions/missing/messages`,
      'POST',
      JSON.stringify({ text: 'hello' }),
    );
    expect(missing.status).toBe(404);

    const started = (await call(
      `${app.baseUrl}/sessions`,
      'POST',
      JSON.stringify({ locale: 'en' }),
    )).json() as { sessionId: string };
    const invalid = await call(
      `${app.baseUrl}/sessions/${started.sessionId}/keep`,
      'POST',
      JSON.stringify({ line: 'not ready' }),
    );
    expect(invalid.status).toBe(409);

    const oversized = await call(
      `${app.baseUrl}/sessions/${started.sessionId}/messages`,
      'POST',
      JSON.stringify({ text: 'x'.repeat(4001) }),
    );
    expect(oversized.status).toBe(413);

    const deleted = await call(`${app.baseUrl}/sessions/${started.sessionId}`, 'DELETE');
    expect(deleted.status).toBe(204);
  } finally {
    await app.close();
  }
});
