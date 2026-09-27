import { Group, Line, LinearGradient, Path, Rect, Skia, Text, vec, type SkFont, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { color } from '@/theme/tokens';

export const DIAL = { spacing: 22, from: 1984, to: 2022, height: 88 } as const;

/** Ruler ticks for every year; majors every 5 years and at both ends. */
export function dialPaths(from: number, to: number, spacing: number, h: number) {
  const minor = Skia.PathBuilder.Make();
  const major = Skia.PathBuilder.Make();
  for (let y = from; y <= to; y++) {
    const x = (y - from) * spacing;
    const isMajor = y % 5 === 0 || y === from || y === to;
    (isMajor ? major : minor).moveTo(x, h * 0.18).lineTo(x, h * (isMajor ? 0.56 : 0.4));
  }
  return { minor: minor.build(), major: major.build() };
}

/**
 * The Year Dial: a ruler that slides under a fixed laterite index. `offset`
 * is the ruler's x translation; the centre of the view reads the year.
 */
export interface DialColors {
  ink: string;
  inkMuted: string;
  hairline: string;
  /** Hex, so the edge fades can append an alpha. */
  ground: string;
  laterite: string;
}

const PRINT_DIAL: DialColors = { ink: color.ink, inkMuted: color.inkMuted, hairline: color.hairline, ground: color.ground, laterite: color.laterite };

export function DialDrawing({
  width,
  height = DIAL.height,
  offset,
  font,
  from = DIAL.from,
  to = DIAL.to,
  spacing = DIAL.spacing,
  colors = PRINT_DIAL,
}: {
  width: number;
  colors?: DialColors;
  height?: number;
  offset: number | SharedValue<Transforms3d>;
  font: SkFont | null;
  from?: number;
  to?: number;
  spacing?: number;
}) {
  const { minor, major } = dialPaths(from, to, spacing, height);
  const labels: { x: number; text: string }[] = [];
  for (let y = from; y <= to; y++) {
    // ends are labelled too, unless a five-year label sits right next to them
    const end = (y === from || y === to) && Math.abs(y - Math.round(y / 5) * 5) >= 2;
    if (y % 5 === 0 || end) labels.push({ x: (y - from) * spacing, text: String(y) });
  }
  const transform = typeof offset === 'number' ? [{ translateX: width / 2 + offset }] : offset;
  const fade = Math.min(80, width * 0.22);
  const tri = Skia.PathBuilder.Make()
    .moveTo(width / 2 - 6, 0)
    .lineTo(width / 2 + 6, 0)
    .lineTo(width / 2, 8)
    .close()
    .build();
  return (
    <Group>
      <Line p1={vec(0, height * 0.18)} p2={vec(width, height * 0.18)} color={colors.hairline} strokeWidth={1} />
      <Group transform={transform}>
        <Path path={minor} style="stroke" strokeWidth={1} color={colors.inkMuted} />
        <Path path={major} style="stroke" strokeWidth={1.5} color={colors.ink} />
        {font
          ? labels.map((l) => (
              <Text key={l.text} x={l.x - font.getTextWidth(l.text) / 2} y={height * 0.86} text={l.text} font={font} color={colors.ink} />
            ))
          : null}
      </Group>
      {/* soft edges: the ruler runs under the paper */}
      <Rect x={0} y={0} width={fade} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(fade, 0)} colors={[colors.ground, `${colors.ground}00`]} />
      </Rect>
      <Rect x={width - fade} y={0} width={fade} height={height}>
        <LinearGradient start={vec(width - fade, 0)} end={vec(width, 0)} colors={[`${colors.ground}00`, colors.ground]} />
      </Rect>
      <Line p1={vec(width / 2, 0)} p2={vec(width / 2, height * 0.66)} color={colors.laterite} strokeWidth={2} />
      <Path path={tri} color={colors.laterite} />
    </Group>
  );
}
