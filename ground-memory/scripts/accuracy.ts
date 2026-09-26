/**
 * Prints the golden-site accuracy table as Markdown, offline, from the recorded
 * fixtures. Run: npm run accuracy
 */
import sites from '../test/golden-sites.json';
import { fixtureFetchTile } from '../test/fixture-fetch';
import { bowlCheck, formatMetres } from '../src/terrain';
import { pct, sampleWindow, waterEdgeDistance, waterHeadline } from '../src/water';

type Expect = { waterKind?: string; bowl?: boolean; buffer?: boolean; lostPermanentMin?: number; lostSeasonalMin?: number };

async function main() {
  const rows: string[] = [];
  rows.push('| Site | Why it is here | Water memory (9×9 JRC px) | Ground (400 m ring) | Expected | Result |');
  rows.push('|---|---|---|---|---|---|');
  for (const s of sites as { name: string; lat: number; lon: number; why: string; expect: Expect }[]) {
    const w = await sampleWindow(s.lat, s.lon, fixtureFetchTile);
    const b = await bowlCheck(s.lat, s.lon, fixtureFetchTile);
    const e = await waterEdgeDistance(s.lat, s.lon, fixtureFetchTile);
    const h = waterHeadline(w);
    const want: string[] = [];
    const got: boolean[] = [];
    if (s.expect.waterKind) {
      want.push(`water: ${s.expect.waterKind}`);
      got.push(w.kind === s.expect.waterKind);
    }
    if (s.expect.bowl !== undefined) {
      want.push(`bowl: ${s.expect.bowl ? 'yes' : 'no'}`);
      got.push(b.isBowl === s.expect.bowl);
    }
    if (s.expect.buffer !== undefined) {
      want.push(`buffer: ${s.expect.buffer ? 'yes' : 'no'}`);
      got.push(e.buffer === s.expect.buffer);
    }
    const water =
      w.kind === 'none'
        ? '0% — no water 1984–2024'
        : `${h.value}% ${h.label} (now ${pct(w.share.now)}%, gone ${pct(w.share.lost)}%)`;
    const ground = b.noData
      ? 'no height data (new land)'
      : `${formatMetres(b.elevationM)} vs ${formatMetres(b.ringMedianM)}; lower than ${b.lowerThan}/16${b.isBowl ? ' → bowl' : ''}`;
    rows.push(
      `| ${s.name} (${s.lat}, ${s.lon}) | ${s.why} | ${water} | ${ground} | ${want.join(', ')} | ${got.every(Boolean) ? '✅ pass' : '❌ fail'} |`,
    );
  }
  console.log(rows.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
