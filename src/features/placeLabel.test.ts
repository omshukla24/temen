import { placeLabel } from './placeLabel';

describe('placeLabel', () => {
  it('sets the locality large and the town small', () => {
    expect(placeLabel({ placeName: 'Beta II', trail: ['Greater Noida'], lat: 28.486, lon: 77.512 })).toEqual({
      title: 'Beta II',
      subtitle: 'Greater Noida',
    });
  });

  it('drops a town that repeats the name and falls back to coordinates for the small line', () => {
    const l = placeLabel({ placeName: 'Chennai', trail: ['Chennai'], lat: 12.9442, lon: 80.2292 });
    expect(l.title).toBe('Chennai');
    expect(l.subtitle).toMatch(/12\.9442/);
  });

  it('uses the town when the core has no name of its own', () => {
    expect(placeLabel({ placeName: null, trail: ['Greater Noida'], lat: 28.486, lon: 77.512 }).title).toBe('Greater Noida');
  });

  it('uses coordinates when nothing is named', () => {
    const l = placeLabel({ placeName: '  ', trail: [], lat: 25.1173, lon: 55.1351 });
    expect(l.title).toMatch(/25\.1173/);
    expect(l.subtitle).toBe('');
  });
});
