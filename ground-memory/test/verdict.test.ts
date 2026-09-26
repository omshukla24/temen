import { fixtureFetchTile } from './fixture-fetch';
import { twoYears, usgsQuery } from './synthetic';
import { parseQuakeTop, quakeReading } from '../src/quakes';
import { parseRain } from '../src/rain';
import { bowlCheck } from '../src/terrain';
import { settle, type Settled } from '../src/util';
import { CANT_SEE_ALWAYS, buildReport, questionsFor, summarise, type Readings } from '../src/verdict';
import { sampleWindow, waterEdgeDistance } from '../src/water';

const ok = <T,>(value: T): Settled<T> => ({ ok: true, value, ms: 1 });
const fail = (error: string): Settled<never> => ({ ok: false, error, ms: 1 });

async function readingsAt(lat: number, lon: number): Promise<Readings> {
  return {
    water: await settle(() => sampleWindow(lat, lon, fixtureFetchTile), 5000, 'w'),
    edge: await settle(() => waterEdgeDistance(lat, lon, fixtureFetchTile), 5000, 'e'),
    bowl: await settle(() => bowlCheck(lat, lon, fixtureFetchTile), 5000, 'b'),
    rain: ok(parseRain(twoYears({ '20021201': 120 }))),
    quakes: ok(quakeReading(2, parseQuakeTop(usgsQuery([{ mag: 4.8, lon: 80, lat: 13, depth: 10, time: 0, place: 'Bay of Bengal' }]), lat, lon))),
    soil: fail('SoilGrids: no data here (water, rock or city core)'),
  };
}

const now = new Date('2026-09-26T08:00:00Z');

describe('buildReport', () => {
  it('drills Kuberan Nagar into a full core', async () => {
    const r = buildReport({ lat: 12.95287, lon: 80.20706, placeName: 'Kuberan Nagar', now, readings: await readingsAt(12.95287, 80.20706) });
    expect(r.headline).toBe('Water was here, and the ground still dips');
    expect(r.flags.lostWater).toBe(true);
    expect(r.flags.bowl).toBe(true);
    expect(r.flags.buffer).toBe(true);
    expect(r.strata.map((s) => s.key)).toEqual(['water', 'ground', 'rain', 'quakes', 'soil', 'cantSee']);
    expect(r.strata.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.strata[0].hatch).toBe('lostWater');
    expect(r.strata[0].flag).toMatch(/FTL/);
    expect(r.strata[1].reading).toBe('−3.0 m');
    expect(r.elevationM).toBeLessThan(0);
    expect(r.teaser).toMatch(/^52% of the ground around this pin was water after 1984/);
  });

  it('turns a failed source into an error stratum in the metaphor', async () => {
    const r = buildReport({ lat: 12.95287, lon: 80.20706, placeName: null, now, readings: await readingsAt(12.95287, 80.20706) });
    const soil = r.strata.find((s) => s.key === 'soil')!;
    expect(soil.status).toBe('error');
    expect(soil.headline).toBe('The drill hit bedrock');
    expect(soil.detail).toMatch(/re-core/);
  });

  it('always ends with what it cannot see', async () => {
    const r = buildReport({ lat: 26.9124, lon: 70.9126, placeName: null, now, readings: await readingsAt(26.9124, 70.9126) });
    const last = r.strata[r.strata.length - 1];
    expect(last.key).toBe('cantSee');
    for (const line of CANT_SEE_ALWAYS) expect(r.cantSee).toContain(line);
  });

  it('never calls a place safe or unsafe', async () => {
    for (const [lat, lon] of [[12.95287, 80.20706], [26.9124, 70.9126], [17.4239, 78.4738], [25.1173, 55.1351]]) {
      const r = buildReport({ lat, lon, placeName: null, now, readings: await readingsAt(lat, lon) });
      const text = JSON.stringify(r);
      expect(text).not.toMatch(/\b(un)?safe\b/i);
      expect(summarise(r)).not.toMatch(/\b(un)?safe\b/i);
    }
  });

  it('keeps a stable id per place and time', async () => {
    const readings = await readingsAt(26.9124, 70.9126);
    const a = buildReport({ lat: 26.9124, lon: 70.9126, placeName: null, now, readings });
    const b = buildReport({ lat: 26.9124, lon: 70.9126, placeName: null, now, readings });
    expect(a.id).toBe(b.id);
  });
});

describe('questionsFor', () => {
  const none = { lostWater: false, onWater: false, seasonal: false, bowl: false, buffer: false, heavyRain: false, clayHeavy: false, bigQuake: false, relief: false };

  it('gives at least two questions on quiet ground', () => {
    expect(questionsFor(none)).toHaveLength(2);
  });

  it('gives at most six', () => {
    const all = Object.fromEntries(Object.keys(none).map((k) => [k, true])) as typeof none;
    const q = questionsFor(all);
    expect(q.length).toBeGreaterThanOrEqual(5);
    expect(q.length).toBeLessThanOrEqual(6);
  });

  it('asks for the FTL map when water was lost', () => {
    expect(questionsFor({ ...none, lostWater: true })[0]).toMatch(/FTL map/);
  });

  it('asks about plinth height with heavy rain', () => {
    expect(questionsFor({ ...none, heavyRain: true }).join(' ')).toMatch(/plinth/);
  });
});
