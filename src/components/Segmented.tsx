import { useEffect, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptic, makeStyles, motion, radius, useTheme } from '@/theme';

import { T } from './T';
import { useReducedMotion } from '@/theme/reduced';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
}

/** Two to four choices in one bar; the ink block slides to the chosen one. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: {
  options: SegmentOption<V>[];
  value: V;
  onChange: (v: V) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const seg = options.length ? w / options.length : 0;
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = reduced ? i * seg : withSpring(i * seg, motion.spring.sheet);
  }, [i, seg, reduced, x]);
  const block = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.bar, style]} onLayout={(e) => setW(e.nativeEvent.layout.width - 2)} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {seg ? <Animated.View style={[styles.block, { width: seg }, block]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={styles.item}
            onPress={() => {
              if (on) return;
              haptic.tick();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
          >
            <T kind="mono" color={on ? c.ground : c.ink} numberOfLines={1} style={styles.label}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: 'row', borderWidth: 1, borderColor: c.dark ? c.line : c.ink, borderRadius: radius.sm, minHeight: 40, overflow: 'hidden' },
  block: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: c.ink },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingHorizontal: 4 },
  // small mono sets its own tracking
  label: { fontSize: 9.5, letterSpacing: 1.5 },
}));
