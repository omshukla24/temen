import { KEYS } from '@/services/storage';

import { memory, persisted, useStore } from './store';

export { canSeeFull, placeKey } from './rules';

/** placeKey → store transaction id, for single-report unlocks. */
export const unlocks = persisted<Record<string, string>>(KEYS.unlocks, {});

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

