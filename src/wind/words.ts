export function tokenizeWindWords(text: string): string[] {
  return text.trim().split(/\s+/u).filter(Boolean);
}
