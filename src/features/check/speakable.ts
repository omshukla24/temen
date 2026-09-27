import type { GroundReport } from 'ground-memory';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT: Record<string, string> = Object.fromEntries(MONTHS.map((m) => [m.slice(0, 3), m]));
const COMPASS: Record<string, string> = {
  N: 'north', S: 'south', E: 'east', W: 'west',
  NE: 'north-east', NW: 'north-west', SE: 'south-east', SW: 'south-west',
  NNE: 'north-north-east', ENE: 'east-north-east', ESE: 'east-south-east', SSE: 'south-south-east',
  SSW: 'south-south-west', WSW: 'west-south-west', WNW: 'west-north-west', NNW: 'north-north-west',
};
const UNITS: [RegExp, string][] = [
  [/(\d)\s?mm\b/g, '$1 millimetres'],
  [/(\d)\s?cm\b/g, '$1 centimetres'],
  [/(\d)\s?km\b/g, '$1 kilometres'],
  [/(\d)\s?m\b/g, '$1 metres'],
  [/(\d)\s?px\b/g, '$1 pixels'],
  [/(\d)\s?%/g, '$1 percent'],
];

/**
 * Text as a phone's voice should say it. Text-to-speech engines read "1984–2024"
 * as "1984 minus 2024", "10 Jul 2003" as "jul", and "M6.9" letter by letter;
 * this spells those out: ranges, dates, units, magnitudes, compass points and
 * Roman-numeral place names ("Beta II" → "Beta 2").
 */
export function speakable(text: string, lang: 'en' | 'hi' = 'en'): string {
  let s = text;
  // ISO dates → 4 December 2023
  s = s.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m, y: string, mo: string, d: string) => {
    const month = MONTHS[Number(mo) - 1];
    return month ? `${Number(d)} ${month} ${y}` : m;
  });
  // 10 Jul 2003 → 10 July 2003
  s = s.replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (_m, d: string, mo: string) => `${d} ${SHORT[mo]}`);
  const to = lang === 'hi' ? ' से ' : ' to ';
  // 1900–today, 1984–2024, 0–5 cm, 15-30: a dash between numbers is a range, never a minus
  s = s.replace(/(\d)\s?[–—-]\s?today\b/gi, `$1${to}${lang === 'hi' ? 'आज' : 'today'}`);
  s = s.replace(/(\d(?:\.\d+)?)\s?[–—-]\s?(\d)/g, `$1${to}$2`);
  // a real minus sign in front of a number
  s = s.replace(/[−-](\d)/g, lang === 'hi' ? 'माइनस $1' : 'minus $1');
  s = s.replace(/\+(\d)/g, lang === 'hi' ? 'प्लस $1' : 'plus $1');
  // 134.0 mm → 134 mm
  s = s.replace(/(\d+)\.0\b/g, '$1');
  if (lang === 'hi') {
    s = s.replace(/(\d)\s?%/g, '$1 प्रतिशत');
    return tidy(s);
  }
  // M4.5+ quakes → quakes of magnitude 4.5 or more; M6.9 → magnitude 6.9
  s = s.replace(/\bM(\d(?:\.\d)?)\+ quakes\b/g, 'quakes of magnitude $1 or more');
  s = s.replace(/\bM(\d(?:\.\d)?)\+/g, 'magnitude $1 or more');
  s = s.replace(/\bM(\d(?:\.\d)?)\b/g, 'magnitude $1');
  // 17 km NE of → 17 kilometres north-east of
  s = s.replace(/\b(N|S|E|W|NE|NW|SE|SW|NNE|ENE|ESE|SSE|SSW|WSW|WNW|NNW) of\b/g, (_m, d: string) => `${COMPASS[d]} of`);
  for (const [re, out] of UNITS) s = s.replace(re, out);
  s = s.replace(/~\s?(\d)/g, 'roughly $1');
  s = s.replace(/≥\s?(\d)/g, 'at least $1');
  // place names: Beta II, Sector III
  s = s.replace(/\b([A-Z][a-z]+) (II|III)\b/g, (_m, w: string, r: string) => `${w} ${r === 'II' ? 2 : 3}`);
  return tidy(s);
}

function tidy(s: string): string {
  return s
    .replace(/\s*\([^)]*\)/g, '') // asides in brackets read badly aloud
    .replace(/["“”]/g, '')
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * What the speaker reads for a core: the place, the headline, then each stratum
 * that was read (its name, headline and the plain sentence under it), and what
 * the core can't see. Everything passes through `speakable`.
 */
export function spokenScript(
  report: GroundReport,
  opts: { lang: 'en' | 'hi'; place?: string | null; tl: (s: string) => string; cantSee: string },
): string {
  const { lang, tl } = opts;
  const stop = lang === 'hi' ? '। ' : '. ';
  const end = (x: string) => x.trim().replace(/[.।]$/, '');
  const parts: string[] = [];
  if (opts.place) parts.push(end(opts.place));
  parts.push(end(tl(report.headline)));
  for (const s of report.strata) {
    if (s.key === 'cantSee' || s.status !== 'ok') continue;
    parts.push(`${tl(s.title)}: ${end(tl(s.headline))}`);
    // detail sentences are English-only in the library
    if (lang === 'en' && s.detail) parts.push(end(s.detail));
  }
  parts.push(end(opts.cantSee));
  return speakable(parts.join(stop) + stop.trim(), lang);
}
