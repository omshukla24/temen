import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { terrainLines } from '@/setpieces/terrain/field';
import { motion, useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/reduced';

/** How far past the screen edge the terrain runs, so a drift never shows its border. */
const BLEED = 28;
const DRIFT_MS = 28000;

/**
 * The ground under every screen: contour lines of an imaginary terrain in
 * the live ink (index lines heavier), drawn once. `drift` lets the whole sheet
 * wander a few points, very slowly, as if the survey were still being walked;
 * reduced motion keeps it still.
 */
export const Terrain = memo(function Terrain({ seed = 7, drift = false, strength = 1 }: { seed?: number; drift?: boolean; strength?: number }) {
  const { c } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const w = width + BLEED * 2;
  const h = height + BLEED * 2;

  const paths = useMemo(() => {
    const minor = Skia.PathBuilder.Make();
    const major = Skia.PathBuilder.Make();
    const m = Skia.Matrix();
    m.scale(w, h);
    for (const l of terrainLines(seed, h / w)) {
      const p = Skia.Path.MakeFromSVGString(l.d);
      if (p) (l.major ? major : minor).addPath(p, m);
    }
    return { minor: minor.build(), major: major.build() };
  }, [seed, w, h]);

  const t = useSharedValue(0);
  useEffect(() => {
    if (!drift || reduced) return;
    t.value = withRepeat(withTiming(1, { duration: DRIFT_MS, easing: motion.ease.inOut }), -1, true);
    return () => cancelAnimation(t);
  }, [drift, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -BLEED + t.value * 14 }, { translateY: -BLEED + t.value * 22 }] }));

  const a = (c.dark ? 0.9 : 1) * strength;
  return (
    <Animated.View pointerEvents="none" style={[styles.root, { width: w, height: h }, style]}>
      <Canvas style={{ width: w, height: h }}>
        <Group>
          <Path path={paths.minor} style="stroke" strokeWidth={0.8} color={c.topo} opacity={0.075 * a} />
          <Path path={paths.major} style="stroke" strokeWidth={1.3} color={c.topo} opacity={0.15 * a} />
        </Group>
      </Canvas>
    </Animated.View>
  );
});

const styles = StyleSheet.create({ root: { position: 'absolute', left: 0, top: 0 } });
