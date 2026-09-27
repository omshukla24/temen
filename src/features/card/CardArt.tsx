import {
  DashPathEffect,
  Group,
  Line,
  Paragraph,
  Path,
  Rect,
  Skia,
  TextAlign,
  vec,
  type SkParagraph,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import { CoreDrawing } from '@/setpieces/CoreDrawing';
import { terrainLines } from '@/setpieces/terrain/field';
import { color } from '@/theme/tokens';

import type { CardModel } from './model';

/** 4:5, the shape WhatsApp and Instagram show whole. */
export const CARD = { width: 1080, height: 1350 } as const;

/** The families the card's font provider registers (see `share.ts`). */
export const CARD_FONTS = {
  Stencil: 'CardStencil',
  Body: 'CardBody',
  BodySemi: 'CardBodySemi',
  Mono: 'CardMono',
} as const;

const M = 72;

/** What a row without a reading says, in the app's own words for the same states. */
const STAMP = {
  sealed: { word: 'SEALED', note: 'Open the full core in Temen' },
  error: { word: 'NO READING', note: 'The source did not answer this time' },
  empty: { word: 'NOT MODELLED', note: 'Nothing is modelled at this point' },
} as const;

type Family = keyof typeof CARD_FONTS;
interface Style {
  family: Family;
  size: number;
  color: string;
  /** Tracking in em. */
  track?: number;
  lh?: number;
  maxLines?: number;
  align?: 'left' | 'right';
}

function para(fonts: SkTypefaceFontProvider, text: string, width: number, s: Style): SkParagraph {
  const b = Skia.ParagraphBuilder.Make(
    { maxLines: s.maxLines, ellipsis: s.maxLines ? '…' : undefined, textAlign: s.align === 'right' ? TextAlign.Right : TextAlign.Left },
    fonts,
  );
  b.pushStyle({
    fontFamilies: [CARD_FONTS[s.family]],
    fontSize: s.size,
    color: Skia.Color(s.color),
    letterSpacing: (s.track ?? 0) * s.size,
    heightMultiplier: s.lh,
  });
  b.addText(text);
  b.pop();
  const p = b.build();
  p.layout(width);
  return p;
}

function terrain(seed: number) {
  const minor = Skia.PathBuilder.Make();
  const major = Skia.PathBuilder.Make();
  const m = Skia.Matrix();
  m.scale(CARD.width, CARD.height);
  for (const l of terrainLines(seed, CARD.height / CARD.width)) {
    const p = Skia.Path.MakeFromSVGString(l.d);
    if (p) (l.major ? major : minor).addPath(p, m);
  }
  return { minor: minor.build(), major: major.build() };
}

/**
 * The shareable card: the place in the stencil, the core's headline, the core
 * itself beside one row per stratum, and a footer with the coordinates, the
 * sources and the honest line. Drawn on the chalk print palette.
 */
export function cardElement(model: CardModel, fonts: SkTypefaceFontProvider): ReactElement {
  const W = CARD.width;
  const H = CARD.height;
  const inner = W - M * 2;
  const ink = color.ink;
  const muted = color.inkMuted;
  const ground = terrain(model.seed);
  const out: ReactElement[] = [];
  let y = 64;

  // masthead
  const wordmark = para(fonts, 'TEMEN', 400, { family: 'Stencil', size: 46, color: ink, track: 0.16, lh: 1.06 });
  const stamp = para(fonts, `CORE ${model.coreId}\n${model.date}`, 420, { family: 'Mono', size: 19, color: ink, track: 0.16, lh: 1.5, align: 'right' });
  out.push(<Paragraph key="wm" paragraph={wordmark} x={M} y={y} width={400} />);
  out.push(<Paragraph key="stamp" paragraph={stamp} x={W - M - 420} y={y + 2} width={420} />);
  y += 92;

  // eyebrow with the survey square
  out.push(<Rect key="sq" x={M} y={y + 5} width={15} height={15} color={color.accent} />);
  out.push(<Rect key="sqf" x={M} y={y + 5} width={15} height={15} style="stroke" strokeWidth={2} color={ink} />);
  const eyebrow = para(fonts, 'GROUND REPORT · 1984–2024', inner - 30, { family: 'Mono', size: 20, color: ink, track: 0.2 });
  out.push(<Paragraph key="eb" paragraph={eyebrow} x={M + 30} y={y} width={inner - 30} />);
  y += 44;

  // the place
  const title = para(fonts, model.title.toUpperCase(), inner, { family: 'Stencil', size: 118, color: ink, lh: 1.04, maxLines: 2 });
  out.push(<Paragraph key="title" paragraph={title} x={M} y={y} width={inner} />);
  y += title.getHeight() + 4;
  if (model.subtitle) {
    const sub = para(fonts, model.subtitle.toUpperCase(), inner, { family: 'Mono', size: 22, color: muted, track: 0.16, maxLines: 1 });
    out.push(<Paragraph key="sub" paragraph={sub} x={M} y={y} width={inner} />);
    y += sub.getHeight() + 18;
  }

  // the staff: a tick a year, 1984 to 2024
  const ticks = 40;
  out.push(<Line key="staff" p1={vec(M, y)} p2={vec(W - M, y)} color={ink} strokeWidth={2} />);
  for (let i = 0; i <= ticks; i++) {
    const x = M + (inner * i) / ticks;
    out.push(<Line key={`t${i}`} p1={vec(x, y)} p2={vec(x, y + (i % 5 === 0 ? 20 : 10))} color={ink} strokeWidth={i % 5 === 0 ? 2 : 1.2} />);
  }
  const y1984 = para(fonts, '1984', 200, { family: 'Mono', size: 17, color: muted, track: 0.16 });
  const y2024 = para(fonts, '2024', 200, { family: 'Mono', size: 17, color: muted, track: 0.16, align: 'right' });
  out.push(<Paragraph key="y0" paragraph={y1984} x={M} y={y + 26} width={200} />);
  out.push(<Paragraph key="y1" paragraph={y2024} x={W - M - 200} y={y + 26} width={200} />);
  y += 70;

  // what the ground remembers, in a sentence
  const headline = para(fonts, model.headline, inner, { family: 'BodySemi', size: 44, color: ink, lh: 1.16, maxLines: 2 });
  out.push(<Paragraph key="hl" paragraph={headline} x={M} y={y} width={inner} />);
  y += headline.getHeight() + 28;
  out.push(<Line key="rule" p1={vec(M, y)} p2={vec(W - M, y)} color={ink} strokeWidth={2} />);
  y += 24;

  // the core beside its strata
  const footerTop = H - 176;
  const bodyH = footerTop - 28 - y;
  const coreW = 150;
  out.push(<CoreDrawing key="core" width={coreW} height={bodyH} bands={model.bands} x={M} y={y} tilt={0.18} />);
  const colX = M + coreW + 48;
  const colW = W - M - colX;
  const rowH = model.rows.length ? bodyH / model.rows.length : bodyH;
  model.rows.forEach((r, i) => {
    const top = y + i * rowH;
    const head = para(fonts, `${r.index}  ${r.title}`, colW, { family: 'Mono', size: 19, color: muted, track: 0.16, maxLines: 1 });
    out.push(<Paragraph key={`rh${i}`} paragraph={head} x={colX} y={top} width={colW} />);
    const big = rowH > 150 ? 64 : 50;
    const readY = top + head.getHeight() + 2;
    if (r.state !== 'ok') {
      const word = para(fonts, STAMP[r.state].word, colW, { family: 'Stencil', size: big * 0.7, color: muted, lh: 1.06 });
      out.push(<Paragraph key={`rs${i}`} paragraph={word} x={colX} y={readY} width={colW} />);
      const note = para(fonts, STAMP[r.state].note, colW, { family: 'Body', size: 22, color: muted, maxLines: 1 });
      out.push(<Paragraph key={`rn${i}`} paragraph={note} x={colX} y={readY + word.getHeight() + 2} width={colW} />);
    } else {
      const reading = para(fonts, r.reading.toUpperCase(), colW, { family: 'Stencil', size: big, color: ink, lh: 1.04, maxLines: 1 });
      out.push(<Paragraph key={`rr${i}`} paragraph={reading} x={colX} y={readY} width={colW} />);
      const unitX = colX + reading.getLongestLine() + 14;
      if (r.unit && unitX < W - M - 60) {
        const unit = para(fonts, r.unit.toUpperCase(), W - M - unitX, { family: 'Mono', size: 19, color: muted, track: 0.12, maxLines: 1 });
        out.push(<Paragraph key={`ru${i}`} paragraph={unit} x={unitX} y={readY + reading.getHeight() - unit.getHeight() - 8} width={W - M - unitX} />);
      }
      const hl = para(fonts, r.headline, colW, { family: 'Body', size: 23, color: ink, maxLines: 1 });
      out.push(<Paragraph key={`rl${i}`} paragraph={hl} x={colX} y={readY + reading.getHeight() + 2} width={colW} />);
    }
    if (i > 0) out.push(<Line key={`rd${i}`} p1={vec(colX, top - 10)} p2={vec(W - M, top - 10)} color={color.line} strokeWidth={1.5} />);
  });

  // footer: where, from what, and what it is not
  out.push(<Line key="foot" p1={vec(M, footerTop)} p2={vec(W - M, footerTop)} color={ink} strokeWidth={2} />);
  const coords = para(fonts, model.coords, inner, { family: 'Mono', size: 22, color: ink, track: 0.12, maxLines: 1 });
  out.push(<Paragraph key="xy" paragraph={coords} x={M} y={footerTop + 20} width={inner} />);
  const tagW = 330;
  const noteW = inner - tagW - 24;
  const honest = para(fonts, `Satellite and model readings, not a safety rating. ${model.sources}.`, noteW, { family: 'Body', size: 18, color: muted, lh: 1.35, maxLines: 3 });
  out.push(<Paragraph key="src" paragraph={honest} x={M} y={footerTop + 60} width={noteW} />);
  const tagY = H - 64 - 72;
  out.push(<Rect key="tag" x={W - M - tagW} y={tagY} width={tagW} height={72} color={color.accent} />);
  out.push(<Rect key="tagf" x={W - M - tagW} y={tagY} width={tagW} height={72} style="stroke" strokeWidth={2.5} color={ink} />);
  const tag = para(fonts, 'WHAT THE GROUND\nREMEMBERS', tagW - 32, { family: 'Mono', size: 18, color: ink, track: 0.14, lh: 1.4 });
  out.push(<Paragraph key="tagt" paragraph={tag} x={W - M - tagW + 16} y={tagY + (72 - tag.getHeight()) / 2} width={tagW - 32} />);

  return (
    <Group>
      <Rect x={0} y={0} width={W} height={H} color={color.ground} />
      <Path path={ground.minor} style="stroke" strokeWidth={1.4} color={ink} opacity={0.07} />
      <Path path={ground.major} style="stroke" strokeWidth={2.2} color={ink} opacity={0.13} />
      {/* registration marks at the corners, as on a survey sheet */}
      {[
        [28, 28],
        [W - 28, 28],
        [28, H - 28],
        [W - 28, H - 28],
      ].map(([cx, cy], i) => (
        <Group key={`reg${i}`}>
          <Line p1={vec(cx - 12, cy)} p2={vec(cx + 12, cy)} color={ink} strokeWidth={1.5} />
          <Line p1={vec(cx, cy - 12)} p2={vec(cx, cy + 12)} color={ink} strokeWidth={1.5} />
        </Group>
      ))}
      <Rect x={16} y={16} width={W - 32} height={H - 32} style="stroke" strokeWidth={1.5} color={ink} opacity={0.35}>
        <DashPathEffect intervals={[6, 6]} />
      </Rect>
      {out}
    </Group>
  );
}
