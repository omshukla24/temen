import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { completeOAuth } from '@/services/account';
import { useTheme } from '@/theme';

/**
 * Where Google sign-in lands (temen://auth-callback?code=…). The in-app
 * browser usually hands the code back first; this route finishes the job when
 * Android delivers the link to the app instead, then gets out of the way.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const { c } = useTheme();
  useEffect(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string') q.set(k, v);
    completeOAuth(`temen://auth-callback?${q.toString()}`).finally(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.ground }}>
      <ActivityIndicator color={c.ink} />
    </View>
  );
}
