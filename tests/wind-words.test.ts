import { tokenizeWindWords } from "../src/wind/words";

test("keeps words together before the wind", () => {
  expect(tokenizeWindWords("prepared positions are" )).toEqual(["prepared", "positions", "are"]);
  expect(tokenizeWindWords("hello  world\nagain")).toEqual(["hello", "world", "again"]);
});
