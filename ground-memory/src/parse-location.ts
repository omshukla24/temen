import { OpenLocationCode } from 'open-location-code';

import { isValidLatLon } from './geo';

export type ParsedLocation =
  | { kind: 'point'; lat: number; lon: number; label: string | null; via: string }
  /** A short link (maps.app.goo.gl …) the app must follow, then parse the final URL. */
  | { kind: 'resolve'; url: string }
  /** A short plus code like "VQJ2+4R Chennai": needs a reference point to recover. */
  | { kind: 'shortPlusCode'; code: string; locality: string | null }
  /** A maps link that carries only a place name or address: search for it. */
  | { kind: 'query'; text: string }
  | { kind: 'none' };

const olc = new OpenLocationCode();

const NUM = String.raw`[-+−]?\d{1,3}(?:\.\d+)?`;

function num(s: string): number {
  return Number(s.replace('−', '-').replace('+', ''));
}

function point(lat: number, lon: number, via: string, label: string | null = null): ParsedLocation | null {
  if (!isValidLatLon(lat, lon)) return null;
  if (lat === 0 && lon === 0) return null; // "null island" is a placeholder, never a real pin
  return { kind: 'point', lat, lon, label, via };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s.replace(/\+/g, ' ');
  }
}

const URL_RE = /\b(?:https?:\/\/|geo:)[^\s<>"']+/gi;
const SHORT_LINK_RE =
  /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.google\.[a-z.]+\/\?cid=|share\.google|w\.wiki|osm\.org\/go)\b/i;

/** "lat,lon" or "lat lon" or "loc:lat+lon" inside a query value. */
function pairIn(value: string): { lat: number; lon: number } | null {
  const v = safeDecode(value).replace(/^loc:/i, '').trim();
  const m = v.match(new RegExp(`^(${NUM})\\s*[,;\\s]\\s*(${NUM})(?:\\b|$)`));
  if (!m) return null;
  return { lat: num(m[1]), lon: num(m[2]) };
}

function labelFromQuery(value: string): string | null {
  const m = safeDecode(value).match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

/** Trailing punctuation from the sentence around a link; keep a ")" that closes a label. */
function trimUrl(raw: string): string {
  let url = raw.replace(/[.,;!?]+$/, '');
  while (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(/[.,;!?]+$/, '');
  }
  return url;
}

function parseUrl(raw: string): ParsedLocation | null {
  const url = trimUrl(raw);

  // Google place pages carry the real pin as !3dLAT!4dLON; the /@ part is only the viewport.
  const place = url.match(new RegExp(`!3d(${NUM})!4d(${NUM})`));
  if (place) {
    const p = point(num(place[1]), num(place[2]), 'google-place');
    if (p) return p;
  }

  // geo:lat,lon[;u=..][?q=lat,lon(label)]
  if (/^geo:/i.test(url)) {
    const body = url.slice(4);
    const [path, query = ''] = body.split('?');
    const params = new URLSearchParams(query);
    const q = params.get('q');
    const base = pairIn(path.split(';')[0]);
    if (q) {
      const qp = pairIn(q);
      if (qp) {
        const p = point(qp.lat, qp.lon, 'geo', labelFromQuery(q));
        if (p) return p;
      }
    }
    if (base) {
      const p = point(base.lat, base.lon, 'geo', q ? safeDecode(q) : null);
      if (p) return p;
    }
    if (q) return { kind: 'query', text: safeDecode(q) };
    return null;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }

  if (parsed) {
    const p = parsed.searchParams;
    // OpenStreetMap marker
    const mlat = p.get('mlat');
    const mlon = p.get('mlon');
    if (mlat && mlon) {
      const r = point(num(mlat), num(mlon), 'osm');
      if (r) return r;
    }
    for (const key of ['q', 'query', 'destination', 'daddr', 'll', 'sll', 'center', 'coordinate', 'location', 'saddr']) {
      const v = p.get(key);
      if (!v) continue;
      const pr = pairIn(v);
      if (pr) {
        const r = point(pr.lat, pr.lon, `param-${key}`, labelFromQuery(v));
        if (r) return r;
      }
    }
  }

  // google.com/maps/@lat,lon,17z
  const at = url.match(new RegExp(`/@(${NUM}),(${NUM})`));
  if (at) {
    const r = point(num(at[1]), num(at[2]), 'google-viewport');
    if (r) return r;
  }

  // openstreetmap.org/#map=17/lat/lon
  const hash = url.match(new RegExp(`#map=\\d+(?:\\.\\d+)?/(${NUM})/(${NUM})`));
  if (hash) {
    const r = point(num(hash[1]), num(hash[2]), 'osm-hash');
    if (r) return r;
  }

  if (SHORT_LINK_RE.test(url)) return { kind: 'resolve', url };

  if (parsed) {
    // a maps link that names a place but has no coordinates
    const q = parsed.searchParams.get('q') ?? parsed.searchParams.get('query');
    if (q && /maps|geo/i.test(parsed.hostname + parsed.pathname)) return { kind: 'query', text: safeDecode(q) };
    const placeName = parsed.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
    if (placeName) {
      // a shared dropped pin resolves to /maps/search/LAT,+LON: that is the pin, not a name
      const pr = pairIn(placeName[1]);
      const pin = pr && point(pr.lat, pr.lon, 'google-search');
      if (pin) return pin;
      return { kind: 'query', text: safeDecode(placeName[1]) };
    }
  }
  return null;
}

// 12°56'39.1"N 80°13'45.1"E, also with ′ ″ and decimal minutes.
const DMS_RE =
  /(\d{1,3})\s*°\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′’]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|”|''|′′)\s*)?([NS])[\s,;]+(\d{1,3})\s*°\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′’]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|”|''|′′)\s*)?([EW])/i;

function parseDms(text: string): ParsedLocation | null {
  const m = text.match(DMS_RE);
  if (!m) return null;
  const part = (d: string, mm?: string, ss?: string) => num(d) + (mm ? num(mm) / 60 : 0) + (ss ? num(ss) / 3600 : 0);
  let lat = part(m[1], m[2], m[3]);
  let lon = part(m[5], m[6], m[7]);
  if (m[4].toUpperCase() === 'S') lat = -lat;
  if (m[8].toUpperCase() === 'W') lon = -lon;
  return point(lat, lon, 'dms');
}

// 12.9442° N, 80.2292° E  /  12.9442N 80.2292E
const HEMI_RE = /(\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])[\s,;]+(\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])\b/i;

function parseHemisphere(text: string): ParsedLocation | null {
  const m = text.match(HEMI_RE);
  if (!m) return null;
  const lat = num(m[1]) * (m[2].toUpperCase() === 'S' ? -1 : 1);
  const lon = num(m[3]) * (m[4].toUpperCase() === 'W' ? -1 : 1);
  return point(lat, lon, 'hemisphere');
}

// "12.9442, 80.2292" — needs a decimal point on both numbers so dates and phone numbers never match.
const PAIR_RE = /(?:^|[^\d.\w])([-+−]?\d{1,2}\.\d+)\s*[,;]?\s+([-+−]?\d{1,3}\.\d+)(?![\d.])|(?:^|[^\d.\w])([-+−]?\d{1,2}\.\d+)\s*[,;]\s*([-+−]?\d{1,3}\.\d+)(?![\d.])/;

function parsePair(text: string): ParsedLocation | null {
  const m = text.match(PAIR_RE);
  if (!m) return null;
  const lat = num(m[1] ?? m[3]);
  const lon = num(m[2] ?? m[4]);
  return point(lat, lon, 'decimal');
}

const PLUS_FULL_RE = /\b([23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i;
const PLUS_SHORT_RE = /\b([23456789CFGHJMPQRVWX]{4,6}\+[23456789CFGHJMPQRVWX]{2,3})\b(?:[\s,]+([^\n]+))?/i;

function parsePlusCode(text: string): ParsedLocation | null {
  const full = text.match(PLUS_FULL_RE);
  if (full && olc.isFull(full[1].toUpperCase())) {
    const area = olc.decode(full[1].toUpperCase());
    return point(area.latitudeCenter, area.longitudeCenter, 'plus-code');
  }
  const short = text.match(PLUS_SHORT_RE);
  if (short && olc.isShort(short[1].toUpperCase())) {
    const locality = short[2]?.trim().replace(/^[,\s]+/, '') || null;
    return { kind: 'shortPlusCode', code: short[1].toUpperCase(), locality };
  }
  return null;
}

/** Recovers a short plus code near a reference point (e.g. the geocoded locality). */
export function recoverPlusCode(code: string, refLat: number, refLon: number): { lat: number; lon: number } | null {
  try {
    const full = olc.recoverNearest(code.toUpperCase(), refLat, refLon);
    const area = olc.decode(full);
    return { lat: area.latitudeCenter, lon: area.longitudeCenter };
  } catch {
    return null;
  }
}

/**
 * Reads a location out of anything people share: WhatsApp location messages,
 * Google/Apple/OSM links, geo: URIs, DMS, decimal pairs and plus codes.
 */
export function parseLocation(input: string | null | undefined): ParsedLocation {
  if (!input) return { kind: 'none' };
  const text = input.trim();
  if (!text) return { kind: 'none' };

  const urls = text.match(URL_RE) ?? [];
  let pending: ParsedLocation | null = null;
  for (const u of urls) {
    const r = parseUrl(u);
    if (!r) continue;
    if (r.kind === 'point') return r;
    pending ??= r;
  }

  // Coordinates written out in the message itself. Only undo %-escapes here:
  // "+" is meaningful outside URLs (plus codes, signed numbers).
  let decoded = text;
  if (/%[0-9a-f]{2}/i.test(text)) {
    try {
      decoded = decodeURIComponent(text);
    } catch {
      decoded = text;
    }
  }
  const direct = parseDms(decoded) ?? parseHemisphere(decoded) ?? parsePlusCode(decoded);
  if (direct?.kind === 'point') return direct;

  // Only look for a bare decimal pair outside URLs, so tracking ids never read as coordinates.
  const noUrls = decoded.replace(URL_RE, ' ');
  const pair = parsePair(noUrls);
  if (pair) return pair;

  return pending ?? direct ?? { kind: 'none' };
}
