import { DashPathEffect, Group, LinearGradient, Oval, Path, Skia, vec, type SkPath, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { color, strata as fills, type StrataKey } from '@/theme/tokens';

export interface Band {
  hatch: string;
  significance: number;
  status?: string;
}

export function bandColor(b: Band): string {
  if (b.status === 'error') return fills.error;
  return fills[(b.hatch as StrataKey) in fills ? (b.hatch as StrataKey) : 'ground'];
}

/** Front-facing band between two seams of a cylinder seen slightly from above. */
export function bandPath(x0: number, x1: number, top: number, bottom: number, ry: number): SkPath {
  const p = Skia.Path.Make();
  const w = x1 - x0;
  p.moveTo(x0, top);
  p.arcToOval({ x: x0, y: top - ry, width: w, height: ry * 2 }, 180, -180, false);
  p.lineTo(x1, bottom);
  p.arcToOval({ x: x0, y: bottom - ry, width: w, height: ry * 2 }, 0, 180, false);
  p.close();
  return p;
}

export interface CoreGeometry {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  ry: number;
  ghostH: number;
}

export function coreGeometry(width: number, height: number, tilt: number, ghost: boolean): CoreGeometry {
  const ry = Math.max(2, width * tilt);
  const pad = 1.5;
  const ghostH = ghost ? Math.max(8, height * 0.12) : 0;
  return { x0: pad, x1: width - pad, top: ry + pad, bottom: height - ghostH - ry - pad, ry, ghostH };
}

/**
 * A core sample: strata stacked top (now) to bottom (1984), shaded as a
 * cylinder, with the cut face on top and a dashed ghost for what it can't see.
 */
export function CoreDrawing({
  width,
  height,
  bands,
  ghost = true,
  tilt = 0.16,
  transform,
  x = 0,
  y = 0,
}: {
  width: number;
  height: number;
  bands: Band[];
  ghost?: boolean;
  tilt?: number;
  transform?: Transforms3d | SharedValue<Transforms3d>;
  x?: number;
  y?: number;
}) {
  const g = coreGeometry(width, height, tilt, ghost);
  const { x0, x1, top, bottom, ry, ghostH } = g;
  const solid = bands.filter((b) => b.hatch !== 'cantSee');
  const total = solid.reduce((a, b) => a + 0.35 + b.significance, 0) || 1;
  const colH = Math.max(1, bottom - top);
  let cursor = top;
  const shapes = solid.map((b) => {
    const h = ((0.35 + b.significance) / total) * colH;
    const s = { path: bandPath(x0, x1, cursor, cursor + h, ry), color: bandColor(b), seam: cursor };
    cursor += h;
    return s;
  });
  const outline = bandPath(x0, x1, top, bottom, ry);
  const ghostPath = bandPath(x0, x1, bottom, bottom + ghostH, ry);
  const seams = Skia.Path.Make();
  for (const s of shapes.slice(1)) seams.addArc({ x: x0, y: s.seam - ry, width: x1 - x0, height: ry * 2 }, 0, 180);
  const cap = { x: x0, y: top - ry, width: x1 - x0, height: ry * 2 };

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {ghost ? (
        <Path path={ghostPath} style="stroke" strokeWidth={1} color={color.inkMuted} opacity={0.7}>
          <DashPathEffect intervals={[3, 3]} />
        </Path>
      ) : null}
      <Group {...(transform ? { transform, origin: vec(width / 2, top) } : null)}>
        {shapes.map((s, i) => (
          <Path key={i} path={s.path} color={s.color} />
        ))}
        <Path path={seams} style="stroke" strokeWidth={0.75} color="rgba(28,27,25,0.25)" />
        <Path path={outline}>
          <LinearGradient
            start={vec(x0, 0)}
            end={vec(x1, 0)}
            positions={[0, 0.3, 0.55, 1]}
            colors={['rgba(0,0,0,0.30)', 'rgba(255,255,255,0.14)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.38)']}
          />
        </Path>
        <Path path={outline} style="stroke" strokeWidth={1} color={color.ink} />
        <Oval rect={cap} color={color.paper} />
        <Oval rect={cap} style="stroke" strokeWidth={1} color={color.ink} />
        <Oval rect={{ x: x0 + (x1 - x0) * 0.38, y: top - ry * 0.24, width: (x1 - x0) * 0.24, height: ry * 0.48 }} color={color.laterite} />
      </Group>
    </Group>
  );
}
