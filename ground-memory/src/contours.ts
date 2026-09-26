import { contours } from 'd3-contour';

import type { ElevationGrid } from './terrain';

export interface ContourLine {
  level: number;
  /** Index lines (every 5th) are drawn heavier. */
  major: boolean;
  /** SVG path in a unit square (0..1 on both axes). */
  d: string;
}

const NICE = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

/** Smallest "nice" interval that keeps the number of levels under maxLevels (≥ 1 m when possible). */
export function contourInterval(min: number, max: number, maxLevels = 28, minInterval = 1): number {
  const span = Math.max(0.01, max - min);
  for (const n of NICE) if (n >= minInterval && span / n <= maxLevels) return n;
  return Math.ceil(span / maxLevels / 100) * 100;
}

/** 3×3 box blur; SRTM-class models carry ±2 m speckle that would draw as noise. */
export function smooth(values: Float32Array, w: number, h: number, passes = 2): Float32Array {
  let src = values;
  for (let p = 0; p < passes; p++) {
    const dst = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            s += src[yy * w + xx];
            n++;
          }
        }
        dst[y * w + x] = s / n;
      }
    }
    src = dst;
  }
  return src;
}

/** Contour lines for Live Contours, as unit-square SVG paths. */
export function contourPaths(grid: ElevationGrid, opts: { maxLevels?: number; minInterval?: number } = {}): {
  interval: number;
  lines: ContourLine[];
} {
  const values = smooth(grid.heights, grid.w, grid.h);
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const interval = contourInterval(min, max, opts.maxLevels, opts.minInterval);
  const first = Math.ceil(min / interval) * interval;
  const thresholds: number[] = [];
  for (let t = first; t <= max; t += interval) thresholds.push(Math.round(t * 100) / 100);
  if (!thresholds.length) return { interval, lines: [] };

  const gen = contours().size([grid.w, grid.h]).thresholds(thresholds);
  const polys = gen(Array.from(values));
  const sx = 1 / grid.w;
  const sy = 1 / grid.h;
  const lines: ContourLine[] = [];
  for (const mp of polys) {
    let d = '';
    for (const polygon of mp.coordinates) {
      for (const ring of polygon) {
        if (ring.length < 6) continue;
        // skip segments that only trace the grid border
        d += ring
          .map(([x, y], i) => {
            const onEdge = x <= 0.5 || y <= 0.5 || x >= grid.w - 0.5 || y >= grid.h - 0.5;
            return `${i === 0 || onEdge ? 'M' : 'L'}${(x * sx).toFixed(4)} ${(y * sy).toFixed(4)}`;
          })
          .join('');
      }
    }
    if (d) lines.push({ level: mp.value, major: Math.round(mp.value / interval) % 5 === 0, d });
  }
  return { interval, lines };
}
