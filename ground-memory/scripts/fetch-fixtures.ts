/**
 * Records the network data the golden tests need, once. Run: npm run fixtures
 * Tiles are recorded by running the real functions with a fetcher that saves
 * every tile it touches, so the fixtures always match what the code reads.
 */
import * as fs from 'fs';
import * as path from 'path';

import sites from '../test/golden-sites.json';
import { FIXTURES, tileFixturePath } from '../test/fixture-fetch';
import { quakeCountUrl, quakeTopUrl } from '../src/quakes';
import { rainUrl } from '../src/rain';
import { soilUrl } from '../src/soil';
import { bowlCheck, elevationGrid } from '../src/terrain';
import { TileCache } from '../src/tiles';
import type { FetchTile } from '../src/types';
import { sampleWindow, waterEdgeDistance, waterMask } from '../src/water';

const UA = 'Temen/1.0 github.com/omshukla24/temen';

const recordingFetchTile: FetchTile = async (url) => {
  const file = tileFixturePath(url);
  if (fs.existsSync(file)) {
    const b = fs.readFileSync(file);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  }
  if (fs.existsSync(file.replace(/\.png$/, '.404'))) return null;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (res.status === 404) {
    fs.writeFileSync(file.replace(/\.png$/, '.404'), '');
    return null;
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(file, Buffer.from(buf));
  console.log('  saved', path.relative(FIXTURES, file));
  return buf;
};

async function saveJson(name: string, url: string) {
  const file = path.join(FIXTURES, 'json', `${name}.json`);
  if (fs.existsSync(file)) return;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(body));
    console.log('  saved', path.relative(FIXTURES, file));
  } catch (e) {
    console.warn(`  skipped ${name}: ${(e as Error).message}`);
  }
}

async function main() {
  const onlyTiles = process.argv.includes('--tiles');
  for (const s of sites) {
    console.log(`${s.id} (${s.lat}, ${s.lon})`);
    const cache = new TileCache();
    await sampleWindow(s.lat, s.lon, recordingFetchTile, 4, cache);
    await waterEdgeDistance(s.lat, s.lon, recordingFetchTile, 600, cache);
    await waterMask(s.lat, s.lon, recordingFetchTile, 48, cache);
    await bowlCheck(s.lat, s.lon, recordingFetchTile, 400, 16, cache);
    await elevationGrid(s.lat, s.lon, recordingFetchTile, 128, cache);
    if (onlyTiles) continue;
    await saveJson(`rain-${s.id}`, rainUrl(s.lat, s.lon));
    await saveJson(`quakes-count-${s.id}`, quakeCountUrl(s.lat, s.lon));
    await saveJson(`quakes-top-${s.id}`, quakeTopUrl(s.lat, s.lon));
    await saveJson(`soil-${s.id}`, soilUrl(s.lat, s.lon));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
