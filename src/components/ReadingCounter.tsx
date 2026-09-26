import { useEffect } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { color, motion, type as roles } from '@/theme';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedText = Animated.createAnimatedComponent(TextInput);

/**
 * A reading that counts up to its value (900 ms). Formats on the UI thread,
 * so the JS thread stays free while strata settle. Screen readers get the final text.
 */
export function ReadingCounter({
  value,
  from = 0,
  format = 'int',
  prefix = '',
  suffix = '',
  delay = 0,
  digits = 0,
  style,
  run = true,
}: {
  value: number;
  /** Start of the count (default 0; years count from 1984). */
  from?: number;
  format?: 'int' | 'signed' | 'pad3';
  prefix?: string;
  suffix?: string;
  delay?: number;
  digits?: number;
  style?: StyleProp<TextStyle>;
  run?: boolean;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? value : from);
  useEffect(() => {
    if (!run) return;
    v.value = reduced ? value : withDelay(delay, withTiming(value, { duration: motion.dur.count, easing: motion.ease.out }));
  }, [value, delay, reduced, run, v]);

  const props = useAnimatedProps(() => {
    const n = v.value;
    let s: string;
    const fixed = Math.abs(n).toFixed(digits);
    if (format === 'pad3') s = Math.round(n).toString().padStart(3, '0');
    else if (format === 'signed') s = `${n > 0.049 ? '+' : n < -0.049 ? '−' : '±'}${fixed}`;
    else s = `${n < 0 ? '−' : ''}${fixed}`;
    return { text: `${prefix}${s}${suffix}`, defaultValue: `${prefix}${s}${suffix}` } as object;
  });

  const finalText =
    format === 'pad3'
      ? `${prefix}${Math.round(value).toString().padStart(3, '0')}${suffix}`
      : `${prefix}${format === 'signed' && value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}${suffix}`;
  return (
    <AnimatedText
      editable={false}
      caretHidden
      underlineColorAndroid="transparent"
      accessibilityLabel={finalText}
      importantForAutofill="no"
      animatedProps={props}
      style={[roles.display, { color: color.ink, padding: 0, margin: 0 }, style]}
    />
  );
}
