import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useSettings, type Appearance } from '@/state/settings';

import { phaseAt } from './daylight';
import { setHapticsEnabled, motion } from './motion';
import { palettes, strataFills, type Palette, type Phase, type StrataFills } from './palettes';

export interface Theme {
  /** The live palette. */
  c: Palette;
  phase: Phase;
  dark: boolean;
  appearance: Appearance;
  fills: StrataFills;
}

const themeOf = (phase: Phase, appearance: Appearance): Theme => {
  const c = palettes[phase];
  return { c, phase, dark: c.dark, appearance, fills: strataFills(c) };
};

const ThemeContext = createContext<Theme>(themeOf('day', 'light'));

/** Which light the app should wear. Pure, so the rules are testable. */
export function resolvePhase(
  appearance: Appearance,
  system: string | null | undefined,
  now: number,
  sunAt: { lat: number; lon: number } | null,
): Phase {
  switch (appearance) {
    case 'light':
      return 'day';
    case 'dark':
      return 'night';
    case 'system':
      return system === 'dark' ? 'night' : 'day';
    default:
      return phaseAt(now, sunAt);
  }
}

const MINUTE = 60_000;

/**
 * Provides the live palette. In Auto the paper follows the sun where the phone
 * last was (checked every minute and whenever the app comes back); a change of
 * light dissolves in from the old paper instead of snapping.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appearance, sunAt, haptics } = useSettings();
  const system = useColorScheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (appearance !== 'auto') return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, MINUTE);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [appearance]);

  useEffect(() => setHapticsEnabled(haptics), [haptics]);

  const phase = resolvePhase(appearance, system, now, sunAt);
  const theme = useMemo(() => themeOf(phase, appearance), [phase, appearance]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.c.ground).catch(() => {});
  }, [theme.c.ground]);

  // The dissolve: when the light changes, the old paper sits on top and fades away.
  const reduced = useReducedMotion();
  const last = useRef(theme.c.ground);
  const [curtain, setCurtain] = useState<{ color: string; key: number } | null>(null);
  const lift = useCallback(() => setCurtain(null), []);
  useEffect(() => {
    if (last.current !== theme.c.ground && !reduced) setCurtain({ color: last.current, key: Date.now() });
    last.current = theme.c.ground;
  }, [theme.c.ground, reduced]);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} animated />
      {children}
      {curtain ? <Curtain key={curtain.key} color={curtain.color} onDone={lift} /> : null}
    </ThemeContext.Provider>
  );
}

function Curtain({ color, onDone }: { color: string; onDone: () => void }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withTiming(0, { duration: motion.dur.theme, easing: motion.ease.inOut }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [o, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]} />;
}

/** The live theme: `const { c } = useTheme()`. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Themed StyleSheets: `const useStyles = makeStyles((c) => ({ root: { backgroundColor: c.ground } }))`
 * at module level, then `const s = useStyles()` in the component. One sheet per light, cached.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Palette) => T): () => T {
  const cache = new Map<Phase, T>();
  return function useStyles() {
    const { c } = useTheme();
    let sheet = cache.get(c.phase);
    if (!sheet) {
      sheet = StyleSheet.create(factory(c));
      cache.set(c.phase, sheet);
    }
    return sheet;
  };
}
