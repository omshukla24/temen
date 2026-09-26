import { distanceM } from './geo';
import type { SourceRef } from './types';
import { get, ymd } from './util';

export const RELIEF_SOURCE: SourceRef = {
  name: 'GDACS flood alerts',
  years: 'last 14 days',
  resolution: 'event point, 100 km radius',
  url: 'https://www.gdacs.org',
  licence: 'EC JRC / UN OCHA, free with attribution',
};

export const RELIEF_RADIUS_KM = 100;

export function reliefUrl(now: Date): string {
  const from = new Date(now.getTime() - 14 * 86400000);
  return (
    'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL' +
    `&fromdate=${ymd(from)}&todate=${ymd(now)}&alertlevel=Green;Orange;Red`
  );
}

export interface FloodEvent {
  id: string;
  name: string;
  country: string;
  alert: string;
  from: string | null;
  to: string | null;
  current: boolean;
  distanceKm: number;
  url: string | null;
}

export interface ReliefReading {
  inZone: boolean;
  event: FloodEvent | null;
  nearby: FloodEvent[];
}

/** GDACS event list is GeoJSON: features[].geometry Point [lon, lat], properties.{eventid, name, alertlevel, iscurrent…}. */
export function parseRelief(json: unknown, lat: number, lon: number, radiusKm = RELIEF_RADIUS_KM): ReliefReading {
  const features = get(json, 'features');
  if (!Array.isArray(features)) return { inZone: false, event: null, nearby: [] };
  const events: FloodEvent[] = [];
  for (const f of features) {
    if (get(f, 'geometry', 'type') !== 'Point') continue;
    const c = get(f, 'geometry', 'coordinates');
    if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
    const p = (k: string) => get(f, 'properties', k);
    const cur = p('iscurrent');
    const current = cur === true || cur === 'true' || cur === 'True';
    const report = get(f, 'properties', 'url', 'report');
    events.push({
      id: String(p('eventid') ?? ''),
      name: String(p('name') ?? p('eventname') ?? 'Flood'),
      country: String(p('country') ?? ''),
      alert: String(p('alertlevel') ?? ''),
      from: typeof p('fromdate') === 'string' ? (p('fromdate') as string) : null,
      to: typeof p('todate') === 'string' ? (p('todate') as string) : null,
      current,
      distanceKm: distanceM({ lat, lon }, { lat: c[1], lon: c[0] }) / 1000,
      url: typeof report === 'string' ? report : null,
    });
  }
  const nearby = events.filter((e) => e.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
  const active = nearby.find((e) => e.current) ?? null;
  return { inZone: !!active, event: active ?? nearby[0] ?? null, nearby };
}
