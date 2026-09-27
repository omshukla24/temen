import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { RAIN_RULES, type ForecastReading } from 'ground-memory';

import { alertDue } from '@/features/watch/alerts';

import { forecast } from './ground';
import { KEYS, readJson, writeJson } from './storage';

export const WATCH_TASK = 'temen-monsoon-watch';
const CHANNEL = 'monsoon';

export interface WatchEntry {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface WatchReading {
  at: string;
  reading: ForecastReading | null;
  error: string | null;
}

type Last = Record<string, WatchReading & { notified?: string }>;

export function watchedPlaces(): WatchEntry[] {
  // saved cores are the watch list (kept small by the user)
  const index = readJson<{ id: string; placeName: string | null; lat: number; lon: number; saved: boolean }[]>(KEYS.reports, []);
  return index.filter((c) => c.saved).map((c) => ({ id: c.id, name: c.placeName ?? `${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`, lat: c.lat, lon: c.lon }));
}

export function lastReadings(): Last {
  return readJson<Last>(KEYS.watch, {});
}

/** Places whose heavy-rain alerts are off (their forecast is still read and shown). */
export function mutedPlaces(): string[] {
  return readJson<string[]>(KEYS.watchMuted, []);
}

export async function setMuted(id: string, muted: boolean): Promise<string[]> {
  const next = mutedPlaces().filter((x) => x !== id);
  if (muted) next.push(id);
  await writeJson(KEYS.watchMuted, next);
  return next;
}

export async function setupNotifications(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Monsoon Watch',
      description: 'Heavy rain forecast for your saved places',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#F2BE22',
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Checks the next 24 h at every saved place and raises one alert per place per
 * day when the forecast crosses the IMD "heavy" line (64.5 mm).
 */
export async function runWatch(notify = true): Promise<Last> {
  const places = watchedPlaces();
  const last = lastReadings();
  const muted = new Set(mutedPlaces());
  const today = new Date().toISOString().slice(0, 10);
  for (const p of places) {
    const r = await forecast(p);
    const entry: Last[string] = { at: new Date().toISOString(), reading: r.ok ? r.value : null, error: r.ok ? null : r.error, notified: last[p.id]?.notified };
    if (notify && r.ok && alertDue({ heavy: r.value.heavy, notified: entry.notified, today, muted: muted.has(p.id) })) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Heavy rain forecast · ${p.name}`,
          body: `${Math.round(r.value.next24hMm)} mm expected in the next 24 h (IMD "heavy" is ${RAIN_RULES.heavyMm} mm). Forecast: MET Norway.`,
          data: { id: p.id },
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
      }).catch(() => {});
      entry.notified = today;
    }
    last[p.id] = entry;
  }
  await writeJson(KEYS.watch, last);
  return last;
}

// Background: best effort, the OS decides when (at least hourly).
TaskManager.defineTask(WATCH_TASK, async () => {
  try {
    await runWatch(true);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function isBackgroundWatchOn(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(WATCH_TASK).catch(() => false);
}

export async function enableBackgroundWatch(on: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(WATCH_TASK).catch(() => false);
  if (on && !registered) await BackgroundTask.registerTaskAsync(WATCH_TASK, { minimumInterval: 60 }).catch(() => {});
  if (!on && registered) await BackgroundTask.unregisterTaskAsync(WATCH_TASK).catch(() => {});
}
