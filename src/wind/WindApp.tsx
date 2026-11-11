import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { useVoiceInput, type VoiceLocale } from "../speech/useVoiceInput";
import type { Selection } from "../speech/transcriptEdit";
import { advanceWindMotion, initialWindMotion, type WindMotion } from "./motion";
import { WindWords } from "./WindWords";
import { addWindEntry, deleteAllWindEntries, deleteWindEntry, readWindEntries, type WindEntry } from "./store";
import { releaseIntent } from "./release";

const PAPER = "#f4f1e9";
const INK = "#302c27";
const MUTED = "#766e64";
const ACCENT = "#78846c";
type Screen = "write" | "motion" | "wind" | "quiet" | "archive" | "record" | "compare";

export function WindApp() {
  const [screen, setScreen] = useState<Screen>("write");
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [locale, setLocale] = useState<VoiceLocale>("en");
  const [entries, setEntries] = useState<WindEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [motion, setMotion] = useState<WindMotion>(initialWindMotion);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const savePending = useRef(false);
  const releasePending = useRef(false);
  const voice = useVoiceInput({ value: draft, selection, locale, onChangeText: setDraft, onSelectionChange: setSelection });

  const refresh = useCallback(async () => {
    try { setEntries(await readWindEntries()); setError(""); }
    catch { setError("Records could not be opened. Try again."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader);
    const a = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    const b = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => { a.remove(); b.remove(); };
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const saveAndWind = useCallback(async () => {
    if (savePending.current) return;
    savePending.current = true;
    setSaving(true);
    try {
      const entry = await addWindEntry(draft);
      setEntries((current) => [entry, ...current]);
      setError("");
      setScreen("wind");
      void Haptics.selectionAsync();
    } catch {
      setError("Could not save on this iPhone. Your words are still here. Try again.");
      setScreen("motion");
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  }, [draft]);

  useEffect(() => {
    if (screen !== "motion") return;
    let active = true;
    void Accelerometer.isAvailableAsync().then((available) => {
      if (active && !available) setError("Motion is unavailable. You can release without shaking.");
    }).catch(() => { if (active) setError("Motion is unavailable. You can release without shaking."); });
    Accelerometer.setUpdateInterval(55);
    const subscription = Accelerometer.addListener((sample) => {
      setMotion((current) => advanceWindMotion(current, { ...sample, t: Date.now() }));
    });
    return () => { active = false; subscription.remove(); };
  }, [screen]);
  useEffect(() => {
    if (screen === "motion" && motion.phase === "wind") void saveAndWind();
  }, [motion.phase, saveAndWind, screen]);
  useEffect(() => {
    if (screen !== "quiet") return;
    const timer = setTimeout(() => { setDraft(""); setMotion(initialWindMotion); setScreen("write"); }, 900);
    return () => clearTimeout(timer);
  }, [screen]);

  const enterMotion = () => {
    if (!draft.trim()) { setError("Say or write a few words first."); return; }
    Keyboard.dismiss();
    setError("");
    setMotion(initialWindMotion);
    setScreen("motion");
  };
  const begin = () => {
    const intent = releaseIntent(voice.status, draft);
    Keyboard.dismiss();
    if (intent === "empty") { setError("Say or write a few words first."); return; }
    if (intent === "stopAndWait" || intent === "wait") {
      releasePending.current = true;
      setError("");
      if (intent === "stopAndWait") voice.stop();
      return;
    }
    enterMotion();
  };
  useEffect(() => {
    if (!releasePending.current) return;
    if (voice.status === "listening") { voice.stop(); return; }
    if (voice.status === "error") {
      releasePending.current = false;
      setError(voice.error || "Speech stopped. Your words are still here.");
      return;
    }
    if (voice.status !== "idle") return;
    const timer = setTimeout(() => {
      if (!releasePending.current) return;
      releasePending.current = false;
      enterMotion();
    }, 180);
    return () => clearTimeout(timer);
  }, [voice.status, voice.error, draft]);
  const removeOne = (entry: WindEntry) => Alert.alert("Delete this record?", "This removes its complete text from this iPhone.", [
    { text: "Keep", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => { void deleteWindEntry(entry.id).then(() => { setOpened(null); setSelected((ids) => ids.filter((id) => id !== entry.id)); void refresh(); setScreen("archive"); }).catch(() => setError("Could not delete this record.")); } },
  ]);
  const removeAll = () => Alert.alert("Delete all records?", "This cannot be undone.", [
    { text: "Keep", style: "cancel" },
    { text: "Delete all", style: "destructive", onPress: () => { void deleteAllWindEntries().then(() => { setEntries([]); setSelected([]); setScreen("archive"); }).catch(() => setError("Could not delete records.")); } },
  ]);
  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  const currentEntry = entries.find((entry) => entry.id === opened);
  const comparison = selected.map((id) => entries.find((entry) => entry.id === id)).filter((item): item is WindEntry => !!item);

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {screen === "write" && <View style={styles.page}>
        {!draft && !keyboardVisible && <Image source={require("./assets/fern-imprint.png")} style={styles.writeFern} accessibilityElementsHidden />}
        <View style={styles.top}><Text style={styles.mark}>aio.</Text></View>
        <View style={[styles.editorWrap, keyboardVisible && styles.editorWrapKeyboard]}>
          <Text style={styles.editorLabel}>SAY IT, OR WRITE IT.</Text>
          <TextInput multiline value={draft} onChangeText={setDraft} onSelectionChange={(event) => setSelection(event.nativeEvent.selection)} placeholder="What is here right now?" placeholderTextColor="#9b948a" style={[styles.editor, keyboardVisible && styles.editorKeyboard]} accessibilityLabel="Your words" textAlignVertical="top" />
        </View>
        <View style={styles.bottom}>
          <View style={styles.voiceRow}>
            <Pressable accessibilityRole="button" onPress={() => { if (voice.status === "listening") voice.stop(); else void voice.start(); }}><Text style={styles.voiceLink}>{voice.status === "listening" ? "●  listening · tap to stop" : "◉  speak"}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setLocale(locale === "en" ? "zh" : "en")}><Text style={styles.languageLink}>{locale === "en" ? "EN" : "中文"}</Text></Pressable>
          </View>
          {voice.status === "error" && <Text style={styles.notice}>{voice.error}</Text>}
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" onPress={begin} style={styles.primary}><Text style={styles.primaryText}>{releasePending.current ? "finishing your words…" : "shake to release"}</Text><Text style={styles.arrow}>↗</Text></Pressable>
          <View style={styles.bottomMeta}><Text style={styles.disclosure}>Your full words stay on this iPhone.</Text><Pressable accessibilityRole="button" accessibilityLabel="Open saved words" onPress={() => { void refresh(); setScreen("archive"); }}><Text style={styles.archiveLink}>past words</Text></Pressable></View>
        </View>
      </View>}

      {(screen === "motion" || screen === "wind") && <View style={styles.ritual} accessible={screenReader} accessibilityLabel={screen === "wind" ? "Your words are drifting" : "Shake to loosen your words, then hold still"} accessibilityActions={screenReader ? [{ name: "release", label: "Release without shaking" }] : undefined} onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "release") void saveAndWind(); }}>
        <Text style={styles.eyebrow}>{screen === "wind" ? "THE WIND" : motion.phase === "ready" ? "NOW HOLD STILL" : "SHAKE TO LOOSEN"}</Text>
        <ScrollView contentContainerStyle={styles.wordSpace}><WindWords text={draft} phase={screen === "wind" ? "wind" : motion.phase} reducedMotion={reducedMotion} onComplete={() => setScreen("quiet")} /></ScrollView>
        {screen === "motion" && <View style={styles.ritualBottom}>
          <Text style={styles.hint}>{motion.phase === "ready" ? "Keep holding your phone. Just stop moving; the wind will come." : "Shake a few times. The letters will loosen. Then hold still."}</Text>
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveAndWind()}><Text style={styles.smallLink}>{saving ? "saving…" : error ? "retry saving" : "release without shaking"}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setMotion(initialWindMotion); setScreen("write"); }}><Text style={styles.mutedLink}>back to writing</Text></Pressable>
        </View>}
      </View>}

      {screen === "quiet" && <View style={styles.quiet}><Image source={require("./assets/fern-imprint.png")} style={styles.fern} accessibilityElementsHidden /><Text style={styles.mark}>aio.</Text></View>}

      {screen === "archive" && <View style={styles.archive}>
        <View style={styles.top}><Pressable accessibilityRole="button" onPress={() => setScreen("write")}><Text style={styles.smallLink}>back</Text></Pressable><Text style={styles.smallTitle}>kept words</Text></View>
        <ScrollView contentContainerStyle={styles.list}>
          {entries.length === 0 && <Text style={styles.empty}>Nothing here yet.</Text>}
          {entries.map((entry) => <View key={entry.id} style={styles.listRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open record from ${new Date(entry.createdAt).toLocaleDateString()}`} style={styles.listText} onPress={() => { setOpened(entry.id); setScreen("record"); }}><Text style={styles.date}>{new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text><Text numberOfLines={2} style={styles.excerpt}>{entry.text}</Text></Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(entry.id) }} accessibilityLabel="Select record to compare" onPress={() => toggleSelected(entry.id)}><Text style={styles.select}>{selected.includes(entry.id) ? "●" : "○"}</Text></Pressable>
          </View>)}
        </ScrollView>
        <View style={styles.archiveFooter}>
          {selected.length === 2 && <Pressable accessibilityRole="button" onPress={() => setScreen("compare")}><Text style={styles.smallLink}>compare selected words</Text></Pressable>}
          {entries.length > 0 && <Pressable accessibilityRole="button" onPress={removeAll}><Text style={styles.mutedLink}>delete all records</Text></Pressable>}
        </View>
      </View>}

      {screen === "record" && <View style={styles.archive}><View style={styles.top}><Pressable accessibilityRole="button" onPress={() => setScreen("archive")}><Text style={styles.smallLink}>back</Text></Pressable><Text style={styles.smallTitle}>your words</Text></View><ScrollView contentContainerStyle={styles.recordScroll}><Text style={styles.date}>{currentEntry && new Date(currentEntry.createdAt).toLocaleString("en-US")}</Text><Text style={styles.fullText}>{currentEntry?.text}</Text></ScrollView>{currentEntry && <Pressable accessibilityRole="button" style={styles.archiveFooter} onPress={() => removeOne(currentEntry)}><Text style={styles.mutedLink}>delete this record</Text></Pressable>}</View>}

      {screen === "compare" && <View style={styles.archive}><View style={styles.top}><Pressable accessibilityRole="button" onPress={() => setScreen("archive")}><Text style={styles.smallLink}>back</Text></Pressable><Text style={styles.smallTitle}>two moments</Text></View><ScrollView contentContainerStyle={styles.recordScroll}>{comparison.map((entry) => <View key={entry.id} style={styles.comparison}><Text style={styles.date}>{new Date(entry.createdAt).toLocaleDateString("en-US")}</Text><Text style={styles.fullText}>{entry.text}</Text></View>)}<Text style={styles.notice}>On-device interpretation is unavailable in this build. Your original words are here to read.</Text></ScrollView></View>}
      {!!error && screen !== "write" && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: PAPER }, page: { flex: 1, paddingHorizontal: 30, paddingTop: 16, paddingBottom: 22 },
  writeFern: { position: "absolute", right: -58, top: 115, width: 170, height: 255, opacity: 0.7 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 },
  mark: { color: INK, fontFamily: "Gaegu_700Bold", fontSize: 42 }, smallTitle: { color: INK, fontFamily: "Gaegu_700Bold", fontSize: 26 },
  smallLink: { color: INK, fontSize: 14, paddingVertical: 8 }, mutedLink: { color: MUTED, fontSize: 13, paddingVertical: 8 },
  editorWrap: { flex: 1, justifyContent: "flex-start", paddingTop: 88 }, editorWrapKeyboard: { paddingTop: 24 },
  editorLabel: { color: ACCENT, fontSize: 11, letterSpacing: 2.2, fontWeight: "600" },
  eyebrow: { color: ACCENT, fontSize: 11, letterSpacing: 2.2, fontWeight: "600", textAlign: "center" },
  editor: { color: INK, fontSize: 21, lineHeight: 32, minHeight: 190, maxHeight: 300, marginTop: 22, padding: 0 }, editorKeyboard: { minHeight: 120, maxHeight: 180, marginTop: 12 },
  bottom: { gap: 12 }, voiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 9 }, voiceLink: { color: INK, fontSize: 14, letterSpacing: 0.5, paddingVertical: 8 }, languageLink: { color: MUTED, fontSize: 12, letterSpacing: 1.2, paddingVertical: 8 },
  primary: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: INK, minHeight: 65, justifyContent: "space-between", alignItems: "center" }, primaryText: { color: INK, fontFamily: "Georgia", fontStyle: "italic", fontSize: 23 }, arrow: { color: INK, fontSize: 24 },
  bottomMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingTop: 3 },
  disclosure: { flex: 1, color: MUTED, fontSize: 11, lineHeight: 16 }, archiveLink: { color: MUTED, fontSize: 12, textDecorationLine: "underline" },
  notice: { color: MUTED, fontSize: 14, lineHeight: 21 }, error: { color: "#8c3f33", fontSize: 13, lineHeight: 19, paddingVertical: 4 },
  ritual: { flex: 1, paddingTop: 42, paddingHorizontal: 20 }, wordSpace: { flexGrow: 1, justifyContent: "center", paddingVertical: 44 }, ritualBottom: { alignItems: "center", gap: 8, paddingBottom: 24 }, hint: { color: MUTED, textAlign: "center", fontSize: 14, lineHeight: 21 }, quiet: { flex: 1, alignItems: "center", justifyContent: "center" }, fern: { position: "absolute", width: 180, height: 270, opacity: 0.55, top: "12%", right: -15 },
  archive: { flex: 1, paddingHorizontal: 28, paddingTop: 18 }, list: { paddingVertical: 30, gap: 0 }, empty: { color: MUTED, fontSize: 18, marginTop: 100, textAlign: "center" }, listRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#c9c4b8", paddingVertical: 19 }, listText: { flex: 1 }, date: { color: ACCENT, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }, excerpt: { color: INK, fontSize: 19, lineHeight: 27, marginTop: 8 }, select: { fontSize: 27, color: ACCENT, paddingLeft: 18 }, archiveFooter: { minHeight: 76, alignItems: "center", justifyContent: "center" }, recordScroll: { paddingTop: 48, paddingBottom: 50 }, fullText: { color: INK, fontSize: 23, lineHeight: 36, marginTop: 22 }, comparison: { marginBottom: 45, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#c9c4b8", paddingBottom: 35 },
});
