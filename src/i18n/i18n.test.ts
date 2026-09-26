import en from './en.json';
import hi from './hi.json';
import { LIBRARY_HI } from './library-hi';
import { CANT_SEE_ALWAYS, questionsFor } from 'ground-memory';

describe('i18n', () => {
  it('has a Hindi string for every English key', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it('never tells anyone a place is safe, in either language', () => {
    // the one line that promises this is allowed to name the word
    const { 'home.honesty': _promise, ...rest } = en;
    void _promise;
    for (const v of [...Object.values(rest), ...Object.values(LIBRARY_HI)]) {
      expect(v).not.toMatch(/\b(un)?safe\b/i);
    }
  });

  it('translates every question the library can ask', () => {
    const all = { lostWater: true, onWater: false, seasonal: false, bowl: true, buffer: true, heavyRain: true, clayHeavy: true, bigQuake: true, relief: false };
    const none = Object.fromEntries(Object.keys(all).map((k) => [k, false])) as typeof all;
    for (const q of [...questionsFor(all), ...questionsFor({ ...none, buffer: true }), ...questionsFor(none)]) {
      expect(LIBRARY_HI[q]).toBeDefined();
    }
    expect(CANT_SEE_ALWAYS.length).toBeGreaterThanOrEqual(4);
  });
});
