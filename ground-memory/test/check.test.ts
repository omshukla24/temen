import { checkGround, checkForecast, checkRelief, stageFor, type Progress, type ReadingCache } from '../src/check';
import type { Deps } from '../src/types';
import { fixtureFetchTile } from './fixture-fetch';
import { gdacs, geoTiff16, metNo, twoYears, usgsCount, usgsQuery } from './synthetic';

const now = new Date('2026-09-26T06:00:00Z');

function fakeJson(overrides: { hang?: RegExp; fail?: RegExp } = {}) {
  const calls: string[] = [];
  const fetchJson: Deps['fetchJson'] = async (url, init) => {
    calls.push(url);
    if (overrides.hang?.test(url)) return new Promise(() => {});
    if (overrides.fail?.test(url)) throw new Error('HTTP 503');
    if (url.includes('power.larc')) return twoYears({ '20021201': 140 });
    if (url.includes('earthquake.usgs.gov') && url.includes('/count?')) return usgsCount(12);
    if (url.includes('earthquake.usgs.gov')) return usgsQuery([{ mag: 5.2, lon: 80.5, lat: 13.5, depth: 10, time: 0, place: 'Test' }]);
    if (url.includes('gdacs')) return gdacs([]);
    if (url.includes('met.no')) {
      if (init?.headers?.['User-Agent'] !== 'Temen/test') throw new Error('403 no UA');
      return metNo(now, Array(24).fill(3), []);
    }
    throw new Error(`unexpected ${url}`);
  };
  return { fetchJson, calls };
}

const PIN = { lat: 12.9442, lon: 80.2292 };
const SOIL_G_KG: Record<string, number> = { clay: 320, sand: 380, silt: 300 };

/** Recorded map tiles, plus a one-cell SoilGrids grid over PIN for each soil layer. */
function fakeTile(overrides: { hang?: RegExp } = {}): Deps['fetchTile'] {
  return async (url) => {
    if (overrides.hang?.test(url)) return new Promise(() => {});
    const soil = url.match(/COVERAGEID=(clay|sand|silt)_/);
    if (!soil) return fixtureFetchTile(url);
    return geoTiff16({ w: 1, h: 1, west: PIN.lon - 0.005, north: PIN.lat + 0.005, dLon: 0.01, dLat: 0.01, values: [SOIL_G_KG[soil[1]]] });
  };
}

const deps = (fetchJson: Deps['fetchJson'], timeoutMs = 2000, fetchTile = fakeTile()): Deps => ({
  fetchJson,
  fetchTile,
  now: () => now,
  timeoutMs,
  userAgent: 'Temen/test',
});

describe('checkGround', () => {
  it('drills every source and reports progress through the loader stages', async () => {
    const { fetchJson } = fakeJson();
    const seen: Progress[] = [];
    const r = await checkGround({ lat: 12.9442, lon: 80.2292 }, deps(fetchJson), { onProgress: (p) => seen.push(p) });
    expect(r.strata.every((s) => s.status !== 'error')).toBe(true);
    expect(r.headline).toBe('Water was here and is gone');
    expect(seen[0].stage).toBe('sounding');
    expect(seen[seen.length - 1]).toMatchObject({ fraction: 1, stage: 'sealed' });
    const fractions = seen.map((p) => p.fraction);
    expect([...fractions].sort((a, b) => a - b)).toEqual(fractions);
  });

  it('times out one slow source without holding the rest', async () => {
    const { fetchJson } = fakeJson();
    const start = Date.now();
    const r = await checkGround(PIN, deps(fetchJson, 300, fakeTile({ hang: /maps\.isric\.org/ })));
    expect(Date.now() - start).toBeLessThan(3000);
    const soil = r.strata.find((s) => s.key === 'soil')!;
    expect(soil.status).toBe('error');
    expect(soil.detail).toMatch(/longer than/);
    expect(r.strata.find((s) => s.key === 'water')!.status).toBe('ok');
  });

  it('reuses cached readings', async () => {
    const store = new Map<string, unknown>();
    const cache: ReadingCache = {
      get: async (k) => store.get(k) ?? null,
      set: async (k, v) => {
        store.set(k, v);
      },
    };
    const first = fakeJson();
    await checkGround({ lat: 12.9442, lon: 80.2292 }, deps(first.fetchJson), { readingCache: cache, relief: false });
    expect(store.size).toBe(3);
    const second = fakeJson();
    await checkGround({ lat: 12.9442, lon: 80.2292 }, deps(second.fetchJson), { readingCache: cache, relief: false });
    expect(second.calls).toEqual([]);
  });

  it('maps fractions to loader words', () => {
    expect(stageFor(0)).toBe('sounding');
    expect(stageFor(0.3)).toBe('coring');
    expect(stageFor(0.83)).toBe('reading');
    expect(stageFor(1)).toBe('sealed');
  });
});

describe('checkForecast / checkRelief', () => {
  it('sends the User-Agent MET Norway requires', async () => {
    const { fetchJson } = fakeJson();
    const f = await checkForecast({ lat: 12.9, lon: 80.2 }, deps(fetchJson));
    expect(f.ok && f.value.next24hMm).toBe(72);
    expect(f.ok && f.value.heavy).toBe(true);
  });

  it('reports failures instead of throwing', async () => {
    const { fetchJson } = fakeJson({ fail: /gdacs/ });
    const r = await checkRelief({ lat: 12.9, lon: 80.2 }, deps(fetchJson));
    expect(r.ok).toBe(false);
  });
});
