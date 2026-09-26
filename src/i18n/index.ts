import { useCallback } from 'react';

import { settings, useSettings, type Lang } from '@/state/settings';

import en from './en.json';
import hi from './hi.json';
import { LIBRARY_HI } from './library-hi';

export type Key = keyof typeof en;

const DICT: Record<Lang, Record<string, string>> = { en, hi };

export function translate(lang: Lang, key: Key): string {
  return DICT[lang][key] ?? en[key] ?? key;
}

/** Library sentence → current language (falls back to the English original). */
export function translateLib(lang: Lang, text: string): string {
  return lang === 'hi' ? (LIBRARY_HI[text] ?? text) : text;
}

export function useT() {
  const { lang } = useSettings();
  const t = useCallback((key: Key) => translate(lang, key), [lang]);
  const tl = useCallback((text: string) => translateLib(lang, text), [lang]);
  return { t, tl, lang };
}

export const tNow = (key: Key) => translate(settings.get().lang, key);
