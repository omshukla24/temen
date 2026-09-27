import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic, useTheme } from '@/theme';

import { useMonoFont } from '../fonts';
import { DIAL, DialDrawing } from './DialDrawing';
import { useReducedMotion } from '@/theme/reduced';

/** How long the ruler glides to the player's next year (about one poll of the player). */
const FOLLOW_MS = 160;
/** After a finger lets go, `year` changes are the dial's own echoes for this long. */
const HAND_MS = 1000;

/** Where a flick would come to rest (UIScrollView's deceleration, as in Apple's sample code). */
function project(velocity: number, rate = 0.998) {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Past an edge the ruler resists more the further you pull. */
function rubberband(overshoot: number, dimension: number, c = 0.55) {
  'worklet';
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/**
 * The Year Dial: drag it 1:1, flick it and it glides to the year the flick
 * was heading for, then settles with the finger's velocity. A tick on every
 * year; rubber-band at 1984 and 2022.
 */
export function YearDial({
  year,
  onChange,
  onSettle,
  from = DIAL.from,
  to = DIAL.to,
}: {
  year: number;
  onChange: (year: number) => void;
  onSettle?: (year: number) => void;
  from?: number;
  to?: number;
}) {
  const reduced = useReducedMotion();
  const { c } = useTheme();
  const dialColors = useMemo(() => ({ ink: c.ink, inkMuted: c.inkMuted, hairline: c.hairline, ground: c.ground, laterite: c.laterite }), [c]);
  const font = useMonoFont(9);
  const [width, setWidth] = useState(0);
  const sp = DIAL.spacing;
  const min = -(to - from) * sp;
  const offset = useSharedValue(-(year - from) * sp);
  const start = useSharedValue(0);
  const detent = useSharedValue(year - from);

  // Who is moving the ruler: a finger (its detents are reported up) or the
  // player (the dial only follows; reporting those back would re-seek the
  // player and keep the dial a step behind it).
  const byHand = useSharedValue(false);
  // The dial's own detents come back as `year` a frame or two late; following
  // one of those would drag a flick back to a year it already passed.
  const handAt = useRef(0);
  const markHand = () => {
    handAt.current = Date.now();
  };
  const emit = (y: number) => {
    markHand();
    onChange(y);
  };

  // External changes (playback) move the dial without a gesture: a short glide
  // to the next year, a jump when playback loops or leaps.
  useEffect(() => {
    if (Date.now() - handAt.current < HAND_MS) return;
    byHand.value = false;
    const target = -(year - from) * sp;
    const years = Math.abs(offset.value - target) / sp;
    if (years < 0.05) return;
    detent.value = Math.max(0, Math.min(to - from, year - from));
    offset.value = reduced || years > 3 ? target : withTiming(target, { duration: FOLLOW_MS, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useAnimatedReaction(
    () => Math.round(-offset.value / sp),
    (i, prev) => {
      const clamped = Math.max(0, Math.min(to - from, i));
      if (prev === null || clamped === detent.value) return;
      detent.value = clamped;
      if (!byHand.value) return;
      scheduleOnRN(haptic.tick);
      scheduleOnRN(emit, from + clamped);
    },
  );

  const settle = (y: number) => onSettle?.(y);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      byHand.value = true;
      scheduleOnRN(markHand);
      start.value = offset.value; // grab from where the ruler is, mid-flight too
    })
    .onUpdate((e) => {
      let x = start.value + e.translationX;
      if (x > 0) x = rubberband(x, width || 300);
      if (x < min) x = min + rubberband(x - min, width || 300);
      offset.value = x;
    })
    .onEnd((e) => {
      const projected = offset.value + project(e.velocityX);
      const i = Math.max(0, Math.min(to - from, Math.round(-projected / sp)));
      const target = -i * sp;
      if (reduced) offset.value = withTiming(target, { duration: 120 });
      else offset.value = withSpring(target, { damping: 22, stiffness: 220, mass: 0.9, velocity: e.velocityX });
      scheduleOnRN(markHand);
      scheduleOnRN(settle, from + i);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    byHand.value = true;
    scheduleOnRN(markHand);
    const i = Math.max(0, Math.min(to - from, Math.round((-offset.value + (e.x - width / 2)) / sp)));
    offset.value = reduced ? -i * sp : withSpring(-i * sp, { damping: 24, stiffness: 260 });
    scheduleOnRN(settle, from + i);
  });

  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: width / 2 + offset.value }]);

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: DIAL.height }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Year dial"
        accessibilityValue={{ min: from, max: to, now: year, text: String(year) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const next = Math.max(from, Math.min(to, year + (e.nativeEvent.actionName === 'increment' ? 1 : -1)));
          markHand();
          offset.value = -(next - from) * sp;
          onChange(next);
          onSettle?.(next);
        }}
      >
        {width ? (
          <Canvas style={{ width, height: DIAL.height }}>
            <DialDrawing width={width} offset={transform} font={font} from={from} to={to} colors={dialColors} />
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}
