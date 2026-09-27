import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ContourLine } from 'ground-memory';

import { motion } from '@/theme';

import { buildContourPaths, ContoursDrawing } from './ContoursDrawing';
import { useReducedMotion } from '@/theme/reduced';
import { useTheme } from '@/theme';

/**
 * The place's real contour lines as the result background. They drift a few
 * points with device tilt (UI thread only); reduced motion keeps them still.
 */
export function LiveContours({ lines, width, height }: { lines: ContourLine[]; width: number; height: number }) {
  const reduced = useReducedMotion();
  const { c } = useTheme();
  const paths = useMemo(() => buildContourPaths(lines, width + 24, height + 24), [lines, width, height]);
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 32 });
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  // quantise to half-points so a phone lying still does not redraw every sample
  useAnimatedReaction(
    () => {
      const { pitch, roll } = sensor.sensor.value;
      return [Math.round(Math.max(-1, Math.min(1, roll / 0.6)) * 20) / 2, Math.round(Math.max(-1, Math.min(1, pitch / 0.6)) * 20) / 2];
    },
    (next, prev) => {
      if (reduced || (prev && next[0] === prev[0] && next[1] === prev[1])) return;
      dx.value = withSpring(next[0], motion.spring.sheet);
      dy.value = withSpring(next[1], motion.spring.sheet);
    },
  );
  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: -12 + dx.value }, { translateY: -12 + dy.value }]);
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <ContoursDrawing paths={paths} transform={transform} ink={c.ink} />
    </Canvas>
  );
}
