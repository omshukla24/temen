/**
 * One alert per place per day, only when the forecast crosses the heavy line,
 * and never for a place whose alerts were muted (its forecast is still read).
 */
export function alertDue(p: { heavy: boolean; notified?: string; today: string; muted: boolean }): boolean {
  return p.heavy && !p.muted && p.notified !== p.today;
}
