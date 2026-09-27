import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic, hit, motion } from '@/theme';
import { useReducedMotion } from '@/theme/reduced';

const APressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticOnPress?: 'tick' | 'seat' | null;
}

/**
 * Feedback lives on touch-down: the surface compresses the instant a finger lands
 * and springs back from wherever it is if the press is cancelled.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, scaleTo = motion.pressScale, hapticOnPress = null, onPressIn, onPressOut, onPress, hitSlop, disabled, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  // disabled dims inside the animated style: a static opacity would lose to the animated one
  const dim = disabled ? 0.4 : 1;
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value * dim }), [dim]);
  return (
    <APressable
      ref={ref}
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      hitSlop={hitSlop ?? 8}
      onPressIn={(e) => {
        if (reduced) o.value = withTiming(0.7, { duration: motion.dur.micro });
        else s.value = withSpring(scaleTo, motion.spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (reduced) o.value = withTiming(1, { duration: motion.dur.micro });
        else s.value = withSpring(1, motion.spring.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) haptic[hapticOnPress]();
        onPress?.(e);
      }}
      style={[{ minHeight: hit.min, justifyContent: 'center' }, style, anim]}
    />
  );
});
