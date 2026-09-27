import { forecastUrl, hourlyStrip, parseForecast } from '../src/forecast';
import { metNo } from './synthetic';

const now = new Date('2026-09-26T06:00:00Z');

describe('forecast', () => {
  it('uses at most 4 decimals', () => {
    expect(forecastUrl(12.953871, 80.2070612)).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=12.9539&lon=80.2071',
    );
  });

  it('sums hourly steps first, then six-hour blocks, without double counting', () => {
    // 6 hourly steps of 2 mm, then 6-h blocks of 12, 18, 30 mm (the last clipped to the window)
    const f = parseForecast(metNo(now, [2, 2, 2, 2, 2, 2], [12, 18, 30, 60]), now);
    // 12 + 12 + 18 + 30 = 72 mm within 24 h
    expect(f.next24hMm).toBe(72);
    expect(f.heavy).toBe(true);
    expect(f.peakHourMm).toBe(5);
    expect(f.updatedAt).toBe(now.toISOString());
  });

  it('is not heavy on a dry day', () => {
    const f = parseForecast(metNo(now, Array(24).fill(0.1), []), now);
    expect(f.next24hMm).toBeCloseTo(2.4, 5);
    expect(f.heavy).toBe(false);
  });

  it('lays the next 24 h out hour by hour for the rain strip', () => {
    const f = parseForecast(metNo(now, [2, 2, 2, 2, 2, 2], [12, 18, 30, 60]), now);
    const strip = hourlyStrip(f, now);
    expect(strip).toHaveLength(24);
    expect(strip.slice(0, 6)).toEqual([2, 2, 2, 2, 2, 2]);
    // a 12 mm six-hour block is 2 mm an hour
    expect(strip.slice(6, 12)).toEqual([2, 2, 2, 2, 2, 2]);
    expect(strip.slice(18, 24)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(f.hourly[0].hours).toBe(1);
    expect(f.hourly[f.hourly.length - 1].hours).toBe(6);
  });

  it('rejects a response without a timeseries', () => {
    expect(() => parseForecast({ properties: {} }, now)).toThrow();
  });
});
