import * as fs from 'fs';
import * as path from 'path';

import { decodePng } from '../src/png';

const tile = path.join(__dirname, 'fixtures/tiles/jrc/13/5350/3505.png');

describe('decodePng', () => {
  it('decodes a JRC tile to RGBA8', () => {
    const img = decodePng(fs.readFileSync(tile));
    expect(img.w).toBe(256);
    expect(img.h).toBe(256);
    expect(img.rgba.length).toBe(256 * 256 * 4);
  });

  it('reads only the view when handed a Buffer inside a larger pool', () => {
    const bytes = fs.readFileSync(tile);
    const pool = new Uint8Array(bytes.length + 64);
    pool.set(bytes, 32);
    const view = pool.subarray(32, 32 + bytes.length);
    expect(decodePng(view).w).toBe(256);
  });

  it('rejects non-PNG data', () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toThrow();
  });
});
