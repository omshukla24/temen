import Storage from 'expo-sqlite/kv-store';

/** Every key the app writes, in one place. */
export const KEYS = {
  reports: 'reports:index',
  report: (id: string) => `reports:${id}`,
  unlocks: 'unlocks',
  watch: 'watch',
  watchMuted: 'watch:muted',
  settings: 'settings',
  siteKit: (id: string) => `sitekit:${id}`,
  readingCache: (k: string) => `cache:${k}`,
  seenShareHint: 'hint:share',
} as const;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function readJsonAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await Storage.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): Promise<void> {
  return Storage.setItemAsync(key, JSON.stringify(value)).catch(() => {});
}

export function remove(key: string): Promise<void> {
  return Storage.removeItemAsync(key).then(
    () => {},
    () => {},
  );
}

export async function keysWithPrefix(prefix: string): Promise<string[]> {
  const all = await Storage.getAllKeysAsync().catch(() => [] as string[]);
  return all.filter((k) => k.startsWith(prefix));
}
