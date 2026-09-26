import {
  TileCache,
  globalPxToLonLat,
  lonLatToGlobalPx,
  lonLatToTile,
  metersPerPixel,
  readRegion,
  tileUrl,
  JRC_TRANSITIONS_URL,
} from '../src/tiles';

describe('tile maths', () => {
  it('puts Palm Jumeirah in the JRC tile the web viewer uses', () => {
    expect(lonLatToTile(25.1173, 55.1351, 13)).toEqual({ x: 5350, y: 3505, px: 161, py: 52 });
  });

  it('round-trips global pixels and lat/lon', () => {
    const { gx, gy } = lonLatToGlobalPx(12.95287, 80.20706, 14);
    const back = globalPxToLonLat(gx, gy, 14);
    expect(back.lat).toBeCloseTo(12.95287, 9);
    expect(back.lon).toBeCloseTo(80.20706, 9);
  });

  it('gives ground metres per pixel', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03, 2);
    expect(metersPerPixel(60, 13)).toBeCloseTo(156543.03 * 0.5 / 8192, 6);
  });

  it('fills URL templates', () => {
    expect(tileUrl(JRC_TRANSITIONS_URL, 13, 1, 2)).toBe(
      'https://storage.googleapis.com/water-world/tiles2024/transitions/13/1/2.png',
    );
  });
});

describe('readRegion', () => {
  // 1×1-tile world at z0 is enough to test stitching and wrap-around.
  function solidTile(r: number, g: number, b: number) {
    const rgba = new Uint8Array(256 * 256 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
    return rgba;
  }

  it('stitches neighbouring tiles and counts missing ones', async () => {
    const seen: string[] = [];
    const cache = new TileCache();
    // Pre-seed the cache so no PNG encoding is needed.
    const fetchTile = async (url: string) => {
      seen.push(url);
      return null;
    };
    const tiles: Record<string, Uint8Array> = { '1/0/0': solidTile(10, 0, 0), '1/1/0': solidTile(20, 0, 0) };
    for (const [k, rgba] of Object.entries(tiles)) {
      await cache.get(`t/${k}`, async () => ({ w: 256, h: 256, rgba }));
    }
    const region = await readRegion({ template: 't/{z}/{x}/{y}', z: 1, x0: 254, y0: 254, w: 4, h: 4 }, fetchTile, cache);
    expect(region.rgba[0]).toBe(10); // top-left from tile 0/0
    expect(region.rgba[(0 * 4 + 3) * 4]).toBe(20); // top-right from tile 1/0
    expect(region.rgba[(3 * 4 + 0) * 4 + 3]).toBe(0); // bottom rows: tile 0/1 missing → transparent
    expect(region.missingTiles).toBe(2);
    expect(seen.sort()).toEqual(['t/1/0/1', 't/1/1/1']);
  });

  it('wraps x across the antimeridian', async () => {
    const urls: string[] = [];
    await readRegion({ template: '{z}/{x}/{y}', z: 1, x0: 510, y0: 0, w: 4, h: 1 }, async (u) => {
      urls.push(u);
      return null;
    }, new TileCache());
    expect(urls.sort()).toEqual(['1/0/0', '1/1/0']);
  });
});
