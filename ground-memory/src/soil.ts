import type { SourceRef } from './types';
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
}

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
  if (!ref) throw new Error('SoilGrids: no data here (water, rock or city core)');
  const clayPct = Math.max(top?.clay ?? 0, sub?.clay ?? 0);
  return { top, sub, texture: usdaTexture(ref), clayHeavy: clayPct >= SOIL_RULES.clayHeavy, clayPct };
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
