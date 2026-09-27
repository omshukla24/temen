import { SOIL_MASKED, parseSoil, soilNear, soilUrl, usdaTexture } from '../src/soil';
import { soilGrids } from './synthetic';

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

  describe('soilNear', () => {
    const masked = soilGrids({ clay: [{ label: '15-30cm', mean: null }], sand: [{ label: '15-30cm', mean: null }], silt: [{ label: '15-30cm', mean: null }] });
    const loam = soilGrids({ clay: [{ label: '15-30cm', mean: 261 }], sand: [{ label: '15-30cm', mean: 300 }], silt: [{ label: '15-30cm', mean: 439 }] });

    it('reads the point itself when it is modelled', async () => {
      const fetchJson = jest.fn(async () => loam);
      const r = await soilNear(28.4861, 77.512, fetchJson);
      expect(r.nearby).toBeUndefined();
      expect(fetchJson).toHaveBeenCalledTimes(1);
    });

    it('walks out to the nearest modelled soil when the point is built over, one call at a time', async () => {
      // the pin and the probe 1 km north are masked; 1 km east is modelled
      const answers = [masked, masked, loam];
      const fetchJson = jest.fn(async () => answers.shift());
      const r = await soilNear(28.4861, 77.512, fetchJson);
      expect(r.nearby).toEqual({ distanceM: 1000, direction: 'E' });
      expect(r.sub!.clay).toBeCloseTo(26.1, 5);
      expect(fetchJson).toHaveBeenCalledTimes(3);
    });

    it('gives up with the masked message when nothing nearby is modelled', async () => {
      const fetchJson = jest.fn(async () => masked);
      await expect(soilNear(25.1173, 55.1351, fetchJson)).rejects.toThrow(SOIL_MASKED);
      expect(fetchJson).toHaveBeenCalledTimes(9);
    });

    it('does not hide network failures behind a neighbour', async () => {
      const fetchJson = jest.fn(async () => {
        throw new Error('HTTP 503');
      });
      await expect(soilNear(28.4861, 77.512, fetchJson)).rejects.toThrow('HTTP 503');
      expect(fetchJson).toHaveBeenCalledTimes(1);
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
