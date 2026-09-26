/**
 * Talking to the Google Earth Timelapse embed from React Native.
 * The embed has no documented JS API, so we look for the CREATE Lab
 * time-machine player object the Timelapse viewer is built on and report what
 * exists. The dial only seeks when a seek method is really there.
 */
export const PROBE_JS = `
(function () {
  function send(msg) { try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {} }
  var tries = 0;
  function find() {
    var cands = ['timelapse', 'tm', 'player', 'timelapsePlayer'];
    for (var i = 0; i < cands.length; i++) {
      var o = window[cands[i]];
      if (o && typeof o === 'object') return { name: cands[i], obj: o };
    }
    return null;
  }
  function probe() {
    tries++;
    var f = find();
    if (!f) {
      if (tries < 40) return setTimeout(probe, 500);
      return send({ type: 'probe', api: null });
    }
    var o = f.obj;
    var info = {
      type: 'probe',
      api: f.name,
      seekToFrame: typeof o.seekToFrame === 'function',
      seek: typeof o.seek === 'function',
      pause: typeof o.pause === 'function',
      frames: typeof o.getNumFrames === 'function' ? o.getNumFrames() : null,
      captureTimes: typeof o.getCaptureTimes === 'function' ? (o.getCaptureTimes() || []).slice(0, 60) : null
    };
    window.__temenPlayer = o;
    send(info);
  }
  probe();
})();
true;
`;

/** JS to jump the player to a frame (only sent when the probe found seekToFrame). */
export function seekJs(frame: number): string {
  return `
(function () {
  var o = window.__temenPlayer;
  if (!o) return;
  try { if (o.pause) o.pause(); if (o.seekToFrame) o.seekToFrame(${Math.max(0, Math.round(frame))}); } catch (e) {}
})();
true;
`;
}

export interface ProbeResult {
  type: 'probe';
  api: string | null;
  seekToFrame?: boolean;
  seek?: boolean;
  pause?: boolean;
  frames?: number | null;
  captureTimes?: string[] | null;
}

/** Year → frame, using the player's own capture times when it reports them. */
export function frameForYear(year: number, probe: ProbeResult | null, first = 1984): number {
  const times = probe?.captureTimes;
  if (times && times.length) {
    const i = times.findIndex((t) => String(t).includes(String(year)));
    if (i >= 0) return i;
  }
  return year - first;
}
