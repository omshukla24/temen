import { formatHemisphere, formatMetres, type GroundReport, type Stratum } from 'ground-memory';

import { color, strata as fills } from '@/theme/tokens';

import { MAP_ATTRIBUTION } from '@/services/map';
import type { SiteKit } from '@/services/sitekit';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HATCH: Record<string, string> = {
  water: `<pattern id="h-water" width="16" height="9" patternUnits="userSpaceOnUse"><path d="M0 5 Q4 2.5 8 5 T16 5" fill="none" stroke="rgba(242,237,228,.5)" stroke-width="1"/></pattern>`,
  lostWater: `<pattern id="h-lostWater" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="rgba(29,90,122,.55)"/></pattern>`,
  ground: `<pattern id="h-ground" width="40" height="11" patternUnits="userSpaceOnUse"><path d="M0 6 C12 3 26 9 40 6" fill="none" stroke="rgba(242,237,228,.45)"/></pattern>`,
  rain: `<pattern id="h-rain" width="8" height="12" patternUnits="userSpaceOnUse"><path d="M4 2 V7" stroke="rgba(28,27,25,.3)"/></pattern>`,
  quakes: `<pattern id="h-quakes" width="24" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 L4 6 L8 14 L12 4 L16 12 L20 8 L24 10" fill="none" stroke="rgba(242,237,228,.55)"/></pattern>`,
  soil: `<pattern id="h-soil" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".8" fill="rgba(28,27,25,.35)"/><circle cx="6.5" cy="7" r=".7" fill="rgba(28,27,25,.3)"/></pattern>`,
};

function band(s: Stratum): string {
  const fill = s.status === 'error' ? fills.error : (fills as Record<string, string>)[s.hatch] ?? fills.ground;
  const h = Math.round(56 + s.significance * 50);
  const idx = String(s.index).padStart(2, '0');
  return `
  <div class="band" style="min-height:${h}px">
    <svg class="col" width="18" height="${h}" preserveAspectRatio="none"><rect width="18" height="100%" fill="${fill}"/><rect width="18" height="100%" fill="url(#h-${s.hatch})"/></svg>
    <div class="bandBody">
      <div class="row"><span class="mono ink">${idx} ${esc(s.title.toUpperCase())}</span><span class="mono ink">${{ low: '●○○', med: '●●○', high: '●●●' }[s.confidence]}</span></div>
      <div class="row base"><span class="reading">${esc(s.reading)}</span><span class="mono">${esc(s.unit)}</span></div>
      <div class="heading">${esc(s.headline)}</div>
      <div class="small">${esc(s.detail)}</div>
      ${s.flag ? `<div class="flag">▲ ${esc(s.flag)}</div>` : ''}
      ${s.facts.length ? `<table class="facts">${s.facts.map((f) => `<tr><td class="mono">${esc(f.label)}</td><td>${esc(f.value)}</td></tr>`).join('')}</table>` : ''}
      <div class="chip mono">${esc(s.source.name)} · ${esc(s.source.years)} · ${esc(s.source.resolution)}</div>
    </div>
  </div>`;
}

/** The Survey Seal as SVG: benchmark mark, coordinates on the rim, the date in the middle. */
export function sealSvg(lat: number, lon: number, iso: string, size = 132): string {
  const d = new Date(iso);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const ring = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? 'E' : 'W'} · TEMEN · `;
  const c = size / 2;
  const r = size * 0.42;
  const s = r * 0.72;
  const tr = r * 0.8;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-4deg)">
  <defs><path id="rim" d="M ${c - tr} ${c} a ${tr} ${tr} 0 1 1 ${2 * tr} 0 a ${tr} ${tr} 0 1 1 ${-2 * tr} 0"/></defs>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color.laterite}" stroke-width="2"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.66}" fill="none" stroke="${color.laterite}" stroke-width="1" stroke-dasharray="2 3"/>
  <g stroke="${color.laterite}" stroke-width="2.2" stroke-linecap="square" fill="none">
    <path d="M${c - 0.42 * s} ${c - 0.06 * r - 0.2 * s} H${c + 0.42 * s}"/>
    <path d="M${c} ${c - 0.06 * r - 0.12 * s} V${c - 0.06 * r + 0.38 * s} M${c} ${c - 0.06 * r - 0.12 * s} L${c - 0.26 * s} ${c - 0.06 * r + 0.34 * s} M${c} ${c - 0.06 * r - 0.12 * s} L${c + 0.26 * s} ${c - 0.06 * r + 0.34 * s}"/>
  </g>
  <text font-family="Mono" font-size="${size * 0.047}" fill="${color.laterite}" letter-spacing="1"><textPath href="#rim">${ring}</textPath></text>
  <text x="${c}" y="${c + r * 0.52}" text-anchor="middle" font-family="Mono" font-size="${size * 0.042}" fill="${color.laterite}">${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}</text>
</svg>`;
}

/** Pure: the report as one self-contained HTML page (fonts, map and photos already inlined). */
export function renderReportHtml(
  r: GroundReport,
  trail: string[],
  kit: SiteKit | null,
  { faces, map, photos }: { faces: string; map: string | null; photos: string },
): string {
  const place = r.placeName ?? formatHemisphere(r.lat, r.lon, 4);
  const crumbs = ['GROUND', ...trail, place].map((s) => esc(s.toUpperCase())).join(' / ');
  const strata = r.strata.filter((s) => s.key !== 'cantSee' && s.key !== 'egg');
  const checked = kit ? Object.entries(kit.checks).filter(([, v]) => v).map(([k]) => k) : [];
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
${faces}
@page { size: A4; margin: 18mm 16mm; }
@media screen { body { padding: 20px 18px 40px; } }
* { box-sizing: border-box; }
body { margin: 0; background: ${color.ground}; color: ${color.ink}; font-family: Body, sans-serif; font-size: 11px; line-height: 1.5; }
.mono { font-family: Mono, monospace; font-size: 8px; letter-spacing: .2em; text-transform: uppercase; color: ${color.inkMuted}; }
.ink { color: ${color.ink}; }
h1 { font-family: Serif, serif; font-weight: 400; font-size: 34px; line-height: 1.05; letter-spacing: -.02em; margin: 6px 0 8px; }
h2 { margin: 18px 0 6px; }
.wordmark { font-family: Serif, serif; font-size: 20px; letter-spacing: .08em; }
.top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid ${color.ink}; padding-bottom: 8px; }
.meta { display: flex; gap: 14px; flex-wrap: wrap; margin: 6px 0 10px; }
.map { width: 100%; border: 1px solid ${color.ink}; margin: 8px 0 4px; }
.band { display: flex; border-bottom: 1px solid rgba(28,27,25,.12); page-break-inside: avoid; }
.col { flex: none; border-left: 1px solid ${color.ink}; border-right: 1px solid ${color.ink}; }
.bandBody { flex: 1; padding: 8px 0 8px 12px; }
.row { display: flex; justify-content: space-between; gap: 8px; }
.base { justify-content: flex-start; align-items: baseline; }
.reading { font-family: Serif, serif; font-size: 28px; line-height: 1.1; }
.heading { font-weight: 600; font-size: 13px; }
.small { color: ${color.inkMuted}; }
.flag { color: ${color.laterite}; margin-top: 4px; }
.facts { margin-top: 4px; border-collapse: collapse; }
.facts td { padding: 1px 10px 1px 0; vertical-align: top; }
.chip { display: inline-block; border: 1px solid ${color.line}; border-radius: 99px; padding: 1px 8px; margin-top: 6px; font-size: 7px; }
.cant { border: 1px dashed ${color.ink}; padding: 10px 12px; margin-top: 12px; page-break-inside: avoid; }
ol { padding-left: 18px; margin: 4px 0; } li { margin: 3px 0; }
.q li::marker { font-family: Serif, serif; color: ${color.laterite}; }
.foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-top: 1px solid ${color.ink}; padding-top: 8px; gap: 16px; }
.photos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
figure { margin: 0; } figure img { width: 100%; border: 1px solid ${color.ink}; } figcaption { margin-top: 2px; font-size: 7px; }
.page { page-break-before: always; }
.italic { font-family: Serif, serif; font-style: italic; font-size: 16px; color: ${color.laterite}; }
</style></head><body>
<div class="top"><div><div class="wordmark">TEMEN</div><div class="mono">what the ground remembers</div></div><div class="mono ink" style="text-align:right">CORE ${esc(r.id.toUpperCase())}<br/>${esc(r.createdAt.slice(0, 16).replace('T', ' · '))} UTC</div></div>
<div class="mono" style="margin-top:8px">${crumbs}</div>
<h1>${esc(r.headline)}</h1>
<div class="italic">${esc(r.teaser)}</div>
<div class="meta mono ink"><span>${esc(formatHemisphere(r.lat, r.lon, 6))}</span><span>ELEV ${r.elevationM != null ? esc(formatMetres(r.elevationM)) : '—'}</span></div>
${map ? `<img class="map" src="${map}"/><div class="mono" style="font-size:6.5px">${esc(MAP_ATTRIBUTION)}</div>` : ''}
<svg width="0" height="0" style="position:absolute"><defs>${Object.values(HATCH).join('')}</defs></svg>
<h2 class="mono ink">THE CORE · NOW → 1984</h2>
<div style="border-top:1px solid ${color.ink}">${strata.map(band).join('')}</div>
<div class="cant"><div class="mono ink">WHAT THIS CAN'T SEE</div><ol>${r.cantSee.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
<h2 class="mono ink">ASK BEFORE YOU SIGN</h2>
<ol class="q">${r.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
${checked.length ? `<h2 class="mono ink">CHECKED ON SITE</h2><ol>${checked.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
<div class="foot"><div style="flex:1"><div class="mono ink">SOURCES</div>${r.sources
    .map((s, i) => `<div>${i + 1}. ${esc(s.name)} · ${esc(s.years)} · ${esc(s.resolution)}${s.licence ? ` · ${esc(s.licence)}` : ''}</div>`)
    .join('')}<div class="small" style="margin-top:6px">Temen reads open records. It never calls a place safe or unsafe, never claims official boundaries and never predicts floods. Pixels are about 30 m: this reads the street, not the plot.</div></div>${sealSvg(r.lat, r.lon, r.createdAt)}</div>
${photos}
</body></html>`;
}
