import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { palettes } from "../theme/palettes";
import type { Entry } from "./store";

type Props = { entries: Entry[]; onBack: () => void; onOpen: (id: string) => void };

export function RejectionList({ entries, onBack, onOpen }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>[copy TBD: 返回]</Text>
      </Pressable>
      <Text style={styles.title}>[copy TBD: 回看标题]</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>[copy TBD: 空状态]</Text>
      ) : entries.map((entry) => {
        const color = entry.state ? palettes.rejection[entry.state] : palettes.rejection.white;
        const meta = [entry.company, entry.role].filter(Boolean).join(" · ");
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            onPress={() => onOpen(entry.id)}
            style={styles.row}
          >
            <View style={[styles.band, { backgroundColor: color }, !entry.state && styles.unselected]} />
            <View style={styles.rowText}>
              <Text style={styles.count}>第 {entry.seq} 次</Text>
              {!!meta && <Text style={styles.meta}>{meta}</Text>}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 58, paddingBottom: 60, gap: 14 },
  back: { minWidth: 44, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 20 },
  title: { color: palettes.rejection.ink, fontFamily: "Gaegu_700Bold", fontSize: 36, marginBottom: 12 },
  empty: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 24, marginTop: 72, textAlign: "center" },
  row: { minHeight: 72, flexDirection: "row", overflow: "hidden", borderRadius: 22, backgroundColor: palettes.rejection.white },
  band: { width: 68 },
  unselected: { borderWidth: 1, borderColor: palettes.rejection.blue },
  rowText: { flex: 1, paddingHorizontal: 18, justifyContent: "center" },
  count: { color: palettes.rejection.ink, fontFamily: "Gaegu_700Bold", fontSize: 21 },
  meta: { color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 16, opacity: 0.72 },
});
