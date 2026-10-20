import { tokens } from '../motion/tokens';
export type MotionSample = { x: number; y: number; z: number; t: number };
export function detectBackTapPair(samples: MotionSample[]): boolean {
  const peaks = samples.filter((sample) => Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) >= tokens.paper.tapThreshold);
  return peaks.some((peak, index) => index > 0 && peak.t - peaks[index - 1].t <= tokens.paper.tapMaxGapMs);
}
export function detectBackTap(samples: MotionSample[], windowMs = tokens.paper.tapMaxGapMs): boolean {
  const peaks = samples.filter((sample) => Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) >= tokens.paper.tapThreshold);
  return peaks.length >= 2 && peaks[peaks.length - 1].t - peaks[peaks.length - 2].t <= windowMs;
}
