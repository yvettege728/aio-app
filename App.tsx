import { useCallback, useState } from "react";
import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from "@expo-google-fonts/gaegu";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { WindApp } from "./src/wind/WindApp";
import { BrandSplash } from "./src/brand/BrandSplash";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
// The JS splash underneath is pixel-identical, so the native one can vanish instantly.
SplashScreen.setOptions({ fade: false, duration: 0 });

export default function App() {
  const [loaded] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);
  return (
    <View style={{ flex: 1, backgroundColor: "#E6EFFA" }}>
      <StatusBar style="dark" />
      {loaded ? <WindApp /> : null}
      {splashDone ? null : <BrandSplash ready={loaded} onDone={finishSplash} />}
    </View>
  );
}
