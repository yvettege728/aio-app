import type { VoiceInputStatus } from "../speech/useVoiceInput";

// Hold to talk, let go to stop. A quick tap latches instead, so people who
// cannot hold (or VoiceOver users) can tap once to start and once to stop.
export type VoiceMode = "hold" | "latched" | null;
export const TAP_MS = 350;

export function pressOutAction(mode: VoiceMode, heldMs: number): "stop" | "latch" | "none" {
  if (mode === "latched") return "stop";
  if (mode === "hold") return heldMs < TAP_MS ? "latch" : "stop";
  return "none";
}

export function voiceHint(status: VoiceInputStatus, mode: VoiceMode, locale: "en" | "zh"): string {
  if (status === "requestingPermission") return "asking for the microphone…";
  if (status === "finishing") return "catching your words…";
  if (status === "listening") return mode === "latched" ? "listening · tap to stop" : "listening · let go when you're done";
  return locale === "zh" ? "hold to speak · Mandarin" : "hold to speak";
}
