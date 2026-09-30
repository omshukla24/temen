// "Field Instrument" tokens. On screen, colours come
// from the live palette (`useTheme()`, src/theme/palettes.ts). This fixed day
// palette is for print (the PDF report) and other places with no React tree.
export const color = {
  ground: '#ECEFE8',
  groundDeep: '#E0E5DD',
  ink: '#0C1719',
  inkMuted: '#4B5C5A',
  line: '#CBD3CC',
  accent: '#F2BE22',
  accentText: '#875800',
  laterite: '#C4411F',
  lake: '#1B6EA8',
  lakeMemory: '#86B3CB',
  silt: '#94764A',
  hairline: 'rgba(12,23,25,0.12)',
  scrim: 'rgba(12,23,25,0.42)',
  paper: '#F7F8F4',
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
