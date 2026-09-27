import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { watchFix, type Fix } from '@/services/location';
import { rememberSunPlace } from '@/state/settings';

export type FixState = { status: 'idle' | 'off' | 'denied' } | { status: 'ok'; fix: Fix };

/**
 * Live GPS for the ticking coordinates on Home. Never asks for permission by
 * itself: it only listens once the user has already granted it. Each fix also
 * tells the automatic light where the sun is (stored only when it moved ~1 km).
 */
export function useFix(enabled = true): FixState {
  const [state, setState] = useState<FixState>({ status: 'idle' });
  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | null = null;
    let alive = true;
    // every start or pause bumps the generation, so a slow start that lost the race closes itself
    let gen = 0;
    const halt = () => {
      gen += 1;
      stop?.();
      stop = null;
    };
    const onFix = (fix: Fix) => {
      if (!alive) return;
      rememberSunPlace(fix.lat, fix.lon);
      setState({ status: 'ok', fix });
    };
    const start = async () => {
      const mine = ++gen;
      const perm = await Location.getForegroundPermissionsAsync();
      if (mine !== gen) return;
      if (!perm.granted) {
        if (alive) setState({ status: perm.canAskAgain ? 'idle' : 'denied' });
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        if (alive && mine === gen) setState({ status: 'off' });
        return;
      }
      const next = await watchFix(onFix);
      if (!alive || mine !== gen) {
        next();
        return;
      }
      stop?.();
      stop = next;
    };
    // a failed start keeps the last state; Home still offers search and pins
    start().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') start().catch(() => {});
      else halt();
    });
    return () => {
      alive = false;
      halt();
      sub.remove();
    };
  }, [enabled]);
  return state;
}
