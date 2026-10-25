import { useEffect, useReducer, useRef, useState } from "react";
import {
  Alert,
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import * as Speech from "expo-speech";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Accelerometer } from "expo-sensors";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import {
  useFonts,
  Gaegu_400Regular,
  Gaegu_700Bold,
} from "@expo-google-fonts/gaegu";
import prompts from "./src/content/prompts.json";
import { nextPromptIndex } from "./src/content/promptSelection";
import { phoneTransition, PhoneState } from "./src/machine/phoneMachine";
import { paperTransition, PaperState } from "./src/machine/paperMachine";
import { containsSafetyConcern } from "./src/safety/check";
import {
  hasStableOrientation,
  isLiftedOrMoved,
  Acceleration,
} from "./src/sensors/faceDown";
import { detectBackTap, MotionSample } from "./src/sensors/backTap";
import { palettes, PaletteName } from "./src/theme/palettes";
import { tokens } from "./src/motion/tokens";
import { captureRef } from "react-native-view-shot";
import { createAgentClient } from "./src/app/agentClient";
import { VoiceInputBar } from "./src/components/VoiceInputBar";
import type { Locale } from "./src/agent/types";
import type { Selection } from "./src/speech/transcriptEdit";

type Prompt = (typeof prompts)[number];
const WRITING_ACCESSORY_ID = "aio-writing-accessory";

function HoldControl({
  label,
  color,
  onComplete,
  testID,
  holdMs = tokens.keep.holdMs,
  drainMs = tokens.keep.drainMs,
}: {
  label: string;
  color: string;
  onComplete: () => void;
  testID?: string;
  holdMs?: number;
  drainMs?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const completeRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);
  const start = () => {
    completeRef.current = false;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? tokens.fade.shortMs : holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        completeRef.current = true;
        onComplete();
      }
    });
  };
  const stop = () => {
    if (completeRef.current) return;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? tokens.fade.shortMs : drainMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };
  const fillHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={start}
      onPressOut={stop}
      style={styles.holdButton}
    >
      <Animated.View
        style={[
          styles.holdFill,
          { backgroundColor: color, height: fillHeight },
        ]}
      />
      <Text style={styles.holdLabel}>{label}</Text>
    </Pressable>
  );
}

function AppMark() {
  return (
    <View style={styles.markHit}>
      <Text style={styles.mark}>aio.</Text>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  const [phoneState, dispatchPhone] = useReducer(
    (state: PhoneState, event: Parameters<typeof phoneTransition>[1]) =>
      phoneTransition(state, event),
    "arrive",
  );
  const writingInputRef = useRef<TextInput>(null);
  const [paperState, dispatchPaper] = useReducer(
    (state: PaperState, event: Parameters<typeof paperTransition>[1]) =>
      paperTransition(state, event),
    "instructions",
  );
  const [mode, setMode] = useState<"choose" | "phone" | "paper">("choose");
  const [promptIndex, setPromptIndex] = useState<number | null>(null);
  const [writing, setWriting] = useState("");
  const [writingSelection, setWritingSelection] = useState<Selection>({ start: 0, end: 0 });
  const [line, setLine] = useState("");
  const [outsideName, setOutsideName] = useState("");
  const [style, setStyle] = useState<"handwriting" | "type">("type");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [voiceListening, setVoiceListening] = useState(false);
  const [agentLocale, setAgentLocale] = useState<Locale>("en");
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [agentCandidates, setAgentCandidates] = useState<string[]>([]);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const agentClient = useRef(createAgentClient()).current;
  const paperSamplesRef = useRef<Acceleration[]>([]);
  const tapSamplesRef = useRef<MotionSample[]>([]);
  const [followUpRequested, setFollowUpRequested] = useState(false);
  const awaitingFirstFaceDownRef = useRef(false);
  const [paperCues, setPaperCues] = useState({ haptics: true, light: false, sound: true });
  const player = useAudioPlayer(require("./assets/sounds/zen-cue.wav"));
  const ambiencePlayer = useAudioPlayer(require("./assets/sounds/ambience.wav"));
  const cameraRef = useRef<CameraView>(null);
  const prompt: Prompt = prompts[promptIndex ?? 0];
  const currentPalette: PaletteName =
    mode === "choose"
      ? "cream"
      : phoneState === "holdToKeep" || paperState === "holdToKeep"
        ? "aqua"
        : phoneState === "card" || paperState === "card"
          ? "ivory"
          : "cream";
  const palette = palettes[currentPalette];
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => undefined);
    ambiencePlayer.loop = true;
    ambiencePlayer.volume = 0.22;
  }, [ambiencePlayer]);
  useEffect(() => {
    const inSilentWriting = mode === "paper" && (paperState === "writing" || paperState === "followUp");
    if (!musicEnabled || inSilentWriting || voiceListening) {
      if (ambiencePlayer.playing) ambiencePlayer.pause();
    } else if (!ambiencePlayer.playing) ambiencePlayer.play();
  }, [ambiencePlayer, musicEnabled, mode, paperState, voiceListening]);
  useEffect(() => () => ambiencePlayer.pause(), [ambiencePlayer]);
  useEffect(() => () => {
    if (agentSessionId) void agentClient.stop(agentSessionId).catch(() => undefined);
  }, [agentClient, agentSessionId]);
  useEffect(() => {
    if (mode !== "paper") return;
    activateKeepAwakeAsync().catch(() => undefined);
    return () => {
      deactivateKeepAwake().catch(() => undefined);
      Speech.stop();
    };
  }, [mode]);
  useEffect(() => {
    if (mode !== "paper") return;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener((sample) => {
      const next = [...paperSamplesRef.current, { ...sample, t: Date.now() }].slice(-24);
      paperSamplesRef.current = next;
      const tapNext = [...tapSamplesRef.current, { ...sample, t: Date.now() }].slice(-24);
      tapSamplesRef.current = tapNext;
      if (paperState === "reading" && hasStableOrientation(next, true)) {
        awaitingFirstFaceDownRef.current = false;
        dispatchPaper({ type: "FACE_DOWN_STABLE" });
        if (paperCues.light) setCameraActive(true);
        if (paperCues.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (paperCues.sound) player.play();
      }
      if (paperState === "writing" && !followUpRequested && detectBackTap(tapNext)) {
        tapSamplesRef.current = [];
        setFollowUpRequested(true);
        dispatchPaper({ type: "REQUEST_FOLLOW_UP" });
        if (paperCues.light) {
          setCameraActive(true);
          setTorch(true);
        }
        if (paperCues.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (paperState === "writing" && awaitingFirstFaceDownRef.current && hasStableOrientation(next, true)) {
        awaitingFirstFaceDownRef.current = false;
        if (paperCues.light) setCameraActive(true);
        if (paperCues.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (paperCues.sound) player.play();
      }
      if ((paperState === "writing" || paperState === "followUp") && !awaitingFirstFaceDownRef.current && isLiftedOrMoved(next)) {
        dispatchPaper({ type: "PICK_UP" });
        setCameraActive(false);
        setTorch(false);
      }
      if (paperState === "paused" && hasStableOrientation(next, true)) {
        dispatchPaper({ type: "FACE_DOWN_AGAIN" });
        if (paperCues.light) setCameraActive(true);
        if (paperCues.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (paperCues.sound) player.play();
      }
      if (
        (paperState === "writing" || paperState === "followUp" || paperState === "paused") &&
        hasStableOrientation(next, false)
      ) {
        dispatchPaper({ type: "FACE_UP_STABLE" });
        setCameraActive(false);
        setTorch(false);
      }
    });
    return () => sub.remove();
  }, [mode, paperState, player, paperCues, followUpRequested]);
  useEffect(() => {
    if (torch) {
      const timer = setTimeout(
        () => setTorch(false),
        tokens.paper.torchPulseMs,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [torch]);
  useEffect(() => {
    if (paperState === "followUp") {
      Speech.speak(prompt.followUp, {
        language: "en-US",
        rate: tokens.paper.speechRate,
        onDone: () => dispatchPaper({ type: "FOLLOW_UP_DONE" }),
      });
      return () => { Speech.stop(); };
    }
    return undefined;
  }, [paperState, prompt]);
  useEffect(() => {
    if (phoneState === "prompt") {
      const timer = setTimeout(
        () => dispatchPhone({ type: "PROMPT_READY" }),
        tokens.fade.promptMs,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phoneState]);
  if (!fontsLoaded)
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  const selectPaper = async () => {
    setMode("paper");
    setPromptIndex(nextPromptIndex(null, prompts.length));
    setFollowUpRequested(false);
  };
  const beginPhoneSession = async () => {
    setAgentBusy(true);
    setAgentError(null);
    try {
      const started = await agentClient.start(agentLocale);
      setAgentSessionId(started.sessionId);
      setAgentMessage(started.message);
      setAgentCandidates([]);
      dispatchPhone({ type: "HOLD_COMPLETE" });
    } catch {
      setAgentError(agentLocale === "zh" ? "aio 暂时没有回应。你的文字尚未发送。" : "aio is quiet right now. Nothing has been sent.");
    } finally {
      setAgentBusy(false);
    }
  };
  const clearAgent = () => {
    setAgentSessionId(null);
    setAgentMessage("");
    setAgentCandidates([]);
    setAgentError(null);
    setAgentBusy(false);
    setVoiceListening(false);
  };
  const closeCard = () => {
    setMode("choose");
    dispatchPhone({ type: "CLOSE" });
    dispatchPaper({ type: "CLOSE" });
    setWriting("");
    setLine("");
    setPromptIndex(null);
    setFollowUpRequested(false);
    setPhotoUri(undefined);
    setStyle("type");
    setCameraActive(false);
    setCameraReady(false);
    clearAgent();
    awaitingFirstFaceDownRef.current = false;
  };
  const submitWriting = async () => {
    if (!writing.trim() || !agentSessionId || agentBusy) return;
    if (containsSafetyConcern(writing)) {
      void agentClient.stop(agentSessionId).catch(() => undefined);
      setAgentSessionId(null);
      setAgentMessage(agentLocale === "zh"
        ? "这次写作采访需要先停在这里。如果你可能正处于危险中，请现在联系你信任的人或当地紧急支持。"
        : "I need to pause this writing interview. Please contact someone you trust or local emergency support now if you may be in immediate danger.");
      dispatchPhone({ type: "SAFETY_STOP" });
      return;
    }
    dispatchPhone({ type: "SUBMIT" });
    setAgentBusy(true);
    setAgentError(null);
    Keyboard.dismiss();
    try {
      const reply = await agentClient.reply(agentSessionId, writing);
      setAgentMessage(reply.message);
      if (reply.stage === "safetyStop") {
        setAgentSessionId(null);
        dispatchPhone({ type: "SAFETY_STOP" });
      } else if (reply.stage === "findLine") {
        setAgentCandidates(reply.candidateLines);
        dispatchPhone({ type: "CANDIDATES" });
      } else {
        setWriting("");
        setWritingSelection({ start: 0, end: 0 });
        dispatchPhone({ type: "FOLLOW_UP" });
      }
    } catch {
      setAgentError(agentLocale === "zh" ? "没有送达。文字还在这里，可以再试一次。" : "It did not arrive. Your words are still here; you can try again.");
      dispatchPhone({ type: "FAIL" });
    } finally {
      setAgentBusy(false);
    }
  };
  const keepPhoneLine = async () => {
    if (!agentSessionId || !line || agentBusy) return;
    setAgentBusy(true);
    setAgentError(null);
    try {
      await agentClient.keep(agentSessionId, line);
      setAgentSessionId(null);
      dispatchPhone({ type: "KEEP_COMPLETE" });
    } catch {
      setAgentError(agentLocale === "zh" ? "这句话暂时无法留下，请再试一次。" : "This line could not be kept yet. Please try again.");
    } finally {
      setAgentBusy(false);
    }
  };
  const beginPaperReading = async () => {
    paperSamplesRef.current = [];
    tapSamplesRef.current = [];
    awaitingFirstFaceDownRef.current = false;
    if (paperCues.light) {
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) setPaperCues((current) => ({ ...current, light: false }));
    }
    dispatchPaper({ type: "BEGIN" });
  };
  const goBack = () => {
    if (mode === "phone") dispatchPhone({ type: "BACK" });
    if (mode === "paper") {
      if (paperState === "instructions") setMode("choose");
      else dispatchPaper({ type: "BACK" });
    }
  };
  const goForward = () => {
    if (mode === "phone") {
      if (phoneState === "outsideName") dispatchPhone({ type: "SKIP_NAME" });
      else if (phoneState === "writing" && writing.trim()) {
        void submitWriting();
      }
    }
    if (mode === "paper") {
      if (paperState === "instructions") void beginPaperReading();
      else if (paperState === "reading") {
        awaitingFirstFaceDownRef.current = true;
        if (paperCues.light) setCameraActive(true);
        dispatchPaper({ type: "BEGIN_WRITING" });
      }
      else if (paperState === "paused") dispatchPaper({ type: "FACE_DOWN_AGAIN" });
      else if (paperState === "organize") dispatchPaper({ type: "SKIP_CAPTURE" });
      else if (paperState === "capture") dispatchPaper({ type: "SKIP_CAPTURE" });
      else if (paperState === "chooseStyle" && line.trim()) dispatchPaper({ type: "STYLE_SELECTED" });
    }
  };
  const canGoBack = mode === "phone"
    ? ["outsideName", "prompt", "writing", "chooseLine", "holdToKeep"].includes(phoneState) && !agentBusy
      : mode === "paper" && ["instructions", "reading", "paused", "organize", "capture", "chooseStyle", "holdToKeep"].includes(paperState);
  const canGoForward = mode === "phone"
    ? phoneState === "outsideName" || (phoneState === "writing" && Boolean(writing.trim()) && !agentBusy)
    : mode === "paper" && ["instructions", "reading", "paused", "organize", "capture"].includes(paperState) || (mode === "paper" && paperState === "chooseStyle" && Boolean(line.trim()));
  const progressLabel = mode === "phone"
    ? ({ arrive: "start", outsideName: "1 / 4", prompt: "2 / 4", writing: "2 / 4", waiting: "2 / 4", chooseLine: "4 / 4", holdToKeep: "4 / 4", safetyStop: "here" } as Partial<Record<PhoneState, string>>)[phoneState] ?? ""
    : mode === "paper"
      ? ({ instructions: "start", reading: "1 / 4", writing: "2 / 4", followUp: "2 / 4", paused: "2 / 4", organize: "3 / 4", capture: "3 / 4", chooseStyle: "4 / 4", holdToKeep: "4 / 4" } as Partial<Record<PaperState, string>>)[paperState] ?? ""
      : "";
  const isPhone = mode === "phone";
  const isCard =
    (isPhone && phoneState === "card") ||
    (mode === "paper" && paperState === "card");
  const isPaperWriting = mode === "paper" && (paperState === "writing" || paperState === "followUp");
  return (
    <View style={[styles.screen, { backgroundColor: isPaperWriting ? "#1F211E" : palette.bg }]}>
      <StatusBar style="dark" hidden={isPaperWriting} />
      <SafeAreaView style={[styles.safe, isPaperWriting && styles.paperDark]}>
        {!isCard && !isPaperWriting && (
          <View style={styles.topBar}>
            <AppMark />
            <Pressable accessibilityRole="button" accessibilityLabel={musicEnabled ? "Turn opening music off" : "Turn opening music on"} onPress={() => setMusicEnabled((enabled) => !enabled)}>
              <Text style={styles.soundToggle}>{musicEnabled ? "sound on" : "sound off"}</Text>
            </Pressable>
          </View>
        )}
        {isPaperWriting && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause paper writing"
            onPress={() => dispatchPaper({ type: "PICK_UP" })}
            style={styles.paperDarkTouch}
          />
        )}
        {mode === "choose" && (
          <View style={styles.centerStage}>
            <View style={styles.welcomeArt}>
              <View style={styles.welcomeRing} />
              <Text style={styles.welcomeDoodle}>✳︎</Text>
              <View style={styles.welcomeDot} />
            </View>
            <Text style={styles.eyebrow}>
              a small place to look from inside
            </Text>
            <Text style={[styles.question, { color: palettes.cream.text }]}>
              Today, would you like to write here, or on paper?
            </Text>
            <View style={styles.choiceStack}>
              <Pressable
                style={[styles.choice, { borderColor: palettes.cream.text }]}
                onPress={() => {
                  setPromptIndex(nextPromptIndex(null, prompts.length));
                  setMode("phone");
                }}
              >
                <Text style={styles.choiceText}>on the phone</Text>
              </Pressable>
              <Pressable
                style={[styles.choice, { borderColor: palettes.cream.text }]}
                onPress={selectPaper}
              >
                <Text style={styles.choiceText}>with paper and pen</Text>
              </Pressable>
            </View>
          </View>
        )}
        {mode === "phone" && phoneState !== "card" && (
          <KeyboardAvoidingView behavior="padding" style={styles.flex}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {phoneState === "arrive" && (
                <View style={styles.centerStage}>
                  <Text style={styles.bigCircleText}>hold to begin</Text>
                  <View accessibilityRole="radiogroup" style={styles.agentLanguages}>
                    {(["en", "zh"] as const).map((locale) => (
                      <Pressable
                        key={locale}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: agentLocale === locale, disabled: agentBusy }}
                        disabled={agentBusy}
                        onPress={() => setAgentLocale(locale)}
                        style={[styles.agentLanguage, agentLocale === locale && styles.agentLanguageSelected]}
                      >
                        <Text style={styles.agentLanguageText}>{locale === "en" ? "English" : "中文"}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.privacyNote}>
                    Typed or transcribed words go to aio's online service. Raw voice stays on this device.
                  </Text>
                  <HoldControl
                    label="hold"
                    color={palette.b}
                    onComplete={() => void beginPhoneSession()}
                    testID="arrive-hold"
                  />
                  {agentBusy && <ActivityIndicator color={palette.text} />}
                  {agentError && <Text style={styles.errorText}>{agentError}</Text>}
                </View>
              )}
              {phoneState === "outsideName" && (
                <View style={styles.contentInner}>
                  <Text style={styles.question}>
                    Is there a name the world gave you that you'd like to set
                    aside for now?
                  </Text>
                  <TextInput
                    value={outsideName}
                    onChangeText={setOutsideName}
                    placeholder="the quiet one"
                    placeholderTextColor={palette.text + "88"}
                    style={styles.input}
                    autoFocus
                  />
                  <Pressable
                    onPress={() => dispatchPhone({ type: "SKIP_NAME" })}
                  >
                    <Text style={styles.link}>not today</Text>
                  </Pressable>
                  {outsideName ? (
                    <HoldControl
                      label="HOLD ON"
                      color={palette.a}
                      onComplete={() => dispatchPhone({ type: "NAME_SAVED" })}
                    />
                  ) : null}
                </View>
              )}
              {(phoneState === "prompt" ||
                phoneState === "writing" ||
                phoneState === "waiting") && (
                <View style={styles.contentInner}>
                  <Text style={styles.promptText}>{agentMessage}</Text>
                  {phoneState === "prompt" && (
                    <ActivityIndicator color={palette.text} />
                  )}
                  {phoneState === "waiting" && (
                    <View style={styles.agentWaiting}>
                      <ActivityIndicator color={palette.text} />
                      <Text style={styles.body}>aio is considering one next question.</Text>
                    </View>
                  )}
                  {phoneState === "writing" && (
                    <>
                      <TextInput
                        ref={writingInputRef}
                        value={writing}
                        onChangeText={setWriting}
                        selection={writingSelection}
                        onSelectionChange={(event) => setWritingSelection(event.nativeEvent.selection)}
                        multiline
                        textAlignVertical="top"
                        inputAccessoryViewID={WRITING_ACCESSORY_ID}
                        style={[
                          styles.writingInput,
                          { borderColor: palette.text + "40" },
                        ]}
                      />
                      <VoiceInputBar
                        value={writing}
                        selection={writingSelection}
                        locale={agentLocale}
                        onLocaleChange={setAgentLocale}
                        onChangeText={setWriting}
                        onSelectionChange={setWritingSelection}
                        onListeningChange={setVoiceListening}
                      />
                      <InputAccessoryView nativeID={WRITING_ACCESSORY_ID}>
                        <View style={styles.keyboardAccessory}>
                          <Text style={styles.accessoryHint}>
                            When you are ready
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Done writing and dismiss keyboard"
                            style={styles.doneButton}
                            onPress={() => {
                              writingInputRef.current?.blur();
                              Keyboard.dismiss();
                            }}
                          >
                            <Text style={styles.doneButtonText}>Done</Text>
                          </Pressable>
                        </View>
                      </InputAccessoryView>
                      {phoneState === "writing" && !writing.trim() && (
                        <Pressable
                          onPress={closeCard}
                        >
                          <Text style={styles.link}>set this aside</Text>
                        </Pressable>
                      )}
                      {agentError && <Text style={styles.errorText}>{agentError}</Text>}
                    </>
                  )}
                </View>
              )}
              {phoneState === "chooseLine" && (
                <View style={styles.contentInner}>
                  <Text style={styles.question}>
                    Is there a line here you would keep?
                  </Text>
                  {agentCandidates.map((sentence) => (
                    <Pressable
                      key={sentence}
                      onPress={() => {
                        setLine(sentence);
                        dispatchPhone({ type: "LINE_SELECTED" });
                      }}
                      style={styles.lineOption}
                    >
                      <Text style={styles.lineOptionText}>{sentence}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {phoneState === "holdToKeep" && (
                <View style={styles.centerStage}>
                  <Text style={styles.keepPrompt}>Keep it as it is.</Text>
                  <TextInput
                    value={line}
                    editable={false}
                    multiline
                    style={styles.lineEdit}
                  />
                  <HoldControl
                    label="hold"
                    color={palette.b}
                    onComplete={() => void keepPhoneLine()}
                    testID="phone-keep"
                  />
                  {agentBusy && <ActivityIndicator color={palette.text} />}
                  {agentError && <Text style={styles.errorText}>{agentError}</Text>}
                </View>
              )}
              {phoneState === "safetyStop" && (
                <View style={styles.contentInner}>
                  <Text style={styles.question}>
                    {agentMessage}
                  </Text>
                  <View style={styles.resourceBox}>
                    <Text style={styles.resourceText}>
                      [crisis line and campus resources: to be verified]
                    </Text>
                  </View>
                  <Pressable onPress={closeCard}>
                    <Text style={styles.link}>close</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        {mode === "paper" && paperState !== "card" && (
          <View style={styles.flex}>
            {(paperState === "instructions" || paperState === "reading") && (
              <ScrollView contentContainerStyle={styles.paperScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.paperContent}>
                <Text style={styles.eyebrow}>with paper and pen</Text>
                <Text style={styles.paperPrompt}>{prompt.prompt}</Text>
                <Text style={styles.body}>{paperState === "instructions" ? "Read the question first. Then place me face down on your paper. There is no timer." : "Turn me face down to begin. I will stay quiet while you write."}</Text>
                {paperState === "instructions" && <View style={styles.cueList}>
                  {(["haptics", "light", "sound"] as const).map((cue) => (
                    <View key={cue} style={styles.cueRow}>
                      <Text style={styles.cueLabel}>{cue === "haptics" ? "soft vibration" : cue === "light" ? "small light signal" : "soft zen cue"}</Text>
                      <Switch value={paperCues[cue]} onValueChange={(value) => setPaperCues((current) => ({ ...current, [cue]: value }))} trackColor={{ false: "#D4D0C8", true: "#AAB0A0" }} thumbColor="#F7F4EC" />
                    </View>
                  ))}
                </View>}
                {paperState === "instructions" && <Pressable onPress={() => setPromptIndex(nextPromptIndex(promptIndex, prompts.length))}>
                  <Text style={styles.link}>choose another question</Text>
                </Pressable>}
                {paperState === "instructions" && <Pressable style={styles.nextButton} onPress={async () => {
                  await beginPaperReading();
                }}><Text style={styles.buttonText}>I have read it</Text></Pressable>}
                {paperState === "reading" && <View style={styles.manualStart}>
                  <Text style={styles.manualStartHint}>If turning me over does not respond, start here, then place me face down.</Text>
                  <Pressable style={styles.nextButton} onPress={() => dispatchPaper({ type: "BEGIN_WRITING" })}>
                    <Text style={styles.buttonText}>begin quiet writing</Text>
                  </Pressable>
                </View>}
              </View>
              </ScrollView>
            )}
            {paperState === "paused" && (
              <View style={styles.paperWaiting}>
                <Text style={styles.eyebrow}>paused</Text>
                <Text style={styles.question}>Your words can wait.</Text>
                <Text style={styles.body}>Turn me face down to continue, or face up when you are ready to make your card.</Text>
              </View>
            )}
            {(paperState === "reading" || paperState === "writing" || paperState === "followUp") && cameraActive && (
              <CameraView ref={cameraRef} style={styles.hiddenCamera} enableTorch={torch} accessible={false} />
            )}
            {paperState === "organize" && (
              <View style={styles.contentInner}>
                <Text style={styles.eyebrow}>back in view</Text>
                <Text style={styles.question}>What would you like to keep?</Text>
                <Text style={styles.body}>Choose one line from the page. A photo is optional.</Text>
                <Pressable
                  style={styles.nextButton}
                  onPress={async () => {
                    const result = permission?.granted ? permission : await requestPermission();
                    if (!result.granted) return;
                    setCameraActive(true);
                    setCameraReady(false);
                    dispatchPaper({ type: "START_CAPTURE" });
                  }}
                >
                  <Text style={styles.buttonText}>take a picture</Text>
                </Pressable>
                <Pressable onPress={() => dispatchPaper({ type: "SKIP_CAPTURE" })}>
                  <Text style={styles.link}>continue without a photo</Text>
                </Pressable>
              </View>
            )}
            {paperState === "capture" && (
              <View style={styles.contentInner}>
                <Text style={styles.question}>
                  Would you like to keep a picture of your page?
                </Text>
                {cameraActive && (
                  <CameraView
                    ref={cameraRef}
                    style={styles.photoPreview}
                    onCameraReady={() => setCameraReady(true)}
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={!cameraReady}
                  style={[styles.nextButton, !cameraReady && styles.saveCardButtonQuiet]}
                  onPress={async () => {
                    if (!cameraReady || !cameraRef.current) return;
                    try {
                      const photo = await cameraRef.current.takePictureAsync();
                      if (!photo?.uri) throw new Error("The camera did not return a photo.");
                      setPhotoUri(photo.uri);
                      dispatchPaper({ type: "PHOTO_CAPTURED" });
                    } catch (error) {
                      Alert.alert(
                        "Could not take the picture",
                        error instanceof Error ? error.message : "Please try again.",
                      );
                    }
                  }}
                >
                  <Text style={styles.buttonText}>{cameraReady ? "take a picture" : "opening camera"}</Text>
                </Pressable>
                <Pressable onPress={() => dispatchPaper({ type: "SKIP_CAPTURE" })}>
                  <Text style={styles.link}>skip photo</Text>
                </Pressable>
              </View>
            )}
            {paperState === "chooseStyle" && (
              <View style={styles.contentInner}>
                <Text style={styles.question}>
                  How would you like to keep it?
                </Text>
                {photoUri && <Pressable
                  style={styles.choice}
                  onPress={() => {
                    setStyle("handwriting");
                    dispatchPaper({ type: "STYLE_SELECTED" });
                  }}
                >
                  <Text style={styles.choiceText}>keep my handwriting</Text>
                </Pressable>}
                <Pressable
                  style={styles.choice}
                  onPress={() => {
                    setStyle("type");
                  }}
                >
                  <Text style={styles.choiceText}>type it</Text>
                </Pressable>
                {style === "type" && (
                  <>
                    <TextInput
                      value={line}
                      onChangeText={setLine}
                      multiline
                      style={styles.lineEdit}
                      placeholder="Type the sentence you underlined"
                    />
                    <Pressable disabled={!line.trim()} style={[styles.nextButton, !line.trim() && styles.saveCardButtonQuiet]} onPress={() => dispatchPaper({ type: "STYLE_SELECTED" })}>
                      <Text style={styles.buttonText}>continue</Text>
                    </Pressable>
                  </>
                )}
                {style === "type" && <Text style={styles.body}>Type your line above, then continue when it feels right.</Text>}
              </View>
            )}
            {paperState === "holdToKeep" && (
              <View style={styles.centerStage}>
                <Text style={styles.keepPrompt}>Keep it as it is.</Text>
                {(style === "handwriting" || line.trim().length > 0) && <HoldControl
                  label="hold"
                  color={palette.b}
                  onComplete={() => dispatchPaper({ type: "KEEP_COMPLETE" })}
                  testID="paper-keep"
                />}
              </View>
            )}
          </View>
        )}
        {isCard && (
          <Card
            line={line || "the line you chose to keep"}
            palette="ivory"
            photoUri={mode === "paper" && style === "handwriting" ? photoUri : undefined}
            onClose={closeCard}
          />
        )}
        {(mode === "phone" || mode === "paper") && !isCard && !isPaperWriting && (
          <View style={styles.flowNav} accessibilityRole="toolbar" accessibilityLabel="Session navigation">
            <Pressable disabled={!canGoBack} accessibilityRole="button" accessibilityLabel="Previous step" onPress={goBack} style={styles.flowNavSide}>
              <Text style={[styles.flowNavAction, !canGoBack && styles.flowNavDisabled]}>‹ back</Text>
            </Pressable>
            <Text style={styles.flowNavProgress}>{progressLabel}</Text>
            <Pressable disabled={!canGoForward} accessibilityRole="button" accessibilityLabel="Next step" onPress={goForward} style={[styles.flowNavSide, styles.flowNavRight]}>
              <Text style={[styles.flowNavAction, !canGoForward && styles.flowNavDisabled]}>next ›</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Card({
  line,
  palette,
  photoUri,
  onClose,
}: {
  line: string;
  palette: PaletteName;
  photoUri?: string;
  onClose: () => void;
}) {
  const p = palettes[palette];
  const cardRef = useRef<View>(null);
  const cardScale = useRef(new Animated.Value(0.97)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (enabled) {
        cardScale.setValue(1);
        cardOpacity.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, ...tokens.spring, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: tokens.transition.settleMs, easing: Easing.bezier(...tokens.transition.ease), useNativeDriver: true }),
      ]).start();
    });
    return () => {
      cardScale.stopAnimation();
      cardOpacity.stopAnimation();
    };
  }, [cardScale, cardOpacity]);
  const saveCard = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true, [
        "photo",
      ]);
      if (!permission.granted) {
        Alert.alert(
          "Photos permission is off",
          "Allow aio to add this card to your photo library in iPhone Settings.",
        );
        return;
      }
      if (!cardRef.current) throw new Error("The card is not ready yet.");
      const uri = await captureRef(cardRef.current, {
        format: "png",
        result: "tmpfile",
      });
      await MediaLibrary.Asset.create(uri);
      setSaved(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Could not save the card", message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Animated.View style={[styles.cardWrap, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
      <View
        ref={cardRef}
        collapsable={false}
        style={[styles.card, { backgroundColor: "#FFFEF7" }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardMark, { color: p.text }]}>aio.</Text>
          <Text style={styles.cardStar} accessibilityElementsHidden>✳</Text>
        </View>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.cardPhoto} />
        ) : (
          <Text style={[styles.cardLine, { color: p.text }]}>{line}</Text>
        )}
      </View>
      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            saved ? "Saved to Photos" : "Save the card to Photos"
          }
          disabled={saving || saved}
          style={[
            styles.saveCardButton,
            (saving || saved) && styles.saveCardButtonQuiet,
          ]}
          onPress={saveCard}
        >
          {saving ? (
            <ActivityIndicator color={p.text} />
          ) : (
            <Text style={[styles.saveCardButtonText, { color: p.text }]}>
              {saved ? "saved to Photos" : "save the card"}
            </Text>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={styles.link}>close</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  paperDark: { backgroundColor: "#1F211E" },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    minHeight: 72,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  soundToggle: { fontFamily: "Gaegu_400Regular", fontSize: 18, color: "#596153", opacity: 0.72, padding: 8 },
  markHit: { padding: 8 },
  mark: { fontFamily: "Gaegu_700Bold", fontSize: 30, color: "#3D473B" },
  stateLabel: { fontFamily: "Gaegu_400Regular", fontSize: 18, opacity: 0.55 },
  centerStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  welcomeArt: {
    width: 104,
    height: 104,
    position: "relative",
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeRing: { position: "absolute", width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderColor: "#8B927F", transform: [{ rotate: "-12deg" }] },
  welcomeDoodle: { fontSize: 46, color: "#74806F", textAlign: "center", fontFamily: "Gaegu_400Regular" },
  welcomeDot: { position: "absolute", width: 7, height: 7, borderRadius: 4, right: 12, top: 16, backgroundColor: "#B9A69A" },
  content: { flexGrow: 1, paddingBottom: 24 },
  contentInner: { paddingHorizontal: 28, paddingTop: 24, gap: 20 },
  eyebrow: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 20,
    marginBottom: 28,
    opacity: 0.64,
  },
  question: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 30,
    lineHeight: 35,
    color: "#3D473B",
  },
  promptText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 31,
    lineHeight: 35,
    color: "#41463E",
    marginTop: 32,
    marginBottom: 12,
  },
  body: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 21,
    lineHeight: 26,
    color: "#66665D",
    opacity: 0.78,
  },
  bigCircleText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 28,
    marginBottom: 26,
  },
  agentLanguages: { flexDirection: "row", gap: 8, marginBottom: 14 },
  agentLanguage: { borderWidth: 1, borderColor: "#8B927F", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  agentLanguageSelected: { backgroundColor: "#E1E9E4", borderColor: "#3D473B" },
  agentLanguageText: { fontFamily: "Gaegu_400Regular", fontSize: 19, color: "#3D473B" },
  privacyNote: { maxWidth: 300, textAlign: "center", fontFamily: "Gaegu_400Regular", fontSize: 17, lineHeight: 22, color: "#66665D", opacity: 0.82 },
  agentWaiting: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 14 },
  errorText: { fontFamily: "Gaegu_400Regular", fontSize: 18, lineHeight: 23, color: "#8B4654" },
  choiceStack: { width: "100%", gap: 14, marginTop: 34 },
  choice: {
    borderWidth: 1.5,
    borderRadius: 28,
    minHeight: 58,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  choiceText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 25,
    color: "#3D473B",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#3D473B44",
    fontFamily: "Gaegu_400Regular",
    fontSize: 25,
    paddingVertical: 8,
  },
  writingInput: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    fontFamily: "Gaegu_400Regular",
    fontSize: 23,
    lineHeight: 29,
    color: "#41463E",
  },
  keyboardAccessory: {
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#F7F4EC",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#41463E22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accessoryHint: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 18,
    color: "#41463E",
    opacity: 0.72,
  },
  doneButton: {
    minWidth: 76,
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#DED9CF",
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontFamily: "Gaegu_700Bold",
    fontSize: 22,
    color: "#41463E",
  },
  link: {
    fontFamily: "Gaegu_700Bold",
    fontSize: 21,
    color: "#565950",
    textDecorationLine: "underline",
  },
  followUp: { gap: 22, paddingTop: 12 },
  followUpText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 26,
    lineHeight: 31,
    color: "#748B7A",
  },
  nextButton: {
    alignSelf: "flex-start",
    borderRadius: 24,
    backgroundColor: "#E7D9D1",
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  buttonText: { fontFamily: "Gaegu_700Bold", fontSize: 21, color: "#4B5146" },
  cueList: { gap: 4, paddingVertical: 4 },
  cueRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#41463E22" },
  cueLabel: { fontFamily: "Gaegu_400Regular", fontSize: 21, color: "#565950" },
  paperScroll: { flexGrow: 1, paddingBottom: 24 },
  paperContent: { paddingHorizontal: 28, paddingTop: 10, paddingBottom: 20, gap: 17 },
  paperPrompt: { fontFamily: "Gaegu_400Regular", fontSize: 28, lineHeight: 34, color: "#41463E", marginTop: 0, marginBottom: 2 },
  manualStart: { gap: 12, paddingTop: 2 },
  manualStartHint: { fontFamily: "Gaegu_400Regular", fontSize: 18, lineHeight: 23, color: "#66665D", opacity: 0.78 },
  paperDarkTouch: { ...StyleSheet.absoluteFill, zIndex: 5, backgroundColor: "transparent" },
  flowNav: { minHeight: 54, marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#41463E22", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flowNavSide: { minWidth: 92, minHeight: 44, justifyContent: "center" },
  flowNavRight: { alignItems: "flex-end" },
  flowNavAction: { fontFamily: "Gaegu_700Bold", fontSize: 19, color: "#565950" },
  flowNavDisabled: { opacity: 0.28 },
  flowNavProgress: { fontFamily: "Gaegu_400Regular", fontSize: 17, color: "#77796F", opacity: 0.72 },
  lineOption: {
    borderBottomWidth: 1,
    borderBottomColor: "#41463E22",
    paddingVertical: 16,
  },
  lineOptionText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 24,
    lineHeight: 29,
    color: "#565950",
  },
  lineEdit: {
    width: "100%",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#4B514622",
    borderRadius: 22,
    padding: 16,
    fontFamily: "Gaegu_400Regular",
    fontSize: 24,
    color: "#41463E",
  },
  keepPrompt: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 28,
    color: "#4B5146",
    marginBottom: 28,
  },
  holdButton: {
    width: 108,
    height: 220,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: "#748B7A",
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 22,
    marginVertical: 20,
  },
  holdFill: { position: "absolute", left: 0, right: 0, bottom: 0 },
  holdLabel: { fontFamily: "Gaegu_700Bold", fontSize: 24, color: "#4B5146" },
  resourceBox: { padding: 18, borderRadius: 18, backgroundColor: "#E7D9D1" },
  resourceText: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 20,
    color: "#4B5146",
  },
  paperWaiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  hiddenCamera: { position: "absolute", width: 1, height: 1, opacity: 0 },
  photoPreview: { width: "100%", height: 240, marginVertical: 12 },
  cardWrap: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 32,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: 470,
    aspectRatio: 0.82,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#DDD7C9",
    padding: 26,
    gap: 30,
    justifyContent: "flex-start",
    shadowColor: "#45443D",
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardStar: { fontSize: 30, color: "#8A927E" },
  cardMark: { fontFamily: "Gaegu_700Bold", fontSize: 30 },
  cardLine: {
    fontFamily: "Gaegu_400Regular",
    fontSize: 28,
    lineHeight: 36,
    flex: 1,
    textAlignVertical: "center",
  },
  cardPhoto: { flex: 1, width: "100%", borderRadius: 16, resizeMode: "cover" },
  cardActions: { alignItems: "center", gap: 16, marginTop: 20 },
  saveCardButton: {
    minHeight: 58,
    minWidth: 220,
    paddingHorizontal: 28,
    borderRadius: 32,
    backgroundColor: "#E7D9D1",
    alignItems: "center",
    justifyContent: "center",
  },
  saveCardButtonQuiet: { opacity: 0.7 },
  saveCardButtonText: { fontFamily: "Gaegu_700Bold", fontSize: 22 },
});
