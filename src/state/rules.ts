/** Water and ground are free on every core; the rest is sealed without a report or Pro. */
export const FREE_STRATA = 2;

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

export interface SingleTxn {
  transactionIdentifier: string;
  productIdentifier: string;
  purchaseDate: string;
}

/**
 * Pairs paid single reports with places. RevenueCat's customer info is the
 * truth; the id a purchase returns can differ from the id customer info lists
 * (Test Store does this), so a fresh purchase takes the newest unowned
 * transaction, and a place holding an id the store doesn't list is re-paired
 * with a spare one. Whatever is left over becomes credits.
 */
export function reconcileSingles(
  txns: SingleTxn[],
  unlocks: Record<string, string>,
  bought?: { place: string; id: string },
  product = 'report_single',
): { unlocks: Record<string, string>; credits: string[] } {
  const singles = txns
    .filter((t) => t.productIdentifier.startsWith(product))
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)); // newest first
  const ids = new Set(singles.map((t) => t.transactionIdentifier));
  const next = { ...unlocks };
  if (bought) next[bought.place] = bought.id;
  const owned = new Set(Object.values(next).filter((id) => ids.has(id)));
  const spare = singles.map((t) => t.transactionIdentifier).filter((id) => !owned.has(id));
  // a fresh purchase is paired first, then older places with unknown ids
  const orphans = Object.keys(next).filter((place) => !ids.has(next[place]) && place !== bought?.place);
  if (bought && !ids.has(bought.id)) orphans.unshift(bought.place);
  for (const place of orphans) {
    const id = spare.shift();
    if (!id) break;
    next[place] = id;
  }
  return { unlocks: next, credits: spare };
}

/** Full core, questions and PDF: Pro, a single-report unlock, or a place in an active flood (Relief mode). */
export function canSeeFull(place: string, relief: boolean, isPro: boolean, map: Record<string, string>): boolean {
  return isPro || relief || !!map[place];
}
