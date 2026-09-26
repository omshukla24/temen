# Temen

**What the ground remembers.** Before you buy or rent anywhere on Earth, Temen shows what that ground remembers: 40 years of surface water, how low it sits, the worst rain, the earthquakes, the soil, and what to ask before you sign.

Android app built with Expo. The analysis lives in [`ground-memory/`](ground-memory), a small open-source TypeScript library with no React Native imports.

> Work in progress for RevenueCat Shipaton 2026.

## Run it

```bash
npm install
cp .env.example .env        # fill in your RevenueCat Test Store key
npx expo run:android        # builds and installs the dev client on a connected phone
npm test                    # ground-memory golden tests run offline from fixtures
```

## License

MIT, see [LICENSE](LICENSE).
