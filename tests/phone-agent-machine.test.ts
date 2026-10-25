import { phoneTransition } from '../src/machine/phoneMachine';

test('phone waits explicitly for an agent response', () => {
  expect(phoneTransition('writing', { type: 'SUBMIT' })).toBe('waiting');
  expect(phoneTransition('waiting', { type: 'FOLLOW_UP' })).toBe('writing');
  expect(phoneTransition('waiting', { type: 'CANDIDATES' })).toBe('chooseLine');
  expect(phoneTransition('waiting', { type: 'FAIL' })).toBe('writing');
});

test('blurring the writing box does not submit private text', () => {
  expect(phoneTransition('writing', { type: 'TEXT_BLURRED', text: 'still drafting' })).toBe('writing');
});
