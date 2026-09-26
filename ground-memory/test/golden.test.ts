import sites from './golden-sites.json';
import { fixtureFetchTile } from './fixture-fetch';
import { bowlCheck } from '../src/terrain';
import { sampleWindow, waterEdgeDistance } from '../src/water';

type Expect = {
  waterKind?: string;
  lostPermanentMin?: number;
  lostSeasonalMin?: number;
  bowl?: boolean;
  buffer?: boolean;
};

type Site = { id: string; name: string; lat: number; lon: number; expect: Expect };

describe.each(sites as Site[])('golden site $name', ({ lat, lon, expect: want }: Site) => {
    it('reads the expected water memory', async () => {
      const s = await sampleWindow(lat, lon, fixtureFetchTile);
      if (want.waterKind) expect(s.kind).toBe(want.waterKind);
      if (want.lostPermanentMin) expect(s.share.lostPermanent).toBeGreaterThanOrEqual(want.lostPermanentMin);
      if (want.lostSeasonalMin) expect(s.share.lostSeasonal).toBeGreaterThanOrEqual(want.lostSeasonalMin);
      expect(s.unknown).toBe(0);
    });

    if (want.bowl !== undefined) {
      it(`${want.bowl ? 'sits' : 'does not sit'} in a bowl`, async () => {
        expect((await bowlCheck(lat, lon, fixtureFetchTile)).isBowl).toBe(want.bowl);
      });
    }

    if (want.buffer !== undefined) {
      it('matches the buffer flag', async () => {
        expect((await waterEdgeDistance(lat, lon, fixtureFetchTile)).buffer).toBe(want.buffer);
      });
    }
});
