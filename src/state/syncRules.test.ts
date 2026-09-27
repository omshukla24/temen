import { byNewest, cleanCode, codeFromUrl, errorFromUrl, isCode, isEmail, planSync, type RemoteCore } from './syncRules';

const remote = (id: string, saved = false): RemoteCore => ({
  id,
  lat: 12.95,
  lon: 80.2,
  place_name: null,
  headline: null,
  saved,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
});
const local = (id: string, saved = false, createdAt = '2026-09-01T00:00:00Z') => ({ id, saved, createdAt });

describe('planSync', () => {
  it('downloads what only the account has and uploads what only the phone has', () => {
    const p = planSync([local('a'), local('b')], [remote('b'), remote('c')]);
    expect(p.download).toEqual(['c']);
    expect(p.upload).toEqual(['a']);
    expect(p.markSaved).toEqual([]);
  });

  it('keeps a place saved on either side saved on both', () => {
    const p = planSync([local('a', true), local('b', false)], [remote('a', false), remote('b', true)]);
    expect(p.upload).toEqual(['a']);
    expect(p.markSaved).toEqual(['b']);
  });

  it('does nothing when both sides agree', () => {
    expect(planSync([local('a', true)], [remote('a', true)])).toEqual({ download: [], upload: [], markSaved: [] });
  });

  it('never plans a deletion', () => {
    const p = planSync([], [remote('x')]);
    expect(p.download).toEqual(['x']);
    expect(p.upload).toEqual([]);
  });
});

describe('byNewest', () => {
  it('sorts newest first without touching the input', () => {
    const list = [local('a', false, '2026-01-01'), local('b', false, '2026-03-01'), local('c', false, '2026-02-01')];
    expect(byNewest(list).map((c) => c.id)).toEqual(['b', 'c', 'a']);
    expect(list[0].id).toBe('a');
  });
});

describe('sign-in input', () => {
  it('accepts ordinary email addresses', () => {
    expect(isEmail('om@example.com')).toBe(true);
    expect(isEmail('  om.shukla+temen@mail.co.in ')).toBe(true);
    expect(isEmail('om@')).toBe(false);
    expect(isEmail('om example.com')).toBe(false);
  });

  it('keeps only digits in a code, 6 to 8 of them', () => {
    expect(cleanCode(' 12 34-56 ')).toBe('123456');
    expect(cleanCode('1234567890')).toBe('12345678');
    expect(isCode('123456')).toBe(true);
    expect(isCode('12345')).toBe(false);
    expect(isCode('12345678')).toBe(true);
  });

  it('reads the code or the error an OAuth redirect carries', () => {
    expect(codeFromUrl('temen://auth-callback?code=abc-123&state=x')).toBe('abc-123');
    expect(codeFromUrl('temen://auth-callback#error=access_denied')).toBeNull();
    expect(errorFromUrl('temen://auth-callback?error=access_denied&error_description=Provider+is+not+enabled')).toBe('Provider is not enabled');
    expect(errorFromUrl('temen://auth-callback?code=1')).toBeNull();
  });
});
