import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { reports, type StoredReport } from '@/state/reports';
import { memory, useStore } from '@/state/store';
import { codeFromUrl, errorFromUrl, planSync, type RemoteCore } from '@/state/syncRules';

import { linkUser, unlinkUser } from './purchases';
import { supabase } from './supabase';

export interface AccountUser {
  id: string;
  email: string | null;
  name: string | null;
  provider: string | null;
}

export interface AccountState {
  /** off = this build has no account backend; the app works fully signed out. */
  status: 'off' | 'loading' | 'signedOut' | 'signedIn';
  user: AccountUser | null;
  syncing: boolean;
  syncedAt: string | null;
  syncFailed: boolean;
}

const state = memory<AccountState>({
  status: supabase ? 'loading' : 'off',
  user: null,
  syncing: false,
  syncedAt: null,
  syncFailed: false,
});

export const account = state;
export const useAccount = () => useStore(state);

/** Must match an entry in Supabase → Authentication → URL Configuration → Redirect URLs. */
export const AUTH_REDIRECT = 'temen://auth-callback';

const toUser = (u: User): AccountUser => {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = [m.display_name, m.full_name, m.name].find((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return { id: u.id, email: u.email ?? null, name: name?.trim() ?? null, provider: (u.app_metadata?.provider as string | undefined) ?? null };
};

const patch = (p: Partial<AccountState>) => state.set((s) => ({ ...s, ...p }));

let started = false;

/** Call once at startup, after purchases are configured. */
export function initAccount(): void {
  if (!supabase || started) return;
  started = true;
  let linkedId: string | null = null;
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ? toUser(session.user) : null;
    patch({ status: user ? 'signedIn' : 'signedOut', user });
    // Supabase warns against awaiting its own calls inside this callback: defer.
    setTimeout(() => {
      if (user && user.id !== linkedId) {
        linkedId = user.id;
        linkUser(user.id);
        syncNow();
      } else if (!user && event === 'SIGNED_OUT') {
        linkedId = null;
        unlinkUser();
        patch({ syncedAt: null, syncFailed: false });
      } else if (user && event === 'USER_UPDATED') {
        patch({ user });
      }
    }, 0);
  });
  reports.watch((change) => {
    if (state.get().status !== 'signedIn') return;
    if (change.kind === 'remove') removeRemote(change.id);
    else queueUpload(change.id);
  });
}

export type AuthResult = { ok: true } | { ok: false; message: string };

const fail = (e: unknown, fallback: string): AuthResult => ({
  ok: false,
  message: e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message ? e.message : fallback,
});

/** Step 1 of email sign-in: the server mails a one-time code. */
export async function sendEmailCode(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  return error ? fail(error, 'Could not send the code.') : { ok: true };
}

/** Step 2: the code from the email signs in (or creates the account). */
export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
  return error ? fail(error, 'That code did not work.') : { ok: true };
}

const usedCodes = new Set<string>();

/** Finishes an OAuth redirect. Safe to call twice with the same URL (browser result and deep link both carry it). */
export async function completeOAuth(url: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const err = errorFromUrl(url);
  if (err) return { ok: false, message: err };
  const code = codeFromUrl(url);
  if (!code) return { ok: false, message: 'Sign-in was cancelled.' };
  if (usedCodes.has(code)) return { ok: true };
  usedCodes.add(code);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error && state.get().status !== 'signedIn') return fail(error, 'Sign-in did not finish.');
  return { ok: true };
}

/** Google through Supabase's hosted OAuth, in an in-app browser tab. */
export async function signInWithGoogle(): Promise<AuthResult | { ok: false; cancelled: true }> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return fail(error, 'Google sign-in is not switched on yet.');
  const r = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  if (r.type !== 'success') return { ok: false, cancelled: true };
  return completeOAuth(r.url);
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

/** Shown in greetings and on the account screen. */
export async function setDisplayName(name: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const clean = name.trim().slice(0, 80);
  const { data, error } = await supabase.auth.updateUser({ data: { display_name: clean } });
  if (error) return fail(error, 'Could not save your name.');
  const id = data.user?.id;
  if (id) await supabase.from('profiles').update({ display_name: clean || null }).eq('id', id);
  if (data.user) patch({ user: toUser(data.user) });
  return { ok: true };
}

/** Deletes the account and everything synced to it (the delete-account Edge Function), then signs out. */
export async function deleteAccount(): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Accounts are not set up in this build.' };
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return fail(error, 'Could not delete the account. Try again, or write to us.');
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  return { ok: true };
}

// ---------------------------------------------------------------- sync

const COLS = 'id,lat,lon,place_name,headline,saved,created_at,updated_at';
const CHUNK = 20;

function rowFor(id: string, userId: string) {
  const summary = reports.list().find((c) => c.id === id);
  const stored = reports.get(id);
  if (!summary || !stored) return null;
  return {
    user_id: userId,
    id,
    lat: summary.lat,
    lon: summary.lon,
    place_name: summary.placeName?.slice(0, 200) ?? null,
    headline: summary.headline?.slice(0, 200) ?? null,
    saved: summary.saved,
    report: stored,
    created_at: summary.createdAt,
  };
}

async function upload(ids: string[], userId: string): Promise<boolean> {
  if (!supabase) return false;
  const rows = ids.map((id) => rowFor(id, userId)).filter((r) => r !== null);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from('cores').upsert(rows.slice(i, i + CHUNK), { onConflict: 'user_id,id' });
    if (error) return false;
  }
  return true;
}

let running: Promise<void> | null = null;

/** Two-way: the phone's cores go up, the account's come down. Nothing is deleted by a sync. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const s = state.get();
    if (!supabase || s.status !== 'signedIn' || !s.user) return;
    const userId = s.user.id;
    patch({ syncing: true });
    try {
      const { data, error } = await supabase.from('cores').select(COLS);
      if (error) throw error;
      const plan = planSync(reports.list(), (data ?? []) as RemoteCore[]);
      for (const id of plan.markSaved) reports.setSaved(id, true, true);
      const uploaded = await upload(plan.upload, userId);
      const remote = new Map(((data ?? []) as RemoteCore[]).map((r) => [r.id, r]));
      for (let i = 0; i < plan.download.length; i += CHUNK) {
        const ids = plan.download.slice(i, i + CHUNK);
        const got = await supabase.from('cores').select('id,report,saved').in('id', ids);
        if (got.error) throw got.error;
        const items = (got.data ?? [])
          .filter((r) => r.report && typeof r.report === 'object' && 'report' in r.report)
          .map((r) => ({ stored: r.report as StoredReport, saved: !!(r.saved ?? remote.get(r.id)?.saved) }));
        reports.adopt(items);
      }
      patch({ syncing: false, syncedAt: new Date().toISOString(), syncFailed: !uploaded });
    } catch {
      patch({ syncing: false, syncFailed: true });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function queueUpload(id: string) {
  pending.add(id);
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    const s = state.get();
    if (!s.user) return;
    const ids = [...pending];
    pending.clear();
    const ok = await upload(ids, s.user.id);
    patch(ok ? { syncedAt: new Date().toISOString(), syncFailed: false } : { syncFailed: true });
  }, 1500);
}

async function removeRemote(id: string) {
  const s = state.get();
  if (!supabase || !s.user) return;
  pending.delete(id);
  await supabase.from('cores').delete().eq('id', id).eq('user_id', s.user.id);
}
