/** A paid report belongs to the place, so re-coring the same plot keeps it (~11 m grid). */
export function placeKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

type Core = { id: string; lat: number; lon: number; saved: boolean };

/**
 * Newest core first. An older unsaved core of the same place (~11 m) is
 * replaced; saved cores stay (their site kit hangs off their id). Unsaved
 * cores past `maxRecent` drop off. `dropped` lists ids whose reports to delete.
 */
export function mergeCore<T extends Core>(list: T[], next: T, maxRecent: number): { list: T[]; dropped: string[] } {
  const key = placeKey(next.lat, next.lon);
  const prev = list.find((c) => c.id === next.id);
  const replaced = list.filter((c) => c.id !== next.id && !c.saved && placeKey(c.lat, c.lon) === key);
  const dropped = replaced.map((c) => c.id);
  const rest = list.filter((c) => c.id !== next.id && !replaced.includes(c));
  const out: T[] = [];
  let unsaved = 0;
  for (const c of [{ ...next, saved: next.saved || !!prev?.saved }, ...rest]) {
    if (!c.saved && ++unsaved > maxRecent) {
      dropped.push(c.id);
      continue;
    }
    out.push(c);
  }
  return { list: out, dropped };
}

/** Full core, questions and PDF: Pro, a single-report unlock, or a place in an active flood (Relief mode). */
export function canSeeFull(place: string, relief: boolean, isPro: boolean, map: Record<string, string>): boolean {
  return isPro || relief || !!map[place];
}
