import * as fs from 'fs';
import * as path from 'path';

import type { FetchTile } from '../src/types';

export const FIXTURES = path.join(__dirname, 'fixtures');

/** Maps a tile URL to its fixture path: tiles/<layer>/<z>/<x>/<y>.png */
export function tileFixturePath(url: string): string {
  const m = url.match(/\/(transitions|terrarium)\/(\d+)\/(\d+)\/(\d+)\.png$/);
  if (!m) throw new Error(`No fixture mapping for ${url}`);
  const layer = m[1] === 'transitions' ? 'jrc' : 'terrarium';
  return path.join(FIXTURES, 'tiles', layer, m[2], m[3], `${m[4]}.png`);
}

/** Offline tile fetcher for tests. A sibling .404 file records a tile the server does not have. */
export const fixtureFetchTile: FetchTile = async (url) => {
  const file = tileFixturePath(url);
  if (fs.existsSync(file.replace(/\.png$/, '.404'))) return null;
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fixture ${path.relative(FIXTURES, file)} — run: npm run fixtures`);
  }
  const b = fs.readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

export function jsonFixture<T = unknown>(name: string): T | null {
  const file = path.join(FIXTURES, 'json', `${name}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}
