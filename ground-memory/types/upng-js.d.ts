declare module 'upng-js' {
  export interface Image {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: ArrayBuffer;
  }
  export function decode(buffer: ArrayBuffer): Image;
  export function toRGBA8(img: Image): ArrayBuffer[];
  const UPNG: { decode: typeof decode; toRGBA8: typeof toRGBA8 };
  export default UPNG;
}
