import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "../brand/brand";
import { windMotionTokens } from "./tokens";

// Not a button: a quiet line that sways a little, telling you the phone itself is the control.
// People who cannot shake (VoiceOver, no motion sensor) get a small text fallback.
export function ShakeHint({ ready, finishing, reducedMotion, showFallback, onRelease }: {
  ready: boolean; finishing: boolean; reducedMotion: boolean; showFallback: boolean; onRelease: () => void;
}) {
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready || reducedMotion) { sway.stopAnimation(); sway.setValue(0); return; }
    const half = windMotionTokens.hintSwayMs / 4;
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: half, easing: ease, useNativeDriver: true }),
      Animated.timing(sway, { toValue: -1, duration: half * 2, easing: ease, useNativeDriver: true }),
      Animated.timing(sway, { toValue: 0, duration: half, easing: ease, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ready, reducedMotion, sway]);

  const label = finishing ? "finishing your words…" : ready ? "shake to let it go" : "say or write first";
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-2.5deg", "2.5deg"] });
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] });

  return <View style={styles.wrap}
    accessible
    accessibilityLabel={label}
    accessibilityActions={ready ? [{ name: "activate", label: "Release without shaking" }] : undefined}
    onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "activate") onRelease(); }}>
    <Animated.View style={[styles.line, { transform: [{ translateX }, { rotate }] }]}>
      <Text style={[styles.waves, !ready && styles.dim]}>~</Text>
      <Text style={[styles.text, !ready && styles.dim]}>{label}</Text>
      <Text style={[styles.waves, !ready && styles.dim]}>~</Text>
    </Animated.View>
    {ready && showFallback && <Pressable accessibilityRole="button" onPress={onRelease} hitSlop={10}><Text style={styles.fallback}>or let go without shaking</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 2, minHeight: 62, justifyContent: "center" },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  text: { color: brand.periwinkle, fontFamily: "Gaegu_700Bold", fontSize: 24 },
  waves: { color: brand.periwinkle, fontFamily: "Gaegu_700Bold", fontSize: 24, opacity: 0.6 },
  dim: { opacity: 0.45 },
  fallback: { color: brand.muted, fontSize: 13, textDecorationLine: "underline", paddingVertical: 6 },
});
