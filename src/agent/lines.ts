export function splitCandidateLines(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s*|\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractCandidateLines(
  turns: string[],
  limit = 3,
): string[] {
  return turns
    .flatMap(splitCandidateLines)
    .filter((line) => Array.from(line).length >= 4)
    .slice(0, limit);
}

export function isExactUserSpan(candidate: string, turns: string[]): boolean {
  const value = candidate.trim();
  return value.length > 0 && turns.some((turn) => turn.includes(value));
}
