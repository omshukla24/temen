import { Circle, DashPathEffect, Group, Path, Skia, type SkFont, Text, TextPath, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { color } from '@/theme/tokens';

/** The benchmark: a bar with the broad arrow beneath it, as cut into survey stones. */
export function benchmarkPath(cx: number, cy: number, s: number) {
  const p = Skia.PathBuilder.Make();
  p.moveTo(cx - 0.42 * s, cy - 0.2 * s).lineTo(cx + 0.42 * s, cy - 0.2 * s);
  p.moveTo(cx, cy - 0.12 * s).lineTo(cx, cy + 0.38 * s);
  p.moveTo(cx, cy - 0.12 * s).lineTo(cx - 0.26 * s, cy + 0.34 * s);
  p.moveTo(cx, cy - 0.12 * s).lineTo(cx + 0.26 * s, cy + 0.34 * s);
  return p.build();
}

/**
 * Survey Seal: benchmark mark, coordinates to 6 decimals around the rim, and the date.
 * `ringText` is the rim inscription; pass fonts loaded on the caller's side.
 */
export function SealDrawing({
  cx,
  cy,
  r,
  ringText,
  centerText,
  font,
  fontSmall,
  transform,
  opacity = 1,
  tint = color.laterite,
}: {
  cx: number;
  cy: number;
  r: number;
  ringText: string;
  centerText: string;
  font: SkFont | null;
  fontSmall: SkFont | null;
  transform?: Transforms3d | SharedValue<Transforms3d>;
  opacity?: number | SharedValue<number>;
  tint?: string;
}) {
  // start at the left so the inscription reads over the top
  const ring = Skia.PathBuilder.Make()
    .addArc({ x: cx - r * 0.8, y: cy - r * 0.8, width: r * 1.6, height: r * 1.6 }, 180, 359.9)
    .build();
  const textW = fontSmall ? fontSmall.getTextWidth(centerText) : 0;
  return (
    <Group {...(transform ? { transform, origin: { x: cx, y: cy } } : null)} opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={2} color={tint} />
      <Circle cx={cx} cy={cy} r={r * 0.66} style="stroke" strokeWidth={1} color={tint}>
        <DashPathEffect intervals={[2, 3]} />
      </Circle>
      <Path path={benchmarkPath(cx, cy - r * 0.06, r * 0.72)} style="stroke" strokeWidth={2.2} strokeCap="square" color={tint} />
      {font ? <TextPath path={ring} text={ringText} font={font} color={tint} /> : null}
      {fontSmall ? <Text x={cx - textW / 2} y={cy + r * 0.52} text={centerText} font={fontSmall} color={tint} /> : null}
    </Group>
  );
}
