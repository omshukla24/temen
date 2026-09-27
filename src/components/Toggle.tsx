import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic, makeStyles, motion, useTheme } from '@/theme';

const W = 46;
const H = 28;
const KNOB = 22;

/** An on/off switch in the palette: laterite when on, a quiet line when off. */
export function Toggle({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = reduced ? withTiming(value ? 1 : 0, { duration: 0 }) : withSpring(value ? 1 : 0, motion.spring.press);
  }, [value, reduced, p]);
  const off = c.line;
  const on = c.laterite;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [off, on]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + p.value * (W - KNOB - 6) }] }));
  return (
    <Pressable
      onPress={() => {
        haptic.tick();
        onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={disabled ? styles.disabled : null}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center' },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: c.paper, borderWidth: 1, borderColor: c.hairline },
  disabled: { opacity: 0.45 },
}));
