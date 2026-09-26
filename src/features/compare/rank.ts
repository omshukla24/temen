import type { GroundReport, StratumKey } from 'ground-memory';

export const ROWS: StratumKey[] = ['water', 'ground', 'rain', 'quakes', 'soil'];

/**
 * Which core has the most notable reading in each row: the most water memory,
 * the lowest ground, the wettest day, the most quakes, the most clay.
 */
export function notable(cores: GroundReport[]): Partial<Record<StratumKey, string>> {
  const out: Partial<Record<StratumKey, string>> = {};
  for (const key of ROWS) {
    let best: { id: string; score: number } | null = null;
    for (const c of cores) {
      const s = c.strata.find((x) => x.key === key);
      if (!s || s.status !== 'ok' || s.value === null) continue;
      const score = key === 'water' ? s.significance : key === 'ground' ? -s.value : s.value;
      if (!best || score > best.score) best = { id: c.id, score };
    }
    if (best && cores.length > 1) out[key] = best.id;
  }
  return out;
}
