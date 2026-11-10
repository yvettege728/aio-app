import { useFonts, Gaegu_400Regular, Gaegu_700Bold } from "@expo-google-fonts/gaegu";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { WindApp } from "./src/wind/WindApp";

export default function App() {
  const [loaded] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  return (
    <View style={{ flex: 1, backgroundColor: "#f4f1e9" }}>
      <StatusBar style="dark" />
      {loaded ? <WindApp /> : null}
    </View>
  );
}
