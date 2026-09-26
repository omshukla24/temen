import { useFont } from '@shopify/react-native-skia';

/* Skia draws its own text (seal rim, dial years); it needs the font files, not the RN families. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MONO = require('@expo-google-fonts/martian-mono/400Regular/MartianMono_400Regular.ttf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SERIF = require('@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf');

export const useMonoFont = (size: number) => useFont(MONO, size);
export const useSerifFont = (size: number) => useFont(SERIF, size);
