import { isLostIndex, isWaterIndex, type WaterMask } from 'ground-memory';

// JRC class indices (see ground-memory WATER_CLASSES)
const NOW = new Set([1, 2, 7]);
const PART = new Set([4, 5, 8, 9, 10]);

/** RGBA8 texels for the Rising: r = now, g = gone, b = part-year/brief, a = any. */
export function maskTexels(mask: WaterMask): Uint8Array {
  const out = new Uint8Array(mask.w * mask.h * 4);
  for (let i = 0; i < mask.classes.length; i++) {
    const c = mask.classes[i];
    if (!isWaterIndex(c)) continue;
    const o = i * 4;
    out[o] = NOW.has(c) ? 255 : 0;
    out[o + 1] = isLostIndex(c) ? 255 : 0;
    out[o + 2] = PART.has(c) ? 255 : 0;
    out[o + 3] = 255;
  }
  return out;
}

export interface MaskStats {
  /** Share of the view's pixels that were ever water, and that are gone. */
  any: number;
  lost: number;
}

export function maskStats(mask: WaterMask): MaskStats {
  let any = 0;
  let lost = 0;
  for (const c of mask.classes) {
    if (!isWaterIndex(c)) continue;
    any++;
    if (isLostIndex(c)) lost++;
  }
  const n = Math.max(1, mask.classes.length);
  return { any: any / n, lost: lost / n };
}

/**
 * Water in the 9×9 window at the mask centre — the same pixels the report reads.
 * The HUD shows the lost share when any water is gone, else the share of water at all.
 */
export function centreShare(mask: WaterMask): { pct: number; gone: boolean } {
  const c = Math.floor(mask.w / 2);
  let lost = 0;
  let any = 0;
  for (let y = c - 4; y <= c + 4; y++)
    for (let x = c - 4; x <= c + 4; x++) {
      const k = mask.classes[y * mask.w + x];
      if (isWaterIndex(k)) any++;
      if (isLostIndex(k)) lost++;
    }
  return { pct: Math.round(((lost || any) / 81) * 100), gone: lost > 0 };
}

/**
 * Screen placement of the mask when the map camera sits on the pin at `zoom`.
 * MapLibre's world is 512·2^zoom points wide; JRC tiles are 256 px at z13,
 * so one satellite pixel spans 2^(zoom−12) points.
 */
export function maskPlacement(mask: WaterMask, pinGx: number, pinGy: number, zoom: number, viewW: number, viewH: number) {
  const cell = 2 ** (zoom - 12);
  return {
    cell,
    origin: [viewW / 2 + (mask.x0 - pinGx) * cell, viewH / 2 + (mask.y0 - pinGy) * cell] as [number, number],
  };
}
