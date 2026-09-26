import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SensorType, useAnimatedSensor, useDerivedValue, useReducedMotion, withSpring } from 'react-native-reanimated';

import type { ContourLine } from 'ground-memory';

import { motion } from '@/theme';

import { buildContourPaths, ContoursDrawing } from './ContoursDrawing';

/**
 * The place's real contour lines as the result background. They drift a few
 * points with device tilt (UI thread only); reduced motion keeps them still.
 */
export function LiveContours({ lines, width, height }: { lines: ContourLine[]; width: number; height: number }) {
  const reduced = useReducedMotion();
  const paths = useMemo(() => buildContourPaths(lines, width + 24, height + 24), [lines, width, height]);
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 32 });
  const transform = useDerivedValue<Transforms3d>(() => {
    if (reduced) return [{ translateX: -12 }, { translateY: -12 }];
    const { pitch, roll } = sensor.sensor.value;
    const dx = Math.max(-1, Math.min(1, roll / 0.6)) * 10;
    const dy = Math.max(-1, Math.min(1, pitch / 0.6)) * 10;
    return [{ translateX: withSpring(-12 + dx, motion.spring.sheet) }, { translateY: withSpring(-12 + dy, motion.spring.sheet) }];
  });
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <ContoursDrawing paths={paths} transform={transform} />
    </Canvas>
  );
}
