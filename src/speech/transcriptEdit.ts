export type Selection = { start: number; end: number };

export type DictationBase = {
  prefix: string;
  selected: string;
  suffix: string;
  original: string;
};

export function beginDictation(text: string, selection: Selection): DictationBase {
  const start = Math.max(0, Math.min(text.length, Math.min(selection.start, selection.end)));
  const end = Math.max(0, Math.min(text.length, Math.max(selection.start, selection.end)));
  return {
    prefix: text.slice(0, start),
    selected: text.slice(start, end),
    suffix: text.slice(end),
    original: text,
  };
}

export function applyTranscript(base: DictationBase, transcript: string) {
  if (!transcript) {
    const cursor = base.prefix.length;
    return { text: base.original, selection: { start: cursor, end: cursor } };
  }
  const text = `${base.prefix}${transcript}${base.suffix}`;
  const cursor = base.prefix.length + transcript.length;
  return { text, selection: { start: cursor, end: cursor } };
}
