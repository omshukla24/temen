import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic, makeStyles, motion, useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/reduced';

const W = 46;
const H = 28;
const KNOB = 22;

/** An on/off switch: survey yellow with an ink knob when on, a quiet line when off. */
export function Toggle({ value, onValueChange, label, disabled }: { value: boolean; onValueChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = reduced ? withTiming(value ? 1 : 0, { duration: 0 }) : withSpring(value ? 1 : 0, motion.spring.press);
  }, [value, reduced, p]);
  const off = c.line;
  const on = c.accent;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [off, on]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + p.value * (W - KNOB - 3) }] }));
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
  track: { width: W, height: H, borderRadius: 2, justifyContent: 'center', borderWidth: 1.5, borderColor: c.ink },
  knob: { width: KNOB - 4, height: KNOB - 4, borderRadius: 1, backgroundColor: c.ink },
  disabled: { opacity: 0.45 },
}));
