import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';

import { ToastHost } from '@/components/Toast';
import { ShareInHandler } from '@/features/ShareInHandler';
import { initAccount } from '@/services/account';
import { initPurchases } from '@/services/purchases';
import { useSettings } from '@/state/settings';
// defines the Monsoon Watch background task at startup, as TaskManager requires
import '@/services/watch';
import { ThemeProvider, fontAssets, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 260, fade: true });

// Deep links (a shared pin, temen://check/...) open with the tabs underneath, so Back lands at Home.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    initPurchases();
    initAccount();
  }, []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <RootStack />
          <ToastHost />
        </ThemeProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

function RootStack() {
  const { c } = useTheme();
  const { reduceMotion } = useSettings();
  return (
    <>
      <ReducedMotionConfig mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.System} />
      <ShareInHandler />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.ground },
          animation: 'slide_from_right',
          animationDuration: 280,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pick" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}
