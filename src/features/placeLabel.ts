import { formatHemisphere } from 'ground-memory';

export interface PlaceLabel {
  /** The locality, set large: "Beta II". */
  title: string;
  /** The town (and region if different), set small: "Greater Noida". */
  subtitle: string;
}

/**
 * Splits a place into the two lines headers and lists show. The locality is
 * the core's own name; the trail (town first) becomes the small line. With no
 * name at all, the coordinates stand in.
 */
export function placeLabel(p: { placeName: string | null | undefined; trail?: string[] | null; lat: number; lon: number }): PlaceLabel {
  const name = p.placeName?.trim();
  const trail = (p.trail ?? []).map((s) => s.trim()).filter((s) => s && s !== name);
  const unique = [...new Set(trail)];
  if (name) return { title: name, subtitle: unique.join(', ') || formatHemisphere(p.lat, p.lon, 4) };
  if (unique.length) return { title: unique[0], subtitle: formatHemisphere(p.lat, p.lon, 4) };
  return { title: formatHemisphere(p.lat, p.lon, 4), subtitle: '' };
}
