// "Field Instrument": TEMEN is a survey
// instrument for the ground: chalk paper by day, aquifer dark by night,
// survey-yellow instrument marks, earth and water for the strata. The paper
// still follows the sun (dawn, day, dusk, night). Every text pairing passes
// WCAG AA on its ground; the yellow is a fill (ink on it), never thin text on chalk.

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Palette {
  phase: Phase;
  dark: boolean;
  /** App background. */
  ground: string;
  /** Pressed rows, sunken wells, skeletons. */
  groundDeep: string;
  /** Raised surfaces: fields, sheets, cards. */
  paper: string;
  ink: string;
  inkMuted: string;
  line: string;
  hairline: string;
  scrim: string;
  /** Survey yellow: primary actions, the pin, the staff, PRO. A fill; text on it uses `onAccent`. */
  accent: string;
  onAccent: string;
  /** The accent as text or thin marks on `ground` (AA): dark ochre by day, yellow by night. */
  accentText: string;
  /** Laterite: caution — flags, the buffer rule, heavy rain, danger. Text on it uses `onLaterite`. */
  laterite: string;
  onLaterite: string;
  /** Laterite as small text or strokes on `ground` (AA). */
  lateriteText: string;
  lake: string;
  lakeText: string;
  lakeMemory: string;
  silt: string;
  crimsonEgg: string;
  /** Ground at ~90% over the map, for headers that sit on it. */
  veil: string;
  /** Instrument panels (HUD chips on the map, the loader): aquifer in every light. */
  panel: string;
  onPanel: string;
  /** Contour lines of the terrain behind every screen (drawn at low opacity). */
  topo: string;
  /** OpenFreeMap style for this light. */
  mapStyle: string;
}

const MAP_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const MAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

const AQUIFER = '#0C1719';
const CHALK = '#E9EFE8';
const YELLOW = '#F2BE22';

const day: Palette = {
  phase: 'day',
  dark: false,
  ground: '#ECEFE8',
  groundDeep: '#E0E5DD',
  paper: '#F7F8F4',
  ink: AQUIFER,
  inkMuted: '#4B5C5A',
  line: '#CBD3CC',
  hairline: 'rgba(12,23,25,0.12)',
  scrim: 'rgba(12,23,25,0.42)',
  accent: YELLOW,
  onAccent: AQUIFER,
  accentText: '#875800',
  laterite: '#C4411F',
  onLaterite: '#F7F8F4',
  lateriteText: '#B23A1B',
  lake: '#1B6EA8',
  lakeText: '#1B6EA8',
  lakeMemory: '#86B3CB',
  silt: '#94764A',
  crimsonEgg: '#9E1B22',
  veil: 'rgba(236,239,232,0.92)',
  panel: AQUIFER,
  onPanel: CHALK,
  topo: AQUIFER,
  mapStyle: MAP_LIGHT,
};

// Dawn: the chalk cools towards blue.
const dawn: Palette = {
  ...day,
  phase: 'dawn',
  ground: '#E9EDEC',
  groundDeep: '#DDE3E2',
  paper: '#F6F8F7',
  inkMuted: '#4A5B5C',
  line: '#C9D2D1',
  accentText: '#855700',
  lateriteText: '#B03A1B',
  veil: 'rgba(233,237,236,0.92)',
};

// Dusk: the chalk greys towards evening and the yellow warms.
const dusk: Palette = {
  ...day,
  phase: 'dusk',
  ground: '#E6E9E0',
  groundDeep: '#D9DED3',
  paper: '#F3F5EF',
  inkMuted: '#4A5953',
  line: '#C6CDC2',
  accent: '#F0B41E',
  accentText: '#825300',
  laterite: '#BD3D1C',
  lateriteText: '#AD3819',
  lakeText: '#1B6AA2',
  veil: 'rgba(230,233,224,0.92)',
};

// Night: aquifer — the ground seen from inside the borehole.
const night: Palette = {
  phase: 'night',
  dark: true,
  ground: AQUIFER,
  groundDeep: '#081012',
  paper: '#132327',
  ink: CHALK,
  inkMuted: '#93A7A3',
  line: '#24383C',
  hairline: 'rgba(233,239,232,0.13)',
  scrim: 'rgba(0,0,0,0.6)',
  accent: YELLOW,
  onAccent: AQUIFER,
  accentText: YELLOW,
  laterite: '#F0643C',
  onLaterite: AQUIFER,
  lateriteText: '#FF7A55',
  lake: '#3FA2E0',
  lakeText: '#6DBDF0',
  lakeMemory: '#2D5A70',
  silt: '#B79363',
  crimsonEgg: '#E0323A',
  veil: 'rgba(12,23,25,0.88)',
  panel: '#132327',
  onPanel: CHALK,
  topo: CHALK,
  mapStyle: MAP_DARK,
};

export const palettes: Record<Phase, Palette> = { dawn, day, dusk, night };

/** Band fills for each stratum type in the Core (derived from the palette only). */
export function strataFills(c: Palette) {
  return {
    water: c.lake,
    lostWater: c.lakeMemory,
    ground: c.silt,
    rain: c.dark ? 'rgba(63,162,224,0.5)' : 'rgba(27,110,168,0.42)',
    quakes: c.laterite,
    soil: c.dark ? 'rgba(183,147,99,0.62)' : 'rgba(148,118,74,0.55)',
    cantSee: 'transparent',
    egg: c.crimsonEgg,
    error: c.line,
  } as const;
}

export type StrataFills = ReturnType<typeof strataFills>;
