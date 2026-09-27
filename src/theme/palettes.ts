// Design lock v4 "Cyanotype" (DESIGN.md §0). TEMEN reads the ground the way a
// survey plan is printed: white linework on Prussian blue by day, the
// blue-black of the borehole by night, survey-yellow keys and marks, earth and
// water for the strata. The light still follows the sun (dawn, day, dusk,
// night). Every text pairing passes WCAG AA on its ground and on paper.

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
  /** The accent as text or thin marks on `ground` (AA). */
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
  /** Instrument panels (HUD chips on the map, the loader): deep blue in every light. */
  panel: string;
  onPanel: string;
  /** Hatch lines drawn over a stratum's coloured column. */
  hatchInk: string;
  /** Contour lines of the terrain behind every screen (drawn at low opacity). */
  topo: string;
  /** OpenFreeMap style for this light. */
  mapStyle: string;
}

const MAP_FIORD = 'https://tiles.openfreemap.org/styles/fiord';
const MAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

const PRUSSIAN = '#133F70';
const DEEP = '#0A1D33';
const WHITE = '#F4F7FB';
const YELLOW = '#F2BE22';

const day: Palette = {
  phase: 'day',
  dark: true,
  ground: PRUSSIAN,
  groundDeep: '#0F3561',
  paper: '#194B80',
  ink: WHITE,
  inkMuted: '#B3C8DE',
  line: '#33609A',
  hairline: 'rgba(244,247,251,0.16)',
  scrim: 'rgba(5,14,26,0.62)',
  accent: YELLOW,
  onAccent: DEEP,
  accentText: YELLOW,
  laterite: '#FF6A3D',
  onLaterite: DEEP,
  lateriteText: '#FFAA8C',
  lake: '#62C2FF',
  lakeText: '#8CD2FF',
  lakeMemory: '#4A7DB0',
  silt: '#D0A869',
  crimsonEgg: '#FF4B55',
  veil: 'rgba(19,63,112,0.92)',
  panel: DEEP,
  onPanel: WHITE,
  hatchInk: 'rgba(10,29,51,0.45)',
  topo: WHITE,
  mapStyle: MAP_FIORD,
};

// Dawn: the print is still wet, a shade lighter.
const dawn: Palette = {
  ...day,
  phase: 'dawn',
  ground: '#17467A',
  groundDeep: '#123C6B',
  paper: '#1D5289',
  inkMuted: '#B8CCE1',
  line: '#3867A1',
  lateriteText: '#FFB59A',
  veil: 'rgba(23,70,122,0.92)',
};

// Dusk: the blue deepens towards night and the yellow warms.
const dusk: Palette = {
  ...day,
  phase: 'dusk',
  ground: '#0F3359',
  groundDeep: '#0B2A4B',
  paper: '#153E69',
  inkMuted: '#ABC1D8',
  line: '#2C5687',
  accent: '#F0B41E',
  accentText: '#F0B41E',
  veil: 'rgba(15,51,89,0.92)',
};

// Night: the borehole — blue-black, the print put away.
const night: Palette = {
  phase: 'night',
  dark: true,
  ground: '#0A1420',
  groundDeep: '#060D16',
  paper: '#111F30',
  ink: '#EAF1F8',
  inkMuted: '#8FA4BB',
  line: '#213349',
  hairline: 'rgba(234,241,248,0.13)',
  scrim: 'rgba(0,0,0,0.6)',
  accent: YELLOW,
  onAccent: '#0A1420',
  accentText: YELLOW,
  laterite: '#F0643C',
  onLaterite: '#0A1420',
  lateriteText: '#FF7A55',
  lake: '#3FA2E0',
  lakeText: '#6DBDF0',
  lakeMemory: '#2A4E6E',
  silt: '#B79363',
  crimsonEgg: '#E0323A',
  veil: 'rgba(10,20,32,0.9)',
  panel: '#111F30',
  onPanel: '#EAF1F8',
  hatchInk: 'rgba(10,20,32,0.45)',
  topo: '#EAF1F8',
  mapStyle: MAP_DARK,
};

export const palettes: Record<Phase, Palette> = { dawn, day, dusk, night };

/** `#rrggbb` at an opacity, for fills derived from the palette. */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Band fills for each stratum type in the Core (derived from the palette only). */
export function strataFills(c: Palette) {
  return {
    water: c.lake,
    lostWater: c.lakeMemory,
    ground: c.silt,
    rain: withAlpha(c.lake, 0.5),
    quakes: c.laterite,
    soil: withAlpha(c.silt, 0.62),
    cantSee: 'transparent',
    egg: c.crimsonEgg,
    error: c.line,
  } as const;
}

export type StrataFills = ReturnType<typeof strataFills>;
