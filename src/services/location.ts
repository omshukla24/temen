import * as Location from 'expo-location';

export type Fix = { lat: number; lon: number; accuracyM: number | null; at: number };

export type LocationState =
  | { status: 'idle' }
  | { status: 'asking' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'off' }
  | { status: 'ok'; fix: Fix };

function toFix(p: Location.LocationObject): Fix {
  return { lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy ?? null, at: p.timestamp };
}

export async function permission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const cur = await Location.getForegroundPermissionsAsync();
  if (cur.granted) return { granted: true, canAskAgain: true };
  if (!cur.canAskAgain) return { granted: false, canAskAgain: false };
  const req = await Location.requestForegroundPermissionsAsync();
  return { granted: req.granted, canAskAgain: req.canAskAgain };
}

/**
 * A fix good enough to core the ground, in under ~10 s: a recent last-known
 * position first, then a fresh high-accuracy one with a timeout.
 */
export async function currentFix(timeoutMs = 10000): Promise<Fix> {
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Location is switched off');
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 50 }).catch(() => null);
  if (last) return toFix(last);
  const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No GPS fix yet — step outside or search instead')), timeoutMs));
  return toFix(await Promise.race([fresh, timeout]));
}

/** Live fix for the ticking coordinates on Home. */
export async function watchFix(onFix: (f: Fix) => void): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 3, timeInterval: 2000 },
    (p) => onFix(toFix(p)),
  );
  return () => sub.remove();
}
