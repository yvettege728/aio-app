import { advanceWindMotion, initialWindMotion, isShed, SHED_STEP, shedOrder, type WindMotion } from "../src/wind/motion";

const point = (x: number, t: number) => ({ x, y: 0, z: 1, t });
const shake = (state: WindMotion, from: number, count: number) => {
  for (let index = 0; index < count; index += 1) {
    state = advanceWindMotion(state, point(index % 2 === 0 ? 1.0 : -1.0, from + index * 55));
  }
  return state;
};

test("each shake sheds a little, not everything at once", () => {
  const state = shake(initialWindMotion, 0, 12);
  expect(state.phase).toBe("loosening");
  expect(state.shed).toBeGreaterThan(0);
  expect(state.shed).toBeLessThan(0.5);
});

test("what has fallen stays gone when shaking stops", () => {
  let state = shake(initialWindMotion, 0, 12);
  const shed = state.shed;
  state = advanceWindMotion(state, point(0, 2000));
  state = advanceWindMotion(state, point(0, 2055));
  expect(state.phase).toBe("idle");
  expect(state.shed).toBe(shed);
});

test("shaking long enough sheds everything and releases the wind", () => {
  const state = shake(initialWindMotion, 0, Math.ceil(1 / SHED_STEP) + 12);
  expect(state.shed).toBe(1);
  expect(state.phase).toBe("wind");
});

test("ordinary hand movement sheds nothing", () => {
  let state = initialWindMotion;
  [0, 0.1, -0.08, 0.12, -0.09, 0.1, 0].forEach((x, index) => {
    state = advanceWindMotion(state, point(x, index * 55));
  });
  expect(state.phase).toBe("idle");
  expect(state.shed).toBe(0);
});

test("shed order is a scattered permutation, not left to right", () => {
  const ranks = shedOrder(20);
  expect([...ranks].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  expect(ranks).not.toEqual(Array.from({ length: 20 }, (_, i) => i));
  expect(shedOrder(20)).toEqual(ranks);
});

test("letters fall in proportion to shed", () => {
  const ranks = shedOrder(10);
  const fallen = (shed: number) => ranks.filter((rank) => isShed(rank, 10, shed)).length;
  expect(fallen(0)).toBe(0);
  expect(fallen(0.35)).toBe(4);
  expect(fallen(1)).toBe(10);
});
