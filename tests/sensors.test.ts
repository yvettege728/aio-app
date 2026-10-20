import { hasStableOrientation, isFaceDown, isFaceUp, isLiftedOrMoved } from '../src/sensors/faceDown';
import { detectBackTap, detectBackTapPair } from '../src/sensors/backTap';

test('face-down detector distinguishes down, up, lifting, and stable orientation', () => {
  expect(isFaceDown({ x: 0, y: 0, z: -1, t: 0 })).toBe(true);
  expect(isFaceUp({ x: 0, y: 0, z: 1, t: 0 })).toBe(true);
  expect(hasStableOrientation([{ x: 0, y: 0, z: -1, t: 0 }, { x: 0, y: 0, z: -1, t: 1000 }], true)).toBe(true);
  expect(hasStableOrientation([{ x: 0, y: 0, z: -1, t: 0 }, { x: 0, y: 0, z: 0, t: 500 }, { x: 0, y: 0, z: -1, t: 1000 }], true)).toBe(false);
  expect(hasStableOrientation([{ x: 0.55, y: 0, z: -0.84, t: 0 }, { x: 0.55, y: 0, z: -0.84, t: 1000 }], true)).toBe(true);
  expect(isLiftedOrMoved([{ x: 0, y: 0, z: -1, t: 0 }, { x: 3, y: 0, z: 0, t: 100 }])).toBe(true);
});

test('back tap detects a pair, not one tap or walking movement', () => {
  const pair = [{ x: 0, y: 0, z: 2, t: 100 }, { x: 0, y: 0, z: 0, t: 200 }, { x: 0, y: 0, z: 2, t: 600 }];
  expect(detectBackTapPair(pair)).toBe(true);
  expect(detectBackTap(pair)).toBe(true);
  expect(detectBackTap([{ x: 0, y: 0, z: 2, t: 100 }])).toBe(false);
  expect(detectBackTap([{ x: 1.2, y: 0, z: 1.1, t: 0 }, { x: 1.3, y: 0, z: 1.2, t: 100 }])).toBe(false);
});
