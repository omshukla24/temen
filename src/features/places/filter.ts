import { placeLabel } from '@/features/placeLabel';
import type { CoreSummary } from '@/state/reports';

/** Which cores the list shows: every one, the saved ones, or those with a caution flag. */
export type PlacesFilter = 'all' | 'saved' | 'flagged';
export type PlacesSort = 'newest' | 'oldest' | 'name' | 'flags' | 'nearest';
export const SORTS: PlacesSort[] = ['newest', 'oldest', 'name', 'flags', 'nearest'];

/** Lower case, accents folded, spaces collapsed: "Kotturpuram " → "kotturpuram". */
export function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Everything a filter may match on: locality, town, the whole trail and the headline (both languages). */
export function haystack(core: CoreSummary, translate: (s: string) => string = (s) => s): string {
  const { title, subtitle } = placeLabel(core);
  const headline = core.headline ?? '';
  return normalise([title, subtitle, core.placeName ?? '', ...(core.trail ?? []), headline, translate(headline)].join(' '));
}

/** Every word of the query must appear somewhere in the core's text. */
export function matches(core: CoreSummary, query: string, translate?: (s: string) => string): boolean {
  const words = normalise(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const text = haystack(core, translate);
  return words.every((w) => text.includes(w));
}

/** The flags that ask for a closer look (seasonal only qualifies lost water, so it isn't counted). */
const CAUTION = ['lostWater', 'onWater', 'bowl', 'buffer', 'heavyRain', 'clayHeavy', 'bigQuake', 'relief'] as const;

/** How many caution flags a core raised. */
export function flagCount(core: Pick<CoreSummary, 'flags'>): number {
  return CAUTION.filter((k) => !!core.flags?.[k]).length;
}

/** The rows a filter shows, newest first (the store keeps that order), narrowed by the search words. */
export function visibleCores(cores: readonly CoreSummary[], filter: PlacesFilter, query: string, translate?: (s: string) => string): CoreSummary[] {
  return cores.filter((c) => (filter === 'all' || (filter === 'saved' ? c.saved : flagCount(c) > 0)) && matches(c, query, translate));
}

/** Metres between two points (equirectangular: plenty for ordering places by distance). */
export function metresBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const k = Math.PI / 180;
  const x = (b.lon - a.lon) * k * Math.cos(((a.lat + b.lat) / 2) * k);
  const y = (b.lat - a.lat) * k;
  return Math.hypot(x, y) * 6_371_000;
}

/**
 * Orders a list without touching the store. Ties keep the newest first.
 * "nearest" needs where you are; without it the list stays newest first.
 */
export function sortCores(list: readonly CoreSummary[], sort: PlacesSort, here?: { lat: number; lon: number } | null): CoreSummary[] {
  const time = (c: CoreSummary) => Date.parse(c.createdAt) || 0;
  const byNew = (a: CoreSummary, b: CoreSummary) => time(b) - time(a);
  const out = [...list];
  switch (sort) {
    case 'oldest':
      return out.sort((a, b) => time(a) - time(b));
    case 'name':
      return out.sort((a, b) => placeLabel(a).title.localeCompare(placeLabel(b).title) || byNew(a, b));
    case 'flags':
      return out.sort((a, b) => flagCount(b) - flagCount(a) || byNew(a, b));
    case 'nearest':
      return here ? out.sort((a, b) => metresBetween(here, a) - metresBetween(here, b) || byNew(a, b)) : out.sort(byNew);
    default:
      return out.sort(byNew);
  }
}

/** Unsaved cores older than `days` — what "clear old checks" removes. Saved cores are never touched. */
export function staleUnsaved(cores: readonly CoreSummary[], now: number, days: number): string[] {
  const cutoff = now - days * 86_400_000;
  return cores.filter((c) => !c.saved && (Date.parse(c.createdAt) || 0) < cutoff).map((c) => c.id);
}
