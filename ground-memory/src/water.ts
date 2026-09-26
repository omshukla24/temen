import {
  JRC_MAX_ZOOM,
  JRC_TRANSITIONS_URL,
  TileCache,
  centredRegion,
  lonLatToGlobalPx,
  metersPerPixel,
  readRegion,
} from './tiles';
import type { FetchTile, SourceRef } from './types';

/**
 * JRC Global Surface Water transition classes, in the dataset's own order (1..10).
 * The 2024 tile palette is not published; it was inferred by cross-tabbing the
 * 2021 and 2024 tiles and is guarded by the golden-site tests.
 */
export const WATER_CLASSES = [
  'none',
  'permanent',
  'newPermanent',
  'lostPermanent',
  'seasonal',
  'newSeasonal',
  'lostSeasonal',
  'seasonalToPermanent',
  'permanentToSeasonal',
  'ephemeralPermanent',
  'ephemeralSeasonal',
] as const;

export type WaterClass = (typeof WATER_CLASSES)[number] | 'unknown';

export const UNKNOWN_CLASS = 255;

const PALETTE: [number, number, number, number][] = [
  // r, g, b, class index
  [0, 0, 221, 1],
  [34, 177, 76, 2],
  [147, 7, 62, 3],
  [153, 217, 234, 4],
  [181, 230, 29, 5],
  [235, 180, 187, 6],
  [255, 139, 55, 7],
  [255, 221, 102, 8],
  [127, 127, 127, 9],
  [172, 172, 172, 10],
];

const exact = new Map<number, number>(PALETTE.map(([r, g, b, c]) => [(r << 16) | (g << 8) | b, c]));

/** Class index (0 = never water, 1..10 JRC classes, 255 = unrecognised colour). */
export function classifyPixel(r: number, g: number, b: number, a: number): number {
  if (a === 0) return 0;
  const hit = exact.get((r << 16) | (g << 8) | b);
  if (hit !== undefined) return hit;
  // Tolerate slight resampling drift, never guess across hues.
  let best = UNKNOWN_CLASS;
  let bestD = 24 * 24 * 3;
  for (const [pr, pg, pb, c] of PALETTE) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function className(index: number): WaterClass {
  return index === UNKNOWN_CLASS ? 'unknown' : (WATER_CLASSES[index] ?? 'unknown');
}

// Groups the app reasons with.
const NOW = new Set([1, 2, 7]); // permanent water at the end of the record
const SEASONAL = new Set([4, 5, 8]); // water for part of the year at the end of the record
const LOST = new Set([3, 6]); // water early in the record, land now
const EPHEMERAL = new Set([9, 10]); // water in only a few years

export type WaterKind = 'onWater' | 'lost' | 'seasonal' | 'ephemeral' | 'near' | 'none';

export interface WaterShares {
  now: number;
  seasonal: number;
  lost: number;
  lostPermanent: number;
  lostSeasonal: number;
  ephemeral: number;
  any: number;
}

export interface WaterSample {
  /** Pixels in the window. */
  total: number;
  counts: Record<WaterClass, number>;
  share: WaterShares;
  centre: WaterClass;
  kind: WaterKind;
  /** Side of the sampled square in metres. */
  windowM: number;
  missingTiles: number;
  unknown: number;
}

export const WATER_SOURCE: SourceRef = {
  name: 'JRC Global Surface Water',
  years: '1984–2024',
  resolution: '30 m',
  url: 'https://global-surface-water.appspot.com',
  licence: 'Copernicus / EC JRC, free use with attribution',
};

export const RULES = {
  onWater: 0.5,
  lost: 0.2,
  seasonal: 0.2,
  ephemeral: 0.2,
  bufferM: 30,
} as const;

function emptyCounts(): Record<WaterClass, number> {
  const c = {} as Record<WaterClass, number>;
  for (const k of WATER_CLASSES) c[k] = 0;
  c.unknown = 0;
  return c;
}

export function sharesFromCounts(counts: Record<WaterClass, number>, total: number): WaterShares {
  const sum = (set: Set<number>) =>
    [...set].reduce((a, i) => a + counts[WATER_CLASSES[i]], 0) / Math.max(1, total);
  const lostPermanent = counts.lostPermanent / Math.max(1, total);
  const lostSeasonal = counts.lostSeasonal / Math.max(1, total);
  const share = {
    now: sum(NOW),
    seasonal: sum(SEASONAL),
    lost: sum(LOST),
    lostPermanent,
    lostSeasonal,
    ephemeral: sum(EPHEMERAL),
    any: 0,
  };
  share.any = share.now + share.seasonal + share.lost + share.ephemeral;
  return share;
}

/** Verdict order matters: standing on water outranks a history of water. */
export function waterKind(share: WaterShares): WaterKind {
  if (share.now >= RULES.onWater) return 'onWater';
  if (share.lost >= RULES.lost) return 'lost';
  if (share.seasonal >= RULES.seasonal) return 'seasonal';
  if (share.ephemeral >= RULES.ephemeral) return 'ephemeral';
  if (share.any > 0) return 'near';
  return 'none';
}

/** Samples the (2r+1)² JRC pixels at z13 around the point (r=4 ≈ 170 m square). */
export async function sampleWindow(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  r = 4,
  cache?: TileCache,
): Promise<WaterSample> {
  const region = await readRegion(centredRegion(JRC_TRANSITIONS_URL, lat, lon, JRC_MAX_ZOOM, r), fetchTile, cache);
  const counts = emptyCounts();
  const total = region.w * region.h;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const c = classifyPixel(region.rgba[o], region.rgba[o + 1], region.rgba[o + 2], region.rgba[o + 3]);
    counts[className(c)]++;
  }
  const centreIdx = (r * region.w + r) * 4;
  const centre = className(
    classifyPixel(region.rgba[centreIdx], region.rgba[centreIdx + 1], region.rgba[centreIdx + 2], region.rgba[centreIdx + 3]),
  );
  const share = sharesFromCounts(counts, total);
  return {
    total,
    counts,
    share,
    centre,
    kind: waterKind(share),
    windowM: region.w * metersPerPixel(lat, JRC_MAX_ZOOM),
    missingTiles: region.missingTiles,
    unknown: counts.unknown,
  };
}

export interface WaterEdge {
  /** Metres to the nearest pixel of any water class; 0 when on one; null when none within maxM. */
  distanceM: number | null;
  nearest: WaterClass | null;
  /** Bearing from the point to that pixel, degrees from north. */
  bearingDeg: number | null;
  buffer: boolean;
}

/** Nearest pixel of any water class (past or present) within maxM. */
export async function waterEdgeDistance(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  maxM = 600,
  cache?: TileCache,
): Promise<WaterEdge> {
  const z = JRC_MAX_ZOOM;
  const mpp = metersPerPixel(lat, z);
  const r = Math.ceil(maxM / mpp) + 1;
  const { gx, gy } = lonLatToGlobalPx(lat, lon, z);
  const region = await readRegion(centredRegion(JRC_TRANSITIONS_URL, lat, lon, z, r), fetchTile, cache);
  let best = Infinity;
  let bestClass: WaterClass | null = null;
  let bestDx = 0;
  let bestDy = 0;
  for (let y = 0; y < region.h; y++) {
    for (let x = 0; x < region.w; x++) {
      const o = (y * region.w + x) * 4;
      const c = classifyPixel(region.rgba[o], region.rgba[o + 1], region.rgba[o + 2], region.rgba[o + 3]);
      if (c === 0 || c === UNKNOWN_CLASS) continue;
      // distance from the point to the pixel's square, in pixels
      const left = region.x0 + x;
      const top = region.y0 + y;
      const dx = gx < left ? left - gx : gx > left + 1 ? gx - (left + 1) : 0;
      const dy = gy < top ? top - gy : gy > top + 1 ? gy - (top + 1) : 0;
      const d = Math.hypot(dx, dy);
      if (d < best) {
        best = d;
        bestClass = className(c);
        bestDx = left + 0.5 - gx;
        bestDy = top + 0.5 - gy;
      }
    }
  }
  const distanceM = Number.isFinite(best) && best * mpp <= maxM ? best * mpp : null;
  const bearingDeg =
    distanceM === null ? null : ((Math.atan2(bestDx, -bestDy) * 180) / Math.PI + 360) % 360;
  return {
    distanceM,
    nearest: distanceM === null ? null : bestClass,
    bearingDeg,
    buffer: distanceM !== null && distanceM <= RULES.bufferM,
  };
}

export interface WaterMask {
  z: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** Class index per pixel (see WATER_CLASSES). */
  classes: Uint8Array;
}

/** Class grid around the point, for drawing the Rising over a map. */
export async function waterMask(
  lat: number,
  lon: number,
  fetchTile: FetchTile,
  r = 48,
  cache?: TileCache,
): Promise<WaterMask> {
  const region = await readRegion(centredRegion(JRC_TRANSITIONS_URL, lat, lon, JRC_MAX_ZOOM, r), fetchTile, cache);
  const classes = new Uint8Array(region.w * region.h);
  for (let i = 0; i < classes.length; i++) {
    const o = i * 4;
    classes[i] = classifyPixel(region.rgba[o], region.rgba[o + 1], region.rgba[o + 2], region.rgba[o + 3]);
  }
  return { z: region.z, x0: region.x0, y0: region.y0, w: region.w, h: region.h, classes };
}

export function isWaterIndex(c: number): boolean {
  return c > 0 && c !== UNKNOWN_CLASS;
}
export function isLostIndex(c: number): boolean {
  return LOST.has(c);
}
export function isNowIndex(c: number): boolean {
  return NOW.has(c) || SEASONAL.has(c);
}

export function pct(share: number): number {
  return Math.round(share * 100);
}

export function waterHeadline(s: WaterSample): { headline: string; detail: string; value: number; label: string } {
  const side = Math.round(s.windowM / 10) * 10;
  switch (s.kind) {
    case 'onWater':
      return {
        headline: "You're on water",
        detail: `Satellites saw open water here at the end of the record: ${pct(s.share.now)}% of the ${side} m square around this point.`,
        value: pct(s.share.now),
        label: 'water now',
      };
    case 'lost': {
      const perm = pct(s.share.lostPermanent);
      const seas = pct(s.share.lostSeasonal);
      const split =
        perm && seas
          ? ` ${perm}% was a permanent lake or sea, ${seas}% held water for part of each year.`
          : perm
            ? ' It was permanent water — a lake, tank or sea — that is now land.'
            : ' It held water for part of each year and is now land.';
      return {
        headline: 'Water was here and is gone',
        detail: `${pct(s.share.lost)}% of the ${side} m square around this point was water after 1984 and is not now.${split}`,
        value: pct(s.share.lost),
        label: 'lost water',
      };
    }
    case 'seasonal':
      return {
        headline: 'This ground floods seasonally',
        detail: `${pct(s.share.seasonal)}% of the ${side} m square around this point holds water for part of the year.`,
        value: pct(s.share.seasonal),
        label: 'seasonal water',
      };
    case 'ephemeral':
      return {
        headline: 'Water came and went',
        detail: `${pct(s.share.ephemeral)}% of the ${side} m square held water in only a few years since 1984 — often a flood, a construction pit or a filled plot.`,
        value: pct(s.share.ephemeral),
        label: 'brief water',
      };
    case 'near':
      return {
        headline: 'Water nearby',
        detail: `${pct(s.share.any)}% of the ${side} m square around this point held water at some point since 1984.`,
        value: pct(s.share.any),
        label: 'water seen',
      };
    default:
      return {
        headline: 'No water seen here 1984–2024',
        detail: `Not one of the ${s.total} satellite pixels around this point was water in 40 years. That record starts in 1984 and sees 30 m, not plots.`,
        value: 0,
        label: 'water seen',
      };
  }
}

export function bufferText(edge: WaterEdge): string | null {
  if (!edge.buffer || edge.distanceM === null) return null;
  const d = Math.round(edge.distanceM);
  const where = d === 0 ? 'This point sits on water seen since 1984' : `Within ${d} m of water seen since 1984`;
  return `${where}. Rules like Hyderabad's keep 30 m clear of the full-tank line for lakes of 10 ha or more — ask the authority for the official FTL map.`;
}
