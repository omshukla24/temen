import { buildReport, type Readings } from 'ground-memory';

import { esc, renderReportHtml, sealSvg } from './html';

const fail = { ok: false as const, error: 'offline', ms: 1 };
const readings = { water: fail, edge: fail, bowl: fail, rain: fail, quakes: fail, soil: fail } as unknown as Readings;

describe('report html', () => {
  const r = buildReport({ lat: 12.95287, lon: 80.20706, placeName: 'Kuberan <Nagar>', now: new Date('2026-09-26T08:00:00Z'), readings });
  const html = renderReportHtml(r, ['Chennai'], null, { faces: '', map: null, photos: '' });

  it('escapes user-facing text', () => {
    expect(esc('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
    expect(html).toContain('KUBERAN &lt;NAGAR&gt;');
    expect(html).not.toContain('<Nagar>');
  });

  it('always carries what it cannot see, sources and the seal', () => {
    expect(html).toContain("WHAT THIS CAN'T SEE");
    expect(html).toContain('SOURCES');
    expect(html).toContain('12.952870° N · 80.207060° E');
  });

  it('never calls the place safe', () => {
    expect(html.replace(/never calls a place safe or unsafe/i, '')).not.toMatch(/\b(un)?safe\b/i);
  });

  it('draws the seal with the date', () => {
    expect(sealSvg(-33.8, 151.2, '2026-09-26T08:00:00Z')).toContain('26 SEP 2026');
  });
});
