import { router } from 'expo-router';

/** Opens a fresh core at a point. */
export function openCheck(p: { lat: number; lon: number; label?: string | null }, replace = false) {
  const params = { id: 'new', lat: p.lat.toFixed(6), lon: p.lon.toFixed(6), label: p.label ?? '' };
  if (replace) router.replace({ pathname: '/check/[id]', params });
  else router.push({ pathname: '/check/[id]', params });
}

export function openSaved(id: string) {
  router.push({ pathname: '/check/[id]', params: { id } });
}
