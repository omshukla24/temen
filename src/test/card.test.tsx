/**
 * The share card draws through CanvasKit at its full size, with the app's own
 * fonts, for an open core and for one with sealed strata.
 * `CARD_PNG=/some/dir npm test -- card` also writes the two cards out to look at.
 */
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import * as fs from 'fs';
import * as path from 'path';

import { CARD, CARD_FONTS, cardElement } from '@/features/card/CardArt';
import { cardModel } from '@/features/card/model';

jest.setTimeout(30000);

// The jest mock's drawAsImage is a no-op; this is what it does, through CanvasKit.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SkiaSGRoot } = require('@shopify/react-native-skia/lib/module/sksg/Reconciler');

// CanvasKit lives in the environment's realm and checks `instanceof Array`, which a test-realm
// array fails; hand the core's gradient its colours and stops as that realm's Float32Arrays.
function shimGradients() {
  const CK = (global as any).CanvasKit;
  if (CK.__cardShim) return;
  const F32 = CK.Color(0, 0, 0, 1).constructor as Float32ArrayConstructor;
  const flat = (a: ArrayLike<number>[]) => {
    const out = new F32(a.length * 4);
    a.forEach((c, i) => out.set(Array.from(c), i * 4));
    return out;
  };
  const make = CK.Shader.MakeLinearGradient;
  CK.Shader.MakeLinearGradient = (start: unknown, end: unknown, colors: ArrayLike<number>[], pos: number[] | null, ...rest: unknown[]) =>
    make.call(CK.Shader, start, end, flat(colors), pos ? F32.from(pos) : pos, ...rest);
  CK.__cardShim = true;
}

async function draw(element: React.ReactElement, width: number, height: number) {
  shimGradients();
  const surface = Skia.Surface.MakeOffscreen(width, height)!;
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  root.drawOnCanvas(surface.getCanvas());
  root.unmount();
  surface.flush();
  return surface.makeImageSnapshot();
}

function fontProvider() {
  const provider = Skia.TypefaceFontProvider.Make();
  const files: [string, string][] = [
    [CARD_FONTS.Stencil, '@expo-google-fonts/big-shoulders-stencil/800ExtraBold/BigShouldersStencil_800ExtraBold.ttf'],
    [CARD_FONTS.Body, '@expo-google-fonts/geologica/400Regular/Geologica_400Regular.ttf'],
    [CARD_FONTS.BodySemi, '@expo-google-fonts/geologica/600SemiBold/Geologica_600SemiBold.ttf'],
    [CARD_FONTS.Mono, '@expo-google-fonts/martian-mono/400Regular/MartianMono_400Regular.ttf'],
  ];
  for (const [family, file] of files) {
    const bytes = new Uint8Array(fs.readFileSync(require.resolve(file)));
    const tf = Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(bytes));
    if (!tf) throw new Error(`font ${file}`);
    provider.registerFont(tf, family);
  }
  return provider;
}

function betaTwo() {
  const { buildReport, parseRain, quakeReading, parseQuakeTop } = require('ground-memory');
  const { twoYears, usgsQuery } = require('../../ground-memory/test/synthetic');
  const ok = (v: unknown) => ({ ok: true, value: v, ms: 1 });
  const readings = {
    water: { ok: false, error: 'Water took longer than 15 s', ms: 1 },
    edge: { ok: false, error: 'x', ms: 1 },
    bowl: ok({ elevationM: 195, ringMedianM: 198.3, depthM: 3.2, lowerThan: 15, ringCount: 16, ringM: 400, reliefM: 10, isBowl: true, noData: false }),
    rain: ok(parseRain(twoYears({ '20030710': 134 }))),
    quakes: ok(quakeReading(97, parseQuakeTop(usgsQuery([{ mag: 6.9, lon: 75.1, lat: 28.7, depth: 10, time: 0, place: '17 km NE of Taranagar, India' }]), 28.486, 77.512))),
    soil: { ok: false, error: 'SoilGrids: no data here (water, rock or city core)', ms: 1 },
  };
  return buildReport({ lat: 28.486083, lon: 77.512026, placeName: 'Beta II', now: new Date('2026-09-27T09:59:00Z'), readings });
}

describe('share card', () => {
  const fonts = fontProvider();
  const report = betaTwo();

  it.each([
    ['open', true],
    ['sealed', false],
  ])('draws the %s card at 1080 × 1350', async (name, full) => {
    const model = cardModel(report, ['Greater Noida'], { full, freeStrata: 2 });
    const image = await draw(cardElement(model, fonts), CARD.width, CARD.height);
    expect(image.width()).toBe(CARD.width);
    expect(image.height()).toBe(CARD.height);
    const png = image.encodeToBytes(ImageFormat.PNG, 100);
    expect(png.length).toBeGreaterThan(10_000);
    const out = process.env.CARD_PNG;
    if (out) fs.writeFileSync(path.join(out, `card-${name}.png`), png);
  });
});
