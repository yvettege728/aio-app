export type PaperState = 'instructions' | 'reading' | 'writing' | 'followUp' | 'paused' | 'organize' | 'capture' | 'chooseStyle' | 'holdToKeep' | 'card';
export type PaperEvent =
  | { type: 'BEGIN' } | { type: 'BEGIN_WRITING' } | { type: 'BACK' } | { type: 'FACE_DOWN_STABLE' } | { type: 'REQUEST_FOLLOW_UP' } | { type: 'FOLLOW_UP_DONE' }
  | { type: 'PICK_UP' } | { type: 'FACE_DOWN_AGAIN' } | { type: 'FACE_UP_STABLE' } | { type: 'START_CAPTURE' } | { type: 'SKIP_CAPTURE' } | { type: 'PHOTO_CAPTURED' }
  | { type: 'STYLE_SELECTED' } | { type: 'KEEP_COMPLETE' } | { type: 'CLOSE' };

export function paperTransition(state: PaperState, event: PaperEvent): PaperState {
  switch (state) {
    case 'instructions': return event.type === 'BEGIN' ? 'reading' : state;
    case 'reading': return event.type === 'FACE_DOWN_STABLE' || event.type === 'BEGIN_WRITING' ? 'writing' : event.type === 'BACK' ? 'instructions' : state;
    case 'writing':
      if (event.type === 'REQUEST_FOLLOW_UP') return 'followUp';
      if (event.type === 'PICK_UP') return 'paused';
      if (event.type === 'FACE_UP_STABLE') return 'organize';
      return state;
    case 'followUp':
      if (event.type === 'FOLLOW_UP_DONE') return 'writing';
      if (event.type === 'PICK_UP') return 'paused';
      if (event.type === 'FACE_UP_STABLE') return 'organize';
      return state;
    case 'paused': return event.type === 'FACE_DOWN_AGAIN' || event.type === 'BACK' ? 'writing' : event.type === 'FACE_UP_STABLE' ? 'organize' : state;
    case 'organize':
      if (event.type === 'START_CAPTURE') return 'capture';
      if (event.type === 'SKIP_CAPTURE') return 'chooseStyle';
      if (event.type === 'BACK') return 'paused';
      return state;
    case 'capture': return event.type === 'PHOTO_CAPTURED' || event.type === 'SKIP_CAPTURE' ? 'chooseStyle' : event.type === 'BACK' ? 'organize' : state;
    case 'chooseStyle': return event.type === 'STYLE_SELECTED' ? 'holdToKeep' : event.type === 'BACK' ? 'organize' : state;
    case 'holdToKeep': return event.type === 'KEEP_COMPLETE' ? 'card' : event.type === 'BACK' ? 'chooseStyle' : state;
    case 'card': return event.type === 'CLOSE' ? 'instructions' : state;
    default: return state;
  }
}
