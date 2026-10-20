export function nextPromptIndex(
  current: number | null,
  total: number,
  random = Math.random,
): number {
  if (total < 1) throw new RangeError("At least one prompt is required.");
  if (total === 1) return 0;
  const available = current === null
    ? total
    : total - 1;
  const picked = Math.min(Math.floor(random() * available), available - 1);
  return current === null || picked < current ? picked : picked + 1;
}
