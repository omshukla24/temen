import { distanceM } from './geo';
import type { SourceRef } from './types';
import { get } from './util';

export const QUAKE_SOURCE: SourceRef = {
  name: 'USGS earthquake catalogue',
  years: '1900–today',
  resolution: 'M4.5+ within 300 km',
  url: 'https://earthquake.usgs.gov/fdsnws/event/1/',
  licence: 'US public domain',
};

export const QUAKE_RULES = { radiusKm: 300, minMag: 4.5, bigMag: 6 } as const;

const base = 'https://earthquake.usgs.gov/fdsnws/event/1';

function params(lat: number, lon: number) {
  return (
    `format=geojson&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&maxradiuskm=${QUAKE_RULES.radiusKm}&starttime=1900-01-01&minmagnitude=${QUAKE_RULES.minMag}`
  );
}

export const quakeCountUrl = (lat: number, lon: number) => `${base}/count?${params(lat, lon)}`;
export const quakeTopUrl = (lat: number, lon: number) => `${base}/query?${params(lat, lon)}&orderby=magnitude&limit=3`;

export interface Quake {
  mag: number;
  place: string;
  year: number;
  date: string;
  distanceKm: number;
  depthKm: number | null;
  url: string | null;
}

export interface QuakeReading {
  count: number;
  top: Quake[];
  strongest: Quake | null;
  bigQuake: boolean;
}

/** USGS count endpoint with format=geojson returns { count, maxAllowed }. */
export function parseQuakeCount(json: unknown): number {
  const c = get(json, 'count');
  if (typeof c !== 'number') throw new Error('USGS: no count');
  return c;
}

export function parseQuakeTop(json: unknown, lat: number, lon: number): Quake[] {
  const features = get(json, 'features');
  if (!Array.isArray(features)) throw new Error('USGS: no features');
  const out: Quake[] = [];
  for (const f of features) {
    const mag = get(f, 'properties', 'mag');
    const time = get(f, 'properties', 'time');
    const coords = get(f, 'geometry', 'coordinates');
    if (typeof mag !== 'number' || typeof time !== 'number' || !Array.isArray(coords)) continue;
    const [qlon, qlat, depth] = coords as number[];
    const d = new Date(time);
    out.push({
      mag,
      place: String(get(f, 'properties', 'place') ?? 'Unnamed'),
      year: d.getUTCFullYear(),
      date: d.toISOString().slice(0, 10),
      distanceKm: distanceM({ lat, lon }, { lat: qlat, lon: qlon }) / 1000,
      depthKm: typeof depth === 'number' ? depth : null,
      url: (get(f, 'properties', 'url') as string | undefined) ?? null,
    });
  }
  return out.sort((a, b) => b.mag - a.mag);
}

export function quakeReading(count: number, top: Quake[]): QuakeReading {
  const strongest = top[0] ?? null;
  return { count, top, strongest, bigQuake: !!strongest && strongest.mag >= QUAKE_RULES.bigMag };
}
