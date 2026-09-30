import type { GroundReport } from 'ground-memory';

import { KEYS, readJson, remove, writeJson } from '@/services/storage';

import { mergeCore } from './rules';
import { byNewest } from './syncRules';
import { persisted, useStore } from './store';

/** What the Home list needs, without loading every full report. */
export interface CoreSummary {
  id: string;
  lat: number;
  lon: number;
  placeName: string | null;
  trail: string[];
  headline: string;
  createdAt: string;
  elevationM: number | null;
  /** Stratum hatches + significance, drawn as the sliver. */
  bands: { hatch: string; significance: number; status: string }[];
  flags: GroundReport['flags'];
  saved: boolean;
}

export interface StoredReport {
  report: GroundReport;
  trail: string[];
}

const index = persisted<CoreSummary[]>(KEYS.reports, []);
const MAX_RECENT = 40;

/** What changed, for the account sync (only user actions; a sync's own writes are silent). */
export type CoreChange = { kind: 'put' | 'saved'; id: string } | { kind: 'remove'; id: string };
const watchers = new Set<(c: CoreChange) => void>();
const emit = (c: CoreChange) => watchers.forEach((w) => w(c));

export function summaryOf(report: GroundReport, trail: string[], saved: boolean): CoreSummary {
  return {
    id: report.id,
    lat: report.lat,
    lon: report.lon,
    placeName: report.placeName,
    trail,
    headline: report.headline,
    createdAt: report.createdAt,
    elevationM: report.elevationM,
    bands: report.strata.map((s) => ({ hatch: s.hatch, significance: s.significance, status: s.status })),
    flags: report.flags,
    saved,
  };
}

export const reports = {
  /** Keeps every drilled core so it opens offline later. */
  put(report: GroundReport, trail: string[]) {
    writeJson(KEYS.report(report.id), { report, trail } satisfies StoredReport);
    index.set((list) => {
      const { list: keep, dropped } = mergeCore(list, summaryOf(report, trail, false), MAX_RECENT);
      for (const id of dropped) remove(KEYS.report(id));
      return keep;
    });
    emit({ kind: 'put', id: report.id });
  },
  /**
   * Rewrites a core already on this phone (a layer that came in late) where it
   * stands in the list, keeping its saved flag. Unlike put() it never merges,
   * so a late layer can't push out a newer core of the same place. False, and
   * nothing written, when the core is gone (deleted or merged away). Watchers
   * hear of it once the report is on disk, so they can read it back.
   */
  update(report: GroundReport, trail: string[]): boolean {
    if (!index.get().some((c) => c.id === report.id)) return false;
    const written = writeJson(KEYS.report(report.id), { report, trail } satisfies StoredReport);
    index.set((list) => list.map((c) => (c.id === report.id ? summaryOf(report, trail, c.saved) : c)));
    written.then(() => emit({ kind: 'put', id: report.id }));
    return true;
  },
  get(id: string): StoredReport | null {
    return readJson<StoredReport | null>(KEYS.report(id), null);
  },
  setSaved(id: string, saved: boolean, silent = false) {
    index.set((list) => list.map((c) => (c.id === id ? { ...c, saved } : c)));
    if (!silent) emit({ kind: 'saved', id });
  },
  remove(id: string) {
    remove(KEYS.report(id));
    index.set((list) => list.filter((c) => c.id !== id));
    emit({ kind: 'remove', id });
  },
  /** Cores downloaded from the account: kept as they are, in date order, never merged away. */
  adopt(items: { stored: StoredReport; saved: boolean }[]) {
    if (!items.length) return;
    for (const { stored } of items) writeJson(KEYS.report(stored.report.id), stored);
    index.set((list) => {
      const have = new Set(list.map((c) => c.id));
      const fresh = items
        .filter((i) => !have.has(i.stored.report.id))
        .map((i) => summaryOf(i.stored.report, i.stored.trail ?? [], i.saved));
      return byNewest([...list, ...fresh]);
    });
  },
  /** Everything on this phone, for "Delete my data". */
  clear() {
    for (const c of index.get()) remove(KEYS.report(c.id));
    index.set([]);
  },
  watch(fn: (c: CoreChange) => void) {
    watchers.add(fn);
    return () => watchers.delete(fn);
  },
  list: () => index.get(),
  store: index,
};

export function useCores(): CoreSummary[] {
  return useStore(index);
}
