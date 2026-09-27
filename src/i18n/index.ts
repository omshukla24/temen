import { useCallback } from 'react';

import { settings, useSettings, type Lang } from '@/state/settings';

import en from './en.json';
import hi from './hi.json';
import { LIBRARY_HI } from './library-hi';
import accountEn from './strings/account.en.json';
import accountHi from './strings/account.hi.json';
import checkEn from './strings/check.en.json';
import checkHi from './strings/check.hi.json';
import homeEn from './strings/home.en.json';
import homeHi from './strings/home.hi.json';
import navEn from './strings/nav.en.json';
import navHi from './strings/nav.hi.json';
import onboardEn from './strings/onboard.en.json';
import onboardHi from './strings/onboard.hi.json';
import placesEn from './strings/places.en.json';
import placesHi from './strings/places.hi.json';
import prefsEn from './strings/prefs.en.json';
import prefsHi from './strings/prefs.hi.json';
import tmEn from './strings/tm.en.json';
import tmHi from './strings/tm.hi.json';

// Each area of the app keeps its strings in its own pair of files (strings/<area>.<lang>.json).
export const EN = { ...en, ...navEn, ...homeEn, ...onboardEn, ...placesEn, ...checkEn, ...tmEn, ...accountEn, ...prefsEn };
export const HI: Record<string, string> = { ...hi, ...navHi, ...homeHi, ...onboardHi, ...placesHi, ...checkHi, ...tmHi, ...accountHi, ...prefsHi };

export type Key = keyof typeof EN;

const DICT: Record<Lang, Record<string, string>> = { en: EN, hi: HI };

export type Vars = Record<string, string | number>;

/** `{name}` placeholders are filled from `vars`. */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = DICT[lang][key] ?? EN[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Library sentence → current language (falls back to the English original). */
export function translateLib(lang: Lang, text: string): string {
  return lang === 'hi' ? (LIBRARY_HI[text] ?? text) : text;
}

export function useT() {
  const { lang } = useSettings();
  const t = useCallback((key: Key, vars?: Vars) => translate(lang, key, vars), [lang]);
  const tl = useCallback((text: string) => translateLib(lang, text), [lang]);
  return { t, tl, lang };
}

export const tNow = (key: Key, vars?: Vars) => translate(settings.get().lang, key, vars);
