import type { ConfigContext, ExpoConfig } from 'expo/config';

const GROUND = '#F2EDE4';
const LATERITE = '#A5482A';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Temen',
  slug: 'temen',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'temen',
  userInterfaceStyle: 'light',
  backgroundColor: GROUND,
  ios: {
    bundleIdentifier: 'com.urizen.temen',
    supportsTablet: false,
  },
  android: {
    package: 'com.urizen.temen',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: GROUND,
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
        backgroundColor: GROUND,
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
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
    ['expo-notifications', { color: LATERITE }],
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
