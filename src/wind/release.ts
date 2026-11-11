import type { VoiceInputStatus } from "../speech/useVoiceInput";

export type ReleaseIntent = "empty" | "stopAndWait" | "wait" | "enterMotion";

export function releaseIntent(status: VoiceInputStatus, text: string): ReleaseIntent {
  if (!text.trim() && status !== "listening" && status !== "finishing" && status !== "requestingPermission") return "empty";
  if (status === "listening") return "stopAndWait";
  if (status === "finishing" || status === "requestingPermission") return "wait";
  return "enterMotion";
}
