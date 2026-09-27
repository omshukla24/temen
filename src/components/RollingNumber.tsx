import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { LayoutAnimationConfig, withDelay, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { motion, type TypeRole, type as roles } from '@/theme';

import { T } from './T';

const ROLL_MS = 420;

/**
 * A number that rolls like an odometer: when it changes, only the characters
 * that changed slide up out of their slot while the new ones rise in, one after
 * another from the left. Rolls in on first show unless `still` is set. Screen
 * readers get the plain value.
 */
export function RollingNumber({
  value,
  kind = 'displayXl',
  color,
  style,
  containerStyle,
  stagger = 28,
  still = false,
  duration = ROLL_MS,
}: {
  value: string | number;
  kind?: TypeRole;
  color?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** ms between neighbouring characters. */
  stagger?: number;
  /** Skip the roll-in on first mount. */
  still?: boolean;
  /** ms for one character's roll; keep it under the gap between changes (fast feeds like playback). */
  duration?: number;
}) {
  const text = String(value);
  const role = roles[kind] as TextStyle;
  const lh = (role.lineHeight as number | undefined) ?? (role.fontSize ?? 16) * 1.2;
  const chars = [...text];
  return (
    <View style={[{ flexDirection: 'row' }, containerStyle]} accessible accessibilityLabel={text} accessibilityRole="text">
      <LayoutAnimationConfig skipEntering={still}>
        {chars.map((ch, i) => (
          // slots are keyed from the right, so 999 → 1000 keeps the units in place
          <Slot key={chars.length - i} ch={ch} lh={lh} delay={i * stagger} ms={duration} kind={kind} color={color} style={style} />
        ))}
      </LayoutAnimationConfig>
    </View>
  );
}

function Slot({ ch, lh, delay, ms, kind, color, style }: { ch: string; lh: number; delay: number; ms: number; kind: TypeRole; color?: string; style?: StyleProp<TextStyle> }) {
  const enter: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: lh * 0.9 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: ms * 0.7 })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration: ms, easing: motion.ease.out })) }],
      },
    };
  };
  const exit: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
      animations: {
        opacity: withDelay(delay, withTiming(0, { duration: ms * 0.6 })),
        transform: [{ translateY: withDelay(delay, withTiming(-lh * 0.9, { duration: ms, easing: motion.ease.out })) }],
      },
    };
  };
  return (
    <View style={{ height: lh, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants">
      <Animated.View key={ch} entering={enter} exiting={exit}>
        <T kind={kind} color={color} style={style}>
          {ch === ' ' ? ' ' : ch}
        </T>
      </Animated.View>
    </View>
  );
}
