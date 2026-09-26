import { frameCount, timelapseEmbedUrl, timelapseViewerUrl, yearToFrame } from '../src/timelapse';

describe('timelapse', () => {
  it('builds the embed URL from the handoff spec', () => {
    expect(timelapseEmbedUrl(12.9442, 80.2292)).toBe(
      'https://earthengine.google.com/iframes/timelapse_player_embed.html#v=12.94420,80.22920,13,latLng&t=0.03&ps=25&bt=19840101&et=20221231&startDwell=0&endDwell=0',
    );
    expect(timelapseViewerUrl(1, 2)).toMatch(/^https:\/\/earthengine\.google\.com\/timelapse#v=1\.00000,2\.00000,13,latLng/);
  });

  it('maps years to frames', () => {
    expect(frameCount()).toBe(39);
    expect(yearToFrame(1984)).toBe(0);
    expect(yearToFrame(2022)).toBe(38);
    expect(yearToFrame(2030)).toBe(38);
    expect(yearToFrame(1900)).toBe(0);
  });
});
