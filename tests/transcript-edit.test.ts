import { applyTranscript, beginDictation } from '../src/speech/transcriptEdit';

test('inserts dictation at the current cursor', () => {
  const base = beginDictation('Before after', { start: 7, end: 7 });
  expect(applyTranscript(base, 'soft rain')).toEqual({
    text: 'Before soft rainafter',
    selection: { start: 16, end: 16 },
  });
});

test('replaces only the active interim segment without duplication', () => {
  const base = beginDictation('Before after', { start: 7, end: 7 });
  const first = applyTranscript(base, 'soft rain');
  const second = applyTranscript(base, 'soft rain outside');
  expect(first.text).toBe('Before soft rainafter');
  expect(second.text).toBe('Before soft rain outsideafter');
});

test('replaces a selected range and restores the original on an empty result', () => {
  const base = beginDictation('blue red door', { start: 5, end: 8 });
  expect(applyTranscript(base, 'green').text).toBe('blue green door');
  expect(applyTranscript(base, '').text).toBe('blue red door');
});

test('normalizes a reversed or out-of-range selection', () => {
  const base = beginDictation('small moment', { start: 99, end: -2 });
  expect(applyTranscript(base, 'kept').text).toBe('kept');
});
