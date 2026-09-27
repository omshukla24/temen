import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The Supabase client, or null in a build without the two public values
 * (accounts are optional: every check works signed out). The session lives in
 * the same on-device key-value store as the cores.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: {
            getItem: (k: string) => Storage.getItemAsync(k),
            setItem: (k: string, v: string) => Storage.setItemAsync(k, v),
            removeItem: async (k: string) => {
              await Storage.removeItemAsync(k);
            },
          },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;

export const accountsEnabled = () => supabase !== null;

// Refresh tokens only while the app is on screen (Supabase's React Native guidance).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
