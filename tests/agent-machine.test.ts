import { advanceStage } from '../src/agent/machine';
import { extractCandidateLines, isExactUserSpan } from '../src/agent/lines';

test('agent follows the bounded interview path', () => {
  expect(advanceStage('recall', 1)).toBe('deepen');
  expect(advanceStage('deepen', 2)).toBe('deepen');
  expect(advanceStage('deepen', 3)).toBe('findLine');
  expect(advanceStage('findLine', 4)).toBe('findLine');
});

test('candidate lines are exact user spans', () => {
  const turns = [
    'I waited by the blue door. Then the rain began.',
    'My hands smelled like oranges.',
  ];
  expect(extractCandidateLines(turns, 3)).toEqual([
    'I waited by the blue door.',
    'Then the rain began.',
    'My hands smelled like oranges.',
  ]);
  expect(isExactUserSpan('the blue door', turns)).toBe(true);
  expect(isExactUserSpan('the red door', turns)).toBe(false);
});

test('candidate extraction supports Chinese punctuation', () => {
  expect(extractCandidateLines(['我站在蓝色的门边。后来下雨了。'], 2)).toEqual([
    '我站在蓝色的门边。',
    '后来下雨了。',
  ]);
});
