import type { Phase } from './palettes';

// Sunrise and sunset from the standard sunrise equation (the same maths as
// NOAA's calculator and the suncalc library): accurate to a minute or two,
// which is plenty for tinting paper.

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const OBLIQUITY = RAD * 23.4397;
const SUN_ALTITUDE = -0.833 * RAD; // centre of the sun, with refraction and its radius

const toJulian = (ms: number) => ms / DAY_MS - 0.5 + J1970;
const fromJulian = (j: number) => (j + 0.5 - J1970) * DAY_MS;

export type SunTimes =
  | { kind: 'normal'; sunrise: number; sunset: number }
  | { kind: 'polarDay' }
  | { kind: 'polarNight' };

/** Sunrise and sunset (epoch ms) for the solar day around `ms` at a point. */
export function sunTimes(ms: number, lat: number, lon: number): SunTimes {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toJulian(ms) - J2000;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const transit = (x: number) => J2000 + x + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const noon = transit(ds);
  const cosW = (Math.sin(SUN_ALTITUDE) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosW > 1) return { kind: 'polarNight' };
  if (cosW < -1) return { kind: 'polarDay' };
  const w = Math.acos(cosW);
  const set = transit(J0 + (w + lw) / (2 * Math.PI) + n);
  const rise = noon - (set - noon);
  return { kind: 'normal', sunrise: fromJulian(rise), sunset: fromJulian(set) };
}

const MIN = 60_000;
// How long each soft phase lasts around the sun's edges.
const DAWN_BEFORE = 40 * MIN;
const DAWN_AFTER = 50 * MIN;
const DUSK_BEFORE = 60 * MIN;
const DUSK_AFTER = 40 * MIN;

/**
 * Which light the paper should take at `ms`. With a place, the sun decides;
 * without one, the phone's local clock stands in (05:30 dawn, 07:30 day,
 * 17:30 dusk, 19:30 night).
 */
export function phaseAt(ms: number, at?: { lat: number; lon: number } | null): Phase {
  if (at && Number.isFinite(at.lat) && Number.isFinite(at.lon)) {
    const s = sunTimes(ms, at.lat, at.lon);
    if (s.kind === 'polarDay') return 'day';
    if (s.kind === 'polarNight') return 'night';
    if (ms >= s.sunrise - DAWN_BEFORE && ms < s.sunrise + DAWN_AFTER) return 'dawn';
    if (ms >= s.sunrise + DAWN_AFTER && ms < s.sunset - DUSK_BEFORE) return 'day';
    if (ms >= s.sunset - DUSK_BEFORE && ms < s.sunset + DUSK_AFTER) return 'dusk';
    // The solar day computed around `ms` can be the neighbouring one near midnight; the
    // windows above never touch midnight except at the poles, so anything else is night.
    return 'night';
  }
  const d = new Date(ms);
  const m = d.getHours() * 60 + d.getMinutes();
  if (m >= 330 && m < 450) return 'dawn';
  if (m >= 450 && m < 1050) return 'day';
  if (m >= 1050 && m < 1170) return 'dusk';
  return 'night';
}
