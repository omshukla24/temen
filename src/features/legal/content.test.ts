import { HELP, PRIVACY, TERMS } from './content';

const all = [...PRIVACY.sections, ...TERMS.sections].flatMap((s) => [s.title, ...s.body]).concat(HELP.flatMap((h) => [h.q, h.a]));

describe('legal and help text', () => {
  it('never calls a place safe or unsafe', () => {
    for (const line of all) expect(line).not.toMatch(/\b(un)?safe\b/i);
  });

  it('names every data service the app sends coordinates to', () => {
    const where = PRIVACY.sections.find((s) => s.title === 'Your location')!.body.join(' ');
    for (const name of ['JRC', 'AWS', 'NASA POWER', 'USGS', 'SoilGrids', 'MET Norway', 'GDACS', 'Photon', 'OpenFreeMap', 'Timelapse']) {
      expect(where).toContain(name);
    }
  });

  it('tells people how to delete their data', () => {
    expect(PRIVACY.sections.some((s) => s.body.some((b) => b.includes('Delete account')))).toBe(true);
  });
});
