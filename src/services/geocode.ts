import * as Location from 'expo-location';

import { APP_UA, fetchJson } from './http';

export interface Place {
  id: string;
  name: string;
  /** "Madipakkam, Chennai, Tamil Nadu" */
  context: string;
  lat: number;
  lon: number;
  kind: string;
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

function contextOf(p: Record<string, string | number | undefined>): string {
  const parts = [p.district ?? p.locality, p.city ?? p.county, p.state, p.country].filter(Boolean) as string[];
  return [...new Set(parts)].join(', ');
}

/** Photon (komoot) search. Fair use: callers debounce; results cached in memory. */
const cache = new Map<string, Place[]>();

export async function searchPlaces(q: string, near?: { lat: number; lon: number }, signal?: AbortSignal): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const key = `${query.toLowerCase()}|${near ? `${near.lat.toFixed(1)},${near.lon.toFixed(1)}` : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const bias = near ? `&lat=${near.lat.toFixed(3)}&lon=${near.lon.toFixed(3)}` : '';
  const json = (await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6${bias}`, {
    headers: { 'User-Agent': APP_UA },
    signal,
  })) as { features?: PhotonFeature[] };
  const out: Place[] = [];
  for (const f of json.features ?? []) {
    const c = f.geometry?.coordinates;
    const p = f.properties ?? {};
    if (!c) continue;
    const name = String(p.name ?? p.street ?? p.city ?? 'Unnamed place');
    out.push({
      id: `${p.osm_type ?? ''}${p.osm_id ?? `${c[1]},${c[0]}`}`,
      name,
      context: contextOf(p),
      lat: c[1],
      lon: c[0],
      kind: String(p.osm_value ?? p.type ?? ''),
    });
  }
  cache.set(key, out);
  return out;
}

type Named = { name: string; trail: string[] };

const named = (name: string | null | undefined, city: string | null | undefined): Named | null =>
  name ? { name, trail: city && city !== name ? [city] : [] } : null;

/** The UI reads English or Hindi; a name in another script (Arabic in Dubai) gets an English try. */
const readable = (s: string) => /[A-Za-zऀ-ॿ]/.test(s);

/**
 * Name for a point: the phone's geocoder first (no network quota), Photon
 * reverse (English names where OpenStreetMap has them) as a fallback.
 */
export async function placeName(lat: number, lon: number): Promise<Named | null> {
  let phone: Named | null = null;
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (r) {
      // Android's `name` is often the nearest shop or a house number, so the
      // neighbourhood names the place: GROUND / CHENNAI / MADIPAKKAM.
      const feature = r.name && !/^\d/.test(r.name) && !r.name.includes('+') ? r.name : null;
      const city = r.city ?? r.subregion;
      phone = named(r.district ?? r.street ?? feature ?? city, city);
      if (phone && readable(phone.name)) return phone;
    }
  } catch {
    // fall through to Photon
  }
  try {
    const json = (await fetchJson(`https://photon.komoot.io/reverse?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&limit=1&lang=en`)) as {
      features?: PhotonFeature[];
    };
    const p = json.features?.[0]?.properties;
    const pick = (v: string | number | undefined) => (v === undefined ? null : String(v));
    return named(pick(p?.district ?? p?.locality ?? p?.street ?? p?.name ?? p?.city), pick(p?.city ?? p?.state)) ?? phone;
  } catch {
    return phone;
  }
}
