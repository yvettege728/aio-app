import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { windMotionTokens } from "./tokens";
import { tokenizeWindWords } from "./words";

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
  const visible = useMemo(() => {
    let used = 0;
    return tokenizeWindWords(text).filter((word) => {
      if (used >= 320) return false;
      used += Array.from(word).length + 1;
      return true;
    });
  }, [text]);
  const visibleLetters = visible.reduce((count, word) => count + Array.from(word).length, 0);
  useEffect(() => {
    if (phase !== "wind") return;
    const timer = setTimeout(onComplete, reducedMotion ? 400 : windMotionTokens.completeBaseMs + visibleLetters * windMotionTokens.letterDelayMs);
    return () => clearTimeout(timer);
  }, [onComplete, phase, reducedMotion, visibleLetters]);
  let letterIndex = 0;
  return <View style={styles.lines} accessibilityElementsHidden>
    {visible.map((word, wordIndex) => <View key={wordIndex} style={styles.word}>
      {Array.from(word).map((letter, index) => <Letter key={index} value={letter} index={letterIndex++} phase={phase} reducedMotion={reducedMotion} />)}
    </View>)}
    {tokenizeWindWords(text).length > visible.length && <Text style={styles.letter}>…</Text>}
  </View>;
}

const styles = StyleSheet.create({
  lines: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 12 },
  word: { flexDirection: "row", marginRight: 8, marginBottom: 4 },
  letter: { color: INK, fontSize: 21, lineHeight: 32, fontWeight: "400" },
});
