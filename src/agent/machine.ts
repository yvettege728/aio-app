import type { AgentStage } from './types';

export function advanceStage(
  stage: AgentStage,
  userTurnCount: number,
): AgentStage {
  if (stage === 'recall') return 'deepen';
  if (stage === 'deepen' && userTurnCount >= 3) return 'findLine';
  return stage;
}
