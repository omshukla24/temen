import { frameForYear, parseMessage, playJs, seekJs, yearForFrame } from './bridge';

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
  it('turns the player frame back into a year', () => {
    const probe = { type: 'probe' as const, api: 'timelapse', captureTimes: ['1984', '1985', '1992 (composite)'] };
    expect(yearForFrame(2, probe)).toBe(1992);
    expect(yearForFrame(10, null)).toBe(1994);
    expect(yearForFrame(-3, null)).toBe(1984);
    expect(yearForFrame(99, null)).toBe(2022);
  });
  it('round-trips year → frame → year', () => {
    for (let y = 1984; y <= 2022; y++) expect(yearForFrame(frameForYear(y, null), null)).toBe(y);
  });
  it('reads only its own messages', () => {
    expect(parseMessage('{"type":"frame","frame":7,"paused":false}')).toEqual({ type: 'frame', frame: 7, paused: false });
    expect(parseMessage('{"type":"probe","api":null}')).toEqual({ type: 'probe', api: null });
    expect(parseMessage('{"type":"frame","frame":"x"}')).toBeNull();
    expect(parseMessage('hello')).toBeNull();
  });
  it('plays and pauses through the probed player', () => {
    expect(playJs(true)).toContain('o.play()');
    expect(playJs(false)).toContain('o.pause()');
  });
});
