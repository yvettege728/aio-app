import { containsSafetyConcern } from '../src/safety/check';

test('safety checker catches configured phrases without case sensitivity', () => {
  expect(containsSafetyConcern('I WANT TO DIE tonight')).toBe(true);
  expect(containsSafetyConcern("I don't want to be here")).toBe(true);
  expect(containsSafetyConcern('I am tired but I will rest')).toBe(false);
  expect(containsSafetyConcern('I want to finish this line')).toBe(false);
});
