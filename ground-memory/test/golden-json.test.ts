/**
 * Checks recorded API responses (npm run fixtures) against events checked by hand.
 * Skips cleanly until the fixtures exist.
 */
import { jsonFixture } from './fixture-fetch';
import { parseForecast } from '../src/forecast';
import { parseQuakeCount, parseQuakeTop } from '../src/quakes';
import { parseRain } from '../src/rain';
import { parseRelief } from '../src/relief';
import { parseSoil } from '../src/soil';

const itIf = (cond: unknown) => (cond ? it : it.skip);
const KUBERAN = { lat: 12.95287, lon: 80.20706 };
const HUSSAIN = { lat: 17.4239, lon: 78.4738 };

describe('recorded rain (NASA POWER)', () => {
  const chennai = jsonFixture('rain-chennai-one-sez');
  itIf(chennai)('the wettest day at Chennai is Cyclone Michaung, 4 Dec 2023', () => {
    const r = parseRain(chennai);
    expect(r.wettest?.date).toBe('2023-12-04');
    expect(r.wettest?.mm).toBeGreaterThan(180);
    expect(r.top.map((d) => d.date)).toContain('2008-11-27'); // Cyclone Nisha
    expect(r.heavyDaysPerYear).toBeGreaterThan(1);
    expect(r.firstYear).toBe(1981);
  });

  const jaisalmer = jsonFixture('rain-jaisalmer-fort');
  itIf(jaisalmer)('the desert control is dry by comparison', () => {
    const r = parseRain(jaisalmer);
    expect(r.annualMeanMm).toBeLessThan(400);
    expect(r.heavyDaysPerYear).toBeLessThan(0.5);
  });
});

describe('recorded quakes (USGS)', () => {
  const count = jsonFixture('quakes-count-kuberan-nagar');
  const top = jsonFixture('quakes-top-kuberan-nagar');
  itIf(count && top)('south Chennai has few M4.5+ quakes within 300 km', () => {
    const n = parseQuakeCount(count);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(10);
    const q = parseQuakeTop(top, KUBERAN.lat, KUBERAN.lon);
    expect(q[0].mag).toBeLessThan(6);
    for (const e of q) expect(e.distanceKm).toBeLessThanOrEqual(300);
  });

  const hTop = jsonFixture('quakes-top-hussain-sagar');
  itIf(hTop)('Hyderabad sees the 1993 Latur earthquake', () => {
    const q = parseQuakeTop(hTop, HUSSAIN.lat, HUSSAIN.lon);
    expect(q[0]).toMatchObject({ year: 1993 });
    expect(q[0].mag).toBeGreaterThanOrEqual(6);
  });

  const palm = jsonFixture('quakes-count-palm-jumeirah');
  itIf(palm)('Dubai sits near the busy Zagros belt', () => {
    expect(parseQuakeCount(palm)).toBeGreaterThan(100);
  });
});

describe('recorded soil (SoilGrids)', () => {
  const kuberan = jsonFixture('soil-kuberan-nagar');
  itIf(kuberan)('south Chennai reads as clay loam', () => {
    const s = parseSoil(kuberan);
    expect(s.texture).toBe('Clay loam');
    expect(s.clayPct).toBeGreaterThan(30);
  });

  const palm = jsonFixture('soil-palm-jumeirah');
  itIf(palm)('reclaimed land has no soil model and says so', () => {
    expect(() => parseSoil(palm)).toThrow(/no data/);
  });
});

describe('recorded forecast (MET Norway) and floods (GDACS)', () => {
  const forecast = jsonFixture<{ properties: { meta: { updated_at: string } } }>('forecast-kuberan-nagar');
  itIf(forecast)('sums the next 24 hours from a real response', () => {
    const f = parseForecast(forecast, new Date(forecast!.properties.meta.updated_at));
    expect(f.hourly.length).toBeGreaterThanOrEqual(20);
    expect(f.next24hMm).toBeGreaterThanOrEqual(0);
    expect(f.updatedAt).toBe(forecast!.properties.meta.updated_at);
  });

  const relief = jsonFixture<{ features: { geometry: { coordinates: [number, number] } }[] }>('relief-sample');
  itIf(relief?.features.length)('puts a point at a real flood event inside the relief zone', () => {
    const [lon, lat] = relief!.features[0].geometry.coordinates;
    const r = parseRelief(relief, lat, lon);
    expect(r.inZone).toBe(true);
    expect(r.event?.distanceKm).toBeLessThan(1);
  });
});
