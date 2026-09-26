import { useSyncExternalStore } from 'react';

import { readJson, writeJson } from '@/services/storage';

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

/** A value that lives in kv-store and re-renders subscribers when it changes. */
export function persisted<T>(key: string, initial: T): Store<T> {
  let value: T | undefined;
  const listeners = new Set<() => void>();
  const load = () => {
    if (value === undefined) value = readJson<T>(key, initial);
    return value;
  };
  return {
    get: load,
    set(next) {
      const prev = load();
      value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeJson(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function memory<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      listeners.forEach((l) => l());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
