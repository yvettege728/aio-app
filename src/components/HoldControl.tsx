import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { tokens } from "../motion/tokens";

type Props = {
  label: string;
  color: string;
  onComplete: () => void;
  onCancel?: () => void;
  testID?: string;
  holdMs?: number;
  drainMs?: number;
  style?: ViewStyle;
  preserveHoldOnReducedMotion?: boolean;
};

export function HoldControl({
  label,
  color,
  onComplete,
  onCancel,
  testID,
  holdMs = tokens.keep.holdMs,
  drainMs = tokens.keep.drainMs,
  style,
  preserveHoldOnReducedMotion = false,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const completeRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  const start = () => {
    completeRef.current = false;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion && !preserveHoldOnReducedMotion ? tokens.fade.shortMs : holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        completeRef.current = true;
        onComplete();
      }
    });
  };

  const stop = () => {
    if (completeRef.current) return;
    onCancel?.();
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion && !preserveHoldOnReducedMotion ? tokens.fade.shortMs : drainMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const fillHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={start}
      onPressOut={stop}
      style={[styles.button, style]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color, height: fillHeight }]} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 108,
    height: 220,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: "#748B7A",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 22,
    marginVertical: 20,
  },
  fill: { position: "absolute", left: 0, right: 0, bottom: 0 },
  label: { fontFamily: "Gaegu_700Bold", fontSize: 24, color: "#4B5146" },
});
