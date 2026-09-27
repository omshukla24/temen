import { phaseAt, sunTimes } from './daylight';

const utc = (s: string) => Date.parse(s);
const MIN = 60_000;

describe('sunTimes', () => {
  it('matches published London times on the June solstice (03:43 and 20:21 UTC)', () => {
    const s = sunTimes(utc('2024-06-21T12:00:00Z'), 51.5074, -0.1278);
    expect(s.kind).toBe('normal');
    if (s.kind !== 'normal') return;
    expect(Math.abs(s.sunrise - utc('2024-06-21T03:43:00Z'))).toBeLessThan(3 * MIN);
    expect(Math.abs(s.sunset - utc('2024-06-21T20:21:00Z'))).toBeLessThan(3 * MIN);
  });

  it('puts Greater Noida sunrise near 06:10 and sunset near 18:05 IST in late September', () => {
    const s = sunTimes(utc('2026-09-27T06:30:00Z'), 28.4861, 77.512);
    if (s.kind !== 'normal') throw new Error('expected a normal day');
    // IST = UTC+5:30
    expect(Math.abs(s.sunrise - utc('2026-09-27T00:40:00Z'))).toBeLessThan(8 * MIN);
    expect(Math.abs(s.sunset - utc('2026-09-27T12:35:00Z'))).toBeLessThan(8 * MIN);
  });

  it('knows the midnight sun and the polar night at Tromsø', () => {
    expect(sunTimes(utc('2024-06-21T12:00:00Z'), 69.6492, 18.9553).kind).toBe('polarDay');
    expect(sunTimes(utc('2024-12-21T12:00:00Z'), 69.6492, 18.9553).kind).toBe('polarNight');
  });
});

describe('phaseAt', () => {
  const noida = { lat: 28.4861, lon: 77.512 };

  it('follows the sun through a day in Greater Noida', () => {
    expect(phaseAt(utc('2026-09-27T00:30:00Z'), noida)).toBe('dawn'); // 06:00 IST
    expect(phaseAt(utc('2026-09-27T06:30:00Z'), noida)).toBe('day'); // 12:00 IST
    expect(phaseAt(utc('2026-09-27T12:15:00Z'), noida)).toBe('dusk'); // 17:45 IST
    expect(phaseAt(utc('2026-09-27T16:30:00Z'), noida)).toBe('night'); // 22:00 IST
    expect(phaseAt(utc('2026-09-26T20:30:00Z'), noida)).toBe('night'); // 02:00 IST
  });

  it('is day all through the midnight sun and night all through the polar night', () => {
    expect(phaseAt(utc('2024-06-21T23:00:00Z'), { lat: 69.6492, lon: 18.9553 })).toBe('day');
    expect(phaseAt(utc('2024-12-21T12:00:00Z'), { lat: 69.6492, lon: 18.9553 })).toBe('night');
  });

  it('falls back to the local clock without a place', () => {
    const at = (h: number, m = 0) => new Date(2026, 8, 27, h, m).getTime();
    expect(phaseAt(at(6))).toBe('dawn');
    expect(phaseAt(at(12))).toBe('day');
    expect(phaseAt(at(18))).toBe('dusk');
    expect(phaseAt(at(23))).toBe('night');
    expect(phaseAt(at(3))).toBe('night');
  });

  it('ignores a place that is not a number', () => {
    expect(phaseAt(new Date(2026, 8, 27, 12).getTime(), { lat: Number.NaN, lon: 0 })).toBe('day');
  });
});
