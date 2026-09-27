/** How long ago something happened, as the words a list row or a status line needs. */
export type Ago =
  | { kind: 'now' }
  | { kind: 'minutes'; n: number }
  | { kind: 'hours'; n: number }
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'days'; n: number }
  | { kind: 'date'; date: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Past this many days a row shows the date instead of a count. */
const DAYS_AS_COUNT = 30;

const pad = (n: number) => String(n).padStart(2, '0');

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Calendar days for list rows (today, yesterday, 3 days, then the date).
 * `precise` adds minutes and hours inside the last day, for "synced 5 min ago".
 */
export function ago(iso: string | null | undefined, now: number, precise = false): Ago {
  const then = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(then)) return { kind: 'date', date: '' };
  const diff = Math.max(0, now - then);
  if (precise && diff < MINUTE) return { kind: 'now' };
  if (precise && diff < HOUR) return { kind: 'minutes', n: Math.floor(diff / MINUTE) };
  if (precise && diff < DAY) return { kind: 'hours', n: Math.floor(diff / HOUR) };
  // Math.round absorbs a daylight-saving hour between the two midnights.
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(then)) / DAY));
  if (days === 0) return { kind: 'today' };
  if (days === 1) return { kind: 'yesterday' };
  if (days < DAYS_AS_COUNT) return { kind: 'days', n: days };
  return { kind: 'date', date: localDate(new Date(then)) };
}
