/**
 * Checks recorded API responses (npm run fixtures) against values checked by hand
 * by hand. Skips cleanly until the fixtures exist.
 */
import { jsonFixture } from './fixture-fetch';
import { parseQuakeCount, parseQuakeTop } from '../src/quakes';
import { parseRain } from '../src/rain';
import { parseSoil } from '../src/soil';

const chennaiRain = jsonFixture('rain-chennai-one-sez');
const itIf = (cond: unknown) => (cond ? it : it.skip);

describe('recorded responses', () => {
  itIf(chennaiRain)('NASA POWER shows Cyclone Michaung at Chennai (≥ 150 mm on 2023-12-04)', () => {
    const r = parseRain(chennaiRain);
    const michaung = r.top.find((d) => d.date === '2023-12-04') ?? { mm: 0 };
    expect(michaung.mm).toBeGreaterThanOrEqual(150);
  });

  const count = jsonFixture('quakes-count-kuberan-nagar');
  const top = jsonFixture('quakes-top-kuberan-nagar');
  itIf(count && top)('USGS count and top quakes parse', () => {
    expect(parseQuakeCount(count)).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(parseQuakeTop(top, 12.95287, 80.20706))).toBe(true);
  });

  const soil = jsonFixture('soil-kuberan-nagar');
  itIf(soil)('SoilGrids parses to a texture class', () => {
    expect(parseSoil(soil).texture).toMatch(/\w/);
  });
});
