import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from "@expo-google-fonts/gaegu";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { RejectionApp } from "./src/rejection/RejectionApp";
import { palettes } from "./src/theme/palettes";

export default function App() {
  const [loaded] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  return (
    <View style={{ flex: 1, backgroundColor: palettes.rejection.sky }}>
      <StatusBar style="dark" />
      {loaded ? <RejectionApp /> : null}
    </View>
  );
}
