import { phoneTransition } from '../src/machine/phoneMachine';
import { paperTransition } from '../src/machine/paperMachine';
import { nextPromptIndex } from '../src/content/promptSelection';

test('phone machine follows the designed path', () => {
  let state = phoneTransition('arrive', { type: 'HOLD_COMPLETE' });
  state = phoneTransition(state, { type: 'SKIP_NAME' });
  state = phoneTransition(state, { type: 'PROMPT_READY' });
  state = phoneTransition(state, { type: 'TEXT_BLURRED', text: 'I was there.' });
  state = phoneTransition(state, { type: 'FOLLOW_UP_DONE' });
  state = phoneTransition(state, { type: 'LINE_SELECTED' });
  state = phoneTransition(state, { type: 'KEEP_COMPLETE' });
  expect(state).toBe('card');
});

test('phone safety stop interrupts writing', () => {
  expect(phoneTransition('writing', { type: 'SAFETY_STOP' })).toBe('safetyStop');
  expect(phoneTransition('writing', { type: 'TEXT_BLURRED', text: '' })).toBe('writing');
});

test('phone can skip an unanswered prompt without losing writing', () => {
  expect(phoneTransition('writing', { type: 'NEXT_PROMPT' })).toBe('prompt');
  expect(phoneTransition('followUp', { type: 'NEXT_PROMPT' })).toBe('followUp');
});

test('prompt selection varies and never repeats the current prompt when alternatives exist', () => {
  expect(nextPromptIndex(null, 4, () => 0)).toBe(0);
  expect(nextPromptIndex(1, 4, () => 0)).toBe(0);
  expect(nextPromptIndex(1, 4, () => 0.99)).toBe(3);
  expect(nextPromptIndex(0, 1, () => 0.9)).toBe(0);
});

test('paper machine follows prompt, quiet writing, requested follow-up, pause and card path', () => {
  let state = paperTransition('instructions', { type: 'BEGIN' });
  state = paperTransition(state, { type: 'FACE_DOWN_STABLE' });
  expect(state).toBe('writing');
  state = paperTransition(state, { type: 'REQUEST_FOLLOW_UP' });
  expect(state).toBe('followUp');
  state = paperTransition(state, { type: 'FOLLOW_UP_DONE' });
  state = paperTransition(state, { type: 'PICK_UP' });
  expect(state).toBe('paused');
  state = paperTransition(state, { type: 'FACE_DOWN_AGAIN' });
  state = paperTransition(state, { type: 'FACE_UP_STABLE' });
  expect(state).toBe('organize');
  state = paperTransition(state, { type: 'SKIP_CAPTURE' });
  expect(state).toBe('chooseStyle');
  state = paperTransition(state, { type: 'STYLE_SELECTED' });
  state = paperTransition(state, { type: 'KEEP_COMPLETE' });
  expect(state).toBe('card');
});

test('paper mode can enter quiet writing with an explicit fallback when orientation is unavailable', () => {
  const reading = paperTransition('instructions', { type: 'BEGIN' });
  expect(paperTransition(reading, { type: 'BEGIN_WRITING' })).toBe('writing');
});

test('paper mode can navigate back without closing the session', () => {
  expect(paperTransition('reading', { type: 'BACK' })).toBe('instructions');
  expect(paperTransition('organize', { type: 'BACK' })).toBe('paused');
});

test('phone mode supports contextual back navigation', () => {
  expect(phoneTransition('outsideName', { type: 'BACK' })).toBe('arrive');
  expect(phoneTransition('followUp', { type: 'BACK' })).toBe('writing');
  expect(phoneTransition('chooseLine', { type: 'BACK' })).toBe('writing');
});
