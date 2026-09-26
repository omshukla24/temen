import en from './en.json';
import hi from './hi.json';
import { LIBRARY_HI } from './library-hi';
import { CANT_SEE_ALWAYS, questionsFor } from 'ground-memory';

import { checklist } from '@/features/sitekit/checklist';

import { translate } from '.';

describe('i18n', () => {
  it('has a Hindi string for every English key', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it('never tells anyone a place is safe, in either language', () => {
    // the lines that promise this are allowed to name the word
    const { 'home.honesty': _promise, 'settings.aboutBody': _about, ...rest } = en;
    void _promise;
    void _about;
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

  it('translates every site-kit checklist item', () => {
    const all = { lostWater: true, onWater: false, seasonal: true, bowl: true, buffer: true, heavyRain: true, clayHeavy: true, bigQuake: true, relief: false };
    for (const item of checklist(all)) expect(LIBRARY_HI[item]).toBeDefined();
  });

  it('fills placeholders and leaves unknown ones alone', () => {
    expect(translate('en', 'paywall.useCredit', { n: 2 })).toBe('Use a restored report (2 left)');
    expect(translate('hi', 'paywall.save', { n: 30 })).toBe('30% बचत');
    expect(translate('en', 'settings.noStore', {})).toContain('{mode}');
  });
});
