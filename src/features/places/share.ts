import { formatHemisphere } from 'ground-memory';

/** A Google Maps link any phone opens, to 6 decimals (about 11 cm). */
export function mapsLink(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

/**
 * The text a shared core carries: where it is, what the ground remembers,
 * the coordinates and a link that opens the spot.
 */
export function shareMessage(p: { title: string; subtitle: string; headline: string; lat: number; lon: number; footer?: string }): string {
  // With no town the label's small line is the coordinates, which get their own line below.
  const town = p.subtitle.trim();
  const where = town && !/\d°/.test(town) ? `${p.title}, ${town}` : p.title;
  return [where, p.headline, formatHemisphere(p.lat, p.lon, 6), mapsLink(p.lat, p.lon), p.footer]
    .filter((line): line is string => !!line && line.trim().length > 0)
    .join('\n');
}
