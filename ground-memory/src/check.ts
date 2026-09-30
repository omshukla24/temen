import { roundTo } from './geo';
import { forecastUrl, parseForecast, type ForecastReading } from './forecast';
import { parseQuakeCount, parseQuakeTop, quakeCountUrl, quakeReading, quakeTopUrl } from './quakes';
import { parseRain, rainUrl } from './rain';
import { parseRelief, reliefUrl, type ReliefReading } from './relief';
import { SOIL_PENDING, soilNear, type SoilReading } from './soil';
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
  /**
   * Seal the core without waiting on slow soil. Soil gets soilGraceMs after
   * every other source; if it is still out, the report comes back with soil
   * pending and this gets the whole report (same id) once soil lands or fails.
   */
  onLate?: (report: GroundReport) => void;
  /** How long soil may trail the other sources before the core is sealed without it. */
  soilGraceMs?: number;
  /** Soil's own timeout when onLate is set. */
  soilLateTimeoutMs?: number;
}

/** Default soilGraceMs. */
export const SOIL_GRACE_MS = 2500;
/** Default soilLateTimeoutMs: soil no longer holds the core, so it can take its time. */
export const SOIL_LATE_TIMEOUT_MS = 45000;

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

/** Soil fetches in flight, by cache key, so two checks of one spot share one set of grids. */
const soilInFlight = new Map<string, Promise<SoilReading>>();

/**
 * One soil fetch per spot at a time. The entry goes when the fetch settles,
 * or after `ms` if it hangs, so a stuck fetch never holds later checks.
 */
function sharedSoil(key: string, ms: number, fn: () => Promise<SoilReading>): Promise<SoilReading> {
  const hit = soilInFlight.get(key);
  if (hit) return hit;
  const p = fn();
  soilInFlight.set(key, p);
  const drop = () => {
    clearTimeout(timer);
    if (soilInFlight.get(key) === p) soilInFlight.delete(key);
  };
  const timer = setTimeout(drop, ms);
  p.then(drop, drop);
  return p;
}

/** p's value if it settles within ms, else null. The timer never outlives p. */
function within<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Floor for the tile-based readings (water, water edge, ground). */
export const TILE_TIMEOUT_MS = 15000;

/**
 * Drills one core: every source in parallel, each with its own timeout, so one
 * slow API never blocks the rest. A failed source becomes an error stratum.
 * With onLate, slow soil is sealed as pending and delivered later.
 */
export async function checkGround(at: LatLon, deps: Deps, opts: CheckOptions = {}): Promise<GroundReport> {
  const { lat, lon } = at;
  const t = deps.timeoutMs ?? 8000;
  // Tile readings fetch up to nine 256 px PNGs while the map loads the same
  // tiles; on mobile data 8 s is too tight for them.
  const tt = Math.max(t, TILE_TIMEOUT_MS);
  const tiles = opts.tileCache ?? new TileCache();
  const rc = opts.readingCache;
  const now = deps.now();
  const headers = deps.userAgent ? { 'User-Agent': deps.userAgent } : undefined;
  const onLate = opts.onLate;
  // four grids at once over mobile data, so soil gets more room too; with
  // onLate it no longer holds the core, so it gets all the room it needs
  const soilMs = onLate ? (opts.soilLateTimeoutMs ?? SOIL_LATE_TIMEOUT_MS) : t * 2;
  const soilKey = `soil:${lat.toFixed(3)},${lon.toFixed(3)}`;

  const jobs = {
    water: () => settle(() => sampleWindow(lat, lon, deps.fetchTile, 4, tiles), tt, 'Water'),
    edge: () => settle(() => waterEdgeDistance(lat, lon, deps.fetchTile, 600, tiles), tt, 'Water edge'),
    bowl: () => settle(() => bowlCheck(lat, lon, deps.fetchTile, 400, 16, tiles), tt, 'Ground'),
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
        () => sharedSoil(soilKey, soilMs, () => cached(rc, soilKey, 180 * DAY, () => soilNear(lat, lon, deps.fetchTile))),
        soilMs,
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

  type Key = keyof typeof jobs;
  type Result = readonly [Key, Settled<unknown>];
  const keys = (Object.keys(jobs) as Key[]).filter((k) => k !== 'relief' || opts.relief !== false);
  let done = 0;
  // once the core is sealed, a late source reports through onLate only
  let sealed = false;
  opts.onProgress?.({ done, total: keys.length, fraction: 0, stage: 'sounding', last: null });
  const run = async (k: Key): Promise<Result> => {
    const r = await jobs[k]();
    done += 1;
    const fraction = done / keys.length;
    if (!sealed) opts.onProgress?.({ done, total: keys.length, fraction, stage: stageFor(fraction), last: k });
    return [k, r];
  };
  const build = (results: Result[]) =>
    buildReport({ lat, lon, placeName: opts.placeName ?? null, now, readings: Object.fromEntries(results) as unknown as Readings });

  if (!onLate) return build(await Promise.all(keys.map(run)));

  const soil = run('soil');
  const rest = await Promise.all(keys.filter((k) => k !== 'soil').map(run));
  const early = await within(soil, opts.soilGraceMs ?? SOIL_GRACE_MS);
  if (early) return build([...rest, early]);
  sealed = true;
  soil.then((late) => {
    try {
      onLate(build([...rest, late]));
    } catch {
      // a broken callback must never become an unhandled rejection
    }
  });
  return build([...rest, ['soil', { ok: false, error: SOIL_PENDING, ms: 0 }]]);
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
