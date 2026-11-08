import AsyncStorage from "@react-native-async-storage/async-storage";
import { addEntry, readEntries } from "../src/rejection/store";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("rejection reflection store", () => {
  beforeEach(() => AsyncStorage.clear());

  test("reads an empty store", async () => {
    await expect(readEntries()).resolves.toEqual([]);
  });

  test("appends body-only and text-only entries with increasing sequence", async () => {
    const first = await addEntry({ body: "tight shoulders", company: "", role: "" });
    const second = await addEntry({ text: "This was a mismatch", state: "mint" });
    expect(first).toMatchObject({ seq: 1, body: "tight shoulders" });
    expect(second).toMatchObject({ seq: 2, text: "This was a mismatch", state: "mint" });
    await expect(readEntries()).resolves.toEqual([second, first]);
  });

  test("rejects an entry with neither body nor understanding", async () => {
    await expect(addEntry({ company: "A", role: "B" })).rejects.toThrow("body or text");
  });

  test("does not expose delete or edit operations", () => {
    const api = require("../src/rejection/store");
    expect(api.deleteEntry).toBeUndefined();
    expect(api.updateEntry).toBeUndefined();
  });
});
