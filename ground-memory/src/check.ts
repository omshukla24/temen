import { roundTo } from './geo';
import { forecastUrl, parseForecast, type ForecastReading } from './forecast';
import { parseQuakeCount, parseQuakeTop, quakeCountUrl, quakeReading, quakeTopUrl } from './quakes';
import { parseRain, rainUrl } from './rain';
import { parseRelief, reliefUrl, type ReliefReading } from './relief';
import { parseSoil, soilUrl } from './soil';
import { bowlCheck } from './terrain';
import { TileCache } from './tiles';
import type { Deps, GroundReport, LatLon } from './types';
import { settle, type Settled } from './util';
import { buildReport, type Readings } from './verdict';
import { sampleWindow, waterEdgeDistance } from './water';

export type Stage = 'sounding' | 'coring' | 'reading' | 'sealed';

export interface Progress {
  done: number;
  total: number;
  /** 0..1 */
  fraction: number;
  stage: Stage;
  /** The source that just finished. */
  last: keyof Readings | null;
}

/** Persistent cache for parsed readings; the app backs it with its kv store. */
export interface ReadingCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

export interface CheckOptions {
  placeName?: string | null;
  tileCache?: TileCache;
  readingCache?: ReadingCache;
  onProgress?: (p: Progress) => void;
  /** Also look for an active flood nearby (Relief mode). Default true. */
  relief?: boolean;
}

const DAY = 86400000;

export function stageFor(fraction: number): Stage {
  if (fraction >= 1) return 'sealed';
  if (fraction >= 0.6) return 'reading';
  if (fraction >= 0.25) return 'coring';
  return 'sounding';
}

async function cached<T>(cache: ReadingCache | undefined, key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  if (cache) {
    try {
      const hit = await cache.get(key);
      if (hit !== null && hit !== undefined) return hit as T;
    } catch {
      // a broken cache must never stop a check
    }
  }
  const value = await fn();
  if (cache) cache.set(key, value, ttl).catch(() => {});
  return value;
}

/**
 * Drills one core: every source in parallel, each with its own timeout, so one
 * slow API never blocks the rest. A failed source becomes an error stratum.
 */
export async function checkGround(at: LatLon, deps: Deps, opts: CheckOptions = {}): Promise<GroundReport> {
  const { lat, lon } = at;
  const t = deps.timeoutMs ?? 8000;
  const tiles = opts.tileCache ?? new TileCache();
  const rc = opts.readingCache;
  const now = deps.now();
  const headers = deps.userAgent ? { 'User-Agent': deps.userAgent } : undefined;

  const jobs = {
    water: () => settle(() => sampleWindow(lat, lon, deps.fetchTile, 4, tiles), t, 'Water'),
    edge: () => settle(() => waterEdgeDistance(lat, lon, deps.fetchTile, 600, tiles), t, 'Water edge'),
    bowl: () => settle(() => bowlCheck(lat, lon, deps.fetchTile, 400, 16, tiles), t, 'Ground'),
    // 45 years of daily rain is a big response; give it more room.
    rain: () =>
      settle(
        () =>
          cached(rc, `rain:${roundTo(lat, 0.5)},${roundTo(lon, 0.625)}`, 30 * DAY, async () =>
            parseRain(await deps.fetchJson(rainUrl(lat, lon, now.getUTCFullYear() - 1), { headers })),
          ),
        Math.max(t, 20000),
        'Rain',
      ),
    quakes: () =>
      settle(
        () =>
          cached(rc, `quakes:${lat.toFixed(1)},${lon.toFixed(1)}`, 7 * DAY, async () => {
            const [count, top] = await Promise.all([
              deps.fetchJson(quakeCountUrl(lat, lon), { headers }).then(parseQuakeCount),
              deps.fetchJson(quakeTopUrl(lat, lon), { headers }).then((j) => parseQuakeTop(j, lat, lon)),
            ]);
            return quakeReading(count, top);
          }),
        t,
        'Quakes',
      ),
    soil: () =>
      settle(
        () =>
          cached(rc, `soil:${lat.toFixed(3)},${lon.toFixed(3)}`, 180 * DAY, async () =>
            parseSoil(await deps.fetchJson(soilUrl(lat, lon), { headers })),
          ),
        t,
        'Soil',
      ),
    relief: () =>
      settle(
        () =>
          cached(rc, `relief:${lat.toFixed(0)},${lon.toFixed(0)}:${now.toISOString().slice(0, 13)}`, 3600000, async () =>
            parseRelief(await deps.fetchJson(reliefUrl(now), { headers }), lat, lon),
          ),
        t,
        'Relief',
      ),
  };

  const keys = (Object.keys(jobs) as (keyof typeof jobs)[]).filter((k) => k !== 'relief' || opts.relief !== false);
  let done = 0;
  opts.onProgress?.({ done, total: keys.length, fraction: 0, stage: 'sounding', last: null });
  const results = await Promise.all(
    keys.map(async (k) => {
      const r = await jobs[k]();
      done += 1;
      const fraction = done / keys.length;
      opts.onProgress?.({ done, total: keys.length, fraction, stage: stageFor(fraction), last: k });
      return [k, r] as const;
    }),
  );
  const readings = Object.fromEntries(results) as unknown as Readings;
  return buildReport({ lat, lon, placeName: opts.placeName ?? null, now, readings });
}

/** Next-24 h rain for Monsoon Watch. */
export async function checkForecast(at: LatLon, deps: Deps): Promise<Settled<ForecastReading>> {
  const headers = deps.userAgent ? { 'User-Agent': deps.userAgent } : undefined;
  return settle(
    async () => parseForecast(await deps.fetchJson(forecastUrl(at.lat, at.lon), { headers }), deps.now()),
    deps.timeoutMs ?? 8000,
    'Forecast',
  );
}

/** Active flood check alone (Relief mode banner on Home). */
export async function checkRelief(at: LatLon, deps: Deps): Promise<Settled<ReliefReading>> {
  const headers = deps.userAgent ? { 'User-Agent': deps.userAgent } : undefined;
  return settle(
    async () => parseRelief(await deps.fetchJson(reliefUrl(deps.now()), { headers }), at.lat, at.lon),
    deps.timeoutMs ?? 8000,
    'Relief',
  );
}
