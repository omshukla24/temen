import UPNG from 'upng-js';

export interface DecodedImage {
  w: number;
  h: number;
  /** RGBA8, row-major, length w * h * 4. */
  rgba: Uint8Array;
}

/**
 * Decodes any PNG (RGBA, RGB or palette) to RGBA8.
 * Accepts a Uint8Array view too: Node Buffers are often views into a larger
 * pooled ArrayBuffer, so the view's own bytes are copied out first.
 */
export function decodePng(input: ArrayBuffer | Uint8Array): DecodedImage {
  const buf =
    input instanceof Uint8Array
      ? (input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer)
      : input;
  const img = UPNG.decode(buf);
  const frames = UPNG.toRGBA8(img);
  if (!frames.length) throw new Error('PNG has no frames');
  return { w: img.width, h: img.height, rgba: new Uint8Array(frames[0]) };
}
