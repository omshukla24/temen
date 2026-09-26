import { parseQuakeCount, parseQuakeTop, quakeCountUrl, quakeReading, quakeTopUrl } from '../src/quakes';
import { usgsCount, usgsQuery } from './synthetic';

describe('quakes', () => {
  it('builds USGS URLs', () => {
    expect(quakeCountUrl(28.47, 77.5)).toBe(
      'https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&latitude=28.4700&longitude=77.5000&maxradiuskm=300&starttime=1900-01-01&minmagnitude=4.5',
    );
    expect(quakeTopUrl(28.47, 77.5)).toMatch(/\/query\?.*&orderby=magnitude&limit=3$/);
  });

  it('reads the count', () => {
    expect(parseQuakeCount(usgsCount(95))).toBe(95);
    expect(() => parseQuakeCount({})).toThrow();
  });

  it('reads the strongest quakes with distance and year', () => {
    const top = parseQuakeTop(
      usgsQuery([
        { mag: 5.1, lon: 78.0, lat: 29.0, depth: 10, time: Date.UTC(2001, 0, 1), place: 'B' },
        { mag: 6.8, lon: 78.8, lat: 30.8, depth: 12, time: Date.UTC(1991, 9, 19), place: 'A' },
      ]),
      28.47,
      77.5,
    );
    expect(top[0].mag).toBe(6.8);
    expect(top[0].year).toBe(1991);
    expect(top[0].distanceKm).toBeGreaterThan(250);
    expect(top[0].distanceKm).toBeLessThan(300);
    const r = quakeReading(95, top);
    expect(r.bigQuake).toBe(true);
    expect(quakeReading(3, top.slice(1)).bigQuake).toBe(false);
    expect(quakeReading(0, []).strongest).toBeNull();
  });
});
