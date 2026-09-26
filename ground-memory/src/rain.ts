import type { SourceRef } from './types';
import { get, isObject } from './util';

export const RAIN_SOURCE: SourceRef = {
  name: 'NASA POWER (MERRA-2 corrected rain)',
  years: '1981–2025',
  resolution: '0.5° × 0.625° (~55 km)',
  url: 'https://power.larc.nasa.gov',
  licence: 'NASA open data',
};

/** IMD categories for a day's rain. */
export const RAIN_RULES = { heavyMm: 64.5, veryHeavyMm: 115.6, extremeMm: 204.5 } as const;

export function rainUrl(lat: number, lon: number, endYear = 2025): string {
  return (
    'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE' +
    `&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=19810101&end=${endYear}1231&format=JSON`
  );
}

export interface RainDay {
  date: string; // YYYY-MM-DD
  mm: number;
}

export interface RainReading {
  wettest: RainDay;
  top: RainDay[];
  heavyDays: number;
  heavyDaysPerYear: number;
  veryHeavyDays: number;
  extremeDays: number;
  annualMeanMm: number;
  firstYear: number;
  lastYear: number;
  years: number;
  /** Heavy-rain days per calendar year, oldest first, for sparklines. */
  heavyByYear: { year: number; days: number }[];
}

/** Parses NASA POWER daily point JSON: properties.parameter.PRECTOTCORR = { YYYYMMDD: mm }. */
export function parseRain(json: unknown): RainReading {
  const series = get(json, 'properties', 'parameter', 'PRECTOTCORR');
  if (!isObject(series)) throw new Error('NASA POWER: no PRECTOTCORR series');
  const fillRaw = get(json, 'header', 'fill_value');
  const fill = typeof fillRaw === 'number' ? fillRaw : -999;

  const days: RainDay[] = [];
  for (const [k, v] of Object.entries(series)) {
    if (typeof v !== 'number' || v === fill || v < 0 || !/^\d{8}$/.test(k)) continue;
    days.push({ date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`, mm: v });
  }
  if (!days.length) throw new Error('NASA POWER: empty series');

  const byYear = new Map<number, { total: number; heavy: number; n: number }>();
  let heavy = 0;
  let veryHeavy = 0;
  let extreme = 0;
  for (const d of days) {
    const y = Number(d.date.slice(0, 4));
    const e = byYear.get(y) ?? { total: 0, heavy: 0, n: 0 };
    e.total += d.mm;
    e.n += 1;
    if (d.mm >= RAIN_RULES.heavyMm) {
      e.heavy += 1;
      heavy += 1;
    }
    if (d.mm >= RAIN_RULES.veryHeavyMm) veryHeavy += 1;
    if (d.mm >= RAIN_RULES.extremeMm) extreme += 1;
    byYear.set(y, e);
  }
  // Only whole years count towards averages.
  const full = [...byYear.entries()].filter(([, e]) => e.n >= 360).sort((a, b) => a[0] - b[0]);
  const years = full.length || byYear.size;
  const top = [...days].sort((a, b) => b.mm - a.mm).slice(0, 3);
  const yearsSorted = [...byYear.keys()].sort((a, b) => a - b);
  return {
    wettest: top[0],
    top,
    heavyDays: heavy,
    heavyDaysPerYear: heavy / Math.max(1, years),
    veryHeavyDays: veryHeavy,
    extremeDays: extreme,
    annualMeanMm: full.length ? full.reduce((a, [, e]) => a + e.total, 0) / full.length : 0,
    firstYear: yearsSorted[0],
    lastYear: yearsSorted[yearsSorted.length - 1],
    years,
    heavyByYear: yearsSorted.map((year) => ({ year, days: byYear.get(year)!.heavy })),
  };
}
