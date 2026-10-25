import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { applyTranscript, beginDictation, type DictationBase, type Selection } from './transcriptEdit';

export type VoiceLocale = 'en' | 'zh';
export type VoiceInputStatus = 'idle' | 'requestingPermission' | 'listening' | 'finishing' | 'error';

type VoiceInputOptions = {
  value: string;
  selection: Selection;
  locale: VoiceLocale;
  onChangeText: (text: string) => void;
  onSelectionChange: (selection: Selection) => void;
  onListeningChange?: (listening: boolean) => void;
};

const expectedStopErrors = new Set(['aborted', 'client', 'no-speech', 'speech-timeout']);

export function useVoiceInput(options: VoiceInputOptions) {
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef<DictationBase | null>(null);
  const stoppingRef = useRef(false);
  const hadErrorRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const finish = useCallback(() => {
    optionsRef.current.onListeningChange?.(false);
    stoppingRef.current = false;
    baseRef.current = null;
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    optionsRef.current.onListeningChange?.(true);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    const base = baseRef.current;
    if (!base) return;
    const edit = applyTranscript(base, transcript);
    optionsRef.current.onChangeText(edit.text);
    optionsRef.current.onSelectionChange(edit.selection);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (stoppingRef.current && expectedStopErrors.has(event.error)) {
      setStatus('idle');
      finish();
      return;
    }
    hadErrorRef.current = true;
    setError(voiceErrorMessage(event.error));
    setStatus('error');
    finish();
  });

  useSpeechRecognitionEvent('end', () => {
    if (!hadErrorRef.current) setStatus('idle');
    finish();
  });

  useEffect(() => () => {
    ExpoSpeechRecognitionModule.abort();
    optionsRef.current.onListeningChange?.(false);
  }, []);

  const start = useCallback(async () => {
    hadErrorRef.current = false;
    stoppingRef.current = false;
    setError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      hadErrorRef.current = true;
      setError('Speech recognition is not available on this device.');
      setStatus('error');
      return;
    }
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      hadErrorRef.current = true;
      setError('On-device speech recognition is not available.');
      setStatus('error');
      return;
    }

    setStatus('requestingPermission');
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      hadErrorRef.current = true;
      setError('Microphone and speech recognition permission are needed.');
      setStatus('error');
      return;
    }

    const current = optionsRef.current;
    baseRef.current = beginDictation(current.value, current.selection);
    ExpoSpeechRecognitionModule.start({
      lang: current.locale === 'zh' ? 'zh-CN' : 'en-US',
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
    });
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    setStatus('finishing');
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const resetError = useCallback(() => {
    hadErrorRef.current = false;
    setError(null);
    setStatus('idle');
  }, []);

  return { status, error, start, stop, resetError };
}

function voiceErrorMessage(code: string): string {
  if (code === 'not-allowed') return 'Microphone or speech permission was not granted.';
  if (code === 'language-not-supported') return 'This speech language is not installed on the device.';
  if (code === 'audio-capture') return 'The microphone could not be used.';
  return 'Voice input stopped. Your draft is still here.';
}
