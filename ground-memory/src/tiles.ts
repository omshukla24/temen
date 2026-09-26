import { decodePng, type DecodedImage } from './png';
import type { FetchTile } from './types';

export const TILE_SIZE = 256;

/** JRC Global Surface Water 1984–2024 transitions. Max zoom 13 (z14 is 404). */
export const JRC_TRANSITIONS_URL =
  'https://storage.googleapis.com/water-world/tiles2024/transitions/{z}/{x}/{y}.png';
export const JRC_MAX_ZOOM = 13;

/** AWS Terrain Tiles, terrarium encoding. */
export const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRARIUM_ZOOM = 14;

export interface TileCoord {
  x: number;
  y: number;
  /** Pixel inside the tile, integer 0..255. */
  px: number;
  py: number;
}

/** Global pixel position at zoom z (fractional). */
export function lonLatToGlobalPx(lat: number, lon: number, z: number): { gx: number; gy: number } {
  const n = TILE_SIZE * 2 ** z;
  const φ = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  const gx = ((lon + 180) / 360) * n;
  const gy = ((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * n;
  return { gx, gy };
}

export function globalPxToLonLat(gx: number, gy: number, z: number): { lat: number; lon: number } {
  const n = TILE_SIZE * 2 ** z;
  const lon = (gx / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * gy) / n))) * 180) / Math.PI;
  return { lat, lon };
}

export function lonLatToTile(lat: number, lon: number, z: number): TileCoord {
  const { gx, gy } = lonLatToGlobalPx(lat, lon, z);
  const x = Math.floor(gx / TILE_SIZE);
  const y = Math.floor(gy / TILE_SIZE);
  return { x, y, px: Math.floor(gx - x * TILE_SIZE), py: Math.floor(gy - y * TILE_SIZE) };
}

/** Ground metres per tile pixel at this latitude and zoom (256 px tiles). */
export function metersPerPixel(lat: number, z: number): number {
  return (156543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

export function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/** A rectangle of pixels stitched from one or more tiles. Missing tiles read as transparent. */
export interface Region {
  z: number;
  /** Global pixel of the top-left corner. */
  x0: number;
  y0: number;
  w: number;
  h: number;
  rgba: Uint8Array;
  /** How many tiles the server had no data for. */
  missingTiles: number;
}

/** Decoded-tile cache shared across reads. Small LRU keyed by URL. */
export class TileCache {
  private map = new Map<string, Promise<DecodedImage | null>>();
  constructor(private readonly max = 48) {}

  get(url: string, load: () => Promise<DecodedImage | null>): Promise<DecodedImage | null> {
    const hit = this.map.get(url);
    if (hit) {
      this.map.delete(url);
      this.map.set(url, hit);
      return hit;
    }
    const p = load().catch((e) => {
      this.map.delete(url);
      throw e;
    });
    this.map.set(url, p);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    return p;
  }
}

const defaultCache = new TileCache();

export interface RegionRequest {
  template: string;
  z: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** Fetches every tile the rectangle touches (in parallel) and stitches them. */
export async function readRegion(
  req: RegionRequest,
  fetchTile: FetchTile,
  cache: TileCache = defaultCache,
): Promise<Region> {
  const { template, z, x0, y0, w, h } = req;
  const n = 2 ** z;
  const out = new Uint8Array(w * h * 4);
  const tx0 = Math.floor(x0 / TILE_SIZE);
  const ty0 = Math.floor(y0 / TILE_SIZE);
  const tx1 = Math.floor((x0 + w - 1) / TILE_SIZE);
  const ty1 = Math.floor((y0 + h - 1) / TILE_SIZE);

  const jobs: Promise<number>[] = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n; // wrap across the antimeridian
      const url = tileUrl(template, z, wx, ty);
      jobs.push(
        cache
          .get(url, async () => {
            const buf = await fetchTile(url);
            return buf ? decodePng(buf) : null;
          })
          .then((img) => {
            if (!img) return 1;
            // copy the overlapping part of this tile into the region
            const sx0 = Math.max(x0, tx * TILE_SIZE);
            const sy0 = Math.max(y0, ty * TILE_SIZE);
            const sx1 = Math.min(x0 + w, (tx + 1) * TILE_SIZE);
            const sy1 = Math.min(y0 + h, (ty + 1) * TILE_SIZE);
            for (let gy = sy0; gy < sy1; gy++) {
              const srcRow = (gy - ty * TILE_SIZE) * img.w;
              const dstRow = (gy - y0) * w;
              for (let gx = sx0; gx < sx1; gx++) {
                const s = (srcRow + (gx - tx * TILE_SIZE)) * 4;
                const d = (dstRow + (gx - x0)) * 4;
                out[d] = img.rgba[s];
                out[d + 1] = img.rgba[s + 1];
                out[d + 2] = img.rgba[s + 2];
                out[d + 3] = img.rgba[s + 3];
              }
            }
            return 0;
          }),
      );
    }
  }
  const missing = (await Promise.all(jobs)).reduce((a, b) => a + b, 0);
  return { z, x0, y0, w, h, rgba: out, missingTiles: missing };
}

/** Square region of (2r+1)² pixels centred on the pixel under lat/lon. */
export function centredRegion(template: string, lat: number, lon: number, z: number, r: number): RegionRequest {
  const { gx, gy } = lonLatToGlobalPx(lat, lon, z);
  return { template, z, x0: Math.floor(gx) - r, y0: Math.floor(gy) - r, w: 2 * r + 1, h: 2 * r + 1 };
}
