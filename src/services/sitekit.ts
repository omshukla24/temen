import { KEYS, readJson, writeJson } from './storage';

export interface SitePhoto {
  uri: string;
  lat: number | null;
  lon: number | null;
  accuracyM: number | null;
  at: string;
  note: string;
}

export interface SiteKit {
  checks: Record<string, boolean>;
  photos: SitePhoto[];
}

export const emptyKit = (): SiteKit => ({ checks: {}, photos: [] });

export function loadKit(id: string): SiteKit {
  return readJson<SiteKit>(KEYS.siteKit(id), emptyKit());
}

export function saveKit(id: string, kit: SiteKit) {
  return writeJson(KEYS.siteKit(id), kit);
}
