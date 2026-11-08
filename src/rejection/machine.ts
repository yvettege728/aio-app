export type RejectionStep =
  | "home"
  | "permission"
  | "release"
  | "shaking"
  | "scattered"
  | "body"
  | "understand"
  | "keep"
  | "kept"
  | "list"
  | "detail"
  | "safetyStop";

export type RejectionState = {
  step: RejectionStep;
  releaseText: string;
  entryId?: string;
};

export type RejectionEvent =
  | { type: "START"; permissionIntroSeen?: boolean }
  | { type: "PERMISSION_READY" }
  | { type: "RELEASED"; text: string }
  | { type: "TOO_SHORT" }
  | { type: "SCATTERED" }
  | { type: "QUIET_FINISHED" }
  | { type: "BODY_NEXT" }
  | { type: "UNDERSTAND_NEXT"; hasContent: boolean }
  | { type: "KEPT" }
  | { type: "CLOSE" }
  | { type: "OPEN_LIST" }
  | { type: "OPEN_DETAIL"; entryId: string }
  | { type: "BACK" }
  | { type: "SAFETY_STOP" };

export const initialRejectionState: RejectionState = {
  step: "home",
  releaseText: "",
};

export function rejectionTransition(
  state: RejectionState,
  event: RejectionEvent,
): RejectionState {
  if (state.step === "safetyStop") return state;
  if (event.type === "SAFETY_STOP") return { ...state, step: "safetyStop" };

  switch (state.step) {
    case "home":
      if (event.type === "START") return { ...initialRejectionState, step: event.permissionIntroSeen ? "release" : "permission" };
      if (event.type === "OPEN_LIST") return { ...state, step: "list" };
      return state;
    case "permission":
      return event.type === "PERMISSION_READY" ? { ...state, step: "release" } : state;
    case "release":
      if (event.type === "RELEASED" && event.text.trim()) {
        return { ...state, step: "shaking", releaseText: event.text.trim() };
      }
      return state;
    case "shaking":
      return event.type === "SCATTERED" ? { ...state, step: "scattered", releaseText: "" } : state;
    case "scattered":
      return event.type === "QUIET_FINISHED" ? { ...state, step: "body" } : state;
    case "body":
      return event.type === "BODY_NEXT" ? { ...state, step: "understand" } : state;
    case "understand":
      if (event.type === "UNDERSTAND_NEXT") {
        return event.hasContent ? { ...state, step: "keep" } : initialRejectionState;
      }
      return state;
    case "keep":
      return event.type === "KEPT" ? { ...state, step: "kept", releaseText: "" } : state;
    case "kept":
      return event.type === "CLOSE" ? initialRejectionState : state;
    case "list":
      if (event.type === "OPEN_DETAIL") return { ...state, step: "detail", entryId: event.entryId };
      return event.type === "BACK" ? initialRejectionState : state;
    case "detail":
      return event.type === "BACK" ? { ...state, step: "list", entryId: undefined } : state;
    default:
      return state;
  }
}
