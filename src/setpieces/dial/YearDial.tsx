import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/theme';

import { useMonoFont } from '../fonts';
import { DIAL, DialDrawing } from './DialDrawing';
import { useReducedMotion } from '@/theme/reduced';

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
  const font = useMonoFont(9);
  const [width, setWidth] = useState(0);
  const sp = DIAL.spacing;
  const min = -(to - from) * sp;
  const offset = useSharedValue(-(year - from) * sp);
  const start = useSharedValue(0);
  const detent = useSharedValue(year - from);

  // The dial's own detents come back as `year` a frame or two late; moving to
  // one of those would drag a flick back to a year it already passed.
  const emitted = useRef<number | null>(null);
  const emit = (y: number) => {
    emitted.current = y;
    onChange(y);
  };

  // external changes (e.g. playback) move the dial without a gesture
  useEffect(() => {
    if (year === emitted.current) return;
    const target = -(year - from) * sp;
    if (Math.abs(offset.value - target) > sp / 2) offset.value = reduced ? target : withSpring(target, { damping: 26, stiffness: 240 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useAnimatedReaction(
    () => Math.round(-offset.value / sp),
    (i, prev) => {
      const clamped = Math.max(0, Math.min(to - from, i));
      if (prev !== null && clamped !== detent.value) {
        detent.value = clamped;
        scheduleOnRN(haptic.tick);
        scheduleOnRN(emit, from + clamped);
      }
    },
  );

  const settle = (y: number) => onSettle?.(y);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
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
      scheduleOnRN(settle, from + i);
    });

  const tap = Gesture.Tap().onEnd((e) => {
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
          offset.value = -(next - from) * sp;
          onChange(next);
          onSettle?.(next);
        }}
      >
        {width ? (
          <Canvas style={{ width, height: DIAL.height }}>
            <DialDrawing width={width} offset={transform} font={font} from={from} to={to} />
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}
