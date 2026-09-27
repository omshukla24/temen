import type { TextStyle } from 'react-native';

// Per-weight entry points: the package index would ship every weight in the APK.
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { MartianMono_300Light } from '@expo-google-fonts/martian-mono/300Light';
import { MartianMono_400Regular } from '@expo-google-fonts/martian-mono/400Regular';

export const fontAssets = {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  MartianMono_300Light,
  MartianMono_400Regular,
};

export const font = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemi: 'HankenGrotesk_600SemiBold',
  monoLight: 'MartianMono_300Light',
  mono: 'MartianMono_400Regular',
} as const;

// Scale in pt (DESIGN.md §0).
export const size = {
  displayXl: 48,
  display: 40,
  title: 28,
  heading: 20,
  body: 16,
  small: 14,
  caption: 13,
  mono: 10.5,
} as const;

// Tracking is size-specific: tighten large serif, open up small mono caps.
const track = (em: number, pt: number) => em * pt;

export const type = {
  displayXl: {
    fontFamily: font.display,
    fontSize: size.displayXl,
    lineHeight: size.displayXl * 1.12, // room for italic descenders (the g in "ground")
    letterSpacing: track(-0.02, size.displayXl),
  },
  display: {
    fontFamily: font.display,
    fontSize: size.display,
    lineHeight: size.display * 1.12,
    letterSpacing: track(-0.02, size.display),
  },
  title: {
    fontFamily: font.display,
    fontSize: size.title,
    lineHeight: size.title * 1.18,
    letterSpacing: track(-0.015, size.title),
  },
  heading: {
    fontFamily: font.bodySemi,
    fontSize: size.heading,
    lineHeight: size.heading * 1.25,
    letterSpacing: track(-0.005, size.heading),
  },
  body: {
    fontFamily: font.body,
    fontSize: size.body,
    lineHeight: size.body * 1.5,
  },
  bodyMedium: {
    fontFamily: font.bodyMedium,
    fontSize: size.body,
    lineHeight: size.body * 1.45,
  },
  small: {
    fontFamily: font.body,
    fontSize: size.small,
    lineHeight: size.small * 1.5,
  },
  caption: {
    fontFamily: font.body,
    fontSize: size.caption,
    lineHeight: size.caption * 1.45,
  },
  mono: {
    fontFamily: font.mono,
    fontSize: size.mono,
    lineHeight: size.mono * 1.6,
    letterSpacing: track(0.2, size.mono),
    textTransform: 'uppercase',
  },
  monoWide: {
    fontFamily: font.monoLight,
    fontSize: size.mono,
    lineHeight: size.mono * 1.6,
    letterSpacing: track(0.28, size.mono),
    textTransform: 'uppercase',
  },
  wordmark: {
    fontFamily: font.display,
    fontSize: size.title,
    letterSpacing: track(0.08, size.title),
  },
} satisfies Record<string, TextStyle>;

export type TypeRole = keyof typeof type;

/** Roles set in the muted ink by default; the rest use full ink. */
export const MUTED_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>(['small', 'caption', 'mono', 'monoWide']);
