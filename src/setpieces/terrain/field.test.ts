import { terrainHeights, terrainLines } from './field';

describe('terrain field', () => {
  it('is the same ground for the same seed and different ground for another', () => {
    expect(Array.from(terrainHeights(7, 24, 40))).toEqual(Array.from(terrainHeights(7, 24, 40)));
    expect(Array.from(terrainHeights(7, 24, 40))).not.toEqual(Array.from(terrainHeights(8, 24, 40)));
  });

  it('draws a readable number of contour lines inside the unit square', () => {
    const lines = terrainLines(11, 2.2);
    expect(lines.length).toBeGreaterThan(6);
    expect(lines.length).toBeLessThan(40);
    expect(lines.some((l) => l.major)).toBe(true);
    for (const l of lines) {
      for (const n of l.d.match(/-?\d+(\.\d+)?/g) ?? []) {
        expect(Number(n)).toBeGreaterThanOrEqual(0);
        expect(Number(n)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reuses the lines it already traced', () => {
    expect(terrainLines(19, 2)).toBe(terrainLines(19, 2));
  });
});
