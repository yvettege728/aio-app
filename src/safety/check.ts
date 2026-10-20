const safetyKeywords = ['kill myself', 'suicide', "don't want to be here", 'want to die', 'end it all'];

export function containsSafetyConcern(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return safetyKeywords.some((keyword) => normalized.includes(keyword));
}

export { safetyKeywords };
