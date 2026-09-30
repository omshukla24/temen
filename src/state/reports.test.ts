import type { GroundReport } from 'ground-memory';

import { reports, type CoreChange } from './reports';

const mockMem = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => mockMem.get(k) ?? null,
    getItemAsync: async (k: string) => mockMem.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void mockMem.set(k, v),
    removeItemAsync: async (k: string) => void mockMem.delete(k),
    getAllKeysAsync: async () => [...mockMem.keys()],
  },
}));

/** Just enough of a report for the index. */
const core = (id: string, lat: number, lon: number, headline = 'Sits in a bowl'): GroundReport =>
  ({
    id,
    lat,
    lon,
    placeName: null,
    createdAt: '2026-09-30T10:00:00.000Z',
    elevationM: 3,
    headline,
    strata: [{ hatch: 'soil', significance: 0.25, status: 'pending' }],
    flags: {},
  }) as unknown as GroundReport;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('reports.update', () => {
  let changes: CoreChange[] = [];
  let unwatch: () => void = () => {};

  beforeEach(() => {
    reports.clear();
    changes = [];
    unwatch = reports.watch((c) => void changes.push(c));
  });
  afterEach(() => unwatch());

  it('rewrites a core in place, keeping its position and saved flag', async () => {
    reports.put(core('a', 12.95, 80.2), ['Chennai']);
    reports.put(core('b', 17.42, 78.47), []);
    reports.setSaved('a', true);
    await flush();
    changes = [];

    const late = { ...core('a', 12.95, 80.2, 'Heavy clay underfoot'), strata: [{ hatch: 'soil', significance: 0.8, status: 'ok' }] } as unknown as GroundReport;
    expect(reports.update(late, ['Chennai', 'Tamil Nadu'])).toBe(true);

    expect(reports.list().map((c) => c.id)).toEqual(['b', 'a']);
    const a = reports.list().find((c) => c.id === 'a')!;
    expect(a).toMatchObject({ saved: true, headline: 'Heavy clay underfoot', trail: ['Chennai', 'Tamil Nadu'] });
    expect(a.bands).toEqual([{ hatch: 'soil', significance: 0.8, status: 'ok' }]);
    await flush();
    expect(reports.get('a')).toEqual({ report: late, trail: ['Chennai', 'Tamil Nadu'] });
    expect(changes).toEqual([{ kind: 'put', id: 'a' }]);
  });

  it('does nothing for a core that was deleted', async () => {
    reports.put(core('a', 12.95, 80.2), []);
    reports.remove('a');
    await flush();
    changes = [];
    expect(reports.update(core('a', 12.95, 80.2, 'Heavy clay underfoot'), [])).toBe(false);
    await flush();
    expect(reports.list()).toEqual([]);
    expect(reports.get('a')).toBeNull();
    expect(changes).toEqual([]);
  });

  it('never brings back a core a newer one of the same place replaced', async () => {
    reports.put(core('old', 12.95, 80.2), []);
    reports.put(core('new', 12.95, 80.2), []);
    await flush();
    expect(reports.list().map((c) => c.id)).toEqual(['new']);
    changes = [];
    expect(reports.update(core('old', 12.95, 80.2, 'Heavy clay underfoot'), [])).toBe(false);
    await flush();
    expect(reports.list().map((c) => c.id)).toEqual(['new']);
    expect(reports.get('old')).toBeNull();
    expect(changes).toEqual([]);
  });
});
