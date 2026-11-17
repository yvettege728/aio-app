import { detectShake, type ShakeSample } from "../rejection/shake";

// 11/16 测试者建议「一点点甩掉而不是一下子」：每次检测到摇晃，就有一部分字脱落。
// shed 是已经脱落的比例（0 到 1）。摇到 1 时整句已经甩完，进入 wind（保存并结束）。
// 停下来时已经脱落的字不会回来，剩下的字只是停止晃动。
export type WindMotion = {
  phase: "idle" | "loosening" | "wind";
  samples: ShakeSample[];
  shed: number;
  lastShakeAt: number | null;
};

export const initialWindMotion: WindMotion = {
  phase: "idle", samples: [], shed: 0, lastShakeAt: null,
};

// 每个被判定为摇晃的样本（约 55ms 一个）脱落的比例。0.035 约等于连续摇一秒半到两秒甩完。
export const SHED_STEP = 0.035;
const SETTLE_MS = 650;

export function advanceWindMotion(state: WindMotion, sample: ShakeSample): WindMotion {
  if (state.phase === "wind") return state;
  const samples = [...state.samples, sample].filter((point) => sample.t - point.t <= 520);

  if (!detectShake(samples).shaking) {
    if (state.phase === "loosening" && state.lastShakeAt !== null && sample.t - state.lastShakeAt > SETTLE_MS) {
      return { ...state, samples, phase: "idle" };
    }
    return { ...state, samples };
  }
  const shed = Math.min(1, state.shed + SHED_STEP);
  return { ...state, samples, shed, lastShakeAt: sample.t, phase: shed >= 1 ? "wind" : "loosening" };
}

// 字脱落的顺序：打散而不是从左到右，像被风从各处一点点带走。确定性的，同一句话每次顺序一样。
// 返回 ranks，ranks[i] 是第 i 个字的脱落名次。
export function shedOrder(count: number): number[] {
  const ranks = Array.from({ length: count }, (_, index) => index);
  let seed = (2166136261 ^ count) >>> 0;
  for (let index = count - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    const swap = seed % (index + 1);
    [ranks[index], ranks[swap]] = [ranks[swap], ranks[index]];
  }
  return ranks;
}

// 名次 rank 的字在 shed 超过 rank / count 时脱落。
export function isShed(rank: number, count: number, shed: number): boolean {
  return count > 0 && shed > rank / count;
}
