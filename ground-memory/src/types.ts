export interface LatLon {
  lat: number;
  lon: number;
}

/** Fetch a map tile. Resolve null when the server has no tile there (HTTP 404). */
export type FetchTile = (url: string) => Promise<ArrayBuffer | null>;

/** Fetch and parse JSON. Reject on network errors or non-2xx responses. */
export type FetchJson = (url: string, init?: { headers?: Record<string, string> }) => Promise<unknown>;

/**
 * Everything ground-memory needs from the platform. Injected so the library
 * runs the same in Node, in tests (fixtures) and in the app.
 */
export interface Deps {
  fetchJson: FetchJson;
  fetchTile: FetchTile;
  now: () => Date;
  /** Per-source timeout in ms. Default 8000. */
  timeoutMs?: number;
  /** Sent where an API asks for identification (MET Norway requires it). */
  userAgent?: string;
}

export type Confidence = 'low' | 'med' | 'high';

export interface SourceRef {
  name: string;
  years: string;
  resolution: string;
  url: string;
  licence?: string;
}

export type StratumKey =
  | 'water'
  | 'buffer'
  | 'ground'
  | 'rain'
  | 'quakes'
  | 'soil'
  | 'forecast'
  | 'cantSee'
  | 'egg';

/** pending: a slow source still on its way; a later report fills it in. */
export type StratumStatus = 'ok' | 'error' | 'empty' | 'pending';

/** Each stratum type has its own hatch in the Core. */
export type Hatch = 'water' | 'lostWater' | 'ground' | 'rain' | 'quakes' | 'soil' | 'cantSee' | 'egg';

export interface Fact {
  label: string;
  value: string;
}

export interface Stratum {
  index: number;
  key: StratumKey;
  title: string;
  /** Display string for the reading, e.g. "66%", "−1.7 m", "188 mm". */
  reading: string;
  /** Numeric value behind the reading, for count-ups and compare. */
  value: number | null;
  unit: string;
  /** One-line headline in plain words. */
  headline: string;
  detail: string;
  confidence: Confidence;
  /** 0..1, how much this stratum should weigh visually (band height). */
  significance: number;
  status: StratumStatus;
  source: SourceRef;
  hatch: Hatch;
  /** A laterite flag shown on the band (e.g. the buffer rule). */
  flag: string | null;
  facts: Fact[];
}

export interface GroundFlags {
  lostWater: boolean;
  onWater: boolean;
  seasonal: boolean;
  bowl: boolean;
  buffer: boolean;
  heavyRain: boolean;
  clayHeavy: boolean;
  bigQuake: boolean;
  relief: boolean;
}

export interface GroundReport {
  id: string;
  lat: number;
  lon: number;
  placeName: string | null;
  createdAt: string;
  elevationM: number | null;
  headline: string;
  strata: Stratum[];
  questions: string[];
  cantSee: string[];
  sources: SourceRef[];
  flags: GroundFlags;
  /** Paywall teaser built from this plot's own strongest finding. */
  teaser: string;
  version: number;
}
