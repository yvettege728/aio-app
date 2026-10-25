import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AgentService } from './AgentService';

class HttpInputError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 8_192) {
      throw new HttpInputError(413, 'Request body is too large.');
    }
    chunks.push(buffer);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('not an object');
    }
    return value as Record<string, unknown>;
  } catch {
    throw new HttpInputError(400, 'Malformed JSON body.');
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  response.end(JSON.stringify(body));
}

function requireText(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpInputError(400, `${key} must be a nonempty string.`);
  }
  if (value.length > 4_000) {
    throw new HttpInputError(413, `${key} is too long.`);
  }
  return value;
}

export function createHttpServer(service: AgentService) {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        response.end();
        return;
      }

      const url = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/sessions') {
        const body = await readJson(request);
        if (body.locale !== 'en' && body.locale !== 'zh') {
          throw new HttpInputError(400, 'locale must be en or zh.');
        }
        sendJson(response, 201, service.start(body.locale));
        return;
      }

      const match = url.pathname.match(/^\/sessions\/([^/]+)(?:\/(messages|keep))?$/);
      if (!match) {
        sendJson(response, 404, { error: 'Not found.' });
        return;
      }
      const [, id, action] = match;

      if (request.method === 'DELETE' && !action) {
        service.stop(id);
        response.writeHead(204, { 'access-control-allow-origin': '*' });
        response.end();
        return;
      }

      if (request.method === 'POST' && action === 'messages') {
        const body = await readJson(request);
        sendJson(response, 200, await service.reply(id, requireText(body, 'text')));
        return;
      }

      if (request.method === 'POST' && action === 'keep') {
        const body = await readJson(request);
        sendJson(response, 200, service.keep(id, requireText(body, 'line')));
        return;
      }

      sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      if (error instanceof HttpInputError) {
        sendJson(response, error.status, { error: message });
      } else if (message.includes('not found or expired')) {
        sendJson(response, 404, { error: 'Session not found or expired.' });
      } else if (message.includes('exact span') || message.includes('not ready')) {
        sendJson(response, 409, { error: 'Session is not ready for that action.' });
      } else {
        sendJson(response, 500, { error: 'Agent request failed.' });
      }
    }
  });
}
