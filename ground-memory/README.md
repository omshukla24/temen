# ground-memory

What the ground remembers, for any point on Earth, from open data: 40 years of surface water, the shape of the ground, the worst rain, earthquakes and soil — plus plain questions to ask before you buy or rent there.

TypeScript, no React Native, no API keys. It powers the [Temen](..) app and runs the same in Node.

```ts
import { checkGround } from 'ground-memory';

const fetchJson = async (url: string, init?: { headers?: Record<string, string> }) => {
  const res = await fetch(url, { headers: init?.headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const fetchTile = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
};

const report = await checkGround(
  { lat: 12.95287, lon: 80.20706 },
  { fetchJson, fetchTile, now: () => new Date(), userAgent: 'your-app/1.0 you@example.com' },
);
console.log(report.headline);          // "Water was here, and the ground still dips"
for (const s of report.strata) console.log(s.index, s.title, s.reading, s.source.name);
console.log(report.questions, report.cantSee);
```

Everything platform-specific is injected (`fetchJson`, `fetchTile`, `now`), so tests run offline from fixtures.

## Modules

| Module | What it does |
|---|---|
| `tiles` | lat/lon ↔ tile pixels, metres per pixel, stitched multi-tile regions with an LRU cache |
| `png` | any PNG → RGBA8 (safe with Node Buffer views) |
| `water` | JRC 2024 transition palette → classes; 9×9 window shares; verdict; distance to the nearest water pixel (buffer flag); class mask for drawing |
| `terrain` | terrarium heights, bilinear sampling; the bowl check (point vs 16 points at 400 m); elevation grids |
| `contours` | smoothed d3-contour lines as unit-square SVG paths |
| `rain` | NASA POWER daily rain: wettest days, IMD heavy (≥ 64.5 mm) and extreme (≥ 204.5 mm) days per year |
| `quakes` | USGS count and strongest M4.5+ events within 300 km |
| `soil` | SoilGrids clay/sand/silt → USDA texture, heavy-clay flag; `soilNear` borrows the nearest modelled soil when the point is built over or water |
| `forecast` | MET Norway next-24 h rain (needs a User-Agent); `hourlyStrip` lays it out hour by hour |
| `relief` | GDACS active floods within 100 km |
| `timelapse` | Google Earth Timelapse embed and viewer URLs |
| `parse-location` | WhatsApp / Google / Apple / OSM links, `geo:` URIs, DMS, decimal pairs, plus codes, short links to resolve |
| `verdict` | readings → a `GroundReport`: strata, flags, questions, what it can't see, a teaser |
| `check` | `checkGround`: every source in parallel, each with its own timeout, progress callbacks, an optional reading cache |

## Rules

The output never calls a place safe or unsafe, never claims official boundaries and never predicts floods. Every report lists its sources with years and resolution and ends with what it cannot see. Tests enforce the first rule.

## The JRC palette

The 2024 transition tiles use a palette that is not published. It was inferred by cross-tabbing the 2021 and 2024 tiles and is guarded by golden tests on real tiles:

| RGB | Class |
|---|---|
| 0,0,221 | permanent |
| 34,177,76 | new permanent |
| 147,7,62 | lost permanent |
| 153,217,234 | seasonal |
| 181,230,29 | new seasonal |
| 235,180,187 | lost seasonal |
| 255,139,55 | seasonal → permanent |
| 255,221,102 | permanent → seasonal |
| 127,127,127 | ephemeral permanent |
| 172,172,172 | ephemeral seasonal |

## Accuracy

| Site | Why it is here | Water memory (9×9 JRC px) | Ground (400 m ring) | Expected | Result |
|---|---|---|---|---|---|
| Palm Jumeirah, Dubai (25.1173, 55.1351) | Land reclaimed from the sea from 2001. | 89% lost water (now 0%, gone 89%) | no height data (0 m sea fill) | water: lost | ✅ pass |
| Chennai One SEZ, Thoraipakkam (12.9442, 80.2292) | Offices near the Pallikaranai marsh. | 67% lost water (now 0%, gone 67%) | no height data (0 m sea fill) | water: lost | ✅ pass |
| Kuberan Nagar, Madipakkam, Chennai (12.95287, 80.20706) | Residential colony in low-lying south Chennai. | 52% lost water (now 0%, gone 52%) | −1.5 m vs 1.5 m; lower than 16/16 → bowl | water: lost, bowl: yes | ✅ pass |
| Jaisalmer Fort (dry control) (26.9124, 70.9126) | Hilltop fort in the Thar desert. | 0% — no water 1984–2024 | 276.1 m vs 237.2 m; lower than 0/16 | water: none, buffer: no | ✅ pass |
| Hussain Sagar, Hyderabad (on-water control) (17.4239, 78.4738) | Centre of a 16th-century lake. | 100% water now (now 100%, gone 0%) | 512.0 m vs 512.0 m; lower than 9/16 | water: onWater | ✅ pass |

## Tests

```bash
npm test                 # from the app root; offline
npm run fixtures         # record tiles + API responses (network)
npm run accuracy         # print the table above
```

## Data and licences

JRC Global Surface Water (Copernicus / EC JRC) · AWS Terrain Tiles (Mapzen terrarium) · NASA POWER · USGS · ISRIC SoilGrids (CC BY 4.0) · MET Norway (CC BY 4.0) · GDACS · Google Earth Timelapse (CC BY 4.0). Respect each provider's fair-use terms; identify your app in the User-Agent.

## License

MIT
