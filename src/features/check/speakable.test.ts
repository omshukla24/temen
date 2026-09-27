import { speakable } from './speakable';

describe('speakable', () => {
  it('reads year ranges as ranges, not minus', () => {
    expect(speakable('No water seen here 1984–2024')).toBe('No water seen here 1984 to 2024');
    expect(speakable('1984-2024 · 30 m')).toBe('1984 to 2024, 30 metres');
    expect(speakable('1900–today')).toBe('1900 to today');
    expect(speakable('at 15–30 cm')).toBe('at 15 to 30 centimetres');
  });

  it('spells out dates', () => {
    expect(speakable('The wettest day since 1981 was 10 Jul 2003: 134.0 mm.')).toBe(
      'The wettest day since 1981 was 10 July 2003: 134 millimetres.',
    );
    expect(speakable('on 2023-12-04')).toBe('on 4 December 2023');
  });

  it('says a real minus sign as minus', () => {
    expect(speakable('−3.1 m vs 400 m around')).toBe('minus 3.1 metres vs 400 metres around');
  });

  it('reads magnitudes, distances and compass points', () => {
    expect(speakable('No M4.5+ quakes within 300 km')).toBe('No quakes of magnitude 4.5 or more within 300 kilometres');
    expect(speakable('The strongest: M6.9, 17 km NE of Taranagar, India, 1905, 232 km away.')).toBe(
      'The strongest: magnitude 6.9, 17 kilometres north-east of Taranagar, India, 1905, 232 kilometres away.',
    );
  });

  it('drops asides and quotes, reads percentages and approximations', () => {
    expect(speakable('Days of 64.5 mm or more (IMD "heavy"): 0.7 a year')).toBe('Days of 64.5 millimetres or more: 0.7 a year');
    expect(speakable('66% of a ~55 km grid')).toBe('66 percent of a roughly 55 kilometres grid');
  });

  it('reads Roman numerals in place names', () => {
    expect(speakable('Beta II, Greater Noida')).toBe('Beta 2, Greater Noida');
  });

  it('handles Hindi ranges and percentages', () => {
    expect(speakable('1984–2024 में 66%', 'hi')).toBe('1984 से 2024 में 66 प्रतिशत');
  });
});
