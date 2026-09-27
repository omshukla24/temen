/** A core tray holds two to five cores. */
export const MIN_COMPARE = 2;
export const MAX_COMPARE = 5;

/**
 * Adds or removes one core. A full tray is returned unchanged (same array),
 * so callers can tell "full" apart from "added".
 */
export function toggleIn(list: readonly string[], id: string, max = MAX_COMPARE): readonly string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

/** `ids` route param ("a,b,c") → known ids, deduplicated, in order, at most five. */
export function parseIds(param: string | string[] | undefined, known: readonly string[]): string[] {
  const raw = Array.isArray(param) ? param.join(',') : (param ?? '');
  const have = new Set(known);
  const out: string[] = [];
  for (const id of raw.split(',').map((s) => s.trim())) {
    if (id && have.has(id) && !out.includes(id) && out.length < MAX_COMPARE) out.push(id);
  }
  return out;
}

/**
 * What the tray starts with: the cores passed in, else up to three saved ones,
 * topped up with the newest so there is something to compare.
 */
export function initialPick(cores: readonly { id: string; saved: boolean }[], param?: string | string[]): string[] {
  const passed = parseIds(
    param,
    cores.map((c) => c.id),
  );
  if (passed.length) return passed;
  const saved = cores.filter((c) => c.saved).slice(0, 3).map((c) => c.id);
  const fill = cores.filter((c) => !saved.includes(c.id)).map((c) => c.id);
  return [...saved, ...fill].slice(0, Math.max(saved.length, Math.min(MIN_COMPARE, cores.length)));
}
