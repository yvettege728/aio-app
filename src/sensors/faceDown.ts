import { tokens } from '../motion/tokens';
export type Acceleration = { x: number; y: number; z: number; t: number };
function stableDirection(sample: Acceleration, faceDown: boolean): boolean {
  const magnitude = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) || 1;
  const normalizedZ = sample.z / magnitude;
  return faceDown ? normalizedZ < -1 + tokens.paper.angleTolerance : normalizedZ > 1 - tokens.paper.angleTolerance;
}
export function isFaceDown(sample: Acceleration): boolean { return stableDirection(sample, true); }
export function isFaceUp(sample: Acceleration): boolean { return stableDirection(sample, false); }
export function hasStableOrientation(samples: Acceleration[], faceDown: boolean, stableMs = tokens.paper.faceDownStableMs): boolean {
  if (samples.length < 2) return false;
  let firstStableSample: Acceleration | undefined;
  let lastStableSample: Acceleration | undefined;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    if (!stableDirection(sample, faceDown)) break;
    firstStableSample = sample;
    lastStableSample ??= sample;
  }
  return Boolean(
    firstStableSample &&
      lastStableSample &&
      lastStableSample.t - firstStableSample.t >= stableMs,
  );
}
export function isLiftedOrMoved(samples: Acceleration[]): boolean {
  if (samples.length < 2) return false;
  const latest = samples.slice(-3);
  const hasLifted = latest.length === 3 && latest.every((sample) => !isFaceDown(sample));
  const hasQuickMovement = samples.slice(-2).some((sample) => Math.abs(sample.x) + Math.abs(sample.y) > 2.4);
  return hasLifted || hasQuickMovement;
}
