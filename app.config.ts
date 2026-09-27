import type { ConfigContext, ExpoConfig } from 'expo/config';

// Design lock v3 (src/theme/palettes.ts): the app opens on aquifer in every light,
// with the core and its levelling staff; survey yellow marks notifications.
const AQUIFER = '#0C1719';
const YELLOW = '#F2BE22';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Temen',
  slug: 'temen',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'temen',
  // The app themes itself (dawn/day/dusk/night); 'automatic' lets Settings → System follow the phone.
  userInterfaceStyle: 'automatic',
  backgroundColor: AQUIFER,
  ios: {
    bundleIdentifier: 'com.urizen.temen',
    supportsTablet: false,
  },
  android: {
    package: 'com.urizen.temen',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: AQUIFER,
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: AQUIFER,
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        dark: { backgroundColor: AQUIFER, image: './assets/images/splash-icon.png' },
      },
    ],
    '@maplibre/maplibre-react-native',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Temen reads the ground under your feet. Your location is used only to run the check and never leaves your phone except to fetch public map data.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Temen uses the camera to take geo-stamped site-visit photos for your report.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    ['expo-notifications', { color: YELLOW }],
    'expo-sharing',
    'expo-sqlite',
    'expo-localization',
    ['expo-share-intent', { androidIntentFilters: ['text/*'] }],
    'expo-background-task',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    rcStore: process.env.EXPO_PUBLIC_RC_STORE ?? 'test',
  },
});
