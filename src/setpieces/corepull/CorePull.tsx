import { Canvas, Group, type Transforms3d } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic, motion } from '@/theme';

import { CoreDrawing, coreGeometry, type Band } from '../CoreDrawing';

const W = 46;
const H = 150;

/**
 * The Core Pull: the pin extrudes into a shaded core (sediment spring), lifts
 * off the map, and dissolves as the strata settle into the Core below.
 * Total ≈ 1100 ms. Calls onDone once, from the JS thread.
 */
export function CorePull({
  bands,
  pinX,
  pinY,
  width,
  height,
  onDone,
}: {
  bands: Band[];
  pinX: number;
  pinY: number;
  width: number;
  height: number;
  onDone: () => void;
}) {
  const extrude = useSharedValue(0);
  const lift = useSharedValue(0);
  const g = coreGeometry(W, H, 0.2, false);

  useEffect(() => {
    haptic.swell();
    extrude.value = withSpring(1, { ...motion.spring.settle, stiffness: 190 });
    lift.value = withDelay(
      620,
      withSequence(
        withTiming(1, { duration: motion.dur.corePull - 620, easing: motion.ease.inOut }, (fin) => {
          if (fin) scheduleOnRN(onDone);
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inner = useDerivedValue<Transforms3d>(() => {
    const e = extrude.value;
    return [{ translateY: (1 - e) * (g.bottom - g.top) }, { scaleY: Math.max(0.001, e) }];
  });
  const outer = useDerivedValue<Transforms3d>(() => [
    { translateX: pinX - W / 2 },
    { translateY: pinY - H + g.ry - lift.value * 48 },
    { scale: 1 + lift.value * 0.12 },
  ]);
  const opacity = useDerivedValue(() => 1 - Math.max(0, (lift.value - 0.35) / 0.65));

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group transform={outer} opacity={opacity}>
        <CoreDrawing width={W} height={H} bands={bands} ghost={false} tilt={0.2} transform={inner} />
      </Group>
    </Canvas>
  );
}
