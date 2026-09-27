import { MAX_COMPARE, initialPick, parseIds, toggleIn } from './pick';

describe('compare picking', () => {
  it('adds and removes a core', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('returns a full tray unchanged', () => {
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(full).toHaveLength(MAX_COMPARE);
    expect(toggleIn(full, 'f')).toBe(full);
    expect(toggleIn(full, 'c')).toEqual(['a', 'b', 'd', 'e']);
  });

  it('reads the ids param: known, unique, ordered, at most five', () => {
    const known = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(parseIds('c, a,zz,a', known)).toEqual(['c', 'a']);
    expect(parseIds('a,b,c,d,e,f', known)).toHaveLength(5);
    expect(parseIds(['a', 'b'], known)).toEqual(['a', 'b']);
    expect(parseIds(undefined, known)).toEqual([]);
  });

  it('starts with the passed cores, else the saved ones, topped up to two', () => {
    const cores = [
      { id: 'n1', saved: false },
      { id: 's1', saved: true },
      { id: 'n2', saved: false },
    ];
    expect(initialPick(cores, 'n2,n1')).toEqual(['n2', 'n1']);
    expect(initialPick(cores)).toEqual(['s1', 'n1']);
    expect(initialPick([{ id: 'x', saved: false }])).toEqual(['x']);
    expect(initialPick([])).toEqual([]);
  });
});
