/** @type {import('jest').Config} */
const esm = ['d3-.*', 'internmap'].join('|');
const app = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^ground-memory$': '<rootDir>/ground-memory/src/index.ts',
  '^ground-memory/(.*)$': '<rootDir>/ground-memory/src/$1',
};
const rn = [
  `node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/react-native-skia|@maplibre/.*|${esm})`,
];

module.exports = {
  projects: [
    {
      displayName: 'ground-memory',
      testEnvironment: 'node',
      roots: ['<rootDir>/ground-memory'],
      testMatch: ['**/test/**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      transformIgnorePatterns: [`node_modules/(?!(${esm})/)`],
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      roots: ['<rootDir>/src'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/test/'],
      moduleNameMapper: app,
      transformIgnorePatterns: rn,
    },
    {
      // every main screen renders in the live theme (native modules mocked, Skia through CanvasKit)
      displayName: 'screens',
      preset: 'jest-expo',
      roots: ['<rootDir>/src/test'],
      testEnvironment: '<rootDir>/src/test/skiaEnv.js',
      setupFiles: ['@shopify/react-native-skia/jestSetup.js', '<rootDir>/src/test/screensSetup.js'],
      moduleNameMapper: app,
      transformIgnorePatterns: rn,
    },
  ],
};
