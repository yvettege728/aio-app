import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { HoldControl } from "../components/HoldControl";
import { VoiceInputBar } from "../components/VoiceInputBar";
import { tokens } from "../motion/tokens";
import { containsSafetyConcern } from "../safety/check";
import type { Selection } from "../speech/transcriptEdit";
import { useVoiceInput, type VoiceLocale } from "../speech/useVoiceInput";
import { palettes } from "../theme/palettes";
import { RejectionDetail } from "./Detail";
import { RejectionList } from "./List";
import { initialRejectionState, rejectionTransition } from "./machine";
import { Scatter } from "./Scatter";
import { detectShake, type ShakeSample } from "./shake";
import { addEntry, readEntries, type Entry, type StateColor } from "./store";

const colorChoices: StateColor[] = ["blue", "dot", "mint", "rose", "coral"];
const emptySelection: Selection = { start: 0, end: 0 };
const INTRO_KEY = "aio.rejection.permissionIntroSeen.v1";
const voiceCopy = {
  start: "[copy TBD: 说话]",
  stop: "[copy TBD: 停止]",
  busy: "[copy TBD: 正在听]",
  error: "[copy TBD: 语音输入失败]",
  idle: "",
};

export function RejectionApp() {
  const [flow, dispatch] = useReducer(rejectionTransition, initialRejectionState);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const [releaseDraft, setReleaseDraft] = useState("");
  const [releaseSelection, setReleaseSelection] = useState<Selection>(emptySelection);
  const [body, setBody] = useState("");
  const [bodySelection, setBodySelection] = useState<Selection>(emptySelection);
  const [understanding, setUnderstanding] = useState("");
  const [understandingSelection, setUnderstandingSelection] = useState<Selection>(emptySelection);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [color, setColor] = useState<StateColor>();
  const [locale, setLocale] = useState<VoiceLocale>("en");
  const [strength, setStrength] = useState(0);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [forceScatter, setForceScatter] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [keptEntry, setKeptEntry] = useState<Entry>();
  const heldAt = useRef<number | undefined>(undefined);
  const released = useRef(false);
  const speechPending = useRef(false);
  const savePending = useRef(false);
  const samples = useRef<ShakeSample[]>([]);

  const releaseVoice = useVoiceInput({
    value: releaseDraft,
    selection: releaseSelection,
    locale,
    onChangeText: setReleaseDraft,
    onSelectionChange: setReleaseSelection,
  });

  const refresh = useCallback(async () => {
    try {
      setEntries(await readEntries());
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    void AsyncStorage.getItem(INTRO_KEY).then((value) => setIntroSeen(value === "yes")).catch(() => undefined);
  }, []);
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const reader = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { reader.remove(); motion.remove(); };
  }, []);

  useEffect(() => {
    if (flow.step !== "scattered") return;
    const timer = setTimeout(() => dispatch({ type: "QUIET_FINISHED" }), tokens.rejection.quietMs);
    return () => clearTimeout(timer);
  }, [flow.step]);

  useEffect(() => {
    if (flow.step !== "shaking") return;
    samples.current = [];
    Accelerometer.setUpdateInterval(tokens.rejection.sampleIntervalMs);
    const subscription = Accelerometer.addListener((sample) => {
      const now = Date.now();
      samples.current = [...samples.current, { ...sample, t: now }].filter(
        (point) => now - point.t <= tokens.rejection.shake.windowMs,
      );
      const result = detectShake(samples.current);
      setStrength(result.shaking ? result.strength : 0);
      if (result.shaking) {
        setShakeSignal((signal) => signal + 1);
      }
    });
    return () => { subscription.remove(); samples.current = []; };
  }, [flow.step]);

  useEffect(() => {
    if (flow.step !== "release" || !released.current) return;
    if (releaseVoice.status === "listening" && !heldAt.current) {
      releaseVoice.stop();
      return;
    }
    if (releaseVoice.status === "error") {
      speechPending.current = false;
      setReleaseDraft("");
      return;
    }
    if (!speechPending.current) return;
    if (releaseVoice.status !== "idle") return;
    speechPending.current = false;
    if (!releaseDraft.trim()) return;
    if (containsSafetyConcern(releaseDraft)) {
      dispatch({ type: "SAFETY_STOP" });
      setReleaseDraft("");
      return;
    }
    dispatch({ type: "RELEASED", text: releaseDraft });
    setReleaseDraft("");
    setReleaseSelection(emptySelection);
  }, [flow.step, releaseDraft, releaseVoice.status]);

  const startRelease = () => {
    released.current = false;
    speechPending.current = true;
    heldAt.current = Date.now();
    setReleaseDraft("");
    void releaseVoice.start();
  };
  const endRelease = () => {
    const elapsed = Date.now() - (heldAt.current ?? Date.now());
    heldAt.current = undefined;
    released.current = true;
    if (elapsed < tokens.rejection.minSpeakMs) {
      speechPending.current = false;
      setReleaseDraft("");
      if (releaseVoice.status === "listening") releaseVoice.stop();
      dispatch({ type: "TOO_SHORT" });
      return;
    }
    if (releaseVoice.status === "listening") releaseVoice.stop();
  };

  const checkSafetyOnBlur = (value: string) => {
    if (containsSafetyConcern(value)) dispatch({ type: "SAFETY_STOP" });
  };

  const nextUnderstanding = () => {
    if (containsSafetyConcern(body) || containsSafetyConcern(understanding)) {
      dispatch({ type: "SAFETY_STOP" });
      return;
    }
    Keyboard.dismiss();
    const hasContent = !!(body.trim() || understanding.trim());
    if (!hasContent) resetDraft();
    dispatch({ type: "UNDERSTAND_NEXT", hasContent });
  };

  const resetDraft = () => {
    speechPending.current = false;
    released.current = false;
    setReleaseDraft("");
    setBody("");
    setUnderstanding("");
    setCompany("");
    setRole("");
    setColor(undefined);
    setShowDetails(false);
    setForceScatter(false);
    setStrength(0);
    setShakeSignal(0);
    setKeptEntry(undefined);
  };

  const keep = async () => {
    if (savePending.current) return;
    savePending.current = true;
    try {
      const saved = await addEntry({ body, text: understanding, state: color, company, role });
      setKeptEntry(saved);
      setEntries((current) => [saved, ...current]);
      setStorageError(false);
      dispatch({ type: "KEPT" });
      setBody("");
      setUnderstanding("");
      setCompany("");
      setRole("");
    } catch {
      setStorageError(true);
    } finally {
      savePending.current = false;
    }
  };

  const step = flow.step;
  const transition = reducedMotion ? tokens.fade.shortMs : tokens.rejection.transitionMs;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.mist} pointerEvents="none" />
      {step === "list" ? (
        <Animated.View key="list" entering={FadeIn.duration(transition)} exiting={FadeOut.duration(transition)} style={styles.flex}><RejectionList entries={entries} onBack={() => dispatch({ type: "BACK" })} onOpen={(entryId) => dispatch({ type: "OPEN_DETAIL", entryId })} /></Animated.View>
      ) : step === "detail" ? (
        <Animated.View key="detail" entering={FadeIn.duration(transition)} exiting={FadeOut.duration(transition)} style={styles.flex}><RejectionDetail entry={entries.find((entry) => entry.id === flow.entryId)} onBack={() => dispatch({ type: "BACK" })} /></Animated.View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Animated.View key={step} entering={FadeIn.duration(transition)} exiting={FadeOut.duration(transition)} style={styles.stage}>
              {step === "home" && <>
                <Text style={styles.mark}>aio.</Text>
                <View style={styles.homeChoices}>
                  <Action label="[copy TBD: 收到一封拒信]" onPress={() => { resetDraft(); dispatch({ type: "START", permissionIntroSeen: introSeen }); }} />
                  <Action label="[copy TBD: 回看]" onPress={() => { void refresh(); dispatch({ type: "OPEN_LIST" }); }} />
                </View>
              </>}
              {step === "permission" && <>
                <Text style={styles.question}>[copy TBD: 使用语音前说明]</Text>
                <Action label="[copy TBD: 继续]" onPress={() => { setIntroSeen(true); void AsyncStorage.setItem(INTRO_KEY, "yes"); dispatch({ type: "PERMISSION_READY" }); }} />
              </>}
              {step === "release" && <>
                <Pressable accessibilityRole="button" accessibilityLabel="[copy TBD: 按住说话]" onPressIn={startRelease} onPressOut={endRelease} style={styles.speakCircle}>
                  <Text style={styles.circleText}>[copy TBD: 按住说话]</Text>
                </Pressable>
                {!!releaseDraft && <Text style={styles.releaseText}>{releaseDraft}</Text>}
                {releaseVoice.status === "error" && <Text accessibilityLiveRegion="polite" style={styles.error}>[copy TBD: 语音识别失败]</Text>}
              </>}
              {step === "shaking" && <View
                style={styles.shakeArea}
                accessible={screenReader}
                accessibilityLabel="[copy TBD: 摇一摇手机]"
                accessibilityActions={screenReader ? [{ name: "scatter", label: "[copy TBD: 完成抖散]" }] : undefined}
                onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "scatter") setForceScatter(true); }}
              >
                <Text style={styles.question}>[copy TBD: 摇一摇手机]</Text>
                <Scatter text={flow.releaseText} strength={strength} signal={shakeSignal} reducedMotion={reducedMotion} forceComplete={forceScatter} onComplete={() => { setReleaseDraft(""); dispatch({ type: "SCATTERED" }); }} />
              </View>}
              {step === "scattered" && <View style={styles.quiet} />}
              {step === "body" && <>
                <Text style={styles.question}>[copy TBD: 身体感受问题]</Text>
                <TextInput
                  multiline
                  value={body}
                  onChangeText={setBody}
                  onSelectionChange={(event) => setBodySelection(event.nativeEvent.selection)}
                  onBlur={() => checkSafetyOnBlur(body)}
                  accessibilityLabel="[copy TBD: 身体感受输入]"
                  style={styles.input}
                />
                <VoiceInputBar theme="rejection" copy={voiceCopy} value={body} selection={bodySelection} locale={locale} onLocaleChange={setLocale} onChangeText={setBody} onSelectionChange={setBodySelection} />
                <View accessibilityRole="radiogroup" style={styles.colors}>
                  {colorChoices.map((choice) => <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityLabel={`[copy TBD: 状态颜色 ${choice}]`}
                    accessibilityState={{ checked: color === choice }}
                    onPress={() => setColor(choice)}
                    style={[styles.colorHit, color === choice && styles.colorSelected]}
                  ><View style={[styles.colorDot, { backgroundColor: palettes.rejection[choice] }]} /></Pressable>)}
                </View>
                <Action label="[copy TBD: 继续]" onPress={() => { checkSafetyOnBlur(body); if (!containsSafetyConcern(body)) dispatch({ type: "BODY_NEXT" }); }} />
              </>}
              {step === "understand" && <>
                <Text style={styles.question}>[copy TBD: 此刻如何理解这次被拒]</Text>
                <TextInput
                  multiline
                  value={understanding}
                  onChangeText={setUnderstanding}
                  onSelectionChange={(event) => setUnderstandingSelection(event.nativeEvent.selection)}
                  onBlur={() => checkSafetyOnBlur(understanding)}
                  accessibilityLabel="[copy TBD: 理解输入]"
                  style={styles.input}
                />
                <VoiceInputBar theme="rejection" copy={voiceCopy} value={understanding} selection={understandingSelection} locale={locale} onLocaleChange={setLocale} onChangeText={setUnderstanding} onSelectionChange={setUnderstandingSelection} />
                <Action label="[copy TBD: 公司与职位]" onPress={() => setShowDetails((current) => !current)} />
                {showDetails && <>
                  <TextInput value={company} onChangeText={setCompany} accessibilityLabel="[copy TBD: 公司]" placeholder="[copy TBD: 公司]" style={styles.singleInput} />
                  <TextInput value={role} onChangeText={setRole} accessibilityLabel="[copy TBD: 职位]" placeholder="[copy TBD: 职位]" style={styles.singleInput} />
                </>}
                <Action label="[copy TBD: 继续]" onPress={() => { if (containsSafetyConcern(understanding)) dispatch({ type: "SAFETY_STOP" }); else nextUnderstanding(); }} />
                <Action label="[copy TBD: 今天不写]" onPress={nextUnderstanding} />
              </>}
              {step === "keep" && <>
                <Text style={styles.question}>[copy TBD: 收下]</Text>
                <HoldControl label="[copy TBD: 长按收下]" color={palettes.rejection.dot} holdMs={tokens.rejection.holdMs} drainMs={tokens.rejection.drainMs} style={styles.keepCapsule} preserveHoldOnReducedMotion onCancel={() => dispatch({ type: "HOLD_RELEASED" })} onComplete={() => { void Haptics.selectionAsync(); void keep(); }} />
                {storageError && <Text accessibilityLiveRegion="polite" style={styles.error}>[copy TBD: 保存失败，请重试]</Text>}
              </>}
              {step === "kept" && <>
                <Text style={styles.kept}>{keptEntry?.text || keptEntry?.body}</Text>
                <Action label="[copy TBD: 关闭]" onPress={() => { resetDraft(); dispatch({ type: "CLOSE" }); }} />
              </>}
              {step === "safetyStop" && <>
                <Text style={styles.question}>{locale === "zh" ? "这次写作采访需要先停在这里。如果你可能正处于危险中，请现在联系你信任的人或当地紧急支持。" : "I need to pause this writing interview. Please contact someone you trust or local emergency support now if you may be in immediate danger."}</Text>
                <Text style={styles.error}>[crisis line and campus resources: to be verified]</Text>
              </>}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {storageError && (step === "home" || step === "list") && <Text accessibilityLiveRegion="polite" style={styles.error}>[copy TBD: 无法读取记录]</Text>}
    </SafeAreaView>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: palettes.rejection.sky },
  mist: { position: "absolute", backgroundColor: palettes.rejection.mist, width: 430, height: 430, borderRadius: 215, opacity: 0.55, top: -170, right: -210 },
  content: { flexGrow: 1, padding: 28, justifyContent: "center" },
  stage: { minHeight: 430, alignItems: "center", justifyContent: "center", gap: 24 },
  mark: { fontFamily: "Gaegu_700Bold", fontSize: 54, color: palettes.rejection.ink },
  homeChoices: { alignSelf: "stretch", gap: 18, marginTop: 80 },
  question: { fontFamily: "Gaegu_400Regular", fontSize: 32, lineHeight: 40, textAlign: "center", color: palettes.rejection.ink },
  action: { minHeight: 56, minWidth: 120, borderRadius: 28, borderWidth: 1, borderColor: palettes.rejection.blue, backgroundColor: palettes.rejection.white, alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  actionText: { fontFamily: "Gaegu_700Bold", fontSize: 22, color: palettes.rejection.ink, textAlign: "center" },
  speakCircle: { width: 228, height: 228, borderRadius: 114, borderWidth: 2, borderColor: palettes.rejection.blue, backgroundColor: palettes.rejection.white, alignItems: "center", justifyContent: "center" },
  circleText: { fontFamily: "Gaegu_700Bold", fontSize: 26, color: palettes.rejection.ink, textAlign: "center" },
  releaseText: { fontFamily: "Gaegu_400Regular", fontSize: 25, color: palettes.rejection.ink, opacity: 0.5, textAlign: "center" },
  shakeArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: 40, minHeight: 430 },
  quiet: { minHeight: 430 },
  input: { alignSelf: "stretch", minHeight: 130, borderRadius: 26, padding: 20, backgroundColor: palettes.rejection.white, color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 24, textAlignVertical: "top" },
  singleInput: { alignSelf: "stretch", minHeight: 52, borderRadius: 22, paddingHorizontal: 18, backgroundColor: palettes.rejection.white, color: palettes.rejection.ink, fontFamily: "Gaegu_400Regular", fontSize: 21 },
  colors: { flexDirection: "row", alignSelf: "stretch", justifyContent: "space-between" },
  colorHit: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 1, borderColor: palettes.rejection.ink },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  kept: { fontFamily: "Gaegu_400Regular", fontSize: 34, lineHeight: 43, color: palettes.rejection.ink, textAlign: "center" },
  keepCapsule: { width: 92, height: 172, borderRadius: 46, borderColor: palettes.rejection.blue, borderWidth: 1, justifyContent: "center", paddingBottom: 0 },
  error: { fontFamily: "Gaegu_400Regular", fontSize: 18, color: palettes.rejection.ink, textAlign: "center", padding: 16 },
});
