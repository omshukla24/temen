import type { LatLon } from './types';

export const EARTH_RADIUS_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point reached from `from` after `distance` metres on initial `bearingDeg` (0 = north). */
export function destination(from: LatLon, bearingDeg: number, distance: number): LatLon {
  const δ = distance / EARTH_RADIUS_M;
  const θ = rad(bearingDeg);
  const φ1 = rad(from.lat);
  const λ1 = rad(from.lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: deg(φ2), lon: ((deg(λ2) + 540) % 360) - 180 };
}

/** Rounds to a grid so nearby checks share a cache entry. */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** "12.944200, 80.229200" style, 6 dp = ~11 cm. */
export function formatLatLon(lat: number, lon: number, dp = 6): string {
  return `${lat.toFixed(dp)}, ${lon.toFixed(dp)}`;
}

/** 12.9442° N 80.2292° E */
export function formatHemisphere(lat: number, lon: number, dp = 6): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(dp)}° ${ns}  ${Math.abs(lon).toFixed(dp)}° ${ew}`;
}
