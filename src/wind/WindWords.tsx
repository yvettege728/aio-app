import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { windMotionTokens } from "./tokens";

type Phase = "idle" | "loosening" | "ready" | "wind";
const INK = "#302c27";

function Letter({ value, index, phase, reducedMotion }: { value: string; index: number; phase: Phase; reducedMotion: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (phase === "wind") {
      progress.value = withDelay(index * windMotionTokens.letterDelayMs, withTiming(1, { duration: reducedMotion ? windMotionTokens.fadeMs : windMotionTokens.driftMs, easing: Easing.out(Easing.cubic) }));
    } else {
      progress.value = withTiming(phase === "ready" ? 0.16 : phase === "loosening" ? 0.06 : 0, { duration: windMotionTokens.settleMs });
    }
  }, [index, phase, progress, reducedMotion]);
  const animated = useAnimatedStyle(() => {
    const direction = index % 3 === 0 ? -1 : 1;
    return {
      opacity: phase === "wind" ? 1 - progress.value : 1,
      transform: reducedMotion ? [] : [
        { translateX: progress.value * direction * (phase === "wind" ? 110 + index % 5 * 18 : 7) },
        { translateY: progress.value * (phase === "wind" ? -55 - index % 7 * 17 : (index % 3 - 1) * 8) },
        { rotate: `${progress.value * direction * (phase === "wind" ? 24 : 8)}deg` },
      ],
    };
  });
  return <Animated.Text style={[styles.letter, animated]}>{value}</Animated.Text>;
}

export function WindWords({ text, phase, reducedMotion, onComplete }: {
  text: string; phase: Phase; reducedMotion: boolean; onComplete: () => void;
}) {
  const visible = useMemo(() => Array.from(text).slice(0, 320), [text]);
  useEffect(() => {
    if (phase !== "wind") return;
    const timer = setTimeout(onComplete, reducedMotion ? 400 : windMotionTokens.completeBaseMs + visible.length * windMotionTokens.letterDelayMs);
    return () => clearTimeout(timer);
  }, [onComplete, phase, reducedMotion, visible.length]);
  return <View style={styles.lines} accessibilityElementsHidden>
    {visible.map((letter, index) => <Letter key={index} value={letter} index={index} phase={phase} reducedMotion={reducedMotion} />)}
    {Array.from(text).length > visible.length && <Text style={styles.letter}>…</Text>}
  </View>;
}

const styles = StyleSheet.create({
  lines: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 8 },
  letter: { color: INK, fontSize: 26, lineHeight: 39, fontWeight: "400" },
});
