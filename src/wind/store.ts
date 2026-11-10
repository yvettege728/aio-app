import AsyncStorage from "@react-native-async-storage/async-storage";

export type WindEntry = { id: string; text: string; createdAt: number };
const KEY = "aio.wind.entries.v1";

export async function readWindEntries(): Promise<WindEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Invalid saved records");
  return (parsed as WindEntry[]).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addWindEntry(text: string): Promise<WindEntry> {
  const cleaned = text.trim();
  if (!cleaned) throw new Error("A record needs text");
  const entries = await readWindEntries();
  const createdAt = Date.now();
  const entry = { id: `${createdAt}-${Math.random().toString(36).slice(2, 10)}`, text: cleaned, createdAt };
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...entries]));
  return entry;
}

export async function deleteWindEntry(id: string): Promise<void> {
  const entries = await readWindEntries();
  await AsyncStorage.setItem(KEY, JSON.stringify(entries.filter((entry) => entry.id !== id)));
}

export async function deleteAllWindEntries(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
