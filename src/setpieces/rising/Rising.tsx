import { AlphaType, Canvas, ColorType, Skia, type Uniforms } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { lonLatToGlobalPx, type WaterMask } from 'ground-memory';

import { color } from '@/theme/tokens';

import { maskPlacement, maskTexels } from './mask';
import { RisingDrawing } from './RisingDrawing';
import { RISING_SKSL } from './shader';

const effect = Skia.RuntimeEffect.Make(RISING_SKSL);

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};
const LAKE = rgba(color.lake);
const MEMORY = rgba(color.lakeMemory);

/**
 * The Rising over the map. `rise` 0..1 moves the water table from the bottom
 * of the view to the top; `drain` 0..1 empties water that is gone ("NOW").
 * Caustics run while `live` is true and freeze otherwise, so an idle screen
 * costs nothing.
 */
export function Rising({
  mask,
  lat,
  lon,
  zoom,
  width,
  height,
  rise,
  drain,
  live,
}: {
  mask: WaterMask;
  lat: number;
  lon: number;
  zoom: number;
  width: number;
  height: number;
  rise: SharedValue<number>;
  drain: SharedValue<number>;
  live: boolean;
}) {
  const image = useMemo(
    () =>
      Skia.Image.MakeImage(
        { width: mask.w, height: mask.h, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
        Skia.Data.fromBytes(maskTexels(mask)),
        mask.w * 4,
      ),
    [mask],
  );
  const placement = useMemo(() => {
    const { gx, gy } = lonLatToGlobalPx(lat, lon, 13);
    return maskPlacement(mask, gx, gy, zoom, width, height);
  }, [mask, lat, lon, zoom, width, height]);

  // Our own clock: when the water goes still the callback stops, time stops
  // changing, and Skia has nothing to redraw.
  const time = useSharedValue(0);
  const frame = useFrameCallback((f) => {
    time.value += (f.timeSincePreviousFrame ?? 16) / 1000;
  }, live);
  useEffect(() => {
    frame.setActive(live);
  }, [live, frame]);

  const uniforms = useDerivedValue<Uniforms>(() => {
    const t = time.value;
    return {
      origin: placement.origin,
      cell: placement.cell,
      texSize: [mask.w, mask.h],
      level: height * (1 - rise.value) - 1,
      time: t,
      drain: drain.value,
      lake: LAKE,
      memory: MEMORY,
      still: 0,
    };
  });

  if (!effect || !image) return null;
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <RisingDrawing effect={effect} image={image} uniforms={uniforms} />
    </Canvas>
  );
}
