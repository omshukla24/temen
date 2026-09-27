/* global jest */
// Native modules the screens touch, replaced for the render smoke tests (src/test/screens.test.tsx).
const mockMem = new Map();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k) => mockMem.get(k) ?? null,
    getItemAsync: async (k) => mockMem.get(k) ?? null,
    setItemAsync: async (k, v) => void mockMem.set(k, v),
    setItemSync: (k, v) => void mockMem.set(k, v),
    removeItemAsync: async (k) => void mockMem.delete(k),
    getAllKeysAsync: async () => [...mockMem.keys()],
  },
}));
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => {
  const m = require('react-native-reanimated/mock');
  const extra = {
    useReducedMotion: () => false,
    useAnimatedSensor: () => ({ sensor: { value: { pitch: 0, roll: 0 } } }),
    SensorType: { ROTATION: 0 },
    LayoutAnimationConfig: ({ children }) => children,
    ReducedMotionConfig: () => null,
    ReduceMotion: { Always: 'always', System: 'system', Never: 'never' },
    interpolateColor: (v, i, o) => o[0],
    cancelAnimation: () => {},
    withRepeat: (a) => a,
    useFrameCallback: () => ({ setActive() {}, isActive: false }),
    useAnimatedScrollHandler: () => () => {},
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
  return { ...m, ...extra, default: { ...m.default, ...extra } };
});
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
require('react-native-gesture-handler/jestSetup');
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Map = ({ children }) => React.createElement(View, { testID: 'map' }, children);
  const Camera = React.forwardRef(() => null);
  return { Map, Camera, StaticMapImageManager: { createImage: async () => '' } };
});
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
    useRouter: () => ({ push: jest.fn() }),
    useLocalSearchParams: () => global.__params ?? {},
    useFocusEffect: (cb) => React.useEffect(() => cb(), []),
    Redirect: () => null,
    Link: ({ children }) => children,
  };
});
jest.mock('react-native-webview', () => { const { View } = require('react-native'); return { __esModule: true, default: View }; });
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  hasServicesEnabledAsync: async () => true,
  watchPositionAsync: async () => ({ remove() {} }),
  getLastKnownPositionAsync: async () => null,
  getCurrentPositionAsync: async () => { throw new Error('no gps'); },
  reverseGeocodeAsync: async () => [],
  Accuracy: { Balanced: 3, High: 4 },
}));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { configure: jest.fn(), getOfferings: async () => ({ current: null }), getCustomerInfo: async () => ({ entitlements: { active: {} }, nonSubscriptionTransactions: [] }), addCustomerInfoUpdateListener: jest.fn(), setLogLevel: jest.fn() }, LOG_LEVEL: {} }));
jest.mock('react-native-purchases-ui', () => ({ __esModule: true, default: {} }));
jest.mock('react-native-purchases-store-galaxy', () => ({ GALAXY_BILLING_MODE: {} }));
jest.mock('../services/http', () => ({ fetchTile: async () => null, fetchJson: async () => { throw new Error('offline'); }, APP_UA: 'test' }));
