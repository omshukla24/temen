import { useCallback } from 'react';

import { settings, useSettings, type Lang } from '@/state/settings';

import en from './en.json';
import hi from './hi.json';
import { LIBRARY_HI } from './library-hi';

export type Key = keyof typeof en;

const DICT: Record<Lang, Record<string, string>> = { en, hi };

export type Vars = Record<string, string | number>;

/** `{name}` placeholders are filled from `vars`. */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = DICT[lang][key] ?? en[key] ?? key;
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
