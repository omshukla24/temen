import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { memory, useStore } from '@/state/store';
import { makeStyles, motion, space, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { T } from './T';

interface ToastMessage {
  id: number;
  text: string;
  glyph?: GlyphName;
}

const current = memory<ToastMessage | null>(null);
let seq = 0;
const SHOW_MS = 2600;

/** A short confirmation at the bottom of the screen ("Saved", "Signed in"). */
export function toast(text: string, glyph?: GlyphName): void {
  const id = ++seq;
  current.set({ id, text, glyph });
  setTimeout(() => {
    if (current.get()?.id === id) current.set(null);
  }, SHOW_MS);
}

/** Mount once, at the root, above everything. */
export function ToastHost() {
  const msg = useStore(current);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useStyles();
  useEffect(() => {
    if (msg) AccessibilityInfo.announceForAccessibility(msg.text);
  }, [msg]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.host, { paddingBottom: insets.bottom + 84 }]}>
      {msg ? (
        <Animated.View key={msg.id} entering={FadeInDown.duration(motion.dur.ui)} exiting={FadeOutDown.duration(motion.dur.exit)} style={styles.pill}>
          {msg.glyph ? <Glyph name={msg.glyph} size={16} color={c.ground} /> : null}
          <T kind="small" color={c.ground}>
            {msg.text}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  host: { justifyContent: 'flex-end', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: c.ink,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: 999,
    maxWidth: '88%',
  },
}));
