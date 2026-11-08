import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Selection } from '../speech/transcriptEdit';
import { useVoiceInput, type VoiceLocale } from '../speech/useVoiceInput';
import { palettes } from '../theme/palettes';

type VoiceInputBarProps = {
  value: string;
  selection: Selection;
  locale: VoiceLocale;
  onLocaleChange: (locale: VoiceLocale) => void;
  onChangeText: (text: string) => void;
  onSelectionChange: (selection: Selection) => void;
  onListeningChange?: (listening: boolean) => void;
  theme?: 'legacy' | 'rejection';
  copy?: { start: string; stop: string; busy: string; error: string; idle: string };
};

export function VoiceInputBar(props: VoiceInputBarProps) {
  const voice = useVoiceInput(props);
  const active = voice.status === 'listening' || voice.status === 'finishing';
  const busy = active || voice.status === 'requestingPermission';
  const rejection = props.theme === 'rejection';

  return (
    <View style={styles.container}>
      <View accessibilityRole="radiogroup" style={styles.languages}>
        {(['en', 'zh'] as const).map((locale) => (
          <Pressable
            key={locale}
            accessibilityRole="radio"
            accessibilityState={{ checked: props.locale === locale, disabled: busy }}
            disabled={busy}
            onPress={() => props.onLocaleChange(locale)}
            style={[styles.language, rejection && styles.rejectionLanguage, props.locale === locale && (rejection ? styles.rejectionLanguageSelected : styles.languageSelected)]}
          >
            <Text style={[styles.languageText, rejection && styles.rejectionText]}>{locale === 'en' ? 'English' : '中文'}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? props.copy?.stop ?? 'Stop voice input' : props.copy?.start ?? 'Start voice input'}
        disabled={voice.status === 'requestingPermission'}
        onPress={active ? voice.stop : voice.start}
        style={[styles.voiceButton, rejection && styles.rejectionVoice, active && (rejection ? styles.rejectionVoiceActive : styles.voiceButtonActive)]}
      >
        <Text style={[styles.voiceButtonText, rejection && styles.rejectionVoiceText]}>{active ? props.copy?.stop ?? 'Stop' : props.copy?.start ?? 'Speak'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.status, rejection && styles.rejectionText]}>
        {voice.error ? props.copy?.error ?? voice.error : busy ? props.copy?.busy ?? statusText(voice.status) : props.copy?.idle ?? statusText(voice.status)}
      </Text>
    </View>
  );
}

function statusText(status: ReturnType<typeof useVoiceInput>['status']) {
  if (status === 'requestingPermission') return 'Checking microphone permission…';
  if (status === 'listening') return 'Listening on this device…';
  if (status === 'finishing') return 'Finishing this phrase…';
  return 'Voice stays on this device until it becomes text.';
}

const styles = StyleSheet.create({
  container: { gap: 8, marginTop: 12 },
  languages: { flexDirection: 'row', gap: 8 },
  language: { borderRadius: 16, borderWidth: 1, borderColor: '#9A958C', paddingHorizontal: 12, paddingVertical: 6 },
  languageSelected: { backgroundColor: '#E7F0ED', borderColor: '#223F45' },
  languageText: { color: '#223F45', fontSize: 14 },
  voiceButton: { alignSelf: 'flex-start', borderRadius: 18, backgroundColor: '#223F45', paddingHorizontal: 18, paddingVertical: 9 },
  voiceButtonActive: { backgroundColor: '#8B4654' },
  voiceButtonText: { color: '#FFFDF5', fontSize: 15 },
  status: { color: '#666057', fontSize: 13, minHeight: 18 },
  rejectionLanguage: { borderColor: palettes.rejection.blue, minHeight: 44, justifyContent: 'center' },
  rejectionLanguageSelected: { backgroundColor: palettes.rejection.dot },
  rejectionText: { color: palettes.rejection.ink, fontFamily: 'Gaegu_400Regular', fontSize: 17 },
  rejectionVoice: { backgroundColor: palettes.rejection.blue, minHeight: 48, justifyContent: 'center' },
  rejectionVoiceActive: { backgroundColor: palettes.rejection.rose },
  rejectionVoiceText: { color: palettes.rejection.white, fontFamily: 'Gaegu_700Bold', fontSize: 19 },
});
