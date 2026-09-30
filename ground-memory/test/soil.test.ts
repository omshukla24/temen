import { distanceM } from '../src/geo';
import {
  SOIL_LATS,
  SOIL_MASKED,
  SOIL_RETRY_MS,
  SOIL_SEARCH_M,
  parseSoil,
  soilGridBoxes,
  soilGridUrl,
  soilNear,
  soilUrl,
  usdaTexture,
  type SoilGridBox,
} from '../src/soil';
import { geoTiff16, soilGrids } from './synthetic';

describe('soil', () => {
  it('builds the SoilGrids URL', () => {
    expect(soilUrl(28.47, 77.5)).toBe(
      'https://rest.isric.org/soilgrids/v2.0/properties/query?lon=77.5000&lat=28.4700&property=clay&property=sand&property=silt&depth=0-5cm&depth=15-30cm&value=mean',
    );
  });

  it('converts g/kg to % with d_factor and flags heavy clay', () => {
    const r = parseSoil(
      soilGrids({
        clay: [{ label: '0-5cm', mean: 380 }, { label: '15-30cm', mean: 452 }],
        sand: [{ label: '0-5cm', mean: 250 }, { label: '15-30cm', mean: 210 }],
        silt: [{ label: '0-5cm', mean: 370 }, { label: '15-30cm', mean: 338 }],
      }),
    );
    expect(r.top).toEqual({ clay: 38, sand: 25, silt: 37 });
    expect(r.sub!.clay).toBeCloseTo(45.2, 5);
    expect(r.clayHeavy).toBe(true);
    expect(r.texture).toBe('Clay');
  });

  it('explains masked ground', () => {
    expect(() =>
      parseSoil(soilGrids({ clay: [{ label: '0-5cm', mean: null }], sand: [{ label: '0-5cm', mean: null }], silt: [] })),
    ).toThrow(/no data here/);
  });

  it('asks the SoilGrids WCS for one uncompressed grid reaching SOIL_SEARCH_M each way', () => {
    const at = { lat: 40.7128, lon: -74.006 };
    const boxes = soilGridBoxes(at.lat, at.lon);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ cols: 81, rows: 81 });
    const u = soilGridUrl('clay', '15-30cm', boxes[0]);
    expect(u).toContain(
      'https://maps.isric.org/mapserv?map=/map/clay.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=clay_15-30cm_mean',
    );
    expect(u).toContain('&GEOTIFF:COMPRESSION=None&GEOTIFF:TILING=false');
    expect(u).toContain('&SCALESIZE=long(81),lat(81)');
    const [west, east] = u.match(/SUBSET=long\(([-\d.]+),([-\d.]+)\)/)!.slice(1).map(Number);
    const [south, north] = u.match(/SUBSET=lat\(([-\d.]+),([-\d.]+)\)/)!.slice(1).map(Number);
    for (const edge of [{ ...at, lat: north }, { ...at, lat: south }, { ...at, lon: east }, { ...at, lon: west }]) {
      expect(distanceM(at, edge)).toBeCloseTo(SOIL_SEARCH_M, -2);
    }
  });

  describe('soilGridBoxes at the edges of the map', () => {
    it.each([
      ['west of it', 179.99],
      ['east of it', -179.99],
    ])('cuts the window in two at the date line (pin just %s)', (_, lon) => {
      // the WCS refuses a box whose west edge lies east of its east edge
      const boxes = soilGridBoxes(-16.85, lon);
      expect(boxes).toHaveLength(2);
      const [a, b] = boxes;
      expect(a).toMatchObject({ east: 180 });
      expect(b).toMatchObject({ west: -180 });
      for (const box of boxes) {
        expect(box.west).toBeLessThan(box.east);
        expect(box.rows).toBe(81);
      }
      expect(a.cols + b.cols).toBeGreaterThanOrEqual(80);
      expect(a.cols + b.cols).toBeLessThanOrEqual(82);
      const [whole] = soilGridBoxes(-16.85, 0);
      expect(a.east - a.west + (b.east - b.west)).toBeCloseTo(whole.east - whole.west, 6);
    });

    it('trims the window to the latitudes SoilGrids covers', () => {
      const [north] = soilGridBoxes(82.7, 20);
      expect(north.north).toBe(SOIL_LATS.north);
      expect(north.rows).toBeLessThan(81);
      expect(north.rows).toBeGreaterThan(40);
      const [south] = soilGridBoxes(-55.95, -67.3);
      expect(south.south).toBe(SOIL_LATS.south);
      expect(south.rows).toBeLessThan(81);
    });

    it.each([
      ['Antarctica', -80, 0],
      ['the South Pole', -89.99, 10],
      ['the Arctic Ocean', 85, 0],
      ['the North Pole', 90, 0],
    ])('asks for nothing over %s, which SoilGrids does not cover', (_, lat, lon) => {
      expect(soilGridBoxes(lat, lon)).toEqual([]);
    });
  });

  describe('soilNear', () => {
    const pin = { lat: 28.4861, lon: 77.512 };

    // 5 × 5 cells of 0.01° centred on the pin; the pin's own cell is masked (0)
    const W = 5;
    const cell = (x: number, y: number) => y * W + x;
    const grid = (cells: Record<number, number>, size = 0.01) =>
      geoTiff16({
        w: W,
        h: W,
        west: pin.lon - (W / 2) * size,
        north: pin.lat + (W / 2) * size,
        dLon: size,
        dLat: size,
        values: Array.from({ length: W * W }, (_, i) => cells[i] ?? 0),
      });
    const EAST = cell(4, 2); // 0.02° east ≈ 1.95 km
    const NORTH = cell(2, 0); // 0.02° north ≈ 2.22 km
    // silt is what clay and sand leave of 1000 g/kg: 440 and 439 at EAST, 300 at NORTH
    const layers: Record<string, ArrayBuffer> = {
      'clay 0-5cm': grid({ [EAST]: 250, [NORTH]: 100 }),
      'sand 0-5cm': grid({ [EAST]: 310, [NORTH]: 600 }),
      'clay 15-30cm': grid({ [EAST]: 261, [NORTH]: 100 }),
      'sand 15-30cm': grid({ [EAST]: 300, [NORTH]: 600 }),
    };
    const gridsFrom = (source: Record<string, ArrayBuffer>) =>
      jest.fn(async (url: string) => {
        const m = url.match(/COVERAGEID=(\w+)_([\d-]+cm)_mean/);
        if (!m) throw new Error(`unexpected ${url}`);
        return source[`${m[1]} ${m[2]}`] ?? null;
      });

    it('reads the pin’s own cell when it is modelled', async () => {
      const PIN = cell(2, 2);
      const own = { ...layers, 'clay 15-30cm': grid({ [PIN]: 452, [EAST]: 261 }), 'sand 15-30cm': grid({ [PIN]: 210 }) };
      const fetchTile = gridsFrom(own);
      const r = await soilNear(pin.lat, pin.lon, fetchTile);
      expect(r.nearby).toBeUndefined();
      expect(r.sub!.clay).toBeCloseTo(45.2, 5);
      expect(r.sub!.silt).toBeCloseTo(33.8, 5);
      expect(r.clayHeavy).toBe(true);
      expect(fetchTile).toHaveBeenCalledTimes(4);
    });

    it('borrows the nearest modelled cell when the pin’s own cell is built over', async () => {
      const fetchTile = gridsFrom(layers);
      const r = await soilNear(pin.lat, pin.lon, fetchTile);
      expect(r.nearby!.direction).toBe('E');
      expect(r.nearby!.distanceM).toBeGreaterThan(1940);
      expect(r.nearby!.distanceM).toBeLessThan(1970);
      expect(r.top).toEqual({ clay: 25, sand: 31, silt: 44 });
      expect(r.sub!.clay).toBeCloseTo(26.1, 5);
      expect(r.texture).toBe('Loam');
      expect(fetchTile).toHaveBeenCalledTimes(4);
    });

    it('asks for clay and sand only, and takes silt as the rest of 1000 g/kg', async () => {
      const fetchTile = gridsFrom(layers);
      await soilNear(pin.lat, pin.lon, fetchTile);
      const asked = fetchTile.mock.calls.map(([url]) => url.match(/COVERAGEID=(\w+)_([\d-]+cm)_mean/)!.slice(1).join(' '));
      expect(asked.sort()).toEqual(['clay 0-5cm', 'clay 15-30cm', 'sand 0-5cm', 'sand 15-30cm']);
    });

    it('never gives silt below zero, and skips cells the WCS wrote as negative', async () => {
      const PIN = cell(2, 2);
      // clay + sand a little over 1000 from rounding; a negative clay is no soil
      const odd = {
        'clay 0-5cm': grid({ [PIN]: 501, [EAST]: -1 }),
        'sand 0-5cm': grid({ [PIN]: 500, [EAST]: 400 }),
        'clay 15-30cm': grid({ [EAST]: -1 }),
        'sand 15-30cm': grid({ [EAST]: 400 }),
      };
      const r = await soilNear(pin.lat, pin.lon, gridsFrom(odd));
      expect(r.nearby).toBeUndefined();
      expect(r.top).toEqual({ clay: 50.1, sand: 50, silt: 0 });
      expect(r.sub).toBeNull();
    });

    it('counts a cell modelled at only one depth', async () => {
      const topOnly = { ...layers, 'clay 15-30cm': grid({}), 'sand 15-30cm': grid({}) };
      const r = await soilNear(pin.lat, pin.lon, gridsFrom(topOnly));
      expect(r.sub).toBeNull();
      expect(r.top).toEqual({ clay: 25, sand: 31, silt: 44 });
      expect(r.nearby!.direction).toBe('E');
    });

    it('gives up with the masked message when nothing within SOIL_SEARCH_M is modelled', async () => {
      // 0.1° cells: the only modelled cell, in the corner, is ~29 km away
      const far = Object.fromEntries(Object.keys(layers).map((k) => [k, grid({ [cell(0, 0)]: 300 }, 0.1)]));
      await expect(soilNear(pin.lat, pin.lon, gridsFrom(far))).rejects.toThrow(SOIL_MASKED);
    });

    it('searches both halves of a window cut at the date line', async () => {
      const at = { lat: -16.85, lon: 179.99 };
      const [westBox, eastBox] = soilGridBoxes(at.lat, at.lon);
      const patch = (box: SoilGridBox, cells: Record<number, number>) =>
        geoTiff16({
          w: box.cols,
          h: box.rows,
          west: box.west,
          north: box.north,
          dLon: (box.east - box.west) / box.cols,
          dLat: (box.north - box.south) / box.rows,
          values: Array.from({ length: box.cols * box.rows }, (_, i) => cells[i] ?? 0),
        });
      // only soil: 6 cells into the half east of the date line, on the pin's row (~2.4 km E)
      const soil = { [Math.floor(eastBox.rows / 2) * eastBox.cols + 5]: 300 };
      const fetchTile = jest.fn(async (url: string) => (url.includes('SUBSET=long(-180.') ? patch(eastBox, soil) : patch(westBox, {})));
      const r = await soilNear(at.lat, at.lon, fetchTile);
      expect(fetchTile).toHaveBeenCalledTimes(8);
      expect(r.nearby!.direction).toBe('E');
      expect(r.nearby!.distanceM).toBeGreaterThan(2000);
      expect(r.nearby!.distanceM).toBeLessThan(3000);
    });

    it('says no soil is modelled where SoilGrids has no data at all, without asking', async () => {
      const fetchTile = jest.fn(async () => null);
      await expect(soilNear(-80, 0, fetchTile)).rejects.toThrow(SOIL_MASKED);
      expect(fetchTile).not.toHaveBeenCalled();
    });

    it('does not hide a failed grid behind a neighbour', async () => {
      const failing = jest.fn(async () => {
        throw new Error('maps.isric.org answered 502');
      });
      await expect(soilNear(pin.lat, pin.lon, failing)).rejects.toThrow('502');
      // each of the four grids is asked twice, never more
      await new Promise((resolve) => setTimeout(resolve, SOIL_RETRY_MS + 100));
      expect(failing).toHaveBeenCalledTimes(8);
    });

    it('asks once more for a grid that failed, and reads it when it comes', async () => {
      const ok = gridsFrom(layers);
      let failed = false;
      const fetchTile = jest.fn(async (url: string) => {
        if (!failed && url.includes('COVERAGEID=clay_0-5cm')) {
          failed = true;
          throw new Error('maps.isric.org answered 502');
        }
        return ok(url);
      });
      const r = await soilNear(pin.lat, pin.lon, fetchTile);
      expect(r.top).toEqual({ clay: 25, sand: 31, silt: 44 });
      expect(fetchTile).toHaveBeenCalledTimes(5);
    });

    it('does not ask again for a grid the server does not have (404)', async () => {
      const missing = jest.fn(async () => null);
      await expect(soilNear(pin.lat, pin.lon, missing)).rejects.toThrow(/no grid/);
      expect(missing).toHaveBeenCalledTimes(4);
    });
  });

  it.each([
    [5, 92, 3, 'Sand'],
    [10, 85, 5, 'Loamy sand'],
    [10, 65, 25, 'Sandy loam'],
    [20, 40, 40, 'Loam'],
    [15, 20, 65, 'Silt loam'],
    [5, 7, 88, 'Silt'],
    [25, 60, 15, 'Sandy clay loam'],
    [30, 35, 35, 'Clay loam'],
    [30, 15, 55, 'Silty clay loam'],
    [38, 50, 12, 'Sandy clay'],
    [45, 10, 45, 'Silty clay'],
    [50, 20, 30, 'Clay'],
  ])('USDA texture: clay %i, sand %i, silt %i → %s', (clay, sand, silt, want) => {
    expect(usdaTexture({ clay, sand, silt })).toBe(want);
  });
});
