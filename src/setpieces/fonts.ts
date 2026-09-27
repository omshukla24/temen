import { useFont } from '@shopify/react-native-skia';

/* Skia draws its own text (seal rim, dial years); it needs the font files, not the RN families. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MONO = require('@expo-google-fonts/martian-mono/400Regular/MartianMono_400Regular.ttf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const STENCIL = require('@expo-google-fonts/big-shoulders-stencil/800ExtraBold/BigShouldersStencil_800ExtraBold.ttf');

export const useMonoFont = (size: number) => useFont(MONO, size);
export const useStencilFont = (size: number) => useFont(STENCIL, size);
