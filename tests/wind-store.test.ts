import AsyncStorage from "@react-native-async-storage/async-storage";
import { addWindEntry, deleteAllWindEntries, deleteWindEntry, readWindEntries } from "../src/wind/store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

beforeEach(() => AsyncStorage.clear());

test("keeps the complete corrected text under a new key", async () => {
  const saved = await addWindEntry("  I felt rejected, but I still asked for help.  ");
  expect(saved.text).toBe("I felt rejected, but I still asked for help.");
  expect(await readWindEntries()).toEqual([saved]);
  expect(await AsyncStorage.getItem("aio.rejection.entries.v1")).toBeNull();
});

test("rejects empty text and removes one or all records", async () => {
  await expect(addWindEntry("  ")).rejects.toThrow();
  const first = await addWindEntry("First");
  const second = await addWindEntry("Second");
  await deleteWindEntry(first.id);
  expect((await readWindEntries()).map((entry) => entry.id)).toEqual([second.id]);
  await deleteAllWindEntries();
  expect(await readWindEntries()).toEqual([]);
});
