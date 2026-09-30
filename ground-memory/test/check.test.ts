import { checkGround, checkForecast, checkRelief, stageFor, type Progress, type ReadingCache } from '../src/check';
import type { Deps, GroundReport } from '../src/types';
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

/**
 * fakeTile whose soil grids wait for open() (and then fail, if asked to).
 * Records every soil request.
 */
function gatedSoil({ fail = false } = {}) {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  const calls: string[] = [];
  const tile = fakeTile();
  const fetchTile: Deps['fetchTile'] = async (url) => {
    if (!url.includes('maps.isric.org')) return tile(url);
    calls.push(url);
    await gate;
    if (fail) throw new Error('maps.isric.org answered 502');
    return tile(url);
  };
  return { fetchTile, open, calls };
}

/** An onLate that can be awaited. */
function lateCatcher() {
  let got!: (r: GroundReport) => void;
  const report = new Promise<GroundReport>((resolve) => (got = resolve));
  return { onLate: jest.fn((r: GroundReport) => got(r)), report };
}

const soilOf = (r: GroundReport) => r.strata.find((s) => s.key === 'soil')!;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  describe('with onLate', () => {
    it('seals the core without slow soil, then delivers the whole core with the same id', async () => {
      const { fetchJson } = fakeJson();
      const soil = gatedSoil();
      const late = lateCatcher();
      const seen: Progress[] = [];
      const r = await checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile), {
        onLate: late.onLate,
        soilGraceMs: 20,
        onProgress: (p) => seen.push(p),
      });
      expect(soilOf(r)).toMatchObject({ status: 'pending', reading: '…', headline: 'Still reading the soil' });
      const others = r.strata.filter((s) => s.key !== 'soil');
      expect(others.every((s) => s.status !== 'error' && s.status !== 'pending')).toBe(true);
      expect(r.flags.clayHeavy).toBe(false);
      expect(r.cantSee.some((x) => x.includes('soil'))).toBe(false);
      expect(late.onLate).not.toHaveBeenCalled();
      const progressAtSeal = seen.length;

      soil.open();
      const after = await late.report;
      expect(late.onLate).toHaveBeenCalledTimes(1);
      expect(after.id).toBe(r.id);
      expect(after.createdAt).toBe(r.createdAt);
      expect(soilOf(after)).toMatchObject({ status: 'ok', reading: '32%' });
      expect(after.strata.find((s) => s.key === 'water')).toEqual(r.strata.find((s) => s.key === 'water'));
      expect(after.cantSee.some((x) => x.includes('soil'))).toBe(true);
      // the loader is gone by now: no progress after the core was sealed
      expect(seen).toHaveLength(progressAtSeal);
    });

    it('delivers a soil error late when slow soil finally fails', async () => {
      const { fetchJson } = fakeJson();
      const soil = gatedSoil({ fail: true });
      const late = lateCatcher();
      const r = await checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile), { onLate: late.onLate, soilGraceMs: 20 });
      expect(soilOf(r).status).toBe('pending');
      soil.open();
      const after = await late.report;
      expect(late.onLate).toHaveBeenCalledTimes(1);
      expect(after.id).toBe(r.id);
      expect(soilOf(after)).toMatchObject({ status: 'error', headline: 'The drill hit bedrock' });
      expect(soilOf(after).detail).toMatch(/502/);
    });

    it('delivers a timeout late when soil never answers', async () => {
      const { fetchJson } = fakeJson();
      const late = lateCatcher();
      const r = await checkGround(PIN, deps(fetchJson, 2000, fakeTile({ hang: /maps\.isric\.org/ })), {
        onLate: late.onLate,
        soilGraceMs: 20,
        soilLateTimeoutMs: 300,
      });
      expect(soilOf(r).status).toBe('pending');
      const after = await late.report;
      expect(soilOf(after).status).toBe('error');
      expect(soilOf(after).detail).toMatch(/longer than/);
    });

    it('waits for soil that lands within the grace, and never calls onLate', async () => {
      const { fetchJson } = fakeJson();
      const late = lateCatcher();
      const r = await checkGround(PIN, deps(fetchJson), { onLate: late.onLate });
      expect(soilOf(r)).toMatchObject({ status: 'ok', reading: '32%' });
      await wait(50);
      expect(late.onLate).not.toHaveBeenCalled();
    });

    it('shrugs off an onLate that throws', async () => {
      const { fetchJson } = fakeJson();
      const soil = gatedSoil();
      let called = 0;
      const onLate = () => {
        called += 1;
        throw new Error('broken screen');
      };
      await checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile), { onLate, soilGraceMs: 20 });
      soil.open();
      await wait(50);
      expect(called).toBe(1);
    });
  });

  it('shares one set of soil grids between two checks of the same spot', async () => {
    const { fetchJson } = fakeJson();
    const soil = gatedSoil();
    const a = lateCatcher();
    const b = lateCatcher();
    const [ra, rb] = await Promise.all([
      checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile), { onLate: a.onLate, soilGraceMs: 20 }),
      checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile), { onLate: b.onLate, soilGraceMs: 20 }),
    ]);
    expect(soilOf(ra).status).toBe('pending');
    expect(soilOf(rb).status).toBe('pending');
    expect(soil.calls).toHaveLength(4);
    soil.open();
    const [la, lb] = await Promise.all([a.report, b.report]);
    expect(soilOf(la).status).toBe('ok');
    expect(soilOf(lb).status).toBe('ok');
    expect(soil.calls).toHaveLength(4);
  });

  it('does not let a hung soil fetch hold later checks of the same spot', async () => {
    const { fetchJson } = fakeJson();
    const hung = await checkGround(PIN, deps(fetchJson, 300, fakeTile({ hang: /maps\.isric\.org/ })));
    expect(soilOf(hung).status).toBe('error');
    const soil = gatedSoil();
    soil.open();
    const r = await checkGround(PIN, deps(fetchJson, 2000, soil.fetchTile));
    expect(soilOf(r).status).toBe('ok');
    expect(soil.calls).toHaveLength(4);
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
