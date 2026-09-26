import { canSeeFull, placeKey } from './rules';

describe('unlock rules', () => {
  it('keys a paid report to the place, ~11 m grid', () => {
    expect(placeKey(12.952871, 80.207061)).toBe('12.9529,80.2071');
    // two spots a couple of metres apart share a key
    expect(placeKey(12.95281, 80.20712)).toBe(placeKey(12.95284, 80.20714));
  });

  it('opens the full core for Pro, an unlocked place, or a relief zone', () => {
    const k = placeKey(12.9529, 80.2071);
    expect(canSeeFull(k, false, false, {})).toBe(false);
    expect(canSeeFull(k, false, true, {})).toBe(true);
    expect(canSeeFull(k, true, false, {})).toBe(true);
    expect(canSeeFull(k, false, false, { [k]: 'txn_1' })).toBe(true);
  });
});
