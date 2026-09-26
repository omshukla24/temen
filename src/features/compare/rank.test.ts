import { buildReport, type Readings } from 'ground-memory';

import { notable } from './rank';

const ok = <T,>(value: T) => ({ ok: true as const, value, ms: 1 });
const fail = { ok: false as const, error: 'x', ms: 1 };

function core(id: string, depth: number, mm: number) {
  const readings = {
    water: fail,
    edge: fail,
    bowl: ok({ elevationM: 1, ringMedianM: 1 + depth, depthM: depth, lowerThan: 8, ringCount: 16, ringM: 400, ring: [], isBowl: false, reliefM: 3, noData: false }),
    rain: ok({ wettest: { date: '2020-01-01', mm }, top: [{ date: '2020-01-01', mm }], heavyDays: 0, heavyDaysPerYear: 0, veryHeavyDays: 0, extremeDays: 0, annualMeanMm: 900, firstYear: 1981, lastYear: 2025, years: 45, heavyByYear: [] }),
    quakes: fail,
    soil: fail,
  } as unknown as Readings;
  const r = buildReport({ lat: 0, lon: 0, placeName: id, now: new Date(), readings });
  return { ...r, id };
}

describe('compare ranking', () => {
  it('marks the lowest ground and the wettest day', () => {
    const n = notable([core('a', 0.5, 90), core('b', 2.5, 60), core('c', -1, 150)]);
    expect(n.ground).toBe('b');
    expect(n.rain).toBe('c');
    expect(n.water).toBeUndefined();
  });
  it('marks nothing with a single core', () => {
    expect(notable([core('a', 1, 1)])).toEqual({});
  });
});
