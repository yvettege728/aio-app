import type { AgentReply, Locale } from '../agent/types';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class AgentUnavailableError extends Error {
  constructor(message = 'aio is unavailable right now.') {
    super(message);
    this.name = 'AgentUnavailableError';
  }
}

export class AgentSessionError extends Error {
  constructor(message = 'This writing session is no longer available.') {
    super(message);
    this.name = 'AgentSessionError';
  }
}

export class AgentClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl = process.env.EXPO_PUBLIC_AIO_AGENT_URL ?? 'http://127.0.0.1:8787',
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  health(): Promise<{ ok: boolean }> {
    return this.request('/health');
  }

  start(locale: Locale): Promise<AgentReply> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ locale }),
    });
  }

  reply(sessionId: string, text: string): Promise<AgentReply> {
    return this.request(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  keep(sessionId: string, line: string): Promise<AgentReply> {
    return this.request(`/sessions/${encodeURIComponent(sessionId)}/keep`, {
      method: 'POST',
      body: JSON.stringify({ line }),
    });
  }

  async stop(sessionId: string): Promise<void> {
    await this.request(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers,
        signal: controller.signal,
      });
      if (response.status === 404 || response.status === 409) {
        throw new AgentSessionError();
      }
      if (response.status >= 500) {
        throw new AgentUnavailableError();
      }
      if (!response.ok) {
        throw new Error(`Agent request failed with status ${response.status}.`);
      }
      if (response.status === 204) return undefined as T;
      return await response.json() as T;
    } catch (error) {
      if (error instanceof AgentSessionError || error instanceof AgentUnavailableError) {
        throw error;
      }
      if (error instanceof Error && error.message.startsWith('Agent request failed')) {
        throw error;
      }
      throw new AgentUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createAgentClient(): AgentClient {
  return new AgentClient();
}
