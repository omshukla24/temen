import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/state/settings';

/**
 * Reduced motion: the phone's accessibility setting, or Preferences → Reduce
 * motion inside the app (so nobody has to touch Developer options). Set-pieces
 * become crossfades, counters show their final value.
 */
export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const { reduceMotion } = useSettings();
  return system || reduceMotion;
}
