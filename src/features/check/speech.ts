import * as Speech from 'expo-speech';
import { useCallback, useEffect } from 'react';

import { summarise, type GroundReport } from 'ground-memory';

import { memory, useStore } from '@/state/store';

/** Which core is being read aloud, if any. One voice at a time, app-wide. */
const speaking = memory<string | null>(null);

/** What the voice says: the headline and each reading, in the app's language. */
export function spokenText(report: GroundReport, hindi: boolean, tl: (s: string) => string): string {
  if (!hindi) return summarise(report);
  return [tl(report.headline), ...report.strata.filter((s) => s.status === 'ok' && s.key !== 'cantSee').map((s) => `${tl(s.title)}: ${tl(s.headline)}`)].join('। ');
}

export function stopSpeaking(): void {
  speaking.set(null);
  Speech.stop();
}

/**
 * Reads a core aloud. `toggle` starts it, or stops it if it is already
 * talking (the speaker button is a play/stop switch, never a restart).
 */
export function useSpeech(id: string | null) {
  const current = useStore(speaking);
  const on = !!id && current === id;

  const say = useCallback(
    (text: string, lang: 'hi' | 'en') => {
      if (!id) return;
      Speech.stop();
      speaking.set(id);
      const end = () => {
        if (speaking.get() === id) speaking.set(null);
      };
      Speech.speak(text, { language: lang === 'hi' ? 'hi-IN' : 'en-IN', rate: 0.96, onDone: end, onStopped: end, onError: end });
    },
    [id],
  );

  const toggle = useCallback(
    (text: string, lang: 'hi' | 'en') => {
      if (on) stopSpeaking();
      else say(text, lang);
    },
    [on, say],
  );

  // Leaving the core ends its reading.
  useEffect(
    () => () => {
      if (id && speaking.get() === id) stopSpeaking();
    },
    [id],
  );

  return { speaking: on, say, toggle, stop: stopSpeaking };
}
