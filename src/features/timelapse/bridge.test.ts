import { frameForYear, seekJs } from './bridge';

describe('timelapse bridge', () => {
  it('prefers the player capture times', () => {
    expect(frameForYear(1992, { type: 'probe', api: 'timelapse', captureTimes: ['1984', '1985', '1992'] })).toBe(2);
  });
  it('falls back to one frame per year from 1984', () => {
    expect(frameForYear(1992, null)).toBe(8);
    expect(frameForYear(1992, { type: 'probe', api: 'timelapse', captureTimes: ['2001'] })).toBe(8);
  });
  it('only seeks through the probed player', () => {
    expect(seekJs(3.4)).toContain('seekToFrame(3)');
    expect(seekJs(-2)).toContain('seekToFrame(0)');
  });
});
