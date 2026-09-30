import { formatHemisphere, type GroundReport } from 'ground-memory';

import { placeLabel } from '@/features/placeLabel';

/** One stratum as the card prints it; a sealed one keeps its name and hides the reading. */
export interface CardRow {
  index: string;
  title: string;
  reading: string;
  unit: string;
  headline: string;
  /**
   * ok = a reading; error = the source didn't answer this time (or, pending,
   * hadn't yet); empty = nothing modelled here.
   */
  state: 'ok' | 'sealed' | 'error' | 'empty';
}

export interface CardModel {
  title: string;
  subtitle: string;
  headline: string;
  coords: string;
  date: string;
  coreId: string;
  rows: CardRow[];
  bands: { hatch: string; significance: number; status: string }[];
  sources: string;
  seed: number;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "27 SEP 2026" from an ISO time, in UTC so the card reads the same everywhere. */
export function cardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** A small stable number from the core id, so each place gets its own terrain behind the card. */
export function cardSeed(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

/**
 * What a shared card shows: the place, the core's headline, one row per stratum
 * (sealed rows keep their name but not their reading, so a card never gives
 * away a paid layer), the coordinates, the date and the sources by name.
 */
export function cardModel(
  report: GroundReport,
  trail: string[],
  opts: { full: boolean; freeStrata: number; translate?: (s: string) => string },
): CardModel {
  const tl = opts.translate ?? ((s: string) => s);
  const label = placeLabel({ placeName: report.placeName, trail, lat: report.lat, lon: report.lon });
  const strata = report.strata.filter((s) => s.key !== 'cantSee' && s.key !== 'egg');
  const rows: CardRow[] = strata.map((s, i) => {
    const state: CardRow['state'] =
      !opts.full && i >= opts.freeStrata ? 'sealed' : s.status === 'error' || s.status === 'pending' ? 'error' : s.status !== 'ok' || s.value === null ? 'empty' : 'ok';
    const shown = state === 'ok';
    return {
      index: String(s.index).padStart(2, '0'),
      title: tl(s.title).toUpperCase(),
      reading: shown ? s.reading : '',
      unit: shown ? s.unit : '',
      headline: shown ? tl(s.headline) : '',
      state,
    };
  });
  return {
    title: label.title,
    subtitle: label.subtitle,
    headline: tl(report.headline),
    coords: formatHemisphere(report.lat, report.lon, 5),
    date: cardDate(report.createdAt),
    coreId: report.id.slice(0, 6).toUpperCase(),
    rows,
    bands: report.strata.map((s) => ({ hatch: s.hatch, significance: s.significance, status: s.status })),
    sources: [...new Set(report.sources.map((s) => s.name.split(' (')[0]))].join(' · '),
    seed: cardSeed(report.id),
  };
}
