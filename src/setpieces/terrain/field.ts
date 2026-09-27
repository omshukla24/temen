import { contourPaths, type ContourLine, type ElevationGrid } from 'ground-memory';

// Deterministic pseudo-random (xorshift) so a screen's terrain never changes between renders.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Three octaves of value noise: broad hills, spurs, and small knolls. */
export function terrainHeights(seed: number, w: number, h: number): Float32Array {
  const r = rng(seed);
  const octaves = [
    { cell: 13, amp: 1 },
    { cell: 6.5, amp: 0.45 },
    { cell: 3.3, amp: 0.18 },
  ].map((o) => {
    const gw = Math.ceil(w / o.cell) + 2;
    const gh = Math.ceil(h / o.cell) + 2;
    return { ...o, gw, v: Float32Array.from({ length: gw * gh }, r) };
  });
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let z = 0;
      for (const o of octaves) {
        const fx = x / o.cell;
        const fy = y / o.cell;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = smoothstep(fx - ix);
        const ty = smoothstep(fy - iy);
        const a = o.v[iy * o.gw + ix];
        const b = o.v[iy * o.gw + ix + 1];
        const c = o.v[(iy + 1) * o.gw + ix];
        const d = o.v[(iy + 1) * o.gw + ix + 1];
        z += o.amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
      }
      out[y * w + x] = z * 60;
    }
  }
  return out;
}

const cache = new Map<string, ContourLine[]>();

/**
 * Contour lines of an imaginary piece of ground, as unit-square SVG paths —
 * the texture behind every screen. Each seed is its own terrain; the grid's
 * aspect follows the screen's so the lines are not stretched.
 */
export function terrainLines(seed: number, aspect = 2.2): ContourLine[] {
  // a coarse grid: the lines come out smooth and the paths stay small for Hermes and Skia
  const w = 36;
  const h = Math.max(18, Math.round(w * aspect));
  const key = `${seed}:${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const heights = terrainHeights(seed, w, h);
  let min = Infinity;
  let max = -Infinity;
  for (const v of heights) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const grid: ElevationGrid = { z: 0, x0: 0, y0: 0, w, h, heights, metersPerPixel: 1, min, max };
  const { lines } = contourPaths(grid, { maxLevels: 22, minInterval: 1 });
  cache.set(key, lines);
  return lines;
}
