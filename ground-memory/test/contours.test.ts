import { contourInterval, contourPaths, smooth } from '../src/contours';
import { elevationGrid } from '../src/terrain';
import { fixtureFetchTile } from './fixture-fetch';

describe('contours', () => {
  it('picks a nice interval', () => {
    expect(contourInterval(0, 12)).toBe(1);
    expect(contourInterval(0, 60)).toBe(2.5);
    expect(contourInterval(200, 300)).toBe(5);
  });

  it('smooths without shifting the mean of a flat field', () => {
    const f = smooth(new Float32Array(16).fill(3), 4, 4);
    expect(Array.from(f).every((v) => Math.abs(v - 3) < 1e-6)).toBe(true);
  });

  it('draws unit-square paths for Kuberan Nagar', async () => {
    const grid = await elevationGrid(12.95287, 80.20706, fixtureFetchTile, 128);
    const { interval, lines } = contourPaths(grid);
    expect(interval).toBeGreaterThanOrEqual(1);
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) {
      expect(l.d.startsWith('M')).toBe(true);
      const nums = l.d.match(/-?\d+\.\d+/g)!.map(Number);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(1);
    }
  });
});
