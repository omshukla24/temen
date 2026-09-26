import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';

import { color as palette } from '@/theme';

/** Survey-instrument glyphs on a 24 grid: one stroke weight, square caps, no fills. */
const PATHS = {
  back: 'M15 5 L8 12 L15 19',
  forward: 'M9 5 L16 12 L9 19',
  close: 'M6 6 L18 18 M18 6 L6 18',
  search: 'M10.5 4 A6.5 6.5 0 1 0 10.5 17 A6.5 6.5 0 1 0 10.5 4 M15.3 15.3 L20 20',
  drill: 'M9 3 H15 V16 H9 Z M9 7 H15 M9 11 H15 M12 16 V21',
  crosshair: 'M12 2 V7 M12 17 V22 M2 12 H7 M17 12 H22 M12 9 A3 3 0 1 0 12 15 A3 3 0 1 0 12 9',
  pin: 'M12 21 V13 M12 3 A5 5 0 1 0 12 13 A5 5 0 1 0 12 3',
  share: 'M12 3 V15 M7 8 L12 3 L17 8 M5 13 V20 H19 V13',
  camera: 'M4 8 H7.5 L9.5 5 H14.5 L16.5 8 H20 V19 H4 Z M12 10.5 A3.5 3.5 0 1 0 12 17.5 A3.5 3.5 0 1 0 12 10.5',
  clock: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 M12 8 V12 L15 14',
  report: 'M6 3 H15 L18 6 V21 H6 Z M9 10 H15 M9 14 H15 M9 18 H13',
  save: 'M7 3 H17 V21 L12 17 L7 21 Z',
  saved: 'M7 3 H17 V21 L12 17 L7 21 Z M9.5 9.5 L11.5 11.5 L14.5 7.5',
  bell: 'M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z M10 20.5 H14',
  sliders: 'M4 7 H11 M15 7 H20 M13 5 V9 M4 17 H6 M10 17 H20 M8 15 V19',
  check: 'M5 12.5 L9.5 17 L19 7',
  lock: 'M7 11 H17 V20 H7 Z M9 11 V8 A3 3 0 0 1 15 8 V11',
  tray: 'M4 5 H8 V19 H4 Z M10 5 H14 V19 H10 Z M16 5 H20 V19 H16 Z',
  speaker: 'M4 10 H8 L13 6 V18 L8 14 H4 Z M16 9.5 A3.5 3.5 0 0 1 16 14.5 M18.5 7 A7 7 0 0 1 18.5 17',
  plus: 'M12 5 V19 M5 12 H19',
  arrow: 'M5 12 H19 M13 6 L19 12 L13 18',
  layers: 'M12 4 L21 9 L12 14 L3 9 Z M3 14 L12 19 L21 14',
  link: 'M10 14 L14 10 M8.5 11.5 L6.5 13.5 A3 3 0 0 0 10.5 17.5 L12.5 15.5 M15.5 12.5 L17.5 10.5 A3 3 0 0 0 13.5 6.5 L11.5 8.5',
  benchmark: 'M5 6 H19 M12 8 V20 M12 8 L7 18 M12 8 L17 18',
  paste: 'M9 4 H15 V7 H9 Z M7 5.5 H5 V21 H19 V5.5 H17',
  trash: 'M5 7 H19 M10 7 V4 H14 V7 M7 7 L8 20 H16 L17 7',
  wave: 'M3 12 Q6 9 9 12 T15 12 T21 12',
  refresh: 'M19 12 A7 7 0 1 1 16.9 7 M19 4 V8 H15',
  globe: 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M3 12 H21 M12 3 C8 8 8 16 12 21 C16 16 16 8 12 3',
} as const;

export type GlyphName = keyof typeof PATHS;

const cache = new Map<string, SkPath>();
function pathFor(name: GlyphName): SkPath | null {
  const hit = cache.get(name);
  if (hit) return hit;
  const p = Skia.Path.MakeFromSVGString(PATHS[name]);
  if (p) cache.set(name, p);
  return p;
}

export function Glyph({
  name,
  size = 22,
  color = palette.ink,
  weight = 1.6,
  style,
}: {
  name: GlyphName;
  size?: number;
  color?: string;
  weight?: number;
  style?: ViewStyle;
}) {
  const path = useMemo(() => pathFor(name), [name]);
  const scale = size / 24;
  if (!path) return <View style={[{ width: size, height: size }, style]} />;
  return (
    <Canvas style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={weight / scale}
        strokeCap="square"
        strokeJoin="miter"
        color={color}
        transform={[{ scale }]}
      />
    </Canvas>
  );
}
