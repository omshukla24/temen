import { getLocales } from 'expo-localization';

import { KEYS } from '@/services/storage';

import { persisted, useStore, type Store } from './store';

export type Lang = 'en' | 'hi';

/** auto = the paper follows the sun where you are; system = the phone's light/dark setting. */
export type Appearance = 'auto' | 'light' | 'dark' | 'system';

export interface Settings {
  lang: Lang;
  speak: boolean;
  /** Dismissed the "share a pin from WhatsApp" card. */
  shareHintSeen: boolean;
  appearance: Appearance;
  haptics: boolean;
  /** Preferences → Reduce motion (on top of the phone's own accessibility setting). */
  reduceMotion: boolean;
  /** Finished (or skipped) the first-run introduction. */
  onboarded: boolean;
  /** Where the phone last was, rounded to ~1 km, so Auto can find the sun offline. */
  sunAt: { lat: number; lon: number } | null;
}

const deviceLang = (): Lang => (getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en');

const DEFAULTS: Settings = {
  lang: deviceLang(),
  speak: false,
  shareHintSeen: false,
  appearance: 'auto',
  haptics: true,
  reduceMotion: false,
  onboarded: false,
  sunAt: null,
};

const stored = persisted<Partial<Settings>>(KEYS.settings, DEFAULTS);

// Older installs stored fewer fields: fill the new ones in without losing theirs.
// The merged object is cached per stored value so useSyncExternalStore sees a stable snapshot.
let cache: { raw: Partial<Settings>; full: Settings } | null = null;
const snapshot = (): Settings => {
  const raw = stored.get();
  if (!cache || cache.raw !== raw) cache = { raw, full: { ...DEFAULTS, ...raw } };
  return cache.full;
};

export const settings: Store<Settings> = {
  get: snapshot,
  set: (next) => stored.set(typeof next === 'function' ? next(snapshot()) : next),
  subscribe: stored.subscribe,
};

export function useSettings(): Settings {
  return useStore(settings);
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.set((s) => ({ ...s, ...patch }));
}

/** Remember roughly where the phone is, for the sun. Writes only when it moved ~1 km. */
export function rememberSunPlace(lat: number, lon: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const r = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
  const cur = settings.get().sunAt;
  if (cur && cur.lat === r.lat && cur.lon === r.lon) return;
  updateSettings({ sunAt: r });
}
