import { fixtureFetchTile } from './fixture-fetch';
import { bowlCheck, bowlHeadline, decodeTerrarium, elevationAt, elevationGrid, formatMetres } from '../src/terrain';
import { TERRARIUM_URL, TERRARIUM_ZOOM, TileCache, lonLatToTile, tileUrl } from '../src/tiles';

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

  it('reads a ring that crosses the date line from the tiles either side of it', async () => {
    // Wrangel Island, ~360 m west of 180°: the eastern ring points fall in tile x = 0
    const [lat, lon, z] = [71.2, 179.99, TERRARIUM_ZOOM];
    const last = 2 ** z - 1;
    const { y } = lonLatToTile(lat, lon, z);
    const flat = (m: number) => {
      const v = m + 32768; // terrarium: R·256 + G − 32768
      const rgba = new Uint8Array(256 * 256 * 4);
      for (let i = 0; i < rgba.length; i += 4) rgba.set([v >> 8, v & 255, 0, 255], i);
      return { w: 256, h: 256, rgba };
    };
    const cache = new TileCache(64);
    for (const ty of [y - 1, y, y + 1]) {
      await cache.get(tileUrl(TERRARIUM_URL, z, last, ty), async () => flat(5));
      await cache.get(tileUrl(TERRARIUM_URL, z, 0, ty), async () => flat(20));
    }
    const fetchTile = jest.fn(async (url: string): Promise<ArrayBuffer | null> => {
      throw new Error(`asked for a tile off the ring: ${url}`);
    });
    const b = await bowlCheck(lat, lon, fetchTile, 400, 16, cache);
    expect(fetchTile).not.toHaveBeenCalled();
    expect(b.elevationM).toBe(5);
    expect(b.ringCount).toBe(16);
    expect(Math.max(...b.ring)).toBe(20); // east of 180°
    expect(Math.min(...b.ring)).toBe(5); // west of it
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
