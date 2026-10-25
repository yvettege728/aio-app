const safetyKeywords = [
  'kill myself',
  'suicide',
  "don't want to be here",
  'want to die',
  'end it all',
  '我想死',
  '想死',
  '不想活',
  '自杀',
  '结束生命',
];

export function containsSafetyConcern(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return safetyKeywords.some((keyword) => normalized.includes(keyword));
}

export { safetyKeywords };
