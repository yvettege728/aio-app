import AsyncStorage from "@react-native-async-storage/async-storage";

export type StateColor = "blue" | "dot" | "mint" | "rose" | "coral";

export type Entry = {
  id: string;
  seq: number;
  state?: StateColor;
  body?: string;
  text?: string;
  company?: string;
  role?: string;
  createdAt: number;
};

export type NewEntry = Omit<Entry, "id" | "seq" | "createdAt">;
const STORAGE_KEY = "aio.rejection.entries.v1";

function clean(value?: string): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export async function readEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const entries = JSON.parse(raw) as Entry[];
  return [...entries].sort((a, b) => b.seq - a.seq);
}

export async function addEntry(input: NewEntry): Promise<Entry> {
  const body = clean(input.body);
  const text = clean(input.text);
  if (!body && !text) throw new Error("An entry needs body or text");

  const entries = await readEntries();
  const seq = entries.reduce((highest, entry) => Math.max(highest, entry.seq), 0) + 1;
  const createdAt = Date.now();
  const entry: Entry = {
    id: `${createdAt}-${seq}`,
    seq,
    state: input.state,
    body,
    text,
    company: clean(input.company),
    role: clean(input.role),
    createdAt,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...entries]));
  return entry;
}
