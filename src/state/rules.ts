/** A paid report belongs to the place, so re-coring the same plot keeps it (~11 m grid). */
export function placeKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/** Full core, questions and PDF: Pro, a single-report unlock, or a place in an active flood (Relief mode). */
export function canSeeFull(place: string, relief: boolean, isPro: boolean, map: Record<string, string>): boolean {
  return isPro || relief || !!map[place];
}
