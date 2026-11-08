import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../motion/tokens";
import { palettes } from "../theme/palettes";

type Props = {
  text: string;
  strength: number;
  signal: number;
  reducedMotion: boolean;
  forceComplete: boolean;
  onComplete: () => void;
};

function splitText(text: string): string[] {
  return text.match(/[\u3400-\u9fff]|[^\s]+|\s+/g) ?? [];
}

function Fragment({
  value,
  index,
  total,
  progress,
  signal,
  strength,
  reducedMotion,
}: {
  value: string;
  index: number;
  total: number;
  progress: number;
  signal: number;
  strength: number;
  reducedMotion: boolean;
}) {
  const detached = useSharedValue(0);
  const wobble = useSharedValue(0);
  const threshold = (index + 1) / Math.max(1, total);
  useEffect(() => {
    detached.value = withTiming(progress >= threshold ? 1 : 0, {
      duration: progress >= threshold ? tokens.rejection.scatterMs : tokens.rejection.settleMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [detached, progress, threshold]);
  useEffect(() => {
    if (strength <= 0 || progress >= threshold || reducedMotion) return;
    const direction = index % 2 === 0 ? -1 : 1;
    wobble.value = withSequence(
      withTiming(direction * tokens.rejection.fragmentJitter * strength, { duration: tokens.rejection.jitterMs }),
      withTiming(0, { duration: tokens.rejection.settleMs }),
    );
  }, [index, progress, reducedMotion, signal, strength, threshold, wobble]);
  const style = useAnimatedStyle(() => {
    const direction = index % 2 === 0 ? -1 : 1;
    const vertical = (index % 3) - 1;
    return {
      opacity: 1 - detached.value,
      transform: [
        { translateX: reducedMotion ? 0 : wobble.value + detached.value * direction * tokens.rejection.scatterDistance },
        { translateY: reducedMotion ? 0 : detached.value * vertical * tokens.rejection.scatterDistance },
        { rotate: `${reducedMotion ? 0 : detached.value * direction * tokens.rejection.fragmentRotation}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.fragment, style]}>
      <Text style={styles.fragmentText}>{value}</Text>
      <View style={[styles.grain, { backgroundColor: index % 2 ? palettes.rejection.rose : palettes.rejection.dot }]} />
    </Animated.View>
  );
}

export function Scatter({ text, strength, signal, reducedMotion, forceComplete, onComplete }: Props) {
  const fragments = useMemo(() => splitText(text), [text]);
  const [progress, setProgress] = useState(0);
  const lastHaptic = useRef(0);
  const lastDetached = useRef(0);
  const completed = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (strength <= 0 || completed.current) return;
    setProgress((current) => Math.min(1, current + tokens.rejection.scatterStep * strength));
  }, [signal, strength]);

  useEffect(() => {
    if (forceComplete) setProgress(1);
  }, [forceComplete]);

  useEffect(() => {
    if (progress <= 0 || completed.current) return;
    const detachedCount = Math.floor(progress * fragments.length);
    const now = Date.now();
    if (detachedCount > lastDetached.current && now - lastHaptic.current >= tokens.rejection.hapticGapMs) {
      lastHaptic.current = now;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    lastDetached.current = detachedCount;
    if (progress >= 1) {
      completed.current = true;
      const timer = setTimeout(() => {
        void Haptics.selectionAsync();
        completeRef.current();
      }, reducedMotion ? tokens.fade.shortMs : tokens.rejection.scatterMs);
      return () => clearTimeout(timer);
    }
  }, [fragments.length, progress, reducedMotion]);

  return (
    <View style={styles.wrap} accessibilityElementsHidden>
      {fragments.map((fragment, index) => (
        <Fragment
          key={`${fragment}-${index}`}
          value={fragment}
          index={index}
          total={fragments.length}
          progress={progress}
          signal={signal}
          strength={strength}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 28 },
  fragment: { marginHorizontal: 2, marginVertical: 3 },
  fragmentText: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 30 },
  grain: { position: "absolute", width: 4, height: 4, borderRadius: 2, right: -1, top: 2, opacity: 0.65 },
});
