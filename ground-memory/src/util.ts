export type Settled<T> = { ok: true; value: T; ms: number } | { ok: false; error: string; ms: number };

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} took longer than ${Math.round(ms / 1000)} s`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function settle<T>(fn: () => Promise<T>, ms: number, label: string): Promise<Settled<T>> {
  const start = Date.now();
  try {
    const value = await withTimeout(fn(), ms, label);
    return { ok: true, value, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - start };
  }
}

/** Small stable id (FNV-1a, base36). */
export function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function get(v: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = v;
  for (const k of path) {
    if (Array.isArray(cur) && typeof k === 'number') cur = cur[k];
    else if (isObject(cur)) cur = cur[k as string];
    else return undefined;
  }
  return cur;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2023-12-04" → "4 Dec 2023" */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
