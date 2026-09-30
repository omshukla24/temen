import { bearingDeg, compassPoint, destination, distanceM } from './geo';
import { decodeGeoTiff16, type Grid16 } from './tiff';
import type { FetchTile, SourceRef } from './types';
import { get } from './util';

export const SOIL_SOURCE: SourceRef = {
  name: 'ISRIC SoilGrids v2.0',
  years: 'modelled 2020',
  resolution: '250 m',
  url: 'https://soilgrids.org',
  licence: 'CC BY 4.0',
};

export const SOIL_RULES = { clayHeavy: 40 } as const;

/** REST point query (2–14 s an answer); checks read soilGridUrl grids, this records fixtures. */
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

/** How far a masked point looks for the nearest modelled soil. */
export const SOIL_SEARCH_M = 10_000;

// cells of ~250 m, SoilGrids' own resolution, with the pin on the centre cell
const GRID_CELLS = 2 * Math.round(SOIL_SEARCH_M / 250) + 1;

const EPSG_4326 = 'http://www.opengis.net/def/crs/EPSG/0/4326';

const GRID_LAYERS = [
  ['clay', '0-5cm'],
  ['sand', '0-5cm'],
  ['silt', '0-5cm'],
  ['clay', '15-30cm'],
  ['sand', '15-30cm'],
  ['silt', '15-30cm'],
] as const;

/**
 * One SoilGrids layer as a grid reaching SOIL_SEARCH_M each way from the
 * point (WCS GetCoverage, uncompressed int16 GeoTIFF). A grid answers in under
 * a second, where a REST point query takes 2–14 s.
 */
export function soilGridUrl(property: string, depth: string, lat: number, lon: number): string {
  const at = { lat, lon };
  const north = destination(at, 0, SOIL_SEARCH_M).lat;
  const south = destination(at, 180, SOIL_SEARCH_M).lat;
  const east = destination(at, 90, SOIL_SEARCH_M).lon;
  const west = destination(at, 270, SOIL_SEARCH_M).lon;
  return (
    `https://maps.isric.org/mapserv?map=/map/${property}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage` +
    `&COVERAGEID=${property}_${depth}_mean&FORMAT=image/tiff&GEOTIFF:COMPRESSION=None&GEOTIFF:TILING=false` +
    `&SUBSET=long(${west.toFixed(5)},${east.toFixed(5)})&SUBSET=lat(${south.toFixed(5)},${north.toFixed(5)})` +
    `&SUBSETTINGCRS=${EPSG_4326}&OUTPUTCRS=${EPSG_4326}&SCALESIZE=long(${GRID_CELLS}),lat(${GRID_CELLS})`
  );
}

const FACTOR: Record<string, number> = { clay: 10, sand: 10, silt: 10 }; // g/kg → %

function soilReading(top: Texture | null, sub: Texture | null): SoilReading {
  const ref = sub ?? top;
  if (!ref) throw new Error(SOIL_MASKED);
  const clayPct = Math.max(top?.clay ?? 0, sub?.clay ?? 0);
  return { top, sub, texture: usdaTexture(ref), clayHeavy: clayPct >= SOIL_RULES.clayHeavy, clayPct };
}

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
  return soilReading(texture('0-5cm'), texture('15-30cm'));
}

async function fetchGrid(fetchTile: FetchTile, url: string): Promise<Grid16> {
  const buf = await fetchTile(url);
  if (!buf) throw new Error('SoilGrids: no grid for this area');
  return decodeGeoTiff16(buf);
}

/** Texture of one grid cell, or null where the WCS wrote no soil (0 or below). */
function cellTexture(clay: Grid16, sand: Grid16, silt: Grid16, i: number): Texture | null {
  const c = clay.values[i];
  const s = sand.values[i];
  const t = silt.values[i];
  if (c < 0 || s < 0 || t < 0 || c + s + t === 0) return null;
  return { clay: c / FACTOR.clay, sand: s / FACTOR.sand, silt: t / FACTOR.silt };
}

interface SoilGrids {
  /** clay, sand, silt at 0–5 cm, then at 15–30 cm; all the same shape. */
  layers: Grid16[];
  cell(i: number): { top: Texture | null; sub: Texture | null };
}

async function loadGrids(lat: number, lon: number, fetchTile: FetchTile): Promise<SoilGrids> {
  const layers = await Promise.all(GRID_LAYERS.map(([property, depth]) => fetchGrid(fetchTile, soilGridUrl(property, depth, lat, lon))));
  const [clayTop, sandTop, siltTop, claySub, sandSub, siltSub] = layers;
  if (layers.some((g) => g.w !== clayTop.w || g.h !== clayTop.h)) throw new Error('SoilGrids: layer grids do not line up');
  return {
    layers,
    cell: (i) => ({ top: cellTexture(clayTop, sandTop, siltTop, i), sub: cellTexture(claySub, sandSub, siltSub, i) }),
  };
}

/**
 * Soil at a point, read from SoilGrids' WCS: one grid per layer reaching
 * SOIL_SEARCH_M each way, fetched together. The pin's own cell when it is
 * modelled; if it is masked (a city block, a lake), the nearest modelled cell,
 * marked `nearby`. Network errors are not hidden: they reject so the stratum
 * can say it could not be read.
 */
export async function soilNear(lat: number, lon: number, fetchTile: FetchTile): Promise<SoilReading> {
  const grids = await loadGrids(lat, lon, fetchTile);
  const { w, h, west, north, dLon, dLat } = grids.layers[0];
  const ownX = Math.floor((lon - west) / dLon);
  const ownY = Math.floor((north - lat) / dLat);
  if (ownX >= 0 && ownX < w && ownY >= 0 && ownY < h) {
    const own = grids.cell(ownY * w + ownX);
    if (own.top || own.sub) return soilReading(own.top, own.sub);
  }
  const pin = { lat, lon };
  let best: { d: number; at: { lat: number; lon: number }; top: Texture | null; sub: Texture | null } | null = null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { top, sub } = grids.cell(y * w + x);
      if (!top && !sub) continue;
      const at = { lat: north - (y + 0.5) * dLat, lon: west + (x + 0.5) * dLon };
      const d = distanceM(pin, at);
      if (d <= SOIL_SEARCH_M && (!best || d < best.d)) best = { d, at, top, sub };
    }
  }
  if (!best) throw new Error(SOIL_MASKED);
  const nearby = { distanceM: Math.round(best.d), direction: compassPoint(bearingDeg(pin, best.at)) };
  return { ...soilReading(best.top, best.sub), nearby };
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
