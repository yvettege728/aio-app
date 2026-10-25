import type { AgentStage, AgentTurn, Locale } from '../../src/agent/types';

export type FollowUpRequest = {
  locale: Locale;
  stage: AgentStage;
  turns: AgentTurn[];
};

export type FollowUpResult = { message: string };

export interface ModelAdapter {
  generateFollowUp(request: FollowUpRequest): Promise<FollowUpResult>;
}
