import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { withDelay, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { motion, type TypeRole, type as roles } from '@/theme';

import { T } from './T';

/**
 * A headline that rises in word by word (a short fade and lift, staggered).
 * Plays once on mount; reduced motion shows it at once. Screen readers get
 * the whole sentence.
 */
export function RevealText({
  text,
  kind = 'display',
  color,
  italic,
  delay = 0,
  stagger = 38,
  style,
  textStyle,
  header,
}: {
  text: string;
  kind?: TypeRole;
  color?: string;
  italic?: boolean;
  delay?: number;
  stagger?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Announce as a heading. */
  header?: boolean;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const size = (roles[kind] as TextStyle).fontSize ?? 16;
  const gap = size * 0.26;
  return (
    <View
      style={[{ flexDirection: 'row', flexWrap: 'wrap' }, style]}
      accessible
      accessibilityLabel={text}
      accessibilityRole={header ? 'header' : 'text'}
    >
      {words.map((w, i) => (
        <Word key={`${i}:${w}`} delay={delay + i * stagger} rise={size * 0.35}>
          <T kind={kind} color={color} italic={italic} style={[i < words.length - 1 ? { marginRight: gap } : null, textStyle]}>
            {w}
          </T>
        </Word>
      ))}
    </View>
  );
}

function Word({ delay, rise, children }: { delay: number; rise: number; children: React.ReactNode }) {
  const enter: EntryExitAnimationFunction = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: rise }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 360 })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 520, easing: motion.ease.out })) }],
      },
    };
  };
  return (
    <Animated.View entering={enter} importantForAccessibility="no-hide-descendants">
      {children}
    </Animated.View>
  );
}
