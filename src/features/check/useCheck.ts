import { useCallback, useEffect, useRef, useState } from 'react';

import type { GroundReport, Progress, Stratum } from 'ground-memory';

import { placeName } from '@/services/geocode';
import { drill } from '@/services/ground';
import { reports } from '@/state/reports';

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

/**
 * Runs a core for a new pin (id = "new") or opens a saved one. Saved cores
 * open offline from kv-store; "re-core" drills the same spot again.
 */
export function useCheck(params: { id: string; lat?: string; lon?: string; label?: string; egg?: string }): CheckState & {
  recore: () => void;
} {
  const isNew = params.id === 'new';
  const saved = !isNew ? reports.get(params.id) : null;
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
    try {
      const report = await drill(at, params.label || null, (p) => {
        if (run.current !== my) return;
        setState((s) => ({ ...s, progress: p, done: p.last ? [...s.done, p.last] : s.done }));
      });
      const n = await name;
      if (!report.placeName && n) report.placeName = n.name;
      if (egg) report.strata.push(EGG);
      const trail = n?.trail?.length ? n.trail : [];
      if (run.current !== my) return;
      const allFailed = report.strata.filter((s) => s.key !== 'cantSee' && s.key !== 'egg').every((s) => s.status === 'error');
      if (allFailed) {
        setState((s) => ({ ...s, phase: 'failed', report: null, error: 'bedrock' }));
        return;
      }
      reports.put(report, trail);
      setState({ phase: 'done', report, trail, progress: null, done: [], error: null });
    } catch (e) {
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

  return { ...state, recore: start };
}
