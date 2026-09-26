import { maskPlacement, maskStats, maskTexels } from './mask';

const mask = { z: 13, x0: 100, y0: 200, w: 3, h: 1, classes: new Uint8Array([0, 1, 6]) };

describe('rising mask', () => {
  it('packs now / gone / any into RGBA texels', () => {
    expect(Array.from(maskTexels(mask))).toEqual([0, 0, 0, 0, 255, 0, 0, 255, 0, 255, 0, 255]);
  });

  it('counts water that is gone', () => {
    const s = maskStats(mask);
    expect(s.any).toBeCloseTo(2 / 3);
    expect(s.lost).toBeCloseTo(1 / 3);
  });

  it('places one satellite pixel at 2^(zoom−12) points with the pin at the view centre', () => {
    const p = maskPlacement(mask, 101.5, 200.5, 15, 400, 300);
    expect(p.cell).toBe(8);
    expect(p.origin).toEqual([200 - 1.5 * 8, 150 - 0.5 * 8]);
  });
});
