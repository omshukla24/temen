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

/** Name for a point: the phone's geocoder first (no network quota), Photon reverse as a fallback. */
export async function placeName(lat: number, lon: number): Promise<{ name: string; trail: string[] } | null> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (r) {
      const local = r.district ?? r.subregion ?? r.name ?? r.street ?? null;
      const trail = [r.city ?? r.subregion, local].filter((x): x is string => !!x);
      const name = r.name && !/^\d/.test(r.name) ? r.name : (local ?? r.city ?? null);
      if (name) return { name, trail: [...new Set(trail)] };
    }
  } catch {
    // fall through to Photon
  }
  try {
    const json = (await fetchJson(`https://photon.komoot.io/reverse?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&limit=1`)) as {
      features?: PhotonFeature[];
    };
    const p = json.features?.[0]?.properties;
    if (!p) return null;
    const name = String(p.name ?? p.street ?? p.district ?? p.city ?? '');
    const trail = [p.city, p.district ?? p.locality].filter(Boolean).map(String);
    return name ? { name, trail: [...new Set(trail)] } : null;
  } catch {
    return null;
  }
}
