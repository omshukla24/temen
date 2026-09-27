import { placeLabel } from '@/features/placeLabel';
import type { CoreSummary } from '@/state/reports';

export type PlacesTab = 'recent' | 'saved';

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

/** The rows a tab shows, newest first (the store keeps that order), narrowed by the filter. */
export function visibleCores(cores: readonly CoreSummary[], tab: PlacesTab, query: string, translate?: (s: string) => string): CoreSummary[] {
  return cores.filter((c) => (tab === 'recent' || c.saved) && matches(c, query, translate));
}
