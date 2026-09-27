/** A core as the `cores` table stores it (supabase/migrations). */
export interface RemoteCore {
  id: string;
  lat: number;
  lon: number;
  place_name: string | null;
  headline: string | null;
  saved: boolean;
  created_at: string;
  updated_at: string;
}

type Local = { id: string; saved: boolean; createdAt: string };

export interface SyncPlan {
  /** Remote cores this phone doesn't have: download their reports. */
  download: string[];
  /** Local cores the account doesn't have, or whose saved mark changed here: upload. */
  upload: string[];
  /** Local cores the account saved elsewhere: mark saved here. */
  markSaved: string[];
}

/**
 * What one sync does. Nothing is deleted by a sync: a core leaves the account
 * only when it is deleted on a phone that is signed in. Saved wins over
 * unsaved, so a place saved on either side stays saved on both.
 */
export function planSync(local: readonly Local[], remote: readonly RemoteCore[]): SyncPlan {
  const there = new Map(remote.map((r) => [r.id, r]));
  const here = new Set(local.map((l) => l.id));
  const download = remote.filter((r) => !here.has(r.id)).map((r) => r.id);
  const upload: string[] = [];
  const markSaved: string[] = [];
  for (const l of local) {
    const r = there.get(l.id);
    if (!r) upload.push(l.id);
    else if (l.saved && !r.saved) upload.push(l.id);
    else if (!l.saved && r.saved) markSaved.push(l.id);
  }
  return { download, upload, markSaved };
}

/** Newest first, the order every list in the app uses. */
export function byNewest<T extends { createdAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Good enough to send a code to; the server has the final word. */
export function isEmail(s: string): boolean {
  return EMAIL.test(s.trim());
}

/** Sign-in codes are 6 to 8 digits, depending on the project's setting. */
export function cleanCode(s: string): string {
  return s.replace(/\D/g, '').slice(0, 8);
}

export function isCode(s: string): boolean {
  return /^\d{6,8}$/.test(s);
}

/** The `code` an OAuth redirect carries (`temen://auth-callback?code=…`), or null. */
export function codeFromUrl(url: string): string | null {
  const m = /[?&#]code=([^&#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

/** An OAuth error the redirect carries, or null. */
export function errorFromUrl(url: string): string | null {
  const m = /[?&#]error_description=([^&#]+)/.exec(url) ?? /[?&#]error=([^&#]+)/.exec(url);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
}
