import { canSeeFull, mergeCore, placeKey } from './rules';

describe('recent cores', () => {
  const core = (id: string, lat: number, lon: number, saved = false) => ({ id, lat, lon, saved });

  it('replaces an older unsaved core of the same place with the new one', () => {
    const list = [core('b', 17.419, 78.47), core('a', 12.9529, 80.2071)];
    const r = mergeCore(list, core('c', 17.41901, 78.47002), 40);
    expect(r.list.map((c) => c.id)).toEqual(['c', 'a']);
    expect(r.dropped).toEqual(['b']);
  });

  it('keeps a saved core of the same place (its site kit hangs off its id)', () => {
    const r = mergeCore([core('b', 17.419, 78.47, true)], core('c', 17.419, 78.47), 40);
    expect(r.list.map((c) => c.id)).toEqual(['c', 'b']);
    expect(r.dropped).toEqual([]);
  });

  it('keeps the saved flag when the same core is written again', () => {
    const r = mergeCore([core('a', 1, 2, true)], core('a', 1, 2), 40);
    expect(r.list).toEqual([core('a', 1, 2, true)]);
  });

  it('drops the oldest unsaved cores past the cap, never saved ones', () => {
    const list = [core('b', 2, 2), core('s', 3, 3, true), core('a', 4, 4)];
    const r = mergeCore(list, core('c', 1, 1), 2);
    expect(r.list.map((c) => c.id)).toEqual(['c', 'b', 's']);
    expect(r.dropped).toEqual(['a']);
  });
});

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
