import { Canvas, Circle, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { Hatch as HatchKind } from 'ground-memory';

import { color } from '@/theme';

/**
 * Each stratum type has its own hatch (DESIGN.md): water = wave lines,
 * lost water = dotted lake-memory, ground = contour lines, rain = short
 * vertical ticks, quakes = a jagged line, soil = stipple.
 */
export const HatchFill = memo(function HatchFill({
  kind,
  width,
  height,
  tint,
  density = 1,
}: {
  kind: HatchKind;
  width: number;
  height: number;
  tint?: string;
  density?: number;
}) {
  const paths = useMemo(() => build(kind, width, height, density), [kind, width, height, density]);
  if (!width || !height || kind === 'cantSee') return null;
  const c = tint ?? TINT[kind];
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group>
        {paths.path ? <Path path={paths.path} style="stroke" strokeWidth={1} color={c} /> : null}
        {paths.dots.map((d, i) => (
          <Circle key={i} cx={d[0]} cy={d[1]} r={d[2]} color={c} />
        ))}
        {paths.ticks.map((t, i) => (
          <Line key={`t${i}`} p1={vec(t[0], t[1])} p2={vec(t[0], t[1] + t[2])} strokeWidth={1} color={c} />
        ))}
      </Group>
    </Canvas>
  );
});

const TINT: Record<HatchKind, string> = {
  water: 'rgba(27,110,168,0.22)',
  lostWater: 'rgba(134,179,203,0.55)',
  ground: 'rgba(148,118,74,0.28)',
  rain: 'rgba(27,110,168,0.22)',
  quakes: 'rgba(196,65,31,0.28)',
  soil: 'rgba(148,118,74,0.42)',
  cantSee: 'transparent',
  egg: color.crimsonEgg,
};

// Deterministic pseudo-random so hatches never shimmer between renders.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function build(kind: HatchKind, w: number, h: number, density: number) {
  const out = { path: null as ReturnType<typeof Skia.Path.Make> | null, dots: [] as [number, number, number][], ticks: [] as [number, number, number][] };
  if (!w || !h) return out;
  const r = rng(Math.round(w * 31 + h * 17) + kind.length);
  switch (kind) {
    case 'water': {
      const p = Skia.PathBuilder.Make();
      const gap = 9 / density;
      for (let y = gap; y < h; y += gap) {
        p.moveTo(0, y);
        for (let x = 0; x < w; x += 16) p.quadTo(x + 4, y - 2.5, x + 8, y).quadTo(x + 12, y + 2.5, x + 16, y);
      }
      out.path = p.build();
      break;
    }
    case 'lostWater': {
      const gap = 7 / density;
      for (let y = gap / 2; y < h; y += gap) for (let x = (y / gap) % 2 ? gap / 2 : 0; x < w; x += gap) out.dots.push([x, y, 1.1]);
      break;
    }
    case 'ground': {
      const p = Skia.PathBuilder.Make();
      const gap = 11 / density;
      for (let y = gap; y < h + gap; y += gap) {
        const a = (r() - 0.5) * 8;
        const b = (r() - 0.5) * 8;
        p.moveTo(0, y);
        p.cubicTo(w * 0.3, y + a, w * 0.6, y + b, w, y + (a - b) / 3);
      }
      out.path = p.build();
      break;
    }
    case 'rain': {
      const gap = 8 / density;
      for (let y = 4; y < h; y += 12) for (let x = ((y / 12) % 2) * (gap / 2); x < w; x += gap) out.ticks.push([x, y, 5]);
      break;
    }
    case 'quakes': {
      const p = Skia.PathBuilder.Make();
      const mid = h / 2;
      p.moveTo(0, mid);
      for (let x = 0; x < w; x += 6) {
        const amp = (r() < 0.12 ? 0.42 : 0.14) * h;
        p.lineTo(x + 3, mid + (r() - 0.5) * 2 * amp);
      }
      out.path = p.build();
      break;
    }
    case 'soil': {
      const n = Math.floor((w * h) / (70 / density));
      for (let i = 0; i < n; i++) out.dots.push([r() * w, r() * h, 0.6 + r() * 0.7]);
      break;
    }
    case 'egg': {
      out.path = Skia.PathBuilder.Make().moveTo(0, h / 2).lineTo(w, h / 2).build();
      break;
    }
  }
  return out;
}
