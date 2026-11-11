import { releaseIntent } from "../src/wind/release";

test("one release tap stops active dictation, then enters the gesture after it finishes", () => {
  expect(releaseIntent("listening", "I need a pause")).toBe("stopAndWait");
  expect(releaseIntent("finishing", "I need a pause")).toBe("wait");
  expect(releaseIntent("idle", "I need a pause")).toBe("enterMotion");
});

test("empty words never enter the gesture", () => {
  expect(releaseIntent("idle", "  ")).toBe("empty");
});
