import { detectShake, ShakeSample } from "../src/rejection/shake";

function samples(points: Array<[number, number, number]>, gap = 55): ShakeSample[] {
  return points.map(([x, y, z], index) => ({ x, y, z, t: index * gap }));
}

describe("deliberate shake detector", () => {
  test("recognizes repeated high-amplitude direction reversals", () => {
    const deliberate = samples([
      [0.1, 0, 1], [2.4, 0.1, 1], [-2.2, -0.1, 1], [2.6, 0, 1],
      [-2.5, 0.1, 1], [2.3, 0, 1], [-2.4, 0, 1], [2.5, 0, 1],
    ]);
    const result = detectShake(deliberate);
    expect(result.shaking).toBe(true);
    expect(result.strength).toBeGreaterThan(0.5);
  });

  test("recognizes a deliberate shake along the other phone axis", () => {
    const deliberate = samples([
      [0, 0, 1], [0, 2.3, 1], [0, -2.4, 1], [0, 2.5, 1],
      [0, -2.3, 1], [0, 2.4, 1], [0, -2.5, 1], [0, 2.2, 1],
    ]);
    expect(detectShake(deliberate).shaking).toBe(true);
  });

  test.each([
    ["walking", samples([[0, 0, 1], [0.25, 0.1, 1.1], [-0.2, 0, 0.9], [0.28, -0.1, 1.05], [-0.22, 0, 1]])],
    ["picking up", samples([[0, 0, 1], [0.4, 0.3, 1.3], [0.9, 0.5, 1.5], [1.1, 0.7, 1.7]])],
    ["resting", samples([[0, 0, 1], [0.01, 0, 1], [0, 0.01, 1], [0, 0, 1]])],
    ["minor tremor", samples([[0.08, 0, 1], [-0.09, 0.02, 1], [0.1, -0.02, 1], [-0.08, 0, 1]])],
  ])("does not mistake %s for a shake", (_name, input) => {
    expect(detectShake(input as ShakeSample[]).shaking).toBe(false);
  });

  test("a still phone in portrait has zero shake strength", () => {
    const portrait = samples([[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]);
    expect(detectShake(portrait)).toEqual({ shaking: false, strength: 0 });
  });
});
