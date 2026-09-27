import { destination } from './geo';
import type { FetchJson, SourceRef } from './types';
import { get } from './util';

export const SOIL_SOURCE: SourceRef = {
  name: 'ISRIC SoilGrids v2.0',
  years: 'modelled 2020',
  resolution: '250 m',
  url: 'https://soilgrids.org',
  licence: 'CC BY 4.0',
};

export const SOIL_RULES = { clayHeavy: 40 } as const;

export function soilUrl(lat: number, lon: number): string {
  return (
    `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}` +
    '&property=clay&property=sand&property=silt&depth=0-5cm&depth=15-30cm&value=mean'
  );
}

export interface Texture {
  clay: number;
  sand: number;
  silt: number;
}

export interface SoilReading {
  top: Texture | null; // 0–5 cm
  sub: Texture | null; // 15–30 cm
  texture: string;
  clayHeavy: boolean;
  clayPct: number;
  /** Set when the point itself is masked and this is the nearest modelled soil. */
  nearby?: { distanceM: number; direction: string } | null;
}

/** SoilGrids models no soil under built-up ground, water or bare rock. */
export const SOIL_MASKED = 'SoilGrids: no data here (water, rock or city core)';

/**
 * Where to look when the point is masked, nearest first. Probed one at a time
 * and only until one answers, to stay inside ISRIC's fair use.
 */
export const SOIL_PROBES: readonly { bearing: number; m: number; direction: string }[] = [
  { bearing: 0, m: 1000, direction: 'N' },
  { bearing: 90, m: 1000, direction: 'E' },
  { bearing: 180, m: 1000, direction: 'S' },
  { bearing: 270, m: 1000, direction: 'W' },
  { bearing: 45, m: 2500, direction: 'NE' },
  { bearing: 135, m: 2500, direction: 'SE' },
  { bearing: 225, m: 2500, direction: 'SW' },
  { bearing: 315, m: 2500, direction: 'NW' },
];

const FACTOR: Record<string, number> = { clay: 10, sand: 10, silt: 10 }; // g/kg → %

/** properties.layers[{ name, unit_measure.d_factor, depths[{ label, values.mean }] }] */
export function parseSoil(json: unknown): SoilReading {
  const layers = get(json, 'properties', 'layers');
  if (!Array.isArray(layers)) throw new Error('SoilGrids: no layers');
  const read = (name: string, depth: string): number | null => {
    const layer = layers.find((l) => get(l, 'name') === name);
    if (!layer) return null;
    const dFactor = get(layer, 'unit_measure', 'd_factor');
    const factor = typeof dFactor === 'number' && dFactor > 0 ? dFactor : FACTOR[name];
    const depths = get(layer, 'depths');
    if (!Array.isArray(depths)) return null;
    const d = depths.find((x) => get(x, 'label') === depth);
    const v = get(d, 'values', 'mean');
    return typeof v === 'number' ? v / factor : null;
  };
  const texture = (depth: string): Texture | null => {
    const clay = read('clay', depth);
    const sand = read('sand', depth);
    const silt = read('silt', depth);
    if (clay === null || sand === null || silt === null) return null;
    return { clay, sand, silt };
  };
  const top = texture('0-5cm');
  const sub = texture('15-30cm');
  const ref = sub ?? top;
  if (!ref) throw new Error(SOIL_MASKED);
  const clayPct = Math.max(top?.clay ?? 0, sub?.clay ?? 0);
  return { top, sub, texture: usdaTexture(ref), clayHeavy: clayPct >= SOIL_RULES.clayHeavy, clayPct };
}

const masked = (e: unknown) => e instanceof Error && e.message === SOIL_MASKED;

/**
 * Soil at a point; if the point is masked (a city block, a lake), the nearest
 * modelled soil on SOIL_PROBES, marked `nearby`. Network errors are not
 * hidden: they reject so the stratum can say it could not be read.
 */
export async function soilNear(lat: number, lon: number, fetchJson: FetchJson, init?: { headers?: Record<string, string> }): Promise<SoilReading> {
  try {
    return parseSoil(await fetchJson(soilUrl(lat, lon), init));
  } catch (e) {
    if (!masked(e)) throw e;
  }
  for (const p of SOIL_PROBES) {
    const at = destination({ lat, lon }, p.bearing, p.m);
    try {
      const r = parseSoil(await fetchJson(soilUrl(at.lat, at.lon), init));
      return { ...r, nearby: { distanceM: p.m, direction: p.direction } };
    } catch (e) {
      if (!masked(e)) throw e;
    }
  }
  throw new Error(SOIL_MASKED);
}

/** USDA soil texture triangle (NRCS rules). Inputs in %, normalised to 100. */
export function usdaTexture(t: Texture): string {
  const sum = t.clay + t.sand + t.silt || 1;
  const clay = (t.clay / sum) * 100;
  const sand = (t.sand / sum) * 100;
  const silt = (t.silt / sum) * 100;
  if (silt + 1.5 * clay < 15) return 'Sand';
  if (silt + 2 * clay < 30) return 'Loamy sand';
  if ((clay >= 7 && clay < 20 && sand > 52) || (clay < 7 && silt < 50)) return 'Sandy loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && clay < 12)) return 'Silt loam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'Sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 35 && sand > 45) return 'Sandy clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  return 'Clay';
}
