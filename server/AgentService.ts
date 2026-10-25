import { randomUUID } from 'node:crypto';
import { extractCandidateLines, isExactUserSpan } from '../src/agent/lines';
import { advanceStage } from '../src/agent/machine';
import {
  choosingPromptByLocale,
  endingMessageByLocale,
  entryPromptByLocale,
  fallbackByLocale,
  safetyMessageByLocale,
} from '../src/agent/persona';
import type { AgentReply, AgentSession, Locale } from '../src/agent/types';
import { isValidAgentMessage } from '../src/agent/validation';
import { containsSafetyConcern } from '../src/safety/check';
import type { ModelAdapter } from './model/ModelAdapter';
import { SessionStore } from './SessionStore';

export class AgentService {
  constructor(
    private readonly store: SessionStore,
    private readonly model: ModelAdapter,
    private readonly now: () => number = Date.now,
  ) {}

  start(locale: Locale, explicitId?: string): AgentReply {
    const id = explicitId ?? randomUUID();
    const timestamp = this.now();
    const message = entryPromptByLocale[locale];
    this.store.create({
      id,
      locale,
      stage: 'recall',
      entryPrompt: message,
      turns: [{ role: 'assistant', text: message }],
      userTurnCount: 0,
      createdAt: timestamp,
      touchedAt: timestamp,
    });
    return this.replyShape(id, 'recall', message);
  }

  async reply(id: string, text: string): Promise<AgentReply> {
    const session = this.requireSession(id);
    const userText = text.trim();
    if (!userText) {
      throw new Error('A reply cannot be empty.');
    }

    if (containsSafetyConcern(userText)) {
      this.store.delete(id);
      return this.replyShape(id, 'safetyStop', safetyMessageByLocale[session.locale], [], true);
    }

    const userTurnCount = session.userTurnCount + 1;
    const stage = advanceStage(session.stage, userTurnCount);
    const turns = [...session.turns, { role: 'user' as const, text: userText }];

    if (stage === 'findLine') {
      const candidateLines = extractCandidateLines(
        turns.filter((turn) => turn.role === 'user').map((turn) => turn.text),
      );
      this.store.set({ ...session, stage, turns, userTurnCount });
      return this.replyShape(
        id,
        stage,
        choosingPromptByLocale[session.locale],
        candidateLines,
      );
    }

    let generated = '';
    try {
      generated = (await this.model.generateFollowUp({ locale: session.locale, stage, turns })).message;
    } catch {
      generated = '';
    }
    const message = isValidAgentMessage(generated)
      ? generated.trim()
      : fallbackByLocale[session.locale];
    const updatedTurns = [...turns, { role: 'assistant' as const, text: message }];
    this.store.set({ ...session, stage, turns: updatedTurns, userTurnCount });
    return this.replyShape(id, stage, message);
  }

  keep(id: string, line: string): AgentReply {
    const session = this.requireSession(id);
    const userTexts = session.turns
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.text);
    if (session.stage !== 'findLine' || !isExactUserSpan(line, userTexts)) {
      throw new Error('The kept line must be an exact span from this session.');
    }
    this.store.delete(id);
    return this.replyShape(id, 'end', endingMessageByLocale[session.locale], [], true, line);
  }

  setAside(id: string): AgentReply {
    const session = this.requireSession(id);
    this.store.delete(id);
    return this.replyShape(id, 'end', endingMessageByLocale[session.locale], [], true);
  }

  stop(id: string): void {
    this.store.delete(id);
  }

  private requireSession(id: string): AgentSession {
    const session = this.store.get(id);
    if (!session) {
      throw new Error('Session not found or expired.');
    }
    return session;
  }

  private replyShape(
    sessionId: string,
    stage: AgentReply['stage'],
    message: string,
    candidateLines: string[] = [],
    complete = false,
    keptLine?: string,
  ): AgentReply {
    return { sessionId, stage, message, candidateLines, complete, keptLine };
  }
}
