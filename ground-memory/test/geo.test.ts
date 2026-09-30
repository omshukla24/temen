import { bearingDeg, compassPoint, destination, distanceM, formatHemisphere, formatLatLon, isValidLatLon, roundTo } from '../src/geo';

describe('geo', () => {
  it('measures distance', () => {
    // one degree of latitude ≈ 111.2 km
    expect(distanceM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111195, -1);
  });

  it('measures the bearing to a point and names it', () => {
    const a = { lat: 40.7128, lon: -74.006 };
    expect(bearingDeg(a, destination(a, 0, 2000))).toBeCloseTo(0, 3);
    expect(bearingDeg(a, destination(a, 250, 2000))).toBeCloseTo(250, 3);
    expect([0, 44, 46, 90, 135, 180, 225, 270, 315, 337, 338, 359].map(compassPoint)).toEqual([
      'N', 'NE', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'NW', 'N', 'N',
    ]);
  });

  it('walks to a destination and back', () => {
    const a = { lat: 12.95287, lon: 80.20706 };
    const b = destination(a, 90, 400);
    expect(distanceM(a, b)).toBeCloseTo(400, 3);
    expect(b.lat).toBeCloseTo(a.lat, 4);
    expect(b.lon).toBeGreaterThan(a.lon);
  });

  it('validates and formats', () => {
    expect(isValidLatLon(91, 0)).toBe(false);
    expect(isValidLatLon(12, 181)).toBe(false);
    expect(isValidLatLon(12.9, 80.2)).toBe(true);
    expect(roundTo(12.74, 0.5)).toBe(12.5);
    expect(formatLatLon(12.9442, 80.2292)).toBe('12.944200, 80.229200');
    expect(formatHemisphere(-33.8688, -70.1, 2)).toBe('33.87° S  70.10° W');
  });
});
