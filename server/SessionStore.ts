import type { AgentSession } from '../src/agent/types';

export class SessionStore {
  private readonly sessions = new Map<string, AgentSession>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  create(session: AgentSession): AgentSession {
    if (this.sessions.has(session.id)) {
      throw new Error(`Session already exists: ${session.id}`);
    }
    const timestamp = this.now();
    const created = { ...session, createdAt: timestamp, touchedAt: timestamp };
    this.sessions.set(created.id, created);
    return created;
  }

  get(id: string): AgentSession | undefined {
    const session = this.sessions.get(id);
    if (!session) {
      return undefined;
    }
    if (this.now() - session.touchedAt > this.ttlMs) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  set(session: AgentSession): AgentSession {
    const updated = { ...session, touchedAt: this.now() };
    this.sessions.set(updated.id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  sweep(): number {
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (this.now() - session.touchedAt > this.ttlMs) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}
