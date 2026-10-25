const forbiddenPatterns = [
  /\b(?:beautiful|brave|amazing|wonderful|proud of you)\b/i,
  /\b(?:introvert|extrovert|personality type|diagnos(?:e|is|ed)|depress(?:ed|ion)|anxious|anxiety)\b/i,
  /\b(?:fortune|destiny|fate|oracle|guru|therapist|life coach)\b/i,
  /\b(?:i know you|who you really are|this means you are|you are clearly)\b/i,
  /(?:算命|命运|注定|人格类型|你就是|你其实是|你真勇敢|真勇敢|你真棒|我知道真正的你|诊断|抑郁症|焦虑症|心理治疗师|人生导师)/u,
];

export function isValidAgentMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized || Array.from(normalized).length > 240) {
    return false;
  }

  const questionMarks = normalized.match(/[?？]/gu)?.length ?? 0;
  if (questionMarks > 1) {
    return false;
  }

  return !forbiddenPatterns.some((pattern) => pattern.test(normalized));
}

export { forbiddenPatterns };
