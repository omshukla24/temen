import type { TextStyle } from 'react-native';

// Per-weight entry points: the package index would ship every weight in the APK.
import { BigShouldersStencil_600SemiBold } from '@expo-google-fonts/big-shoulders-stencil/600SemiBold';
import { BigShouldersStencil_800ExtraBold } from '@expo-google-fonts/big-shoulders-stencil/800ExtraBold';
import { Geologica_400Regular } from '@expo-google-fonts/geologica/400Regular';
import { Geologica_500Medium } from '@expo-google-fonts/geologica/500Medium';
import { Geologica_600SemiBold } from '@expo-google-fonts/geologica/600SemiBold';
import { MartianMono_300Light } from '@expo-google-fonts/martian-mono/300Light';
import { MartianMono_400Regular } from '@expo-google-fonts/martian-mono/400Regular';

export const fontAssets = {
  BigShouldersStencil_600SemiBold,
  BigShouldersStencil_800ExtraBold,
  Geologica_400Regular,
  Geologica_500Medium,
  Geologica_600SemiBold,
  MartianMono_300Light,
  MartianMono_400Regular,
};

// Display: a condensed stencil, the way core boxes and survey kit are
// labelled. Body: Geologica. Mono: Martian Mono, the instrument's readout.
export const font = {
  display: 'BigShouldersStencil_800ExtraBold',
  /** The lighter stencil, for a second voice next to the display (teasers, units). */
  displayAlt: 'BigShouldersStencil_600SemiBold',
  body: 'Geologica_400Regular',
  bodyMedium: 'Geologica_500Medium',
  bodySemi: 'Geologica_600SemiBold',
  monoLight: 'MartianMono_300Light',
  mono: 'MartianMono_400Regular',
} as const;

// Scale in pt (DESIGN.md §0). The stencil is condensed, so it runs larger.
export const size = {
  hero: 72,
  displayXl: 56,
  display: 44,
  title: 30,
  heading: 19,
  body: 16,
  small: 14,
  caption: 13,
  mono: 10.5,
} as const;

// Tracking is size-specific: tighten large serif, open up small mono caps.
const track = (em: number, pt: number) => em * pt;

// The stencil's caps sit 0.80 em tall over a 0.21 em descent: Android clips the
// caps if a line is shorter than ~1.02 em, so display lines stay at 1.06 em.
const STENCIL_LH = 1.06;

const stencil = (pt: number, em = 0.005): TextStyle => ({
  fontFamily: font.display,
  fontSize: pt,
  lineHeight: Math.round(pt * STENCIL_LH),
  letterSpacing: track(em, pt),
  textTransform: 'uppercase',
});

export const type = {
  hero: stencil(size.hero, 0),
  displayXl: stencil(size.displayXl, 0),
  display: stencil(size.display),
  title: stencil(size.title, 0.01),
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
    fontSize: 24,
    lineHeight: Math.round(24 * STENCIL_LH),
    letterSpacing: track(0.16, 24),
  },
} satisfies Record<string, TextStyle>;

export type TypeRole = keyof typeof type;

/** Roles set in the muted ink by default; the rest use full ink. */
export const MUTED_ROLES: ReadonlySet<TypeRole> = new Set<TypeRole>(['small', 'caption', 'mono', 'monoWide']);
