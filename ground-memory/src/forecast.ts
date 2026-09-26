import { RAIN_RULES } from './rain';
import type { SourceRef } from './types';
import { get } from './util';

export const FORECAST_SOURCE: SourceRef = {
  name: 'MET Norway Locationforecast 2.0',
  years: 'next 24 h',
  resolution: '~1–9 km model grid',
  url: 'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
  licence: 'CC BY 4.0',
};

/** MET Norway wants at most 4 decimals, and a User-Agent that identifies the app. */
export function forecastUrl(lat: number, lon: number): string {
  return `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
}

export interface ForecastReading {
  next24hMm: number;
  peakHourMm: number;
  heavy: boolean;
  hourly: { time: string; mm: number }[];
  updatedAt: string | null;
}

/**
 * Sums precipitation over the next 24 h. The compact timeseries has next_1_hours
 * for the near term and next_6_hours further out; each block is counted once.
 */
export function parseForecast(json: unknown, now: Date): ForecastReading {
  const ts = get(json, 'properties', 'timeseries');
  if (!Array.isArray(ts)) throw new Error('MET Norway: no timeseries');
  const start = now.getTime();
  const end = start + 24 * 3600 * 1000;
  let covered = start - 3600 * 1000; // allow the step that is already running
  let total = 0;
  let peak = 0;
  const hourly: { time: string; mm: number }[] = [];
  for (const step of ts) {
    const time = get(step, 'time');
    if (typeof time !== 'string') continue;
    const t = Date.parse(time);
    if (!Number.isFinite(t) || t < covered || t >= end) continue;
    const one = get(step, 'data', 'next_1_hours', 'details', 'precipitation_amount');
    const six = get(step, 'data', 'next_6_hours', 'details', 'precipitation_amount');
    if (typeof one === 'number') {
      total += one;
      peak = Math.max(peak, one);
      hourly.push({ time, mm: one });
      covered = t + 3600 * 1000;
    } else if (typeof six === 'number') {
      // clip the last block to the 24 h window
      const hours = Math.min(6, (end - t) / 3600000);
      total += six * (hours / 6);
      peak = Math.max(peak, six / 6);
      hourly.push({ time, mm: six });
      covered = t + 6 * 3600 * 1000;
    }
  }
  const updated = get(json, 'properties', 'meta', 'updated_at');
  return {
    next24hMm: Math.round(total * 10) / 10,
    peakHourMm: Math.round(peak * 10) / 10,
    heavy: total >= RAIN_RULES.heavyMm,
    hourly,
    updatedAt: typeof updated === 'string' ? updated : null,
  };
}
