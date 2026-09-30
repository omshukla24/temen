import {
  TileCache,
  checkForecast,
  checkGround,
  checkRelief,
  type Deps,
  type GroundReport,
  type Progress,
  type ReadingCache,
} from 'ground-memory';

import { APP_UA, fetchJson, fetchTile } from './http';
import { KEYS, readJsonAsync, writeJson } from './storage';

/** Decoded tiles shared by every check in this session (Rising, contours, core). */
export const tiles = new TileCache(64);

export const deps: Deps = {
  fetchJson,
  fetchTile,
  now: () => new Date(),
  timeoutMs: 8000,
  userAgent: APP_UA,
};

type Entry = { v: unknown; exp: number };

/** Parsed readings (rain, quakes, soil) survive restarts, so saved places re-open offline. */
export const readingCache: ReadingCache = {
  async get(key) {
    const e = await readJsonAsync<Entry | null>(KEYS.readingCache(key), null);
    if (!e || e.exp < Date.now()) return null;
    return e.v;
  },
  async set(key, v, ttlMs) {
    await writeJson(KEYS.readingCache(key), { v, exp: Date.now() + ttlMs } satisfies Entry);
  },
};

/** Cores sealed with a layer still on its way in this session, by id; a saved one waits for it instead of giving up. */
export const lateCores = new Set<string>();

const hasPending = (r: GroundReport) => r.strata.some((s) => s.status === 'pending');

/** Drills one core. With onLate, slow soil comes later as the whole core again, same id. */
export async function drill(
  at: { lat: number; lon: number },
  placeName: string | null,
  onProgress?: (p: Progress) => void,
  onLate?: (report: GroundReport) => void,
): Promise<GroundReport> {
  let landed = false;
  const late = onLate
    ? (r: GroundReport) => {
        landed = true;
        lateCores.delete(r.id);
        onLate(r);
      }
    : undefined;
  const report = await checkGround(at, deps, { placeName, tileCache: tiles, readingCache, onProgress, onLate: late });
  if (late && !landed && hasPending(report)) lateCores.add(report.id);
  return report;
}

export const forecast = (at: { lat: number; lon: number }) => checkForecast(at, deps);
export const relief = (at: { lat: number; lon: number }) => checkRelief(at, deps);
