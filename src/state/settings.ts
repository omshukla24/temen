import { getLocales } from 'expo-localization';

import { KEYS } from '@/services/storage';

import { persisted, useStore } from './store';

export type Lang = 'en' | 'hi';

export interface Settings {
  lang: Lang;
  speak: boolean;
  /** Dismissed the "share a pin from WhatsApp" card. */
  shareHintSeen: boolean;
}

const deviceLang = (): Lang => (getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en');

export const settings = persisted<Settings>(KEYS.settings, { lang: deviceLang(), speak: false, shareHintSeen: false });

export function useSettings(): Settings {
  return useStore(settings);
}

export function updateSettings(patch: Partial<Settings>) {
  settings.set((s) => ({ ...s, ...patch }));
}
