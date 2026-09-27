import { buildReport, parseQuakeTop, parseRain, quakeReading } from 'ground-memory';

import { twoYears, usgsQuery } from '../../../ground-memory/test/synthetic';

import { cardDate, cardModel, cardSeed } from './model';

const ok = (v: unknown) => ({ ok: true as const, value: v, ms: 1 });

function report() {
  const readings = {
    water: { ok: false as const, error: 'Water took longer than 15 s', ms: 1 },
    edge: { ok: false as const, error: 'x', ms: 1 },
    bowl: ok({ elevationM: 195, ringMedianM: 198.3, depthM: 3.2, lowerThan: 15, ringCount: 16, ringM: 400, reliefM: 10, isBowl: true, noData: false }),
    rain: ok(parseRain(twoYears({ '20030710': 134 }))),
    quakes: ok(quakeReading(97, parseQuakeTop(usgsQuery([{ mag: 6.9, lon: 75.1, lat: 28.7, depth: 10, time: 0, place: '17 km NE of Taranagar, India' }]), 28.486, 77.512))),
    soil: { ok: false as const, error: 'SoilGrids: no data here (water, rock or city core)', ms: 1 },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return buildReport({ lat: 28.486083, lon: 77.512026, placeName: 'Beta II', now: new Date('2026-09-27T09:59:00Z'), readings: readings as any });
}

describe('cardModel', () => {
  it('prints the place, the headline and one row per stratum', () => {
    const m = cardModel(report(), ['Greater Noida'], { full: true, freeStrata: 2 });
    expect(m.title).toBe('Beta II');
    expect(m.subtitle).toBe('Greater Noida');
    expect(m.headline).toBe('Sits in a bowl');
    expect(m.rows.map((r) => r.title)).toEqual(['WATER', 'GROUND', 'RAIN', 'QUAKES', 'SOIL']);
    expect(m.date).toBe('27 SEP 2026');
    expect(m.coords).toContain('28.48608');
    expect(m.sources).toContain('USGS');
  });

  it('never gives away a sealed reading', () => {
    const m = cardModel(report(), ['Greater Noida'], { full: false, freeStrata: 2 });
    const sealed = m.rows.filter((r) => r.state === 'sealed');
    expect(sealed.map((r) => r.title)).toEqual(['RAIN', 'QUAKES', 'SOIL']);
    for (const r of sealed) expect([r.reading, r.unit, r.headline]).toEqual(['', '', '']);
    expect(m.rows[1]).toMatchObject({ title: 'GROUND', state: 'ok' });
    expect(m.rows[1].reading).not.toBe('');
  });

  it('tells a failed reading from one that was never modelled', () => {
    const m = cardModel(report(), [], { full: true, freeStrata: 2 });
    expect(m.rows[0]).toMatchObject({ title: 'WATER', state: 'error', reading: '' });
    expect(m.rows.find((r) => r.title === 'QUAKES')).toMatchObject({ state: 'ok', reading: '97' });
  });

  it('translates the words it prints', () => {
    const m = cardModel(report(), [], { full: true, freeStrata: 2, translate: (s) => `«${s}»` });
    expect(m.headline).toBe('«Sits in a bowl»');
    expect(m.rows[1].title).toBe('«GROUND»');
  });
});

describe('card helpers', () => {
  it('dates the card in UTC and gives each core its own terrain', () => {
    expect(cardDate('2026-01-05T23:30:00Z')).toBe('5 JAN 2026');
    expect(cardDate('nonsense')).toBe('');
    expect(cardSeed('abc')).toBe(cardSeed('abc'));
    expect(cardSeed('abc')).not.toBe(cardSeed('abd'));
  });
});
