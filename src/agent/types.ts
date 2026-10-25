export type AgentStage =
  | 'recall'
  | 'deepen'
  | 'findLine'
  | 'keep'
  | 'setAside'
  | 'end'
  | 'safetyStop';

export type Locale = 'en' | 'zh';

export type UserTurn = { role: 'user'; text: string };
export type AssistantTurn = { role: 'assistant'; text: string };
export type AgentTurn = UserTurn | AssistantTurn;

export type AgentSession = {
  id: string;
  stage: AgentStage;
  locale: Locale;
  entryPrompt: string;
  turns: AgentTurn[];
  userTurnCount: number;
  createdAt: number;
  touchedAt: number;
};

export type AgentReply = {
  sessionId: string;
  stage: AgentStage;
  message: string;
  candidateLines: string[];
  complete: boolean;
  keptLine?: string;
};
