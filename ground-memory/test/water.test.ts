import { fixtureFetchTile } from './fixture-fetch';
import {
  UNKNOWN_CLASS,
  bufferText,
  classifyPixel,
  className,
  sharesFromCounts,
  waterEdgeDistance,
  waterHeadline,
  waterKind,
  waterMask,
  sampleWindow,
  type WaterClass,
} from '../src/water';

const counts = (c: Partial<Record<WaterClass, number>>) =>
  ({
    none: 0, permanent: 0, newPermanent: 0, lostPermanent: 0, seasonal: 0, newSeasonal: 0,
    lostSeasonal: 0, seasonalToPermanent: 0, permanentToSeasonal: 0, ephemeralPermanent: 0,
    ephemeralSeasonal: 0, unknown: 0, ...c,
  }) as Record<WaterClass, number>;

describe('classifyPixel', () => {
  it('maps the inferred 2024 palette to JRC classes', () => {
    expect(className(classifyPixel(0, 0, 221, 255))).toBe('permanent');
    expect(className(classifyPixel(34, 177, 76, 255))).toBe('newPermanent');
    expect(className(classifyPixel(147, 7, 62, 255))).toBe('lostPermanent');
    expect(className(classifyPixel(153, 217, 234, 255))).toBe('seasonal');
    expect(className(classifyPixel(181, 230, 29, 255))).toBe('newSeasonal');
    expect(className(classifyPixel(235, 180, 187, 255))).toBe('lostSeasonal');
    expect(className(classifyPixel(255, 139, 55, 255))).toBe('seasonalToPermanent');
    expect(className(classifyPixel(255, 221, 102, 255))).toBe('permanentToSeasonal');
    expect(className(classifyPixel(127, 127, 127, 255))).toBe('ephemeralPermanent');
    expect(className(classifyPixel(172, 172, 172, 255))).toBe('ephemeralSeasonal');
  });

  it('treats transparent as never water', () => {
    expect(classifyPixel(0, 0, 221, 0)).toBe(0);
  });

  it('tolerates small drift but never guesses across hues', () => {
    expect(className(classifyPixel(2, 3, 218, 255))).toBe('permanent');
    expect(classifyPixel(255, 0, 255, 255)).toBe(UNKNOWN_CLASS);
  });
});

describe('verdict rules', () => {
  it('ranks standing water above a history of water', () => {
    expect(waterKind(sharesFromCounts(counts({ permanent: 50, lostPermanent: 31 }), 81))).toBe('onWater');
  });
  it('flags lost water at 20%', () => {
    expect(waterKind(sharesFromCounts(counts({ lostSeasonal: 17 }), 81))).toBe('lost');
    expect(waterKind(sharesFromCounts(counts({ lostSeasonal: 16 }), 81))).toBe('near');
  });
  it('flags seasonal ground', () => {
    expect(waterKind(sharesFromCounts(counts({ seasonal: 10, newSeasonal: 10 }), 81))).toBe('seasonal');
  });
  it('says none only when no pixel was ever water', () => {
    expect(waterKind(sharesFromCounts(counts({ none: 81 }), 81))).toBe('none');
  });
  it('never uses the words safe or unsafe', () => {
    for (const kind of ['onWater', 'lost', 'seasonal', 'ephemeral', 'near', 'none'] as const) {
      const text = waterHeadline({
        total: 81, counts: counts({}), centre: 'none', kind, windowM: 168, missingTiles: 0, unknown: 0,
        share: { now: 0.5, seasonal: 0.2, lost: 0.3, lostPermanent: 0.1, lostSeasonal: 0.2, ephemeral: 0.2, any: 1 },
      });
      expect(`${text.headline} ${text.detail}`).not.toMatch(/\b(un)?safe\b/i);
    }
  });
});

describe('waterEdgeDistance', () => {
  it('is 0 on water and fires the buffer flag', async () => {
    const e = await waterEdgeDistance(12.9442, 80.2292, fixtureFetchTile);
    expect(e.distanceM).toBe(0);
    expect(e.buffer).toBe(true);
    expect(bufferText(e)).toMatch(/official FTL map/);
  });

  it('finds nothing within 600 m in the desert', async () => {
    const e = await waterEdgeDistance(26.9124, 70.9126, fixtureFetchTile);
    expect(e.distanceM).toBeNull();
    expect(e.buffer).toBe(false);
    expect(bufferText(e)).toBeNull();
  });

  it('measures a positive distance a little off the shore', async () => {
    // ~250 m south-east of the Chennai One sample, still inside the recorded tiles
    const e = await waterEdgeDistance(12.9425, 80.2300, fixtureFetchTile, 600);
    expect(e.distanceM).not.toBeNull();
    expect(e.bearingDeg).not.toBeNull();
  });
});

describe('waterMask', () => {
  it('returns a class grid centred on the point', async () => {
    const m = await waterMask(25.1173, 55.1351, fixtureFetchTile, 48);
    expect(m.w).toBe(97);
    expect(m.classes.length).toBe(97 * 97);
    expect(className(m.classes[48 * 97 + 48])).toBe('lostPermanent');
  });
});

describe('sampleWindow', () => {
  it('samples a 9×9 window by default', async () => {
    const s = await sampleWindow(25.1173, 55.1351, fixtureFetchTile);
    expect(s.total).toBe(81);
    expect(s.unknown).toBe(0);
    expect(s.missingTiles).toBe(0);
  });
});
