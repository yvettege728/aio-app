import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { palettes } from "../theme/palettes";
import type { Entry } from "./store";

export function RejectionDetail({ entry, onBack }: { entry?: Entry; onBack: () => void }) {
  const tint = entry?.state ? palettes.rejection[entry.state] : palettes.rejection.white;
  return (
    <View style={styles.screen}>
      <View style={[styles.tint, { backgroundColor: tint }]} />
      <View style={styles.haze} />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>[copy TBD: 返回]</Text>
        </Pressable>
        {entry && <>
          <Text style={styles.count}>第 {entry.seq} 次</Text>
          {!!entry.company && <Text style={styles.meta}>{entry.company}</Text>}
          {!!entry.role && <Text style={styles.meta}>{entry.role}</Text>}
          {!!entry.body && <Section label="[copy TBD: 身体感受]" value={entry.body} />}
          {!!entry.text && <Section label="[copy TBD: 理解]" value={entry.text} />}
        </>}
        {!entry && <Text style={styles.meta}>[copy TBD: 无法读取这条记录]</Text>}
      </ScrollView>
    </View>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return <View style={styles.section}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palettes.rejection.sky },
  tint: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.32 },
  haze: { position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: palettes.rejection.white, opacity: 0.72, top: 110, left: -80 },
  container: { padding: 24, paddingTop: 58, paddingBottom: 60 },
  back: { minWidth: 44, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 20 },
  count: { color: palettes.rejection.ink, fontFamily: "Gaegu_700Bold", fontSize: 38, marginTop: 28 },
  meta: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 19, opacity: 0.7 },
  section: { marginTop: 42 },
  label: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 18, opacity: 0.62 },
  value: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 30, lineHeight: 38, marginTop: 8 },
});
