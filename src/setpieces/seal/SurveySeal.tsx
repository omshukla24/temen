import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import {
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme';

import { useMonoFont } from '../fonts';
import { SealDrawing } from './SealDrawing';
import { useReducedMotion } from '@/theme/reduced';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function sealText(lat: number, lon: number, iso: string) {
  const d = new Date(iso);
  const ring = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? 'E' : 'W'} · TEMEN · `;
  const center = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return { ring, center };
}

/** The seal stamps in: overshoots, lands with a slight twist, a soft haptic from the caller. */
export function SurveySeal({ size, lat, lon, date, stamp }: { size: number; lat: number; lon: number; date: string; stamp: number }) {
  const reduced = useReducedMotion();
  const font = useMonoFont(size * 0.034);
  const small = useMonoFont(size * 0.03);
  const s = useSharedValue(reduced ? 1 : 1.35);
  const o = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!stamp) return;
    if (reduced) {
      o.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: motion.dur.ui }));
      return;
    }
    s.value = withSequence(withTiming(1.35, { duration: 0 }), withSpring(1, motion.spring.settle));
    o.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: motion.dur.micro }));
  }, [stamp, reduced, s, o]);
  const transform = useDerivedValue<Transforms3d>(() => [{ scale: s.value }, { rotate: -0.07 * (2 - s.value) }]);
  const { ring, center } = sealText(lat, lon, date);
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <SealDrawing cx={size / 2} cy={size / 2} r={size * 0.42} ringText={ring} centerText={center} font={font} fontSmall={small} transform={transform} opacity={o} />
    </Canvas>
  );
}
