import { pressOutAction, voiceHint, TAP_MS } from "../src/wind/voicePress";

test("holding then letting go stops listening", () => {
  expect(pressOutAction("hold", TAP_MS + 400)).toBe("stop");
});

test("a quick tap latches listening on until the next tap", () => {
  expect(pressOutAction("hold", 120)).toBe("latch");
  expect(pressOutAction("latched", 80)).toBe("stop");
});

test("letting go with no active voice does nothing", () => {
  expect(pressOutAction(null, 900)).toBe("none");
});

test("hint tells people what to do next", () => {
  expect(voiceHint("idle", null, "en")).toBe("hold to speak");
  expect(voiceHint("listening", "hold", "en")).toMatch(/let go/);
  expect(voiceHint("listening", "latched", "en")).toMatch(/tap to stop/);
  expect(voiceHint("finishing", null, "en")).toMatch(/catching/);
});
