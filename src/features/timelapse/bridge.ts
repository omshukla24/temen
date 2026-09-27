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
    info.play = typeof o.play === 'function' || typeof o.handlePlayPause === 'function';
    info.follows = typeof o.getCurrentFrameNumber === 'function' || (typeof o.getCurrentTime === 'function' && typeof o.getFps === 'function');
    window.__temenPlayer = o;
    send(info);
    watch(o);
  }
  // Report the player's frame whenever it changes, so the Year Dial follows playback.
  function frameOf(o) {
    try {
      if (typeof o.getCurrentFrameNumber === 'function') return o.getCurrentFrameNumber();
      if (typeof o.getCurrentTime === 'function' && typeof o.getFps === 'function') return Math.round(o.getCurrentTime() * o.getFps());
    } catch (e) {}
    return null;
  }
  function pausedOf(o) {
    try { if (typeof o.isPaused === 'function') return !!o.isPaused(); } catch (e) {}
    return null;
  }
  function watch(o) {
    var last = null, lastPaused = null;
    setInterval(function () {
      var f = frameOf(o), p = pausedOf(o);
      if (f === null || isNaN(f)) return;
      f = Math.round(f);
      if (f !== last || p !== lastPaused) {
        last = f; lastPaused = p;
        send({ type: 'frame', frame: f, paused: p });
      }
    }, 200);
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

/** Play or pause the probed player. */
export function playJs(play: boolean): string {
  return `
(function () {
  var o = window.__temenPlayer;
  if (!o) return;
  try {
    var paused = typeof o.isPaused === 'function' ? o.isPaused() : null;
    if (${play ? 'true' : 'false'}) {
      if (typeof o.play === 'function') o.play();
      else if (paused !== false && typeof o.handlePlayPause === 'function') o.handlePlayPause();
    } else {
      if (typeof o.pause === 'function') o.pause();
      else if (paused === false && typeof o.handlePlayPause === 'function') o.handlePlayPause();
    }
  } catch (e) {}
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
  /** The player can be played and paused from outside. */
  play?: boolean;
  /** The player reports its current frame, so the dial can follow it. */
  follows?: boolean;
  frames?: number | null;
  captureTimes?: string[] | null;
}

/** The player's frame changed (playback or its own controls). */
export interface FrameMessage {
  type: 'frame';
  frame: number;
  paused: boolean | null;
}

export type PlayerMessage = ProbeResult | FrameMessage;

/** Parses a WebView message; anything that isn't ours is null. */
export function parseMessage(data: string): PlayerMessage | null {
  try {
    const m = JSON.parse(data) as { type?: unknown; frame?: unknown };
    if (m && m.type === 'probe') return m as ProbeResult;
    if (m && m.type === 'frame' && typeof m.frame === 'number' && Number.isFinite(m.frame)) return m as FrameMessage;
  } catch {
    // not JSON: some page script
  }
  return null;
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

/** Frame → year: the player's capture time when it names one, else one frame per year. */
export function yearForFrame(frame: number, probe: ProbeResult | null, first = 1984, last = 2022): number {
  const times = probe?.captureTimes;
  const f = Math.max(0, Math.round(frame));
  if (times && f < times.length) {
    const m = /(19|20)\d{2}/.exec(String(times[f]));
    if (m) return Math.min(last, Math.max(first, Number(m[0])));
  }
  return Math.min(last, Math.max(first, first + f));
}
