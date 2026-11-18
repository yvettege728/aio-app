import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "../brand/brand";
import { windMotionTokens } from "./tokens";

const SIZE = 78;

// A liquid drop in the brand palette: periwinkle rim, pale core, white glint.
// While listening, soft rings breathe out from it like the bloom in the splash.
export function VoiceButton({ listening, busy, reducedMotion, hint, onPressIn, onPressOut }: {
  listening: boolean; busy: boolean; reducedMotion: boolean; hint: string;
  onPressIn: () => void; onPressOut: () => void;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const half = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!listening || reducedMotion) { breath.stopAnimation(); breath.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(breath, { toValue: 1, duration: windMotionTokens.voiceBreathMs, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [listening, reducedMotion, breath]);

  const squeeze = (to: number) => Animated.spring(press, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  const ring = (offset: Animated.Value | null) => {
    const t = offset ? Animated.modulo(Animated.add(breath, offset), 1) : breath;
    return { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }] };
  };
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  return <View style={styles.wrap}>
    <View style={styles.stage}>
      {listening && !reducedMotion && <><Animated.View pointerEvents="none" style={[styles.ring, ring(null)]} /><Animated.View pointerEvents="none" style={[styles.ring, ring(half)]} /></>}
      {listening && reducedMotion && <View pointerEvents="none" style={[styles.ring, styles.ringStill]} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop speaking" : "Speak"}
        accessibilityHint="Hold to speak and let go when you are done, or tap to start and tap again to stop."
        accessibilityState={{ busy }}
        onPressIn={() => { squeeze(1); onPressIn(); }}
        onPressOut={() => { squeeze(0); onPressOut(); }}
        hitSlop={14}
      >
        <Animated.View style={[styles.drop, listening && styles.dropOn, { transform: [{ scale }] }]}>
          <View pointerEvents="none" style={styles.core} />
          <View pointerEvents="none" style={styles.glint} />
          <Ionicons name="mic" size={30} color={listening ? brand.white : brand.periwinkle} />
        </Animated.View>
      </Pressable>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.hint}>{hint}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6 },
  stage: { width: SIZE * 1.9, height: SIZE * 1.5, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, borderColor: brand.periwinkle, backgroundColor: "rgba(159,211,238,0.18)" },
  ringStill: { transform: [{ scale: 1.3 }], opacity: 0.35 },
  drop: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 2, borderColor: brand.periwinkle, backgroundColor: "rgba(251,252,255,0.75)",
    shadowColor: "#2E3A78", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  dropOn: { backgroundColor: brand.periwinkle, borderColor: brand.white },
  core: { position: "absolute", left: 10, right: 10, top: 14, bottom: 6, borderRadius: SIZE, backgroundColor: "rgba(201,211,246,0.45)" },
  glint: { position: "absolute", left: 17, top: 11, width: 22, height: 9, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.9)", transform: [{ rotate: "-24deg" }] },
  hint: { color: brand.periwinkleText, fontFamily: "Gaegu_400Regular", fontSize: 19 },
});
