import { initialRejectionState, rejectionTransition } from "../src/rejection/machine";

describe("rejection state machine", () => {
  test("runs the release and reflection path", () => {
    let state = initialRejectionState;
    state = rejectionTransition(state, { type: "START" });
    expect(state.step).toBe("permission");
    state = rejectionTransition(state, { type: "PERMISSION_READY" });
    expect(state.step).toBe("release");
    state = rejectionTransition(state, { type: "RELEASED", text: "I feel dismissed" });
    expect(state.step).toBe("shaking");
    state = rejectionTransition(state, { type: "SCATTERED" });
    expect(state.step).toBe("scattered");
    state = rejectionTransition(state, { type: "QUIET_FINISHED" });
    expect(state.step).toBe("body");
    state = rejectionTransition(state, { type: "BODY_NEXT" });
    expect(state.step).toBe("understand");
    state = rejectionTransition(state, { type: "UNDERSTAND_NEXT", hasContent: true });
    expect(state.step).toBe("keep");
    state = rejectionTransition(state, { type: "KEPT" });
    expect(state.step).toBe("kept");
    expect(state.releaseText).toBe("");
  });

  test("returns directly to release after the permission introduction was seen", () => {
    expect(rejectionTransition(initialRejectionState, { type: "START", permissionIntroSeen: true }).step).toBe("release");
  });

  test("skips an empty reflection without storing", () => {
    const state = rejectionTransition(
      { ...initialRejectionState, step: "understand" },
      { type: "UNDERSTAND_NEXT", hasContent: false },
    );
    expect(state.step).toBe("home");
  });

  test("routes home to list and list to detail", () => {
    const list = rejectionTransition(initialRejectionState, { type: "OPEN_LIST" });
    expect(list.step).toBe("list");
    const detail = rejectionTransition(list, { type: "OPEN_DETAIL", entryId: "entry-2" });
    expect(detail).toMatchObject({ step: "detail", entryId: "entry-2" });
    expect(rejectionTransition(detail, { type: "BACK" }).step).toBe("list");
  });

  test("release shorter than the threshold remains waiting", () => {
    const release = { ...initialRejectionState, step: "release" as const };
    expect(rejectionTransition(release, { type: "TOO_SHORT" })).toEqual(release);
  });

  test("letting go during the keep hold retains the reflection step", () => {
    const keeping = { ...initialRejectionState, step: "keep" as const };
    expect(rejectionTransition(keeping, { type: "HOLD_RELEASED" })).toEqual(keeping);
  });

  test("closing the kept view returns home", () => {
    const kept = { ...initialRejectionState, step: "kept" as const };
    expect(rejectionTransition(kept, { type: "CLOSE" })).toEqual(initialRejectionState);
  });

  test("safety stop wins from every writing step and cannot be dismissed", () => {
    for (const step of ["release", "body", "understand"] as const) {
      const stopped = rejectionTransition({ ...initialRejectionState, step }, { type: "SAFETY_STOP" });
      expect(stopped.step).toBe("safetyStop");
      expect(rejectionTransition(stopped, { type: "BACK" }).step).toBe("safetyStop");
    }
  });
});
