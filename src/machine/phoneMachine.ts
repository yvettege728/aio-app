export type PhoneState = 'arrive' | 'outsideName' | 'prompt' | 'writing' | 'followUp' | 'chooseLine' | 'holdToKeep' | 'card' | 'safetyStop';
export type PhoneEvent =
  | { type: 'HOLD_COMPLETE' } | { type: 'SKIP_NAME' } | { type: 'NAME_SAVED' } | { type: 'PROMPT_READY' }
  | { type: 'NEXT_PROMPT' } | { type: 'TEXT_BLURRED'; text: string } | { type: 'FOLLOW_UP_DONE' }
  | { type: 'LINE_SELECTED' } | { type: 'KEEP_COMPLETE' } | { type: 'BACK' } | { type: 'CLOSE' } | { type: 'SAFETY_STOP' };

export function phoneTransition(state: PhoneState, event: PhoneEvent): PhoneState {
  switch (state) {
    case 'arrive': return event.type === 'HOLD_COMPLETE' ? 'outsideName' : state;
    case 'outsideName': return event.type === 'SKIP_NAME' || event.type === 'NAME_SAVED' ? 'prompt' : event.type === 'BACK' ? 'arrive' : state;
    case 'prompt': return event.type === 'PROMPT_READY' ? 'writing' : event.type === 'BACK' ? 'outsideName' : state;
    case 'writing':
      if (event.type === 'SAFETY_STOP') return 'safetyStop';
      if (event.type === 'NEXT_PROMPT') return 'prompt';
      if (event.type === 'BACK') return 'outsideName';
      return event.type === 'TEXT_BLURRED' && event.text.trim() ? 'followUp' : state;
    case 'followUp': return event.type === 'FOLLOW_UP_DONE' ? 'chooseLine' : event.type === 'BACK' ? 'writing' : state;
    case 'chooseLine': return event.type === 'LINE_SELECTED' ? 'holdToKeep' : event.type === 'BACK' ? 'writing' : state;
    case 'holdToKeep': return event.type === 'KEEP_COMPLETE' ? 'card' : event.type === 'BACK' ? 'chooseLine' : state;
    case 'card': return event.type === 'CLOSE' ? 'arrive' : state;
    case 'safetyStop': return event.type === 'CLOSE' ? 'arrive' : state;
    default: return state;
  }
}
