/**
 * Hand-written inputs in each API's documented shape. These are NOT recorded
 * data: they exercise the parsers. Recorded responses live in fixtures/json
 * (npm run fixtures) and are checked by golden-json.test.ts.
 */

/** NASA POWER daily point: properties.parameter.PRECTOTCORR = { YYYYMMDD: mm }. */
export function powerRain(days: Record<string, number>) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [80.2, 13.0, 10] },
    properties: { parameter: { PRECTOTCORR: days } },
    header: { fill_value: -999.0 },
  };
}

/** Two full synthetic years (2001, 2002) plus a partial 2003. */
export function twoYears(overrides: Record<string, number> = {}) {
  const days: Record<string, number> = {};
  for (const year of [2001, 2002]) {
    const d = new Date(Date.UTC(year, 0, 1));
    while (d.getUTCFullYear() === year) {
      days[d.toISOString().slice(0, 10).replace(/-/g, '')] = 1;
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  days['20030101'] = 2;
  days['20030102'] = -999; // fill value
  return powerRain({ ...days, ...overrides });
}

export function usgsCount(count: number) {
  return { count, maxAllowed: 20000 };
}

export function usgsQuery(quakes: { mag: number; lon: number; lat: number; depth: number; time: number; place: string }[]) {
  return {
    type: 'FeatureCollection',
    features: quakes.map((q) => ({
      type: 'Feature',
      properties: { mag: q.mag, place: q.place, time: q.time, url: 'https://earthquake.usgs.gov/x' },
      geometry: { type: 'Point', coordinates: [q.lon, q.lat, q.depth] },
    })),
  };
}

type Depth = { label: string; mean: number | null };
export function soilGrids(layers: Record<string, Depth[]>) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [80.2, 13.0] },
    properties: {
      layers: Object.entries(layers).map(([name, depths]) => ({
        name,
        unit_measure: { d_factor: 10, mapped_units: 'g/kg', target_units: '%', uncertainty_unit: '' },
        depths: depths.map((d) => ({ range: {}, label: d.label, values: { mean: d.mean } })),
      })),
    },
  };
}

export function metNo(start: Date, oneHours: number[], sixHours: number[]) {
  const timeseries: unknown[] = [];
  let t = start.getTime();
  for (const mm of oneHours) {
    timeseries.push({ time: new Date(t).toISOString(), data: { instant: { details: {} }, next_1_hours: { details: { precipitation_amount: mm } }, next_6_hours: { details: { precipitation_amount: 99 } } } });
    t += 3600000;
  }
  for (const mm of sixHours) {
    timeseries.push({ time: new Date(t).toISOString(), data: { instant: { details: {} }, next_6_hours: { details: { precipitation_amount: mm } } } });
    t += 6 * 3600000;
  }
  return { type: 'Feature', properties: { meta: { updated_at: start.toISOString() }, timeseries } };
}

export function gdacs(events: { lat: number; lon: number; current: boolean; name: string; alert?: string }[]) {
  return {
    type: 'FeatureCollection',
    features: events.map((e, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        eventtype: 'FL', eventid: 1000 + i, name: e.name, alertlevel: e.alert ?? 'Orange',
        country: 'India', fromdate: '2026-09-20T00:00:00', todate: '2026-09-26T00:00:00',
        iscurrent: e.current ? 'true' : 'false', url: { report: 'https://www.gdacs.org/report' },
      },
    })),
  };
}
