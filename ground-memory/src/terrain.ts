import { destination } from './geo';
import {
  TERRARIUM_URL,
  TERRARIUM_ZOOM,
  TileCache,
  lonLatToGlobalPx,
  lonLatToGlobalPxNear,
  metersPerPixel,
  readRegion,
  type Region,
} from './tiles';
import type { FetchTile, SourceRef } from './types';

export const TERRAIN_SOURCE: SourceRef = {
  name: 'AWS Terrain Tiles (terrarium)',
  years: 'SRTM 2000 + others',
  resolution: '~10–30 m',
  url: 'https://registry.opendata.aws/terrain-tiles/',
  licence: 'Mapzen terrain, open data with attribution',
};

/** Terrarium: height = R·256 + G + B/256 − 32768 (metres). */
export function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

function heightAt(region: Region, x: number, y: number): number {
  const cx = Math.max(0, Math.min(region.w - 1, x));
  const cy = Math.max(0, Math.min(region.h - 1, y));
  const o = (cy * region.w + cx) * 4;
  return decodeTerrarium(region.rgba[o], region.rgba[o + 1], region.rgba[o + 2]);
}

/** Bilinear height at a fractional global pixel inside the region. */
function sample(region: Region, gx: number, gy: number): number {
  // pixel centres sit at +0.5
  const fx = gx - region.x0 - 0.5;
  const fy = gy - region.y0 - 0.5;
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  const tx = fx - x;
  const ty = fy - y;
  const h00 = heightAt(region, x, y);
  const h10 = heightAt(region, x + 1, y);
  const h01 = heightAt(region, x, y + 1);
  const h11 = heightAt(region, x + 1, y + 1);
  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty;
}

/** Pixel rectangle around the points, kept continuous across ±180° next to the first one. */
function boundsRegion(points: { lat: number; lon: number }[], z: number) {
  const anchor = lonLatToGlobalPx(points[0].lat, points[0].lon, z).gx;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const { gx, gy } = lonLatToGlobalPxNear(p.lat, p.lon, z, anchor);
    minX = Math.min(minX, gx);
    minY = Math.min(minY, gy);
    maxX = Math.max(maxX, gx);
    maxY = Math.max(maxY, gy);
  }
  const x0 = Math.floor(minX) - 2;
  const y0 = Math.floor(minY) - 2;
  return { x0, y0, w: Math.ceil(maxX) - x0 + 3, h: Math.ceil(maxY) - y0 + 3 };
}

export async function elevationAt(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  cache?: TileCache,
): Promise<number> {
  const z = TERRARIUM_ZOOM;
  const b = boundsRegion([{ lat, lon }], z);
  const region = await readRegion({ template: TERRARIUM_URL, z, ...b }, fetchTile, cache);
  const { gx, gy } = lonLatToGlobalPx(lat, lon, z);
  return sample(region, gx, gy);
}

export interface BowlReading {
  elevationM: number;
  ringMedianM: number;
  /** ring median − point: positive means the point sits lower than its surroundings. */
  depthM: number;
  /** How many of the ring points are higher than the point. */
  lowerThan: number;
  ringCount: number;
  ringM: number;
  ring: number[];
  isBowl: boolean;
  /** Highest minus lowest ring point, for the "flat ground" note. */
  reliefM: number;
  /** Every sample read exactly 0 m: the model has no heights here (sea, new land). */
  noData: boolean;
}

/** A bowl: ≥ 1.5 m below the ring median and lower than ¾ of the ring (12 of 16). */
export const BOWL_RULES = { depthM: 1.5, lowerShare: 0.75, minRingShare: 0.75 } as const;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Point vs n ring points at ringM metres: does rain run towards this spot? */
export async function bowlCheck(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  ringM = 400,
  n = 16,
  cache?: TileCache,
): Promise<BowlReading> {
  const z = TERRARIUM_ZOOM;
  const ringPts = Array.from({ length: n }, (_, i) => destination({ lat, lon }, (360 / n) * i, ringM));
  const b = boundsRegion([{ lat, lon }, ...ringPts], z);
  const region = await readRegion({ template: TERRARIUM_URL, z, ...b }, fetchTile, cache);
  const pinGx = lonLatToGlobalPx(lat, lon, z).gx;
  const at = (p: { lat: number; lon: number }) => {
    const { gx, gy } = lonLatToGlobalPxNear(p.lat, p.lon, z, pinGx);
    return sample(region, gx, gy);
  };
  const elevationM = at({ lat, lon });
  // Terrarium flattens the sea (and water it filled) to exactly 0 m; that is a
  // missing height, not sea level, so leave those samples out of the comparison.
  const ring = ringPts.map(at).filter((h) => h !== 0);
  const ringMedianM = ring.length ? median(ring) : 0;
  const depthM = ringMedianM - elevationM;
  const lowerThan = ring.filter((h) => h > elevationM).length;
  const noData = elevationM === 0 || ring.length < n * BOWL_RULES.minRingShare;
  const share = ring.length ? lowerThan / ring.length : 0;
  return {
    elevationM,
    ringMedianM,
    depthM,
    lowerThan,
    ringCount: ring.length,
    ringM,
    ring,
    isBowl: !noData && depthM >= BOWL_RULES.depthM && share >= BOWL_RULES.lowerShare,
    reliefM: ring.length ? Math.max(...ring) - Math.min(...ring) : 0,
    noData,
  };
}

export interface ElevationGrid {
  z: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Metres, row-major. */
  heights: Float32Array;
  metersPerPixel: number;
  min: number;
  max: number;
}

/** size×size heights centred on the point (z14 ≈ 9 m/px at the equator), for Live Contours. */
export async function elevationGrid(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  size = 128,
  cache?: TileCache,
): Promise<ElevationGrid> {
  const z = TERRARIUM_ZOOM;
  const { gx, gy } = lonLatToGlobalPx(lat, lon, z);
  const x0 = Math.floor(gx) - (size >> 1);
  const y0 = Math.floor(gy) - (size >> 1);
  const region = await readRegion({ template: TERRARIUM_URL, z, x0, y0, w: size, h: size }, fetchTile, cache);
  const heights = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < heights.length; i++) {
    const o = i * 4;
    const h = decodeTerrarium(region.rgba[o], region.rgba[o + 1], region.rgba[o + 2]);
    heights[i] = h;
    if (h < min) min = h;
    if (h > max) max = h;
  }
  return { z, x0, y0, w: size, h: size, heights, metersPerPixel: metersPerPixel(lat, z), min, max };
}

export function formatMetres(m: number, signed = false): string {
  const v = Math.round(m * 10) / 10;
  const s = Math.abs(v).toFixed(1);
  if (!signed) return `${v < 0 ? '−' : ''}${s} m`;
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${s} m`;
}

export function bowlHeadline(b: BowlReading): { headline: string; detail: string } {
  if (b.noData) {
    return {
      headline: 'No height data here',
      detail:
        'The terrain model has no height here: it reads exactly 0 m, the value it gives the sea and water it flattened. That happens at sea, on filled wetland and on land made after the survey, so the shape of this ground is unknown.',
    };
  }
  const lower = `${b.lowerThan} of ${b.ringCount}`;
  if (b.isBowl) {
    return {
      headline: 'Sits in a bowl',
      detail: `This point is ${formatMetres(b.depthM)} below the ground ${b.ringM} m around it and lower than ${lower} points on that ring. Rain runs towards it.`,
    };
  }
  const share = b.ringCount ? b.lowerThan / b.ringCount : 0;
  if (b.depthM >= 0.5 && share >= 10 / 16) {
    return {
      headline: 'Slightly low ground',
      detail: `This point is ${formatMetres(b.depthM)} below the ground ${b.ringM} m around it, lower than ${lower} points on that ring.`,
    };
  }
  if (b.depthM <= -1.5 && share <= 4 / 16) {
    return {
      headline: 'Sits on a rise',
      detail: `This point is ${formatMetres(-b.depthM)} above the ground ${b.ringM} m around it. Water tends to run away from it.`,
    };
  }
  if (b.reliefM < 3) {
    return {
      headline: 'Flat ground',
      detail: `Within ${b.ringM} m the ground varies by only ${formatMetres(b.reliefM)}. On flat ground water drains slowly — drains matter more than slope.`,
    };
  }
  return {
    headline: 'No bowl here',
    detail: `The ground ${b.ringM} m around is ${b.depthM >= 0 ? formatMetres(b.depthM) + ' higher' : formatMetres(-b.depthM) + ' lower'} on the median, and ${lower} ring points are higher than this one.`,
  };
}
