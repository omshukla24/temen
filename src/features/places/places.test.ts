import type { CoreSummary } from '@/state/reports';

import { ago } from './ago';
import { matches, normalise, visibleCores } from './filter';
import { directionsLink, mapsLink, shareMessage } from './share';

function core(id: string, over: Partial<CoreSummary> = {}): CoreSummary {
  return {
    id,
    lat: 28.486,
    lon: 77.512,
    placeName: 'Beta II',
    trail: ['Greater Noida'],
    headline: 'Water was seen here in 1992.',
    createdAt: '2026-09-20T10:00:00.000Z',
    elevationM: 190,
    bands: [],
    flags: {} as CoreSummary['flags'],
    saved: false,
    ...over,
  };
}

describe('ago', () => {
  const now = new Date(2026, 8, 27, 15, 0, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).toISOString();

  it('counts calendar days for rows', () => {
    expect(ago(at(2026, 8, 27, 1), now)).toEqual({ kind: 'today' });
    expect(ago(at(2026, 8, 26, 23), now)).toEqual({ kind: 'yesterday' });
    expect(ago(at(2026, 8, 24), now)).toEqual({ kind: 'days', n: 3 });
    expect(ago(at(2026, 6, 2), now)).toEqual({ kind: 'date', date: '2026-07-02' });
  });

  it('adds minutes and hours when asked', () => {
    expect(ago(at(2026, 8, 27, 14, 59), now, true)).toEqual({ kind: 'minutes', n: 1 });
    expect(ago(new Date(now - 20_000).toISOString(), now, true)).toEqual({ kind: 'now' });
    expect(ago(at(2026, 8, 27, 10), now, true)).toEqual({ kind: 'hours', n: 5 });
    expect(ago(at(2026, 8, 25), now, true)).toEqual({ kind: 'days', n: 2 });
  });

  it('survives a missing or broken date', () => {
    expect(ago(null, now)).toEqual({ kind: 'date', date: '' });
    expect(ago('not a date', now)).toEqual({ kind: 'date', date: '' });
  });

  it('never says a time in the future', () => {
    expect(ago(new Date(now + 60_000).toISOString(), now, true)).toEqual({ kind: 'now' });
  });
});

describe('places filter', () => {
  const cores = [
    core('a', { saved: true }),
    core('b', { placeName: 'Kuberan Nagar', trail: ['Chennai', 'Tamil Nadu'], headline: 'Lower than the ground around it.' }),
    core('c', { placeName: 'Jumeirah', trail: ['Dubai'], saved: true }),
  ];

  it('folds case, accents and spaces', () => {
    expect(normalise('  Bétà   II ')).toBe('beta ii');
  });

  it('matches the locality, the town and the headline', () => {
    expect(matches(cores[0], 'beta')).toBe(true);
    expect(matches(cores[0], 'noida')).toBe(true);
    expect(matches(cores[1], 'lower ground')).toBe(true);
    expect(matches(cores[1], 'tamil')).toBe(true);
    expect(matches(cores[1], 'noida')).toBe(false);
  });

  it('needs every word of the query', () => {
    expect(matches(cores[1], 'chennai dubai')).toBe(false);
  });

  it('also matches the translated headline', () => {
    const hi = (s: string) => (s.startsWith('Water') ? 'यहाँ 1992 में पानी देखा गया।' : s);
    expect(matches(cores[0], 'पानी', hi)).toBe(true);
  });

  it('keeps the store order and splits recent from saved', () => {
    expect(visibleCores(cores, 'recent', '').map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(visibleCores(cores, 'saved', '').map((c) => c.id)).toEqual(['a', 'c']);
    expect(visibleCores(cores, 'saved', 'dubai').map((c) => c.id)).toEqual(['c']);
    expect(visibleCores(cores, 'recent', 'nowhere')).toEqual([]);
  });
});

describe('share', () => {
  it('links the spot to 6 decimals', () => {
    expect(mapsLink(12.9442, 80.2292)).toBe('https://maps.google.com/?q=12.944200,80.229200');
  });

  it('asks Google Maps for directions to the spot', () => {
    expect(directionsLink(28.486083, 77.512026)).toBe('https://www.google.com/maps/dir/?api=1&destination=28.486083,77.512026');
  });

  it('carries the place, headline, coordinates and link', () => {
    const msg = shareMessage({ title: 'Beta II', subtitle: 'Greater Noida', headline: 'Water was seen here in 1992.', lat: 28.486, lon: 77.512, footer: 'Read with Temen' });
    expect(msg.split('\n')).toEqual([
      'Beta II, Greater Noida',
      'Water was seen here in 1992.',
      '28.486000° N  77.512000° E',
      'https://maps.google.com/?q=28.486000,77.512000',
      'Read with Temen',
    ]);
  });

  it('does not repeat coordinates standing in for a town', () => {
    const msg = shareMessage({ title: 'Somewhere', subtitle: '25.1173° N  55.1351° E', headline: '', lat: 25.1173, lon: 55.1351 });
    expect(msg.split('\n')[0]).toBe('Somewhere');
    expect(msg).not.toContain('\n\n');
  });
});
