import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, StyleSheet, useWindowDimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";

// Same full-screen image, aspect-filled, as the native splash
// (plugins/withFullBleedSplash.js), so the hand-off is invisible.
const SPLASH = require("../../assets/splash-icon.png");
const SPLASH_GROUND = "#E6EFFA";

const HOLD_MS = 1400;
const FADE_MS = 700;

export function BrandSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [painted, setPainted] = useState(false);
  const { width, height } = useWindowDimensions();

  // Hide the native splash only once this identical image has painted,
  // so there is no blank frame in between.
  useEffect(() => {
    if (painted) void SplashScreen.hideAsync().catch(() => undefined);
  }, [painted]);

  useEffect(() => {
    if (!ready || !painted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: reduced ? 200 : FADE_MS, useNativeDriver: true })
          .start(() => { if (!cancelled) onDone(); });
      }, reduced ? 900 : HOLD_MS);
    });
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [ready, painted, onDone, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel="aio. thank you for showing up"
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
    >
      <Image source={SPLASH} style={{ position: "absolute", left: 0, top: 0, width, height }} resizeMode="cover" onLoadEnd={() => setPainted(true)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: SPLASH_GROUND, zIndex: 10 },
});
