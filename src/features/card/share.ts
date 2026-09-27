import { drawAsImage, ImageFormat, loadData, Skia, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { GroundReport } from 'ground-memory';

import { CARD, CARD_FONTS, cardElement } from './CardArt';
import { cardModel } from './model';

/* eslint-disable @typescript-eslint/no-require-imports */
const FILES: [string, number][] = [
  [CARD_FONTS.Stencil, require('@expo-google-fonts/big-shoulders-stencil/800ExtraBold/BigShouldersStencil_800ExtraBold.ttf')],
  [CARD_FONTS.Body, require('@expo-google-fonts/geologica/400Regular/Geologica_400Regular.ttf')],
  [CARD_FONTS.BodySemi, require('@expo-google-fonts/geologica/600SemiBold/Geologica_600SemiBold.ttf')],
  [CARD_FONTS.Mono, require('@expo-google-fonts/martian-mono/400Regular/MartianMono_400Regular.ttf')],
];
/* eslint-enable @typescript-eslint/no-require-imports */

let fonts: Promise<SkTypefaceFontProvider> | null = null;

/** The card's own font provider, loaded once. */
function cardFonts(): Promise<SkTypefaceFontProvider> {
  if (!fonts) {
    fonts = (async () => {
      const provider = Skia.TypefaceFontProvider.Make();
      for (const [family, mod] of FILES) {
        const tf = await loadData(mod, (d) => Skia.Typeface.MakeFreeTypeFaceFromData(d));
        if (tf) provider.registerFont(tf, family);
      }
      return provider;
    })().catch((e) => {
      fonts = null;
      throw e;
    });
  }
  return fonts;
}

/**
 * Draws the place as a card (PNG, 1080 × 1350) and hands it to the share sheet.
 * Sealed strata stay sealed on the card.
 */
export async function shareCard(
  report: GroundReport,
  trail: string[],
  opts: { full: boolean; freeStrata: number; translate?: (s: string) => string; dialogTitle?: string },
): Promise<void> {
  const provider = await cardFonts();
  const image = await drawAsImage(cardElement(cardModel(report, trail, opts), provider), CARD);
  if (!image) throw new Error('Could not draw the card');
  const bytes = image.encodeToBytes(ImageFormat.PNG, 100);
  const place = (report.placeName ?? 'core').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').slice(0, 40);
  const file = new File(Paths.cache, `Temen-${place}-${report.id.slice(0, 6)}.png`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone');
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: opts.dialogTitle, UTI: 'public.png' });
}
