import { useCallback, useEffect, useRef, useState } from 'react';

import { settleStale, type GroundReport, type Progress, type Stratum } from 'ground-memory';

import { placeName } from '@/services/geocode';
import { drill, lateCores } from '@/services/ground';
import { reports, type StoredReport } from '@/state/reports';

export type CheckPhase = 'drilling' | 'done' | 'failed';

export interface CheckState {
  phase: CheckPhase;
  report: GroundReport | null;
  trail: string[];
  progress: Progress | null;
  done: string[];
  error: string | null;
}

const EGG: Stratum = {
  index: 7,
  key: 'egg',
  title: 'Temen-ni-gru',
  reading: '∞',
  value: null,
  unit: 'risen',
  headline: 'TEMEN-NI-GRU · RISEN',
  detail: 'The drill went past bedrock. Something under here is climbing.',
  confidence: 'low',
  significance: 0.2,
  status: 'ok',
  source: { name: 'Devil May Cry 3', years: '2005', resolution: '1 tower', url: 'https://en.wikipedia.org/wiki/Devil_May_Cry_3:_Dante%27s_Awakening' },
  hatch: 'egg',
  flag: null,
  facts: [],
};

const hasPending = (r: GroundReport) => r.strata.some((s) => s.status === 'pending');

/**
 * A saved core as it should open: a layer still pending stays pending only
 * while its late answer is still on its way in this session.
 */
function opened(stored: StoredReport | null, id: string): StoredReport | null {
  if (!stored || !hasPending(stored.report) || lateCores.has(id)) return stored;
  return { ...stored, report: settleStale(stored.report) };
}

/** The first core as it was kept (its place name, the egg) with the late layer in. */
function withLate(kept: GroundReport, late: GroundReport): GroundReport {
  const egg = kept.strata.find((s) => s.key === 'egg');
  return { ...late, placeName: kept.placeName, strata: egg ? [...late.strata, egg] : late.strata };
}

/**
 * Runs a core for a new pin (id = "new") or opens a saved one. Saved cores
 * open offline from kv-store; "re-core" drills the same spot again. Slow soil
 * comes in after the core is shown, and is written into the kept core.
 */
export function useCheck(params: { id: string; lat?: string; lon?: string; label?: string; egg?: string }): CheckState & {
  recore: () => void;
} {
  const isNew = params.id === 'new';
  const stored = !isNew ? reports.get(params.id) : null;
  const saved = opened(stored, params.id);
  const [state, setState] = useState<CheckState>(() =>
    saved
      ? { phase: 'done', report: saved.report, trail: saved.trail, progress: null, done: [], error: null }
      : { phase: 'drilling', report: null, trail: [], progress: null, done: [], error: saved === null && !isNew ? 'This core is no longer on this phone.' : null },
  );
  const run = useRef(0);

  const at = saved ? { lat: saved.report.lat, lon: saved.report.lon } : { lat: Number(params.lat), lon: Number(params.lon) };
  const egg = params.egg === '1';

  const start = useCallback(async () => {
    const my = ++run.current;
    if (!Number.isFinite(at.lat) || !Number.isFinite(at.lon)) {
      setState((s) => ({ ...s, phase: 'failed', error: 'No place to core.' }));
      return;
    }
    setState((s) => ({ ...s, phase: 'drilling', progress: null, done: [], error: null }));
    const name = placeName(at.lat, at.lon).catch(() => null);
    // the core as kept, once it is; null if it never was (failed, or left behind)
    let keep: (kept: StoredReport | null) => void = () => {};
    const kept = new Promise<StoredReport | null>((resolve) => (keep = resolve));
    const onLate = (late: GroundReport) => {
      kept.then((k) => {
        if (!k) return;
        const report = withLate(k.report, late);
        // written even if the screen has moved on; a no-op if the core is gone
        if (!reports.update(report, k.trail)) return;
        if (run.current === my) setState((s) => ({ ...s, report }));
      });
    };
    try {
      const report = await drill(
        at,
        params.label || null,
        (p) => {
          if (run.current !== my) return;
          setState((s) => ({ ...s, progress: p, done: p.last ? [...s.done, p.last] : s.done }));
        },
        onLate,
      );
      const n = await name;
      if (!report.placeName && n) report.placeName = n.name;
      if (egg) report.strata.push(EGG);
      const trail = n?.trail?.length ? n.trail : [];
      if (run.current !== my) {
        keep(null);
        return;
      }
      // a layer still on its way has not been read either
      const allFailed = report.strata
        .filter((s) => s.key !== 'cantSee' && s.key !== 'egg')
        .every((s) => s.status === 'error' || s.status === 'pending');
      if (allFailed) {
        keep(null);
        setState((s) => ({ ...s, phase: 'failed', report: null, error: 'bedrock' }));
        return;
      }
      reports.put(report, trail);
      keep({ report, trail });
      setState({ phase: 'done', report, trail, progress: null, done: [], error: null });
    } catch (e) {
      keep(null);
      if (run.current !== my) return;
      setState((s) => ({ ...s, phase: 'failed', error: e instanceof Error ? e.message : 'bedrock' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at.lat, at.lon, params.label, egg]);

  useEffect(() => {
    if (isNew) start();
    return () => {
      run.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A saved core kept with a layer pending picks it up if it lands while open.
  const waiting = !!stored && hasPending(stored.report);
  useEffect(() => {
    if (!waiting) return;
    const id = params.id;
    const unwatch = reports.watch((c) => {
      if (c.kind !== 'put' || c.id !== id) return;
      const fresh = reports.get(id);
      if (fresh) setState((s) => (s.report?.id === id ? { ...s, report: fresh.report, trail: fresh.trail } : s));
    });
    return () => {
      unwatch();
    };
  }, [waiting, params.id]);

  return { ...state, recore: start };
}
