export const tokens = {
  arrive: {
    holdMs: 1100, // 进场圆填满的时长，用户感到自己在准备而不是被催促。
    drainMs: 1600, // 中途松手后的回退时长，用户感到内容仍然安全。
  },
  keep: {
    holdMs: 1500, // 收下胶囊填满的时长，用户感到这是决定而不是点击次数。
    drainMs: 1700, // 放手后填充退回的时长，用户感到可以反悔。
  },
  name: { settleMs: 720 },
  fade: {
    promptMs: 520,
    shortMs: 180,
  },
  float: {
    durationMs: 6200,
    maxOffset: 4,
    breathScale: 1.015,
  },
  spring: {
    damping: 22,
    stiffness: 120,
    mass: 1,
  },
  transition: {
    settleMs: 380,
    ease: [0.22, 1, 0.36, 1] as const,
  },
  paper: {
    speechRate: 0.78,
    torchPulseMs: 180,
    faceDownStableMs: 1000,
    angleTolerance: 0.4,
    tapThreshold: 1.65,
    tapMaxGapMs: 850,
  },
} as const;

export type TokenValues = typeof tokens;
