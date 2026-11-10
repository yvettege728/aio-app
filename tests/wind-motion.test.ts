import { advanceWindMotion, initialWindMotion, type WindMotion } from "../src/wind/motion";

const point = (x: number, t: number) => ({ x, y: 0, z: 1, t });

test("a deliberate shake loosens words and stillness triggers wind", () => {
  let state = initialWindMotion;
  const xs = [0, 2.4, -2.2, 2.6, -2.5, 2.3, -2.4, 2.5, -2.4, 2.5];
  xs.forEach((x, index) => { state = advanceWindMotion(state, point(x, index * 55)); });
  expect(state.phase).toBe("ready");
  state = advanceWindMotion(state, point(0, 605));
  state = advanceWindMotion(state, point(0.01, 660));
  state = advanceWindMotion(state, point(0.01, 1250));
  expect(state.phase).toBe("ready");
  state = advanceWindMotion(state, point(0.01, 1650));
  expect(state.phase).toBe("wind");
});

test("movement during stillness resets the wait", () => {
  let state: WindMotion = { ...initialWindMotion, phase: "ready", stillSince: 100 };
  state = advanceWindMotion(state, point(0, 300));
  state = advanceWindMotion(state, point(1, 800));
  expect(state.stillSince).toBeNull();
  state = advanceWindMotion(state, point(1.01, 850));
  expect(state.stillSince).toBe(850);
  state = advanceWindMotion(state, point(1.01, 1200));
  expect(state.phase).toBe("ready");
});

test("ordinary hand movement does not arm release", () => {
  let state = initialWindMotion;
  [0, 0.1, -0.08, 0.12, -0.09, 0.1, 0].forEach((x, index) => {
    state = advanceWindMotion(state, point(x, index * 55));
  });
  expect(state.phase).toBe("idle");
});

test("a partial shake settles when movement stops early", () => {
  let state: WindMotion = { ...initialWindMotion, phase: "loosening", shakeHits: 1, lastShakeAt: 100 };
  state = advanceWindMotion(state, point(0, 900));
  expect(state.phase).toBe("idle");
  expect(state.shakeHits).toBe(0);
});
