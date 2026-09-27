import { alertDue } from './alerts';

describe('alertDue', () => {
  const today = '2026-09-27';
  it('alerts once a day for heavy rain', () => {
    expect(alertDue({ heavy: true, today, muted: false })).toBe(true);
    expect(alertDue({ heavy: true, notified: today, today, muted: false })).toBe(false);
    expect(alertDue({ heavy: true, notified: '2026-09-26', today, muted: false })).toBe(true);
  });
  it('stays quiet for light rain and for muted places', () => {
    expect(alertDue({ heavy: false, today, muted: false })).toBe(false);
    expect(alertDue({ heavy: true, today, muted: true })).toBe(false);
  });
});
