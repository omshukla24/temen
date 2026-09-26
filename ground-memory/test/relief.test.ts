import { parseRelief, reliefUrl } from '../src/relief';
import { gdacs } from './synthetic';

describe('relief', () => {
  it('asks GDACS for the last 14 days of floods', () => {
    expect(reliefUrl(new Date('2026-09-26T10:00:00Z'))).toBe(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=2026-09-12&todate=2026-09-26&alertlevel=Green;Orange;Red',
    );
  });

  it('is in a relief zone only near a current flood', () => {
    const json = gdacs([
      { lat: 13.3, lon: 80.3, current: true, name: 'Chennai floods' },
      { lat: 13.0, lon: 80.25, current: false, name: 'Old flood' },
      { lat: 20, lon: 85, current: true, name: 'Far away' },
    ]);
    const r = parseRelief(json, 12.95, 80.2);
    expect(r.inZone).toBe(true);
    expect(r.event!.name).toBe('Chennai floods');
    expect(r.nearby.map((e) => e.name)).toEqual(['Old flood', 'Chennai floods']);
  });

  it('is not in a relief zone near a finished flood', () => {
    const r = parseRelief(gdacs([{ lat: 13.0, lon: 80.25, current: false, name: 'Old' }]), 12.95, 80.2);
    expect(r.inZone).toBe(false);
    expect(r.event!.name).toBe('Old');
  });

  it('survives an empty or odd response', () => {
    expect(parseRelief({}, 0, 0).inZone).toBe(false);
    expect(parseRelief({ features: [{ geometry: { type: 'Polygon' } }] }, 0, 0).nearby).toEqual([]);
  });
});
