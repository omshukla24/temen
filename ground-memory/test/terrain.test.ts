import { fixtureFetchTile } from './fixture-fetch';
import { bowlCheck, bowlHeadline, decodeTerrarium, elevationAt, elevationGrid, formatMetres } from '../src/terrain';

describe('terrarium decoding', () => {
  it('decodes sea level and a known height', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0);
    expect(decodeTerrarium(129, 44, 128)).toBeCloseTo(300.5, 5);
    expect(decodeTerrarium(127, 255, 0)).toBe(-1);
  });
});

describe('bowlCheck', () => {
  it('finds the Kuberan Nagar bowl', async () => {
    const b = await bowlCheck(12.95287, 80.20706, fixtureFetchTile);
    expect(b.isBowl).toBe(true);
    expect(b.lowerThan).toBe(16);
    expect(b.elevationM).toBeLessThan(0);
    expect(b.ringMedianM).toBeGreaterThan(1);
    expect(b.depthM).toBeGreaterThanOrEqual(1.5);
    expect(bowlHeadline(b).headline).toBe('Sits in a bowl');
  });

  it('reads a hilltop as a rise', async () => {
    const b = await bowlCheck(26.9124, 70.9126, fixtureFetchTile);
    expect(b.isBowl).toBe(false);
    expect(b.depthM).toBeLessThan(-10);
    expect(bowlHeadline(b).headline).toBe('Sits on a rise');
  });

  it('admits when there is no height data', async () => {
    const b = await bowlCheck(25.1173, 55.1351, fixtureFetchTile);
    expect(b.noData).toBe(true);
    expect(b.isBowl).toBe(false);
    expect(bowlHeadline(b).headline).toBe('No height data here');
  });

  it('treats the sea-fill 0 m as missing, not as a height', async () => {
    // Chennai One SEZ sits on former marsh the terrain model flattened to exactly 0 m
    const b = await bowlCheck(12.9442, 80.2292, fixtureFetchTile);
    expect(b.elevationM).toBe(0);
    expect(b.noData).toBe(true);
    expect(bowlHeadline(b).headline).toBe('No height data here');
  });
});

describe('elevation', () => {
  it('interpolates a single point', async () => {
    const h = await elevationAt(26.9124, 70.9126, fixtureFetchTile);
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(320);
  });

  it('returns a square grid for contours', async () => {
    const g = await elevationGrid(12.95287, 80.20706, fixtureFetchTile, 128);
    expect(g.heights.length).toBe(128 * 128);
    expect(g.max).toBeGreaterThan(g.min);
    expect(g.metersPerPixel).toBeGreaterThan(8);
  });

  it('formats metres with a true minus sign', () => {
    expect(formatMetres(-1.49)).toBe('−1.5 m');
    expect(formatMetres(3.04, true)).toBe('+3.0 m');
    expect(formatMetres(0, true)).toBe('±0.0 m');
  });
});
