// Design lock v2 "Core Sample, day and night" (DESIGN.md §0). The paper follows
// the sun: a rose-limestone dawn, limestone day, amber dusk and charcoal night.
// Every palette keeps body text at WCAG AA on its ground.

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
  /** Accent fill (buttons, the pin, flags). Text on it uses `onLaterite`. */
  laterite: string;
  onLaterite: string;
  /** Accent as small text or strokes on `ground` (AA). */
  lateriteText: string;
  lake: string;
  lakeText: string;
  lakeMemory: string;
  silt: string;
  crimsonEgg: string;
  /** Ground at ~90% over the map, for HUDs and headers that sit on it. */
  veil: string;
  /** OpenFreeMap style for this light. */
  mapStyle: string;
}

const MAP_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const MAP_DARK = 'https://tiles.openfreemap.org/styles/dark';

const day: Palette = {
  phase: 'day',
  dark: false,
  ground: '#F2EDE4',
  groundDeep: '#E8E1D4',
  paper: '#F7F3EC',
  ink: '#1C1B19',
  inkMuted: '#5E5A52',
  line: '#D9D1C3',
  hairline: 'rgba(28,27,25,0.12)',
  scrim: 'rgba(28,27,25,0.38)',
  laterite: '#A5482A',
  onLaterite: '#F7F3EC',
  lateriteText: '#A5482A',
  lake: '#1D5A7A',
  lakeText: '#1D5A7A',
  lakeMemory: '#7FA6BA',
  silt: '#8A7A62',
  crimsonEgg: '#8E1B1B',
  veil: 'rgba(242,237,228,0.9)',
  mapStyle: MAP_LIGHT,
};

const dawn: Palette = {
  ...day,
  phase: 'dawn',
  ground: '#F3EAE4',
  groundDeep: '#E9DDD5',
  paper: '#F8F2EE',
  line: '#DCCEC5',
  inkMuted: '#5F5853',
  veil: 'rgba(243,234,228,0.9)',
};

const dusk: Palette = {
  ...day,
  phase: 'dusk',
  ground: '#EFE4D3',
  groundDeep: '#E4D6C0',
  paper: '#F5ECDD',
  line: '#D5C5AC',
  inkMuted: '#5A5245',
  laterite: '#9C4225',
  lateriteText: '#9C4225',
  veil: 'rgba(239,228,211,0.9)',
};

const night: Palette = {
  phase: 'night',
  dark: true,
  ground: '#151412',
  groundDeep: '#0E0D0C',
  paper: '#1F1D1A',
  ink: '#ECE5D8',
  inkMuted: '#A39B8D',
  line: '#36322C',
  hairline: 'rgba(236,229,216,0.14)',
  scrim: 'rgba(0,0,0,0.55)',
  laterite: '#C8603D',
  onLaterite: '#140F0C',
  lateriteText: '#E07B57',
  lake: '#4F90B6',
  lakeText: '#7DB4D6',
  lakeMemory: '#3E6377',
  silt: '#9A8A70',
  crimsonEgg: '#C4403F',
  veil: 'rgba(21,20,18,0.86)',
  mapStyle: MAP_DARK,
};

export const palettes: Record<Phase, Palette> = { dawn, day, dusk, night };

/** Band fills for each stratum type in the Core (derived from the palette only). */
export function strataFills(c: Palette) {
  return {
    water: c.lake,
    lostWater: c.lakeMemory,
    ground: c.silt,
    rain: c.dark ? 'rgba(79,144,182,0.42)' : 'rgba(29,90,122,0.3)',
    quakes: c.laterite,
    soil: c.dark ? 'rgba(154,138,112,0.7)' : 'rgba(138,122,98,0.62)',
    cantSee: 'transparent',
    egg: c.crimsonEgg,
    error: c.line,
  } as const;
}

export type StrataFills = ReturnType<typeof strataFills>;
