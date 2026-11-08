import { tokens } from "../motion/tokens";

export type ShakeSample = { x: number; y: number; z: number; t: number };
export type ShakeResult = { shaking: boolean; strength: number };

export function detectShake(input: ShakeSample[]): ShakeResult {
  const cutoff = input.at(-1)?.t ?? 0;
  const samples = input.filter((sample) => cutoff - sample.t <= tokens.rejection.shake.windowMs);
  if (samples.length < tokens.rejection.shake.minSamples) return { shaking: false, strength: 0 };

  const gravity = [samples[0].x, samples[0].y, samples[0].z];
  const magnitudes = samples.map((sample) => {
    const motion = Math.hypot(sample.x - gravity[0], sample.y - gravity[1], sample.z - gravity[2]);
    gravity[0] += (sample.x - gravity[0]) * tokens.rejection.shake.gravitySmoothing;
    gravity[1] += (sample.y - gravity[1]) * tokens.rejection.shake.gravitySmoothing;
    gravity[2] += (sample.z - gravity[2]) * tokens.rejection.shake.gravitySmoothing;
    return motion;
  });
  const high = magnitudes.filter((value) => value >= tokens.rejection.shake.amplitude).length;
  let reversals = 0;
  for (let index = 2; index < samples.length; index += 1) {
    const previous = [
      samples[index - 1].x - samples[index - 2].x,
      samples[index - 1].y - samples[index - 2].y,
      samples[index - 1].z - samples[index - 2].z,
    ];
    const current = [
      samples[index].x - samples[index - 1].x,
      samples[index].y - samples[index - 1].y,
      samples[index].z - samples[index - 1].z,
    ];
    const previousSize = Math.hypot(...previous);
    const currentSize = Math.hypot(...current);
    const cosine = previous.reduce((sum, value, axis) => sum + value * current[axis], 0) /
      (previousSize * currentSize || 1);
    if (
      previousSize >= tokens.rejection.shake.reversalDelta &&
      currentSize >= tokens.rejection.shake.reversalDelta &&
      cosine <= tokens.rejection.shake.reversalCosine
    ) {
      reversals += 1;
    }
  }
  const strength = Math.min(
    1,
    (high / tokens.rejection.shake.minHighSamples) * tokens.rejection.shake.highWeight +
      (reversals / tokens.rejection.shake.minReversals) * tokens.rejection.shake.reversalWeight,
  );
  return {
    shaking:
      high >= tokens.rejection.shake.minHighSamples &&
      reversals >= tokens.rejection.shake.minReversals,
    strength,
  };
}
