import { RAIN_RULES, parseRain, rainUrl } from '../src/rain';
import { twoYears } from './synthetic';

describe('rain', () => {
  it('builds the NASA POWER URL', () => {
    expect(rainUrl(12.94, 80.2292, 2025)).toBe(
      'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=80.2292&latitude=12.9400&start=19810101&end=20251231&format=JSON',
    );
  });

  it('finds the wettest day and counts heavy days per full year', () => {
    const r = parseRain(twoYears({ '20011104': 70, '20020712': 120, '20021201': 210.4 }));
    expect(r.wettest).toEqual({ date: '2002-12-01', mm: 210.4 });
    expect(r.top.map((d) => d.mm)).toEqual([210.4, 120, 70]);
    expect(r.heavyDays).toBe(3);
    expect(r.heavyDaysPerYear).toBeCloseTo(1.5, 5); // 3 heavy days over 2 full years
    expect(r.veryHeavyDays).toBe(2);
    expect(r.extremeDays).toBe(1);
    expect(r.years).toBe(2);
    expect(r.firstYear).toBe(2001);
    expect(r.lastYear).toBe(2003);
    expect(r.heavyByYear).toEqual([
      { year: 2001, days: 1 },
      { year: 2002, days: 2 },
      { year: 2003, days: 0 },
    ]);
  });

  it('ignores the fill value', () => {
    const r = parseRain(twoYears());
    expect(r.top.every((d) => d.mm >= 0)).toBe(true);
  });

  it('uses the IMD thresholds', () => {
    expect(RAIN_RULES).toEqual({ heavyMm: 64.5, veryHeavyMm: 115.6, extremeMm: 204.5 });
  });

  it('rejects malformed responses', () => {
    expect(() => parseRain({})).toThrow(/PRECTOTCORR/);
    expect(() => parseRain({ properties: { parameter: { PRECTOTCORR: { '20010101': -999 } } } })).toThrow(/empty/);
  });
});
