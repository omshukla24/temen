import { formatMetres, TERRAIN_SOURCE, bowlHeadline, type BowlReading } from './terrain';
import { QUAKE_SOURCE, type QuakeReading } from './quakes';
import { RAIN_RULES, RAIN_SOURCE, type RainReading } from './rain';
import type { ReliefReading } from './relief';
import { SOIL_MASKED, SOIL_SOURCE, type SoilReading } from './soil';
import type { GroundFlags, GroundReport, SourceRef, Stratum } from './types';
import { hashId, prettyDate, type Settled } from './util';
import { WATER_SOURCE, bufferText, pct, waterHeadline, type WaterEdge, type WaterSample } from './water';

export const REPORT_VERSION = 1;

export interface Readings {
  water: Settled<WaterSample>;
  edge: Settled<WaterEdge>;
  bowl: Settled<BowlReading>;
  rain: Settled<RainReading>;
  quakes: Settled<QuakeReading>;
  soil: Settled<SoilReading>;
  relief?: Settled<ReliefReading>;
}

export const CANT_SEE_ALWAYS = [
  'Lakes and marshes filled before 1984, when the satellite record starts.',
  'Drains, nalas and storm-water channels narrower than about 30 m.',
  'Official full-tank lines, buffer zones and legal boundaries — only the authority can give those.',
  'Individual plots: every pixel is about 30 m, so this reads the street, not the house.',
];

const BORING = 'The records here are quiet';

function errorStratum(index: number, key: Stratum['key'], title: string, source: SourceRef, hatch: Stratum['hatch'], error: string): Stratum {
  return {
    index,
    key,
    title,
    reading: '—',
    value: null,
    unit: '',
    headline: 'The drill hit bedrock',
    detail: `This layer could not be read: ${error}. Pull down to re-core.`,
    confidence: 'low',
    significance: 0.2,
    status: 'error',
    source,
    hatch,
    flag: null,
    facts: [],
  };
}

export function waterStratum(r: Settled<WaterSample>, e: Settled<WaterEdge>): Stratum {
  if (!r.ok) return errorStratum(1, 'water', 'Water', WATER_SOURCE, 'water', r.error);
  const s = r.value;
  const h = waterHeadline(s);
  const edge = e.ok ? e.value : null;
  const facts = [
    { label: 'Window', value: `${s.total} px · ${Math.round(s.windowM)} m square` },
    { label: 'Water now', value: `${pct(s.share.now)}%` },
    { label: 'Seasonal', value: `${pct(s.share.seasonal)}%` },
    { label: 'Lost since 1984', value: `${pct(s.share.lost)}%` },
  ];
  if (edge?.distanceM != null && edge.distanceM > 0) facts.push({ label: 'Nearest water', value: `${Math.round(edge.distanceM)} m` });
  return {
    index: 1,
    key: 'water',
    title: 'Water',
    reading: `${h.value}%`,
    value: h.value,
    unit: h.label,
    headline: h.headline,
    detail: h.detail,
    confidence: s.missingTiles > 0 || s.unknown > 0 ? 'low' : 'high',
    significance: s.kind === 'none' ? 0.35 : Math.min(1, 0.45 + s.share.any * 0.55),
    status: 'ok',
    source: WATER_SOURCE,
    hatch: s.kind === 'lost' ? 'lostWater' : 'water',
    flag: edge ? bufferText(edge) : null,
    facts,
  };
}

export function groundStratum(r: Settled<BowlReading>): Stratum {
  if (!r.ok) return errorStratum(2, 'ground', 'Ground', TERRAIN_SOURCE, 'ground', r.error);
  const b = r.value;
  const h = bowlHeadline(b);
  if (b.noData) {
    return {
      index: 2, key: 'ground', title: 'Ground', reading: '—', value: null, unit: 'no heights',
      headline: h.headline, detail: h.detail, confidence: 'low', significance: 0.3, status: 'empty',
      source: TERRAIN_SOURCE, hatch: 'ground', flag: null, facts: [],
    };
  }
  return {
    index: 2,
    key: 'ground',
    title: 'Ground',
    reading: formatMetres(-b.depthM, true),
    value: Math.round(-b.depthM * 10) / 10,
    unit: `vs ${b.ringM} m around`,
    headline: h.headline,
    detail: h.detail,
    confidence: b.reliefM < 2 ? 'low' : 'med',
    significance: b.isBowl ? 1 : Math.min(0.8, 0.35 + Math.max(0, b.depthM) * 0.15),
    status: 'ok',
    source: TERRAIN_SOURCE,
    hatch: 'ground',
    flag: null,
    facts: [
      { label: 'Elevation', value: formatMetres(b.elevationM) },
      { label: 'Ring median', value: formatMetres(b.ringMedianM) },
      { label: 'Lower than', value: `${b.lowerThan} of ${b.ringCount}` },
      { label: 'Relief in 400 m', value: formatMetres(b.reliefM) },
    ],
  };
}

export function rainStratum(r: Settled<RainReading>): Stratum {
  if (!r.ok) return errorStratum(3, 'rain', 'Rain', RAIN_SOURCE, 'rain', r.error);
  const x = r.value;
  const perYear = x.heavyDaysPerYear;
  const headline =
    x.wettest.mm >= RAIN_RULES.extremeMm
      ? 'Extreme rain has fallen here'
      : perYear >= 1
        ? 'Heavy rain every year'
        : x.heavyDays > 0
          ? 'Heavy rain some years'
          : 'No heavy-rain days on record';
  return {
    index: 3,
    key: 'rain',
    title: 'Rain',
    reading: `${Math.round(x.wettest.mm)} mm`,
    value: Math.round(x.wettest.mm),
    unit: 'wettest day',
    headline,
    detail: `The wettest day since ${x.firstYear} was ${prettyDate(x.wettest.date)}: ${x.wettest.mm.toFixed(1)} mm. Days of ${RAIN_RULES.heavyMm} mm or more (IMD "heavy"): ${perYear.toFixed(1)} a year on average.`,
    confidence: 'med',
    significance: Math.min(1, 0.3 + perYear * 0.15 + (x.wettest.mm >= RAIN_RULES.extremeMm ? 0.3 : 0)),
    status: 'ok',
    source: RAIN_SOURCE,
    hatch: 'rain',
    flag: null,
    facts: [
      ...x.top.map((d, i) => ({ label: i === 0 ? 'Wettest day' : `#${i + 1}`, value: `${d.mm.toFixed(1)} mm · ${prettyDate(d.date)}` })),
      { label: 'Heavy days / yr', value: perYear.toFixed(1) },
      { label: 'Extreme days (≥ 204.5 mm)', value: String(x.extremeDays) },
      { label: 'Average year', value: `${Math.round(x.annualMeanMm)} mm` },
    ],
  };
}

export function quakeStratum(r: Settled<QuakeReading>): Stratum {
  if (!r.ok) return errorStratum(4, 'quakes', 'Quakes', QUAKE_SOURCE, 'quakes', r.error);
  const q = r.value;
  const s = q.strongest;
  const headline = q.count === 0 ? 'No M4.5+ quakes within 300 km' : q.bigQuake ? 'A strong quake has struck nearby' : 'Moderate quakes nearby';
  const detail =
    q.count === 0
      ? 'The USGS catalogue has no magnitude 4.5+ earthquake within 300 km since 1900. Older and smaller quakes are not in it.'
      : `${q.count} quakes of M4.5 or more within 300 km since 1900. The strongest: M${s!.mag.toFixed(1)}, ${s!.place}, ${s!.year}, ${Math.round(s!.distanceKm)} km away.`;
  return {
    index: 4,
    key: 'quakes',
    title: 'Quakes',
    reading: String(q.count),
    value: q.count,
    unit: 'M4.5+ in 300 km',
    headline,
    detail,
    confidence: 'high',
    significance: s ? Math.min(1, 0.3 + Math.max(0, s.mag - 4.5) * 0.25) : 0.3,
    status: 'ok',
    source: QUAKE_SOURCE,
    hatch: 'quakes',
    flag: null,
    facts: q.top.map((x) => ({ label: `M${x.mag.toFixed(1)} · ${x.year}`, value: `${Math.round(x.distanceKm)} km · ${x.place}` })),
  };
}

export function soilStratum(r: Settled<SoilReading>): Stratum {
  if (!r.ok && r.error === SOIL_MASKED) {
    return {
      index: 5, key: 'soil', title: 'Soil', reading: '—', value: null, unit: 'not modelled',
      headline: 'No soil modelled here',
      detail:
        'SoilGrids leaves out built-up ground, water and bare rock, and found no modelled soil within 2.5 km of this point. Ask for the soil test done for the foundation design.',
      confidence: 'low', significance: 0.25, status: 'empty', source: SOIL_SOURCE, hatch: 'soil', flag: null, facts: [],
    };
  }
  if (!r.ok) return errorStratum(5, 'soil', 'Soil', SOIL_SOURCE, 'soil', r.error);
  const s = r.value;
  const ref = s.sub ?? s.top!;
  const near = s.nearby ? `Nothing is modelled under this point (built-up ground or water); this is the nearest modelled soil, ${(s.nearby.distanceM / 1000).toFixed(1)} km ${s.nearby.direction}. ` : '';
  return {
    index: 5,
    key: 'soil',
    title: 'Soil',
    reading: `${Math.round(s.clayPct)}%`,
    value: Math.round(s.clayPct),
    unit: s.nearby ? `clay · ${(s.nearby.distanceM / 1000).toFixed(1)} km ${s.nearby.direction}` : 'clay',
    headline: s.clayHeavy ? 'Heavy clay' : s.texture,
    detail:
      near +
      (s.clayHeavy
        ? `Modelled texture: ${s.texture.toLowerCase()}, ${Math.round(s.clayPct)}% clay. Clay swells when wet and shrinks when dry, which can crack walls and floors.`
        : `Modelled texture: ${s.texture.toLowerCase()} — ${Math.round(ref.clay)}% clay, ${Math.round(ref.sand)}% sand, ${Math.round(ref.silt)}% silt at 15–30 cm.`),
    confidence: 'low',
    significance: Math.min(1, 0.25 + s.clayPct / 80),
    status: 'ok',
    source: SOIL_SOURCE,
    hatch: 'soil',
    flag: null,
    facts: [
      ...(s.nearby ? [{ label: 'Read at', value: `${(s.nearby.distanceM / 1000).toFixed(1)} km ${s.nearby.direction} of the pin` }] : []),
      ...(s.top ? [{ label: '0–5 cm', value: `${Math.round(s.top.clay)}% clay · ${Math.round(s.top.sand)}% sand · ${Math.round(s.top.silt)}% silt` }] : []),
      ...(s.sub ? [{ label: '15–30 cm', value: `${Math.round(s.sub.clay)}% clay · ${Math.round(s.sub.sand)}% sand · ${Math.round(s.sub.silt)}% silt` }] : []),
    ],
  };
}

export function flagsFrom(r: Readings): GroundFlags {
  const w = r.water.ok ? r.water.value : null;
  return {
    lostWater: !!w && w.kind === 'lost',
    onWater: !!w && w.kind === 'onWater',
    seasonal: !!w && w.kind === 'seasonal',
    bowl: r.bowl.ok && r.bowl.value.isBowl,
    buffer: r.edge.ok && r.edge.value.buffer,
    heavyRain: r.rain.ok && r.rain.value.heavyDaysPerYear >= 1,
    clayHeavy: r.soil.ok && r.soil.value.clayHeavy,
    bigQuake: r.quakes.ok && r.quakes.value.bigQuake,
    relief: !!r.relief?.ok && r.relief.value.inZone,
  };
}

/** Questions to ask before signing: 2–6 per place, from what the ground showed. */
export function questionsFor(f: GroundFlags): string[] {
  const q: string[] = [];
  if (f.lostWater || f.seasonal || f.onWater)
    q.push("Was this plot ever part of a lake, tank or marsh? Ask for the land record (survey number) and the lake's official FTL map.");
  if (f.buffer && !f.lostWater) q.push('Ask the planning authority for the FTL and buffer-zone map, and check this plot against it.');
  if (f.bowl) q.push('Where does rainwater go from this lane? Ask neighbours how deep it got in the worst rain they remember.');
  if (f.heavyRain) q.push('What is the plinth height above the road? Is there a sump pump, and where does it discharge?');
  if (f.clayHeavy) q.push('What foundation type was used, and how deep? Look for cracks in walls, floors and the compound wall.');
  if (f.bigQuake) q.push('Is the structure designed for this seismic zone? Ask for the structural stability certificate.');
  const fillers = [
    'Ask neighbours and the local shopkeeper how this street fared in the last big flood.',
    'Check the title deed and approved building plan against the survey number on the ground.',
  ];
  for (const x of fillers) if (q.length < 2) q.push(x);
  return q.slice(0, 6);
}

export function cantSeeFor(r: Readings): string[] {
  const extra: string[] = [];
  if (r.rain.ok) extra.push('A cloudburst over one street: rain is averaged over a ~55 km grid.');
  if (r.soil.ok) extra.push('What is under this plot: soil is modelled at 250 m, not tested.');
  if (r.bowl.ok && !r.bowl.value.noData) extra.push('Buildings and trees: heights come from a satellite surface model and can be a few metres off.');
  return [...CANT_SEE_ALWAYS, ...extra];
}

function cantSeeStratum(items: string[]): Stratum {
  return {
    index: 6,
    key: 'cantSee',
    title: "What this can't see",
    reading: String(items.length),
    value: items.length,
    unit: 'blind spots',
    headline: "What this can't see",
    detail: items.join(' '),
    confidence: 'high',
    significance: 0.4,
    status: 'ok',
    source: { name: 'Temen', years: '—', resolution: '—', url: 'https://github.com/omshukla24/temen' },
    hatch: 'cantSee',
    flag: null,
    facts: items.map((x, i) => ({ label: String(i + 1).padStart(2, '0'), value: x })),
  };
}

/** The core's one-line headline: the strongest finding, never "safe" or "unsafe". */
export function headlineFor(f: GroundFlags, strata: Stratum[]): string {
  const water = strata.find((s) => s.key === 'water');
  if (f.onWater) return "You're on water";
  if (f.lostWater && f.bowl) return 'Water was here, and the ground still dips';
  if (f.lostWater) return 'Water was here and is gone';
  if (f.bowl) return 'Sits in a bowl';
  if (f.seasonal) return 'This ground floods seasonally';
  if (f.buffer) return 'Close to water seen since 1984';
  if (f.heavyRain) return 'Heavy rain every year';
  if (f.bigQuake) return 'A strong quake has struck nearby';
  if (f.clayHeavy) return 'Heavy clay underfoot';
  if (water?.status === 'ok') return BORING;
  return 'Partly read';
}

/** Paywall teaser from this plot's own strongest finding. No invented years. */
export function teaserFor(r: Readings, f: GroundFlags): string {
  if (r.water.ok && (f.lostWater || f.onWater || f.seasonal)) {
    const s = r.water.value;
    if (f.lostWater) return `${pct(s.share.lost)}% of the ground around this pin was water after 1984, and isn't now.`;
    if (f.onWater) return `Satellites still see water under ${pct(s.share.now)}% of the ground around this pin.`;
    return `${pct(s.share.seasonal)}% of the ground around this pin holds water part of the year.`;
  }
  if (r.bowl.ok && f.bowl) return `This spot sits ${formatMetres(r.bowl.value.depthM)} below the ground around it.`;
  if (r.rain.ok) return `The wettest day here: ${Math.round(r.rain.value.wettest.mm)} mm on ${prettyDate(r.rain.value.wettest.date)}.`;
  return 'Your core is drilled — five strata, forty years deep.';
}

export interface BuildInput {
  lat: number;
  lon: number;
  placeName: string | null;
  now: Date;
  readings: Readings;
}

export function buildReport({ lat, lon, placeName, now, readings }: BuildInput): GroundReport {
  const strata = [
    waterStratum(readings.water, readings.edge),
    groundStratum(readings.bowl),
    rainStratum(readings.rain),
    quakeStratum(readings.quakes),
    soilStratum(readings.soil),
  ];
  const cantSee = cantSeeFor(readings);
  strata.push(cantSeeStratum(cantSee));
  const flags = flagsFrom(readings);
  const createdAt = now.toISOString();
  const sources = strata.filter((s) => s.key !== 'cantSee').map((s) => s.source);
  return {
    id: hashId(`${lat.toFixed(6)},${lon.toFixed(6)},${createdAt}`),
    lat,
    lon,
    placeName,
    createdAt,
    elevationM: readings.bowl.ok && !readings.bowl.value.noData ? readings.bowl.value.elevationM : null,
    headline: headlineFor(flags, strata),
    strata,
    questions: questionsFor(flags),
    cantSee,
    sources,
    flags,
    teaser: teaserFor(readings, flags),
    version: REPORT_VERSION,
  };
}

/** Plain-language summary for the spoken verdict and share text. */
export function summarise(report: GroundReport): string {
  const parts = [report.headline + '.'];
  for (const s of report.strata) {
    if (s.key === 'cantSee' || s.status !== 'ok') continue;
    parts.push(`${s.title}: ${s.headline}.`);
  }
  parts.push("This can't see drains, official lake boundaries or single plots.");
  return parts.join(' ');
}
