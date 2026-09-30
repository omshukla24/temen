import { decodeGeoTiff16 } from '../src/tiff';
import { geoTiff16 } from './synthetic';

describe('decodeGeoTiff16', () => {
  const spec = { w: 3, h: 2, west: 77.5, north: 28.5, dLon: 0.01, dLat: 0.02, values: [1, 2, 3, 0, -5, 600] };

  it.each([false, true])('reads size, corner, cell size and values (big-endian %s)', (bigEndian) => {
    const g = decodeGeoTiff16(geoTiff16({ ...spec, bigEndian }));
    expect(g).toMatchObject({ w: 3, h: 2, west: 77.5, north: 28.5, dLon: 0.01, dLat: 0.02 });
    expect(Array.from(g.values)).toEqual([1, 2, 3, 0, -5, 600]);
  });

  it('rejects something that is not a TIFF, like a WCS error page', () => {
    const xml = new TextEncoder().encode('<?xml version="1.0"?><ows:ExceptionReport/>');
    expect(() => decodeGeoTiff16(xml.buffer as ArrayBuffer)).toThrow(/not a TIFF/);
  });

  it('rejects a compressed grid instead of reading garbage', () => {
    const buf = geoTiff16(spec);
    const dv = new DataView(buf);
    // entry 3 is Compression (259); 8 = Deflate
    dv.setUint16(10 + 3 * 12 + 8, 8, true);
    expect(() => decodeGeoTiff16(buf)).toThrow(/compressed/);
  });
});
