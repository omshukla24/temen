import { checklist } from './checklist';

const none = { lostWater: false, onWater: false, seasonal: false, bowl: false, buffer: false, heavyRain: false, clayHeavy: false, bigQuake: false, relief: false };

describe('site checklist', () => {
  it('always has the basics', () => {
    expect(checklist(null)).toHaveLength(5);
  });
  it('leads with what this ground showed', () => {
    const c = checklist({ ...none, bowl: true, lostWater: true, clayHeavy: true });
    expect(c[0]).toMatch(/slope/);
    expect(c.join(' ')).toMatch(/marsh/);
    expect(c[c.length - 1]).toMatch(/Cracks/);
  });
});
