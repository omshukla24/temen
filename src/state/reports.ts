import type { GroundReport } from 'ground-memory';

import { KEYS, readJson, remove, writeJson } from '@/services/storage';

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
      const prev = list.find((c) => c.id === report.id);
      const next = [summaryOf(report, trail, prev?.saved ?? false), ...list.filter((c) => c.id !== report.id)];
      // drop the oldest unsaved cores beyond the cap
      const keep: CoreSummary[] = [];
      let unsaved = 0;
      for (const c of next) {
        if (!c.saved && ++unsaved > MAX_RECENT) {
          remove(KEYS.report(c.id));
          continue;
        }
        keep.push(c);
      }
      return keep;
    });
  },
  get(id: string): StoredReport | null {
    return readJson<StoredReport | null>(KEYS.report(id), null);
  },
  setSaved(id: string, saved: boolean) {
    index.set((list) => list.map((c) => (c.id === id ? { ...c, saved } : c)));
  },
  remove(id: string) {
    remove(KEYS.report(id));
    index.set((list) => list.filter((c) => c.id !== id));
  },
  list: () => index.get(),
  store: index,
};

export function useCores(): CoreSummary[] {
  return useStore(index);
}
