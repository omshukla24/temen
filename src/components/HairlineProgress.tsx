import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { makeStyles, motion, useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/reduced';

/** A 1 px line that fills left to right. Pass `progress` (0..1) or let it run for `duration`. */
export function HairlineProgress({
  progress,
  duration = motion.dur.count,
  delay = 0,
  tint,
  run = true,
}: {
  progress?: SharedValue<number>;
  duration?: number;
  delay?: number;
  tint?: string;
  run?: boolean;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const own = useSharedValue(0);
  useEffect(() => {
    if (progress || !run) return;
    own.value = reduced ? 1 : withDelay(delay, withTiming(1, { duration, easing: motion.ease.out }));
  }, [progress, run, reduced, delay, duration, own]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.0001, (progress ?? own).value) }] }));
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.fill, { backgroundColor: tint ?? c.ink }, style]} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  track: { height: 1, backgroundColor: c.hairline, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: 1, width: '100%', transformOrigin: 'left' },
}));
