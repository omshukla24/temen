import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { watchFix, type Fix } from '@/services/location';

export type FixState = { status: 'idle' | 'off' | 'denied' } | { status: 'ok'; fix: Fix };

/**
 * Live GPS for the ticking coordinates on Home. Never asks for permission by
 * itself: it only listens once the user has already granted it.
 */
export function useFix(enabled = true): FixState {
  const [state, setState] = useState<FixState>({ status: 'idle' });
  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | null = null;
    let alive = true;
    const start = async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        if (alive) setState({ status: perm.canAskAgain ? 'idle' : 'denied' });
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        if (alive) setState({ status: 'off' });
        return;
      }
      stop?.();
      stop = await watchFix((fix) => alive && setState({ status: 'ok', fix }));
    };
    start().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') start().catch(() => {});
      else {
        stop?.();
        stop = null;
      }
    });
    return () => {
      alive = false;
      stop?.();
      sub.remove();
    };
  }, [enabled]);
  return state;
}
