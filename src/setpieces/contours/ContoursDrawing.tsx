import { Group, Path, Skia, type SkPath, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { ContourLine } from 'ground-memory';

import { color } from '@/theme/tokens';

export interface ContourPaths {
  minor: SkPath;
  major: SkPath;
}

/** Unit-square contour paths → two Skia paths scaled to cover a w×h box. */
export function buildContourPaths(lines: ContourLine[], w: number, h: number): ContourPaths {
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  const s = Math.max(w, h); // cover, keep the terrain's aspect
  const m = Skia.Matrix();
  m.translate((w - s) / 2, (h - s) / 2);
  m.scale(s, s);
  for (const l of lines) {
    const p = Skia.Path.MakeFromSVGString(l.d);
    if (!p) continue;
    p.transform(m);
    (l.major ? major : minor).addPath(p);
  }
  return { minor, major };
}

/** Live Contours: the place's own terrain, in ink at 8% (index lines at 14%). */
export function ContoursDrawing({
  paths,
  transform,
  opacity = 1,
}: {
  paths: ContourPaths;
  transform?: Transforms3d | SharedValue<Transforms3d>;
  opacity?: number | SharedValue<number>;
}) {
  return (
    <Group {...(transform ? { transform } : null)} opacity={opacity}>
      <Path path={paths.minor} style="stroke" strokeWidth={0.8} color={color.ink} opacity={0.08} />
      <Path path={paths.major} style="stroke" strokeWidth={1.1} color={color.ink} opacity={0.14} />
    </Group>
  );
}
