import { KEYS } from '@/services/storage';

import { memory, persisted, useStore } from './store';

export { canSeeFull, placeKey } from './rules';

/** placeKey → store transaction id, for single-report unlocks. */
export const unlocks = persisted<Record<string, string>>(KEYS.unlocks, {});

/** Restored single reports not yet tied to a place on this phone. */
export const credits = persisted<string[]>('credits', []);

export function useCredits(): string[] {
  return useStore(credits);
}

export const pro = memory<{ active: boolean; expires: string | null; product: string | null }>({
  active: false,
  expires: null,
  product: null,
});

export function useIsPro(): boolean {
  return useStore(pro).active;
}

export function useUnlocks(): Record<string, string> {
  return useStore(unlocks);
}

