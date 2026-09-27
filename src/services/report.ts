import { StaticMapImageManager } from '@maplibre/maplibre-react-native';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatHemisphere, type GroundReport } from 'ground-memory';

import { esc, renderReportHtml } from '@/features/report/html';

import { MAP_STYLE } from './map';
import type { SiteKit } from './sitekit';

/* eslint-disable @typescript-eslint/no-require-imports */
const FONTS = {
  stencil: require('@expo-google-fonts/big-shoulders-stencil/800ExtraBold/BigShouldersStencil_800ExtraBold.ttf'),
  stencilAlt: require('@expo-google-fonts/big-shoulders-stencil/600SemiBold/BigShouldersStencil_600SemiBold.ttf'),
  body: require('@expo-google-fonts/geologica/400Regular/Geologica_400Regular.ttf'),
  bodySemi: require('@expo-google-fonts/geologica/600SemiBold/Geologica_600SemiBold.ttf'),
  mono: require('@expo-google-fonts/martian-mono/400Regular/MartianMono_400Regular.ttf'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

async function fontFaces(): Promise<string> {
  const faces: [string, number, number | string, 'normal' | 'italic'][] = [
    ['Stencil', FONTS.stencil, 800, 'normal'],
    ['Stencil', FONTS.stencilAlt, 600, 'normal'],
    ['Body', FONTS.body, 400, 'normal'],
    ['Body', FONTS.bodySemi, 600, 'normal'],
    ['Mono', FONTS.mono, 400, 'normal'],
  ];
  const css: string[] = [];
  for (const [family, mod, weight, style] of faces) {
    try {
      const [asset] = await Asset.loadAsync(mod);
      if (!asset.localUri) continue;
      const b64 = await new File(asset.localUri).base64();
      css.push(`@font-face{font-family:${family};src:url(data:font/ttf;base64,${b64}) format('truetype');font-weight:${weight};font-style:${style};}`);
    } catch {
      // fall back to system fonts for this face
    }
  }
  return css.join('\n');
}

async function mapSnapshot(r: GroundReport): Promise<string | null> {
  try {
    const b64 = await StaticMapImageManager.createImage({
      mapStyle: MAP_STYLE,
      center: [r.lon, r.lat],
      zoom: 15,
      width: 520,
      height: 300,
      output: 'base64',
      logo: false,
    });
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

async function photoImgs(kit: SiteKit | null): Promise<string> {
  if (!kit?.photos.length) return '';
  const items: string[] = [];
  for (const p of kit.photos.slice(0, 6)) {
    try {
      const b64 = await new File(p.uri).base64();
      const where = p.lat != null && p.lon != null ? formatHemisphere(p.lat, p.lon, 6) : 'no fix';
      items.push(`<figure><img src="data:image/jpeg;base64,${b64}"/><figcaption class="mono">${esc(where)} · ${esc(p.at.slice(0, 16).replace('T', ' '))}${p.accuracyM ? ` · ±${Math.round(p.accuracyM)} m` : ''}${p.note ? `<br/>${esc(p.note)}` : ''}</figcaption></figure>`);
    } catch {
      // photo moved or deleted
    }
  }
  return items.length ? `<section class="page"><h2 class="mono ink">SITE VISIT</h2><div class="photos">${items.join('')}</div></section>` : '';
}

export async function reportHtml(r: GroundReport, trail: string[], kit: SiteKit | null, opts: { withMap?: boolean } = {}): Promise<string> {
  const [faces, map, photos] = await Promise.all([fontFaces(), opts.withMap === false ? null : mapSnapshot(r), photoImgs(kit)]);
  return renderReportHtml(r, trail, kit, { faces, map, photos });
}

function fileName(r: GroundReport): string {
  const place = (r.placeName ?? 'core').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `Temen-${place}-${r.createdAt.slice(0, 10)}.pdf`;
}

export async function makePdf(html: string, r: GroundReport): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const dest = new File(Paths.cache, fileName(r));
  try {
    if (dest.exists) dest.delete();
    await new File(uri).move(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export async function sharePdf(uri: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Send this core', UTI: 'com.adobe.pdf' });
}
