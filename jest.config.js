/** @type {import('jest').Config} */
const esm = ['d3-.*', 'internmap'].join('|');

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
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^ground-memory$': '<rootDir>/ground-memory/src/index.ts',
        '^ground-memory/(.*)$': '<rootDir>/ground-memory/src/$1',
      },
      transformIgnorePatterns: [
        `node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|${esm})/)`,
      ],
    },
  ],
};
