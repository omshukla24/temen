// Design lock v1 "Core Sample" (DESIGN.md §0). Light only; the map is the only large colour field.
export const color = {
  ground: '#F2EDE4',
  groundDeep: '#E8E1D4',
  ink: '#1C1B19',
  inkMuted: '#5E5A52',
  line: '#D9D1C3',
  laterite: '#A5482A',
  lake: '#1D5A7A',
  lakeMemory: '#7FA6BA',
  silt: '#8A7A62',
  hairline: 'rgba(28,27,25,0.12)',
  scrim: 'rgba(28,27,25,0.38)',
  paper: '#F7F3EC',
  crimsonEgg: '#8E1B1B',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, gutter: 20 } as const;

// Cores are square-edged; only chips round.
export const radius = { none: 0, sm: 4, md: 10, pill: 999 } as const;

export const hit = { min: 44 } as const;

export const hairline = 1;

export type ColorToken = keyof typeof color;

/** Band fills for each stratum type in the Core (derived from the palette only). */
export const strata = {
  water: color.lake,
  lostWater: color.lakeMemory,
  ground: color.silt,
  rain: 'rgba(29,90,122,0.3)',
  quakes: color.laterite,
  soil: 'rgba(138,122,98,0.62)',
  cantSee: 'transparent',
  egg: color.crimsonEgg,
  error: color.line,
} as const;

export type StrataKey = keyof typeof strata;
