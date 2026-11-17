import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { windMotionTokens } from "./tokens";
import { tokenizeWindWords } from "./words";

type Phase = "idle" | "loosening" | "wind";
import { brand } from "../brand/brand";
import { isShed, shedOrder } from "./motion";
const INK = brand.ink;

// gone：这个字已经被甩掉（摇晃中一点点脱落，或最后的风）。脱落后不会回来。
function Letter({ value, index, phase, gone, reducedMotion }: { value: string; index: number; phase: Phase; gone: boolean; reducedMotion: boolean }) {
  const progress = useSharedValue(0);
  const wobble = useSharedValue(0);
  useEffect(() => {
    if (gone) {
      const delay = phase === "wind" ? (index % 9) * windMotionTokens.letterDelayMs : 0;
      progress.value = withDelay(delay, withTiming(1, { duration: reducedMotion ? windMotionTokens.fadeMs : windMotionTokens.driftMs, easing: Easing.out(Easing.cubic) }));
    }
  }, [gone, index, phase, progress, reducedMotion]);
  useEffect(() => {
    if (!gone) wobble.value = withTiming(phase === "loosening" ? 1 : 0, { duration: windMotionTokens.settleMs });
  }, [gone, phase, wobble]);
  const animated = useAnimatedStyle(() => {
    const direction = index % 3 === 0 ? -1 : 1;
    const drift = progress.value;
    const loose = wobble.value * 0.08;
    return {
      opacity: 1 - drift,
      transform: reducedMotion ? [] : [
        { translateX: drift * direction * (110 + index % 5 * 18) + loose * direction * 7 },
        { translateY: drift * (-55 - index % 7 * 17) + loose * (index % 3 - 1) * 8 },
        { rotate: `${drift * direction * 24 + loose * direction * 8}deg` },
      ],
    };
  });
  return <Animated.Text style={[styles.letter, animated]}>{value}</Animated.Text>;
}

export function WindWords({ text, phase, shed, reducedMotion, onComplete }: {
  text: string; phase: Phase; shed: number; reducedMotion: boolean; onComplete: () => void;
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
  const ranks = useMemo(() => shedOrder(visibleLetters), [visibleLetters]);
  useEffect(() => {
    if (phase !== "wind") return;
    const timer = setTimeout(onComplete, reducedMotion ? 400 : windMotionTokens.completeBaseMs);
    return () => clearTimeout(timer);
  }, [onComplete, phase, reducedMotion]);
  let letterIndex = 0;
  return <View style={styles.lines} accessibilityElementsHidden>
    {visible.map((word, wordIndex) => <View key={wordIndex} style={styles.word}>
      {Array.from(word).map((letter, index) => {
        const i = letterIndex++;
        const gone = phase === "wind" || isShed(ranks[i], visibleLetters, shed);
        return <Letter key={index} value={letter} index={i} phase={phase} gone={gone} reducedMotion={reducedMotion} />;
      })}
    </View>)}
    {tokenizeWindWords(text).length > visible.length && <Text style={styles.letter}>…</Text>}
  </View>;
}

const styles = StyleSheet.create({
  lines: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 12 },
  word: { flexDirection: "row", marginRight: 8, marginBottom: 4 },
  letter: { color: INK, fontFamily: "Gaegu_400Regular", fontSize: 25, lineHeight: 34, fontWeight: "400" },
});
