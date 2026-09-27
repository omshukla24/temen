/**
 * Smoke test: every main screen renders in the live theme without throwing.
 * Native modules are replaced in screensSetup.js; Skia draws through CanvasKit.
 */
import { act, create } from 'react-test-renderer';

import { ThemeProvider } from '@/theme';

jest.setTimeout(20000);

function flatten(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flatten).join(' ');
  return flatten(node.children);
}

async function render(el: React.ReactElement) {
  let r: any;
  await act(async () => {
    r = create(<ThemeProvider>{el}</ThemeProvider>);
  });
  await act(async () => {
    await new Promise((res) => setTimeout(res, 50));
  });
  return r;
}

describe('screens render', () => {
  it('Home', async () => {
    const Home = require('@/app/(tabs)/index').default;
    const r = await render(<Home />);
    const text = flatten(r.toJSON());
    expect(text).toContain('TEMEN');
    expect(text).toContain('Core this ground');
  });
  it('Onboarding', async () => {
    const O = require('@/app/onboarding').default;
    const r = await render(<O />);
  });
  it('Watch', async () => {
    const W = require('@/app/(tabs)/watch').default;
    const r = await render(<W />);
  });
  it('Preferences', async () => {
    const P = require('@/app/settings').default;
    const r = await render(<P />);
  });
  it('Pick', async () => {
    const P = require('@/app/pick').default;
    const r = await render(<P />);
  });

  it('Check with a saved core', async () => {
    const { buildReport, parseRain, parseSoil, quakeReading, parseQuakeTop } = require('ground-memory');
    const { soilGrids, twoYears, usgsQuery } = require('../../ground-memory/test/synthetic');
    const ok = (v: any) => ({ ok: true, value: v, ms: 1 });
    const readings: any = {
      water: { ok: false, error: 'Water took longer than 15 s', ms: 1 },
      edge: { ok: false, error: 'x', ms: 1 },
      bowl: ok({ elevationM: 195, ringMedianM: 198.3, depthM: 3.2, lowerThan: 15, ringCount: 16, ringM: 400, reliefM: 10, isBowl: true, noData: false }),
      rain: ok(parseRain(twoYears({ '20030710': 134 }))),
      quakes: ok(quakeReading(97, parseQuakeTop(usgsQuery([{ mag: 6.9, lon: 75.1, lat: 28.7, depth: 10, time: 0, place: '17 km NE of Taranagar, India' }]), 28.486, 77.512))),
      soil: { ok: false, error: 'SoilGrids: no data here (water, rock or city core)', ms: 1 },
    };
    const r = buildReport({ lat: 28.486083, lon: 77.512026, placeName: 'Beta II', now: new Date('2026-09-27T09:59:00Z'), readings });
    const { reports } = require('@/state/reports');
    reports.put(r, ['Greater Noida']);
    (global as any).__params = { id: r.id };
    const C = require('@/app/check/[id]').default;
    const tree = await render(<C />);
    const text = flatten(tree.toJSON());
    expect(text).toContain('Sits in a bowl');
    expect(text).toContain('No reading');
    expect(text).toContain('TIME MACHINE');
  });
  it('Places', async () => {
    const P = require('@/app/(tabs)/places').default;
  });
  it('Account', async () => {
    const A = require('@/app/(tabs)/account').default;
  });
  it('Paywall', async () => {
    (global as any).__params = {};
    const P = require('@/app/paywall').default;
  });
  it('Time machine', async () => {
    (global as any).__params = { id: 'new', lat: '28.48', lon: '77.51' };
    const T = require('@/app/timelapse/[id]').default;
  });
  it('Compare', async () => {
    const C = require('@/app/compare').default;
  });
});
