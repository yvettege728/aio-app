import { detectShake, type ShakeSample } from "../rejection/shake";

export type WindMotion = {
  phase: "idle" | "loosening" | "ready" | "wind";
  samples: ShakeSample[];
  shakeHits: number;
  lastShakeAt: number | null;
  stillSince: number | null;
};

export const initialWindMotion: WindMotion = {
  phase: "idle", samples: [], shakeHits: 0, lastShakeAt: null, stillSince: null,
};

const STILL_DELTA = 0.18;
const STILL_MS = 900;
const ARM_HITS = 3;

export function advanceWindMotion(state: WindMotion, sample: ShakeSample): WindMotion {
  if (state.phase === "wind") return state;
  const previous = state.samples.at(-1);
  const samples = [...state.samples, sample].filter((point) => sample.t - point.t <= 520);
  const delta = previous ? Math.hypot(sample.x - previous.x, sample.y - previous.y, sample.z - previous.z) : 0;

  if (state.phase === "ready") {
    if (delta > STILL_DELTA) return { ...state, samples, stillSince: null };
    const stillSince = state.stillSince ?? sample.t;
    return { ...state, samples, stillSince, phase: sample.t - stillSince >= STILL_MS ? "wind" : "ready" };
  }

  const shaking = detectShake(samples).shaking;
  if (!shaking) {
    if (state.phase === "loosening" && state.lastShakeAt !== null && sample.t - state.lastShakeAt > 650) {
      return { ...state, samples, phase: "idle", shakeHits: 0, lastShakeAt: null };
    }
    return { ...state, samples };
  }
  const shakeHits = (state.lastShakeAt !== null && sample.t - state.lastShakeAt > 650 ? 0 : state.shakeHits) + 1;
  return { ...state, samples, shakeHits, lastShakeAt: sample.t, phase: shakeHits >= ARM_HITS ? "ready" : "loosening" };
}
