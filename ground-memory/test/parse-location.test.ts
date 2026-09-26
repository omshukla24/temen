import { parseLocation, recoverPlusCode } from '../src/parse-location';

const pt = (input: string) => {
  const r = parseLocation(input);
  if (r.kind !== 'point') throw new Error(`expected a point from ${input}, got ${JSON.stringify(r)}`);
  return r;
};

describe('parseLocation', () => {
  it('reads a WhatsApp location share', () => {
    const r = pt('https://maps.google.com/maps?q=12.9442%2C80.2292&z=17&hl=en');
    expect(r.lat).toBeCloseTo(12.9442, 6);
    expect(r.lon).toBeCloseTo(80.2292, 6);
  });

  it('reads a WhatsApp message with a place name before the link', () => {
    const r = pt('Chennai One SEZ, 200 Feet Rd, Thoraipakkam\nhttps://maps.google.com/?q=12.9442,80.2292');
    expect(r.lat).toBeCloseTo(12.9442, 6);
  });

  it('prefers the Google place pin over the viewport', () => {
    const r = pt(
      'https://www.google.com/maps/place/Kuberan+Nagar/@12.9500,80.2000,15z/data=!3m1!4b1!4m6!3m5!1s0x3a525d!8m2!3d12.95287!4d80.20706!16s',
    );
    expect(r.lat).toBeCloseTo(12.95287, 6);
    expect(r.lon).toBeCloseTo(80.20706, 6);
    expect(r.via).toBe('google-place');
  });

  it('reads the viewport when that is all there is', () => {
    expect(pt('https://www.google.com/maps/@25.1173,55.1351,15z').lat).toBeCloseTo(25.1173, 6);
  });

  it('reads api=1 search and directions links', () => {
    expect(pt('https://www.google.com/maps/search/?api=1&query=17.4239,78.4738').lon).toBeCloseTo(78.4738, 6);
    expect(pt('https://www.google.com/maps/dir/?api=1&destination=17.4239%2C78.4738').lat).toBeCloseTo(17.4239, 6);
  });

  it('reads geo: URIs, including the q= form with a label', () => {
    expect(pt('geo:12.9442,80.2292').lat).toBeCloseTo(12.9442, 6);
    expect(pt('geo:12.9442,80.2292;u=35?z=17').lon).toBeCloseTo(80.2292, 6);
    const r = pt('geo:0,0?q=12.9442,80.2292(Plot%2014)');
    expect(r.lat).toBeCloseTo(12.9442, 6);
    expect(r.label).toBe('Plot 14');
  });

  it('reads Apple Maps and OpenStreetMap links', () => {
    expect(pt('https://maps.apple.com/?ll=25.1173,55.1351&q=Dropped%20Pin').lat).toBeCloseTo(25.1173, 6);
    expect(pt('https://www.openstreetmap.org/?mlat=26.9124&mlon=70.9126#map=17/26.9124/70.9126').lon).toBeCloseTo(70.9126, 6);
    expect(pt('https://www.openstreetmap.org/#map=17/26.9124/70.9126').lat).toBeCloseTo(26.9124, 6);
  });

  it('reads degrees, minutes and seconds', () => {
    const r = pt(`12°56'39.1"N 80°13'45.1"E`);
    expect(r.lat).toBeCloseTo(12.944194, 5);
    expect(r.lon).toBeCloseTo(80.229194, 5);
    const s = pt('33°51′35.9″S 151°12′40.0″E');
    expect(s.lat).toBeLessThan(0);
  });

  it('reads hemisphere decimals and bare pairs', () => {
    expect(pt('12.9442° N, 80.2292° E').lon).toBeCloseTo(80.2292, 6);
    expect(pt('12.9442, 80.2292').lat).toBeCloseTo(12.9442, 6);
    expect(pt('lat long: -33.8688 151.2093').lat).toBeCloseTo(-33.8688, 6);
  });

  it('reads full plus codes', () => {
    // Chennai One SEZ
    const r = pt('7M42W6VH+MM');
    expect(r.via).toBe('plus-code');
    expect(r.lat).toBeCloseTo(12.9442, 3);
    expect(r.lon).toBeCloseTo(80.2292, 3);
  });

  it('hands back short plus codes with their locality', () => {
    expect(parseLocation('W6VH+MM Chennai, Tamil Nadu')).toEqual({
      kind: 'shortPlusCode',
      code: 'W6VH+MM',
      locality: 'Chennai, Tamil Nadu',
    });
    // recovered near Chennai Central
    const rec = recoverPlusCode('W6VH+MM', 13.08, 80.27);
    expect(rec!.lat).toBeCloseTo(12.9442, 3);
    expect(rec!.lon).toBeCloseTo(80.2292, 3);
  });

  it('asks the app to resolve short links', () => {
    expect(parseLocation('Check this plot https://maps.app.goo.gl/AbCdEf123')).toEqual({
      kind: 'resolve',
      url: 'https://maps.app.goo.gl/AbCdEf123',
    });
  });

  it('turns a named place link into a search', () => {
    expect(parseLocation('https://www.google.com/maps/place/Chennai+One+SEZ')).toEqual({
      kind: 'query',
      text: 'Chennai One SEZ',
    });
  });

  it('ignores null island, out-of-range numbers, dates and phone numbers', () => {
    expect(parseLocation('geo:0,0').kind).toBe('none');
    expect(parseLocation('https://maps.google.com/?q=95.1,80.2').kind).not.toBe('point');
    expect(parseLocation('Meet on 12.09.2026 at 10.30').kind).toBe('none');
    expect(parseLocation('Call +91 98400 12345').kind).toBe('none');
    expect(parseLocation('Price 45.5 lakh, 1200.75 sq ft').kind).toBe('none');
    expect(parseLocation('').kind).toBe('none');
    expect(parseLocation(undefined).kind).toBe('none');
  });
});
