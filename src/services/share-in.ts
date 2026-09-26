import { parseLocation, recoverPlusCode, type ParsedLocation } from 'ground-memory';

import { searchPlaces } from './geocode';
import { resolveRedirect } from './http';

export type Resolved = { lat: number; lon: number; label: string | null } | { error: string };

/**
 * Turns whatever was shared or pasted into a point: follows short links,
 * geocodes named places and recovers short plus codes near their locality.
 */
export async function resolveShared(text: string, near?: { lat: number; lon: number }): Promise<Resolved> {
  let parsed: ParsedLocation = parseLocation(text);
  if (parsed.kind === 'resolve') {
    try {
      const final = await resolveRedirect(parsed.url);
      parsed = parseLocation(final);
    } catch {
      return { error: "That link didn't open. Check your connection and share it again." };
    }
  }
  switch (parsed.kind) {
    case 'point':
      return { lat: parsed.lat, lon: parsed.lon, label: parsed.label };
    case 'query': {
      const [first] = await searchPlaces(parsed.text, near).catch(() => []);
      return first ? { lat: first.lat, lon: first.lon, label: first.name } : { error: `Couldn't find "${parsed.text}".` };
    }
    case 'shortPlusCode': {
      const ref = parsed.locality ? (await searchPlaces(parsed.locality, near).catch(() => []))[0] : near;
      if (!ref) return { error: 'That plus code needs a town next to it, like "W6VH+MM Chennai".' };
      const p = recoverPlusCode(parsed.code, ref.lat, ref.lon);
      return p ? { ...p, label: parsed.code } : { error: "That plus code didn't resolve." };
    }
    case 'resolve':
      return { error: "That link didn't lead to a place." };
    default:
      return { error: 'No location in what was shared. Share a pin from WhatsApp or Google Maps.' };
  }
}
