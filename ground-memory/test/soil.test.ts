import { distanceM } from '../src/geo';
import { SOIL_MASKED, SOIL_SEARCH_M, parseSoil, soilGridUrl, soilNear, soilUrl, usdaTexture } from '../src/soil';
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
    const u = soilGridUrl('clay', '15-30cm', at.lat, at.lon);
    expect(u).toContain(
      'https://maps.isric.org/mapserv?map=/map/clay.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=clay_15-30cm_mean',
    );
    expect(u).toContain('&GEOTIFF:COMPRESSION=None&GEOTIFF:TILING=false');
    const [west, east] = u.match(/SUBSET=long\(([-\d.]+),([-\d.]+)\)/)!.slice(1).map(Number);
    const [south, north] = u.match(/SUBSET=lat\(([-\d.]+),([-\d.]+)\)/)!.slice(1).map(Number);
    for (const edge of [{ ...at, lat: north }, { ...at, lat: south }, { ...at, lon: east }, { ...at, lon: west }]) {
      expect(distanceM(at, edge)).toBeCloseTo(SOIL_SEARCH_M, -2);
    }
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
    const layers: Record<string, ArrayBuffer> = {
      'clay 0-5cm': grid({ [EAST]: 250, [NORTH]: 100 }),
      'sand 0-5cm': grid({ [EAST]: 310, [NORTH]: 600 }),
      'silt 0-5cm': grid({ [EAST]: 440, [NORTH]: 300 }),
      'clay 15-30cm': grid({ [EAST]: 261, [NORTH]: 100 }),
      'sand 15-30cm': grid({ [EAST]: 300, [NORTH]: 600 }),
      'silt 15-30cm': grid({ [EAST]: 439, [NORTH]: 300 }),
    };
    const gridsFrom = (source: Record<string, ArrayBuffer>) =>
      jest.fn(async (url: string) => {
        const m = url.match(/COVERAGEID=(\w+)_([\d-]+cm)_mean/);
        if (!m) throw new Error(`unexpected ${url}`);
        return source[`${m[1]} ${m[2]}`] ?? null;
      });

    it('reads the pin’s own cell when it is modelled', async () => {
      const PIN = cell(2, 2);
      const own = { ...layers, 'clay 15-30cm': grid({ [PIN]: 452, [EAST]: 261 }), 'sand 15-30cm': grid({ [PIN]: 210 }), 'silt 15-30cm': grid({ [PIN]: 338 }) };
      const fetchTile = gridsFrom(own);
      const r = await soilNear(pin.lat, pin.lon, fetchTile);
      expect(r.nearby).toBeUndefined();
      expect(r.sub!.clay).toBeCloseTo(45.2, 5);
      expect(r.clayHeavy).toBe(true);
      expect(fetchTile).toHaveBeenCalledTimes(6);
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
      expect(fetchTile).toHaveBeenCalledTimes(6);
    });

    it('counts a cell modelled at only one depth', async () => {
      const topOnly = { ...layers, 'clay 15-30cm': grid({}), 'sand 15-30cm': grid({}), 'silt 15-30cm': grid({}) };
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

    it('does not hide a failed grid behind a neighbour', async () => {
      const failing = jest.fn(async () => {
        throw new Error('maps.isric.org answered 502');
      });
      await expect(soilNear(pin.lat, pin.lon, failing)).rejects.toThrow('502');
      await expect(soilNear(pin.lat, pin.lon, jest.fn(async () => null))).rejects.toThrow(/no grid/);
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
