/**
 * Just enough GeoTIFF for SoilGrids' WCS grids: one band of 16-bit integers,
 * uncompressed, in strips, placed by a tiepoint and pixel scale in degrees.
 * Anything else is refused rather than misread.
 */
export interface Grid16 {
  w: number;
  h: number;
  /** Outer corner of the top-left cell, degrees. */
  west: number;
  north: number;
  /** Cell size, degrees. */
  dLon: number;
  dLat: number;
  /** Row-major, top row first. */
  values: Int16Array | Uint16Array;
}

const TAG = {
  width: 256,
  height: 257,
  bitsPerSample: 258,
  compression: 259,
  stripOffsets: 273,
  samplesPerPixel: 277,
  rowsPerStrip: 278,
  sampleFormat: 339,
  pixelScale: 33550,
  tiepoint: 33922,
} as const;

// TIFF field type → bytes per value (SHORT, LONG, DOUBLE; others are not read)
const TYPE_SIZE: Record<number, number> = { 3: 2, 4: 4, 12: 8 };

function readTags(dv: DataView, le: boolean): Map<number, number[]> {
  const ifd = dv.getUint32(4, le);
  const count = dv.getUint16(ifd, le);
  const tags = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    const tag = dv.getUint16(entry, le);
    const type = dv.getUint16(entry + 2, le);
    const n = dv.getUint32(entry + 4, le);
    const size = TYPE_SIZE[type];
    if (!size) continue;
    const at = size * n <= 4 ? entry + 8 : dv.getUint32(entry + 8, le);
    const values: number[] = [];
    for (let k = 0; k < n; k++) {
      const o = at + k * size;
      values.push(type === 3 ? dv.getUint16(o, le) : type === 4 ? dv.getUint32(o, le) : dv.getFloat64(o, le));
    }
    tags.set(tag, values);
  }
  return tags;
}

export function decodeGeoTiff16(input: ArrayBuffer): Grid16 {
  if (input.byteLength < 8) throw new Error('Grid is not a TIFF');
  const dv = new DataView(input);
  const order = dv.getUint16(0);
  if (order !== 0x4949 && order !== 0x4d4d) throw new Error('Grid is not a TIFF');
  const le = order === 0x4949;
  if (dv.getUint16(2, le) !== 42) throw new Error('Grid is not a TIFF');

  const tags = readTags(dv, le);
  const one = (tag: number, fallback?: number): number => {
    const v = tags.get(tag)?.[0] ?? fallback;
    if (v === undefined) throw new Error(`Grid TIFF lacks tag ${tag}`);
    return v;
  };
  if (one(TAG.compression, 1) !== 1) throw new Error('Grid TIFF is compressed');
  if (one(TAG.bitsPerSample) !== 16 || one(TAG.samplesPerPixel, 1) !== 1) throw new Error('Grid TIFF is not one 16-bit band');
  const offsets = tags.get(TAG.stripOffsets);
  const scale = tags.get(TAG.pixelScale);
  const tie = tags.get(TAG.tiepoint);
  if (!offsets || !scale || scale.length < 2 || !tie || tie.length < 6) throw new Error('Grid TIFF is not georeferenced strips');

  const w = one(TAG.width);
  const h = one(TAG.height);
  const rowsPerStrip = one(TAG.rowsPerStrip, h);
  const signed = one(TAG.sampleFormat, 1) === 2;
  const values = signed ? new Int16Array(w * h) : new Uint16Array(w * h);
  for (let y = 0; y < h; y++) {
    const rowAt = offsets[Math.floor(y / rowsPerStrip)] + (y % rowsPerStrip) * w * 2;
    if (rowAt + w * 2 > input.byteLength) throw new Error('Grid TIFF is truncated');
    for (let x = 0; x < w; x++) {
      values[y * w + x] = signed ? dv.getInt16(rowAt + x * 2, le) : dv.getUint16(rowAt + x * 2, le);
    }
  }
  const [dLon, dLat] = scale;
  // tiepoint: raster (i, j) sits at model (x, y)
  const [i, j, , x0, y0] = tie;
  return { w, h, west: x0 - i * dLon, north: y0 + j * dLat, dLon, dLat, values };
}
