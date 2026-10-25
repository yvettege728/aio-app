import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Selection } from '../speech/transcriptEdit';
import { useVoiceInput, type VoiceLocale } from '../speech/useVoiceInput';

type VoiceInputBarProps = {
  value: string;
  selection: Selection;
  locale: VoiceLocale;
  onLocaleChange: (locale: VoiceLocale) => void;
  onChangeText: (text: string) => void;
  onSelectionChange: (selection: Selection) => void;
  onListeningChange?: (listening: boolean) => void;
};

export function VoiceInputBar(props: VoiceInputBarProps) {
  const voice = useVoiceInput(props);
  const active = voice.status === 'listening' || voice.status === 'finishing';
  const busy = active || voice.status === 'requestingPermission';

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
            style={[styles.language, props.locale === locale && styles.languageSelected]}
          >
            <Text style={styles.languageText}>{locale === 'en' ? 'English' : '中文'}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? 'Stop voice input' : 'Start voice input'}
        disabled={voice.status === 'requestingPermission'}
        onPress={active ? voice.stop : voice.start}
        style={[styles.voiceButton, active && styles.voiceButtonActive]}
      >
        <Text style={styles.voiceButtonText}>{active ? 'Stop' : 'Speak'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {voice.error ?? statusText(voice.status)}
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
});
