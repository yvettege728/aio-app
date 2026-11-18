import { useCallback, useRef } from "react";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { windMotionTokens } from "./tokens";

// Two soft wind sounds made by scripts/make-wind-sounds.py.
// They follow the ring/silent switch: when the phone is on silent, aio is silent.
const RUSTLE = require("./assets/rustle.wav");
const WIND = require("./assets/wind.wav");

export function useWindSound() {
  const rustle = useAudioPlayer(RUSTLE);
  const wind = useAudioPlayer(WIND);
  const lastRustle = useRef(0);

  // Speech recognition leaves the session in record mode (quiet earpiece);
  // reset to normal playback each time the ritual begins.
  const prepare = useCallback(() => {
    void setAudioModeAsync({ playsInSilentMode: false, allowsRecording: false, interruptionMode: "mixWithOthers" }).catch(() => undefined);
  }, []);

  const play = (player: typeof rustle, volume: number) => {
    try { player.volume = volume; void player.seekTo(0); player.play(); } catch { /* sound is optional */ }
  };

  // Called on every shed step; throttled so a long shake is a breath, not a buzz.
  const rustleNow = useCallback(() => {
    const now = Date.now();
    if (now - lastRustle.current < windMotionTokens.rustleGapMs) return;
    lastRustle.current = now;
    play(rustle, 0.35 + Math.random() * 0.15);
  }, [rustle]);

  const gustNow = useCallback(() => play(wind, 0.6), [wind]);

  return { prepare, rustle: rustleNow, gust: gustNow };
}
