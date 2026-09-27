import type { CoreSummary } from '@/state/reports';

import { ageOf, directRow, firstName, fixText, greetingKey, latestCore, savedCores, shouldSearch } from './logic';

const core = (id: string, createdAt: string, saved = false): CoreSummary => ({
  id,
  lat: 12.9442,
  lon: 80.2292,
  placeName: null,
  trail: [],
  headline: 'Water nearby',
  createdAt,
  elevationM: null,
  bands: [],
  flags: {
    lostWater: false,
    onWater: false,
    seasonal: false,
    bowl: false,
    buffer: false,
    heavyRain: false,
    clayHeavy: false,
    bigQuake: false,
    relief: false,
  },
  saved,
});

describe('greetingKey', () => {
  it('says morning, afternoon and evening by the hour', () => {
    expect(greetingKey(4)).toBe('home.greetMorning');
    expect(greetingKey(11)).toBe('home.greetMorning');
    expect(greetingKey(12)).toBe('home.greetAfternoon');
    expect(greetingKey(16)).toBe('home.greetAfternoon');
    expect(greetingKey(17)).toBe('home.greetEvening');
    expect(greetingKey(23)).toBe('home.greetEvening');
    expect(greetingKey(2)).toBe('home.greetEvening');
  });
});

describe('firstName', () => {
  it('keeps the first word of a name', () => {
    expect(firstName('  Om Shukla ')).toBe('Om');
  });

  it('says nothing for empty names, emails and very long words', () => {
    expect(firstName(null)).toBeNull();
    expect(firstName('   ')).toBeNull();
    expect(firstName('someone@example.com')).toBeNull();
    expect(firstName('Abcdefghijklmnopqrstuvwxyz')).toBeNull();
  });
});

describe('ageOf', () => {
  const now = new Date(2026, 8, 27, 18, 0).getTime();

  it('counts calendar days, not 24-hour windows', () => {
    expect(ageOf(new Date(2026, 8, 27, 0, 5).toISOString(), now)).toEqual({ kind: 'today' });
    expect(ageOf(new Date(2026, 8, 26, 23, 55).toISOString(), now)).toEqual({ kind: 'yesterday' });
    expect(ageOf(new Date(2026, 8, 20, 12).toISOString(), now)).toEqual({ kind: 'days', n: 7 });
  });

  it('falls back to the date after a month and handles junk', () => {
    const old = new Date(2026, 5, 1, 12).toISOString();
    expect(ageOf(old, now)).toEqual({ kind: 'date', date: old.slice(0, 10) });
    expect(ageOf('not a date', now)).toEqual({ kind: 'unknown' });
  });

  it('treats a clock that ran ahead as today', () => {
    expect(ageOf(new Date(2026, 8, 28, 9).toISOString(), now)).toEqual({ kind: 'today' });
  });
});

describe('cores on Home', () => {
  const list = [core('a', '2026-09-20T10:00:00.000Z', true), core('b', '2026-09-26T10:00:00.000Z'), core('c', '2026-09-24T10:00:00.000Z', true)];

  it('finds the latest core in any order', () => {
    expect(latestCore(list)?.id).toBe('b');
    expect(latestCore([])).toBeNull();
  });

  it('lists saved cores newest first without touching the input', () => {
    const before = list.map((c) => c.id);
    expect(savedCores(list).map((c) => c.id)).toEqual(['c', 'a']);
    expect(list.map((c) => c.id)).toEqual(before);
  });
});

describe('search input', () => {
  it('sends only free text of 3+ letters to the geocoder', () => {
    expect(shouldSearch('Be')).toBe(false);
    expect(shouldSearch('Beta II')).toBe(true);
    expect(shouldSearch('12.9442, 80.2292')).toBe(false);
    expect(shouldSearch('temen ni gru')).toBe(false);
  });

  it('describes pasted pins, links and the egg', () => {
    expect(directRow('Temen-ni-gru')).toEqual({ kind: 'egg' });
    expect(directRow('12.9442, 80.2292')).toEqual({ kind: 'point', title: '12.94420° N  80.22920° E' });
    expect(directRow('https://maps.app.goo.gl/abc123')).toEqual({ kind: 'link' });
    expect(directRow('Beta II')).toBeNull();
    expect(directRow('   ')).toBeNull();
  });
});

describe('fixText', () => {
  it('writes coordinates to 5 dp with the accuracy when known', () => {
    expect(fixText({ lat: 28.48612345, lon: 77.51234567, accuracyM: 7.6 })).toBe('28.48612° N  77.51235° E  ±8 M');
    expect(fixText({ lat: -1, lon: -2, accuracyM: null })).toBe('1.00000° S  2.00000° W');
  });
});
