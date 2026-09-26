import type { SourceRef } from './types';

export const TIMELAPSE_SOURCE: SourceRef = {
  name: 'Google Earth Timelapse (Google, Landsat, Copernicus)',
  years: '1984–2022',
  resolution: '30 m',
  url: 'https://earthengine.google.com/timelapse/',
  licence: 'CC BY 4.0',
};

export const TIMELAPSE_YEARS = { first: 1984, last: 2022 } as const;

/** Embeddable player, started at the pin. */
export function timelapseEmbedUrl(lat: number, lon: number, zoom = 13, from = TIMELAPSE_YEARS.first, to = TIMELAPSE_YEARS.last): string {
  return (
    'https://earthengine.google.com/iframes/timelapse_player_embed.html' +
    `#v=${lat.toFixed(5)},${lon.toFixed(5)},${zoom},latLng&t=0.03&ps=25&bt=${from}0101&et=${to}1231&startDwell=0&endDwell=0`
  );
}

/** Full viewer, for "open in browser". */
export function timelapseViewerUrl(lat: number, lon: number, zoom = 13): string {
  return `https://earthengine.google.com/timelapse#v=${lat.toFixed(5)},${lon.toFixed(5)},${zoom},latLng&t=0.03`;
}

export function yearToFrame(year: number): number {
  return Math.max(0, Math.min(TIMELAPSE_YEARS.last, year) - TIMELAPSE_YEARS.first);
}

export function frameCount(): number {
  return TIMELAPSE_YEARS.last - TIMELAPSE_YEARS.first + 1;
}
