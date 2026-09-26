import { centreShare, maskPlacement, maskStats, maskTexels } from './mask';

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

  it('labels the HUD share as gone only when water was lost', () => {
    const grid = (c: number) => ({ z: 13, x0: 0, y0: 0, w: 9, h: 9, classes: new Uint8Array(81).fill(c) });
    expect(centreShare(grid(1))).toEqual({ pct: 100, gone: false }); // a lake today
    expect(centreShare(grid(3))).toEqual({ pct: 100, gone: true }); // lost permanent
    expect(centreShare(grid(0))).toEqual({ pct: 0, gone: false }); // dry
  });

  it('places one satellite pixel at 2^(zoom−12) points with the pin at the view centre', () => {
    const p = maskPlacement(mask, 101.5, 200.5, 15, 400, 300);
    expect(p.cell).toBe(8);
    expect(p.origin).toEqual([200 - 1.5 * 8, 150 - 0.5 * 8]);
  });
});
