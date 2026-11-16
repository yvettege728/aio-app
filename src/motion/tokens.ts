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
  rejection: {
    minSpeakMs: 650, // 说话达到这个时长才接住文字，用户不会因误触被推进。
    quietMs: 900, // 碎片消失后的留白时长，用户感到情绪真正落下。
    holdMs: 1450, // 收下胶囊填满的时长，用户感到这是一次明确选择。
    drainMs: 1650, // 长按中途松手后的回退时长，用户感到内容没有丢失。
    transitionMs: 420, // 页面淡入淡出的时长，用户感到过程连续而不突兀。
    scatterMs: 540, // 单个碎片离场的时长，用户感到文字轻轻散开。
    settleMs: 360, // 停止摇晃后碎片归位的时长，用户感到仍可继续。
    hapticGapMs: 130, // 两次轻触感之间的最短间隔，避免手机持续震动。
    scatterDistance: 260, // 普通动态模式下碎片离开文字的距离，用户看到释放发生。
    scatterStep: 0.16, // 每次有效摇晃推动碎片脱落的比例，用户可停下再继续。
    sampleIntervalMs: 52, // 加速度计采样间隔，兼顾摇晃识别和真机流畅度。
    fragmentJitter: 8, // 碎片松动时的最大晃动距离，用户看到文字开始失去固定形态。
    jitterMs: 140, // 碎片受摇晃轻微偏移再归位的时长，停下来会重新安静。
    fragmentRotation: 24, // 碎片离场时的最大旋转角度，用户感到它们自然散开。
    spring: {
      damping: 20, // 转场弹簧的阻尼，减少回弹带来的兴奋感。
      stiffness: 115, // 转场弹簧的力度，让界面反应清楚但不急促。
      mass: 1, // 转场弹簧的质量，让移动保持柔和的重量感。
    },
    shake: {
      windowMs: 520, // 检测摇晃的时间窗，要求动作在短时间内连续发生。
      minSamples: 6, // 判断前需要的最少样本，避免一次拿起手机被误判。
      amplitude: 0.8, // 有意摇晃需要达到的加速度幅度，过滤走路和轻微抖动。11/16 真机测试：1.35 需要很大力气，降到 0.8。
      gravitySmoothing: 0.18, // 缓慢估计手机朝向的重力分量，避免竖拿手机被当作摇晃。
      reversalDelta: 0.8, // 相邻方向反转的最小变化，区分摇晃和单向移动。11/16 随 amplitude 一起从 1.4 降低。
      reversalCosine: -0.45, // 连续运动向量需要足够反向，过滤转身和普通拿起。
      minHighSamples: 4, // 时间窗内需要的高幅样本数，避免偶发撞击触发。
      minReversals: 3, // 时间窗内需要的方向反转数，确认用户在反复摇晃。
      highWeight: 0.45, // 幅度对摇晃强度的占比，让更用力时脱落更快。
      reversalWeight: 0.55, // 反转对摇晃强度的占比，让往复动作比单次冲击更重要。
    },
  },
} as const;

export type TokenValues = typeof tokens;
