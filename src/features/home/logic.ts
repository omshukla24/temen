import { formatHemisphere, parseLocation, type ParsedLocation } from 'ground-memory';

import type { CoreSummary } from '@/state/reports';

/** "Temen-ni-gru" in any spacing: the easter egg (DESIGN.md). */
export const EGG = /temen[\s-]*ni[\s-]*gru/i;

/** Where the egg drills when the phone has no fix yet. */
export const EGG_FALLBACK = { lat: 12.9442, lon: 80.2292 };

const MIN_QUERY = 3;
const DAY_MS = 86_400_000;
const RECENT_DAYS = 30;

export type GreetingKey = 'home.greetMorning' | 'home.greetAfternoon' | 'home.greetEvening';

/** Morning 04–11, afternoon 12–16, evening the rest (late night reads as evening). */
export function greetingKey(hour: number): GreetingKey {
  if (hour >= 4 && hour < 12) return 'home.greetMorning';
  if (hour >= 12 && hour < 17) return 'home.greetAfternoon';
  return 'home.greetEvening';
}

const MAX_NAME = 18;

/** The first word of a display name, or null when there is nothing friendly to say. */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.includes('@') || first.length > MAX_NAME) return null;
  return first;
}

export type Age = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'days'; n: number } | { kind: 'date'; date: string } | { kind: 'unknown' };

const localDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** How long ago a core was drilled, in calendar days on this phone. */
export function ageOf(iso: string, now: number): Age {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { kind: 'unknown' };
  // rounding absorbs a daylight-saving hour
  const days = Math.round((localDay(new Date(now)) - localDay(d)) / DAY_MS);
  if (days <= 0) return { kind: 'today' };
  if (days === 1) return { kind: 'yesterday' };
  if (days < RECENT_DAYS) return { kind: 'days', n: days };
  return { kind: 'date', date: iso.slice(0, 10) };
}

/** The most recently drilled core, whatever order the list is in. */
export function latestCore(cores: readonly CoreSummary[]): CoreSummary | null {
  let best: CoreSummary | null = null;
  for (const c of cores) if (!best || c.createdAt > best.createdAt) best = c;
  return best;
}

/** Saved cores, newest first. */
export function savedCores(cores: readonly CoreSummary[]): CoreSummary[] {
  return cores.filter((c) => c.saved).sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** Only free text worth sending to the geocoder: not a pin, a link or the egg. */
export function shouldSearch(text: string): boolean {
  const q = text.trim();
  return q.length >= MIN_QUERY && parseLocation(q).kind === 'none' && !EGG.test(q);
}

export type DirectRow =
  | { kind: 'egg' }
  | { kind: 'point'; title: string }
  | { kind: 'link' }
  | { kind: 'code'; title: string }
  | { kind: 'query'; title: string };

/** What the row under the search field says for a pasted pin, link or code. */
export function directRow(q: string): DirectRow | null {
  if (EGG.test(q)) return { kind: 'egg' };
  const d: ParsedLocation = q.trim() ? parseLocation(q) : { kind: 'none' };
  switch (d.kind) {
    case 'point':
      return { kind: 'point', title: formatHemisphere(d.lat, d.lon, 5) };
    case 'resolve':
      return { kind: 'link' };
    case 'shortPlusCode':
      return { kind: 'code', title: d.code };
    case 'query':
      return { kind: 'query', title: d.text };
    default:
      return null;
  }
}

/** The ticking GPS line: coordinates to 5 dp and the accuracy, if known. */
export function fixText(fix: { lat: number; lon: number; accuracyM: number | null }): string {
  const acc = fix.accuracyM != null && Number.isFinite(fix.accuracyM) ? `  ±${Math.round(fix.accuracyM)} M` : '';
  return `${formatHemisphere(fix.lat, fix.lon, 5)}${acc}`;
}
