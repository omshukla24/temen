import { fetch } from 'expo/fetch';

export const APP_UA = process.env.EXPO_PUBLIC_APP_UA || 'Temen/1.0 github.com/omshukla24/temen';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`${hostOf(url)} answered ${status}`);
    this.name = 'HttpError';
  }
}

export function hostOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1] : url;
}

export async function fetchJson(url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': APP_UA, ...init?.headers },
    signal: init?.signal,
  });
  if (!res.ok) throw new HttpError(res.status, url);
  return res.json();
}

export async function fetchTile(url: string): Promise<ArrayBuffer | null> {
  const res = await fetch(url, { headers: { 'User-Agent': APP_UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(res.status, url);
  return res.arrayBuffer();
}

/** Follows a short link (maps.app.goo.gl …) and returns where it lands. */
export async function resolveRedirect(url: string): Promise<string> {
  const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': APP_UA }, redirect: 'follow' });
  const final = res.url || url;
  // Some short links land on a consent or HTML page that embeds the real URL.
  if (final === url || /consent\.google/.test(final)) {
    const text = await res.text().catch(() => '');
    const m = text.match(/https:\/\/www\.google\.[a-z.]+\/maps\/[^"'\s<>]+/);
    if (m) return m[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  }
  return final;
}
