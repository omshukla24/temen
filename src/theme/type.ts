import type { TextStyle } from 'react-native';

// Per-weight entry points: the package index would ship every weight in the APK.
import { BigShouldersStencil_800ExtraBold } from '@expo-google-fonts/big-shoulders-stencil/800ExtraBold';
import { Geologica_400Regular } from '@expo-google-fonts/geologica/400Regular';
import { Geologica_500Medium } from '@expo-google-fonts/geologica/500Medium';
import { Geologica_600SemiBold } from '@expo-google-fonts/geologica/600SemiBold';
import { Geologica_700Bold } from '@expo-google-fonts/geologica/700Bold';
import { MartianMono_300Light } from '@expo-google-fonts/martian-mono/300Light';
import { MartianMono_400Regular } from '@expo-google-fonts/martian-mono/400Regular';

export const fontAssets = {
  BigShouldersStencil_800ExtraBold,
  Geologica_400Regular,
  Geologica_500Medium,
  Geologica_600SemiBold,
  Geologica_700Bold,
  MartianMono_300Light,
  MartianMono_400Regular,
};

// One family does the talking: Geologica, bold for display and readings,
// regular for reading. Martian Mono is the instrument's readout. The stencil
// is kept for the TEMEN wordmark alone.
export const font = {
  display: 'Geologica_700Bold',
  /** A second, lighter voice next to the display (teasers, units). */
  displayAlt: 'Geologica_400Regular',
  body: 'Geologica_400Regular',
  bodyMedium: 'Geologica_500Medium',
  bodySemi: 'Geologica_600SemiBold',
  monoLight: 'MartianMono_300Light',
  mono: 'MartianMono_400Regular',
  wordmark: 'BigShouldersStencil_800ExtraBold',
} as const;

// Scale in pt (DESIGN.md §0).
export const size = {
  hero: 60,
  displayXl: 40,
  display: 34,
  title: 24,
  heading: 19,
  body: 16,
  small: 14,
  caption: 13,
  mono: 10.5,
} as const;

// Tracking is size-specific: tighten large display, open up small mono caps.
const track = (em: number, pt: number) => em * pt;

// Geologica's accents and descenders need ~1.1 em at display sizes.
const DISPLAY_LH = 1.1;

const display = (pt: number, em: number): TextStyle => ({
  fontFamily: font.display,
  fontSize: pt,
  lineHeight: Math.round(pt * DISPLAY_LH),
  letterSpacing: track(em, pt),
});

export const type = {
  hero: display(size.hero, -0.03),
  displayXl: display(size.displayXl, -0.025),
  display: display(size.display, -0.02),
  title: display(size.title, -0.015),
  heading: {
    fontFamily: font.bodySemi,
    fontSize: size.heading,
    lineHeight: size.heading * 1.3,
    letterSpacing: track(-0.01, size.heading),
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
    letterSpacing: track(0.1, size.mono),
    textTransform: 'uppercase',
  },
  monoWide: {
    fontFamily: font.monoLight,
    fontSize: size.mono,
    lineHeight: size.mono * 1.6,
    letterSpacing: track(0.16, size.mono),
    textTransform: 'uppercase',
  },
  wordmark: {
    fontFamily: font.wordmark,
    fontSize: 24,
    // the stencil's caps clip on Android below ~1.02 em
    lineHeight: Math.round(24 * 1.06),
    letterSpacing: track(0.16, 24),
  },
} satisfies Record<string, TextStyle>;

export type TypeRole = keyof typeof type;

/** Roles set in the muted ink by default; the rest use full ink. */
export const MUTED_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>(['small', 'caption', 'mono', 'monoWide']);
