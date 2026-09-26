import { parseSoil, soilUrl, usdaTexture } from '../src/soil';
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
