// Design lock v4 "Cyanotype" (DESIGN.md §0). On screen, colours come from the
// live palette (`useTheme()`, src/theme/palettes.ts). This fixed palette is for
// print (the PDF report goes out on plain white paper in the plan's blue ink)
// and for places with no React tree.
export const color = {
  ground: '#FFFFFF',
  groundDeep: '#E6EDF5',
  ink: '#0B2440',
  inkMuted: '#4A5F78',
  line: '#C9D5E3',
  accent: '#F2BE22',
  accentText: '#875800',
  laterite: '#C4411F',
  lake: '#1B6EA8',
  lakeMemory: '#86B3CB',
  silt: '#94764A',
  hairline: 'rgba(11,36,64,0.12)',
  scrim: 'rgba(11,36,64,0.42)',
  paper: '#F2F6FA',
  crimsonEgg: '#9E1B22',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, gutter: 20 } as const;

// Instruments are square-edged: corners are cut, not rounded. Only the toggle and dots are round.
export const radius = { none: 0, sm: 2, md: 4, pill: 999 } as const;

/** Stroke weights: hairline for rules, frame for the ink outlines of fields, tiles and cores. */
export const stroke = { hair: 1, frame: 1.5, heavy: 2 } as const;

export const hit = { min: 44 } as const;

export const hairline = 1;

export type ColorToken = keyof typeof color;

/** Print band fills (on screen use `strataFills(c)` from the live palette). */
export const strata = {
  water: color.lake,
  lostWater: color.lakeMemory,
  ground: color.silt,
  rain: 'rgba(27,110,168,0.42)',
  quakes: color.laterite,
  soil: 'rgba(148,118,74,0.55)',
  cantSee: 'transparent',
  egg: color.crimsonEgg,
  error: color.line,
} as const;

export type StrataKey = keyof typeof strata;
